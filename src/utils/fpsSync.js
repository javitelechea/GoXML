const SYNC_MARKERS = new Set(['T-START', 'T-END', '@@@P1']);
const MIN_PREROLL_GAP = 30;

const round2 = (n) => Math.round(n * 100) / 100;

const isOn25fpsGrid = (value) =>
    Math.abs(value * 25 - Math.round(value * 25)) < 0.001;

export const is25fpsGrid = (events) => {
    const timed = events.filter((e) => Number.isFinite(e.start) && Number.isFinite(e.end));
    if (timed.length < 10) return false;

    const aligned = timed.filter((e) => isOn25fpsGrid(e.start) && isOn25fpsGrid(e.end));
    return aligned.length / timed.length >= 0.9;
};

export const hasTagandviewMarkers = (events) =>
    events.some((e) => e.code === 'T-START') && events.some((e) => e.code === 'T-END');

const maxEndTime = (events) =>
    events.reduce((max, e) => Math.max(max, e.end || 0), 0);

/**
 * After a 25→30 fps conversion, Tagandview exports often keep T-START near 0
 * even though the video sync point sits after a long pre-roll gap.
 */
export const findPreRollSyncStart = (events, scale = 25 / 30) => {
    const sorted = [...events].sort((a, b) => a.start - b.start);
    const tStart = sorted.find((e) => e.code === 'T-START');
    if (!tStart || tStart.start > 5) return null;

    for (let i = 0; i < sorted.length - 1; i++) {
        const curr = sorted[i];
        const next = sorted[i + 1];
        const gap = next.start - curr.start;

        if (curr.start <= 5 && gap >= MIN_PREROLL_GAP && !SYNC_MARKERS.has(next.code)) {
            return round2(next.start * scale);
        }
    }

    return null;
};

export const detectFpsDesync = (events) => {
    if (!events?.length || !is25fpsGrid(events)) {
        return { detected: false };
    }

    const tagandview = hasTagandviewMarkers(events);
    const maxEnd = maxEndTime(events);
    const scale = 25 / 30;
    const scaledEnd = maxEnd * scale;

    const longTimeline = maxEnd > 5400;
    const scaledFitsMatch = scaledEnd >= 4500 && scaledEnd <= 6600;

    if (!tagandview && !(longTimeline && scaledFitsMatch)) {
        return { detected: false, on25fpsGrid: true };
    }

    return {
        detected: true,
        sourceFps: 25,
        targetFps: 30,
        scale,
        tagandview,
        maxEnd,
        scaledEnd,
        reason: tagandview
            ? 'Export Tagandview en grilla 25 fps'
            : 'Timeline largo en grilla 25 fps',
    };
};

export const applyFpsConversion = (events, scale = 25 / 30) => {
    const scaled = events.map((e) => ({
        ...e,
        start: round2(Math.max(0, e.start * scale)),
        end: round2(Math.max(0, e.end * scale)),
    }));

    const syncStart = findPreRollSyncStart(events, scale);
    if (syncStart == null) return scaled;

    const syncEnd = round2(syncStart + 1);

    return scaled.map((e) => {
        if (e.code === 'T-START' || e.code === '@@@P1') {
            return { ...e, start: syncStart, end: syncEnd };
        }
        return e;
    });
};

export const autoFixFpsSync = (events) => {
    const detection = detectFpsDesync(events);
    if (!detection.detected) {
        return { events, applied: false, detection };
    }

    return {
        events: applyFpsConversion(events, detection.scale),
        applied: true,
        detection,
    };
};
