export const normalizeEvents = (events) => {
    // Sort by start time ascending
    const sorted = [...events].sort((a, b) => a.start - b.start);
    // Replace IDs with sequential 1, 2, 3...
    return sorted.map((event, index) => ({
        ...event,
        id: (index + 1).toString()
    }));
};
