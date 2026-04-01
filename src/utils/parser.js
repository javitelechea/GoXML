import { parseNacmacFile } from './nacmacParser';

export const parseLongoMatchProject = (rawText) => {
    try {
        const data = JSON.parse(rawText);
        if (!data.Timeline) throw new Error("No se encontró la sección 'Timeline' en el archivo .lgm");
        return extractLongoMatchTimelineEvents(data);
    } catch (err) {
        throw new Error("Error parseando .lgm: " + err.message);
    }
};

export const extractLongoMatchTimelineEvents = (data) => {
    return data.Timeline.map(event => ({
        id: event.ID || Math.random().toString(36).substr(2, 9),
        start: event.Start !== undefined ? parseFloat(event.Start) : (event.EventTime !== undefined ? parseFloat(event.EventTime) : 0),
        end: event.Stop !== undefined ? parseFloat(event.Stop) : (event.Start !== undefined ? parseFloat(event.Start) : (event.EventTime !== undefined ? parseFloat(event.EventTime) : 0)),
        code: event.Name || ""
    }));
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

