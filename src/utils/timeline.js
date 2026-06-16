export const minStartTime = (events) => {
    if (!events?.length) return 0;
    return events.reduce((min, e) => Math.min(min, e.start), events[0].start);
};

export const detectTimelineStart = (events) => {
    if (!events?.length) return 0;

    const lower = (s) => (s || '').toLowerCase();
    const periodStart = events.find((e) =>
        lower(e.code).includes('start period') ||
        lower(e.code).includes('comienzo primer') ||
        lower(e.code).includes('comienzo 1er') ||
        (lower(e.code) === 'offsets' && e.start >= 0 && e.start < 120)
    );

    return periodStart ? periodStart.start : minStartTime(events);
};
