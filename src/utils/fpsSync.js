const SYNC_MARKERS = new Set(['T-START', 'T-END', '@@@P1']);
const MIN_PREROLL_GAP = 30;

const round2 = (n) => Math.round(n * 100) / 100;

export const hasTagandviewMarkers = (events) =>
    events.some((e) => e.code === 'T-START') && events.some((e) => e.code === 'T-END');

/** Solo Tagandview explícito (T-START + T-END). Nunca adivinar por duración o grilla 25fps. */
export const canConvertTagandviewFps = (events) =>
    Boolean(events?.length && hasTagandviewMarkers(events));

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
