import { parseNacmacFile } from './nacmacParser';

export const parseLongoMatchProject = (rawText) => {
    try {
        const cleaned = rawText.replace(/^\uFEFF/, '').trim();
        const data = JSON.parse(cleaned);
        if (!data.Timeline) throw new Error("No se encontró la sección 'Timeline' en el archivo .lgm");
        return extractLongoMatchTimelineEvents(data);
    } catch (err) {
        throw new Error("Error parseando .lgm: " + err.message);
    }
};

const isNativeSerializedLgm = (data) => {
    if (data.$type || data.$id) return true;
    if (data.Timeline.length > 0 && data.Timeline[0].$type) return true;
    return false;
};

const detectTimeUnit = (events) => {
    const numericStarts = events
        .map(e => typeof e.Start === 'number' ? e.Start : parseFloat(e.Start))
        .filter(v => !isNaN(v) && v > 0);
    if (numericStarts.length === 0) return 1;
    const maxVal = Math.max(...numericStarts);
    if (maxVal > 86400) return 1000;
    return 1;
};

const buildLgmRefMap = (data) => {
    const refMap = {};
    if (data.Dashboard && data.Dashboard.List) {
        for (const button of data.Dashboard.List) {
            if (button.EventType && button.EventType.$id) {
                refMap[button.EventType.$id] = button.EventType.Name || "";
            }
        }
    }
    return refMap;
};

export const extractLongoMatchTimelineEvents = (data) => {
    const isNative = isNativeSerializedLgm(data);
    const refMap = isNative ? buildLgmRefMap(data) : {};

    let events = data.Timeline;

    if (isNative) {
        events = events.filter(event => {
            const type = event.$type || "";
            return type.includes("TimelineEvent");
        });
    }

    const divisor = detectTimeUnit(events);

    return events.map(event => {
        let code = "";

        if (isNative && event.EventType && event.EventType.$ref) {
            code = refMap[event.EventType.$ref] || "";
        }

        if (!code) {
            const rawName = event.Name || "";
            code = isNative ? rawName.replace(/\s+\d{3,}$/, '') : rawName;
        }

        const rawStart = event.Start !== undefined ? parseFloat(event.Start) : (event.EventTime !== undefined ? parseFloat(event.EventTime) : 0);
        const rawEnd = event.Stop !== undefined ? parseFloat(event.Stop) : rawStart;

        return {
            id: event.ID || Math.random().toString(36).substr(2, 9),
            start: rawStart / divisor,
            end: rawEnd / divisor,
            code
        };
    });
};

export const parseSportscodeTimeline = (rawText) => {
    try {
        if (rawText.trim().startsWith('{')) {
            const data = JSON.parse(rawText);
            if (data.timeline && data.timeline.rows) {
                const events = [];
                data.timeline.rows.forEach(row => {
                    const code = row.name || 'Unknown Row';
                    if (row.instances && Array.isArray(row.instances)) {
                        row.instances.forEach(inst => {
                            events.push({
                                id: inst.uniqueId || inst.instanceNum || Math.random().toString(36).substr(2, 9),
                                start: parseFloat(inst.startTime) || 0,
                                end: parseFloat(inst.endTime) || 0,
                                code: code
                            });
                        });
                    }
                });
                return events;
            }
        }
        if (rawText.trim().startsWith('<')) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(rawText, "text/xml");
            const instances = xmlDoc.getElementsByTagName("instance");
            const events = [];
            for (let i = 0; i < instances.length; i++) {
                const inst = instances[i];
                events.push({
                    id: inst.getElementsByTagName("ID")[0]?.textContent || '',
                    start: parseFloat(inst.getElementsByTagName("start")[0]?.textContent) || 0,
                    end: parseFloat(inst.getElementsByTagName("end")[0]?.textContent) || 0,
                    code: inst.getElementsByTagName("code")[0]?.textContent || 'Unknown'
                });
            }
            return events;
        }
        throw new Error("Formato no reconocido.");
    } catch (err) {
        throw new Error("Error parseando Sportscode: " + err.message);
    }
};

export const parseInputFile = async (data, fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    let events = [];
    let type = "";

    if (ext === 'nacmac') {
        events = await parseNacmacFile(data);
        type = "Nacsport (.nacmac)";
    } else if (ext === 'lgm') {
        events = parseLongoMatchProject(data);
        type = "LongoMatch (.lgm)";
    } else {
        events = parseSportscodeTimeline(data);
        type = "Sportscode (.SCTimeline/XML)";
    }

    return { events, type };
};

