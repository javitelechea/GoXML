import initSqlJs from 'sql.js';

/**
 * Parser for .nacmac (Nacsport Lite/Basic/TAG/Elite) files.
 * These files are SQLite databases.
 * Uses sql.js with a CDN for the WASM binary.
 */
export const parseNacmacFile = async (arrayBuffer) => {
    try {
        const SQL = await initSqlJs({
            // Loading WASM from CDN to avoid complex manual file setup in the project
            locateFile: file => `https://sql.js.org/dist/${file}`
        });

        const db = new SQL.Database(new Uint8Array(arrayBuffer));

        // 1. Get FPS from Videos table
        let fps = 25; // Standard fallback
        try {
            const videoRes = db.exec("SELECT FPS FROM Videos LIMIT 1");
            if (videoRes.length > 0 && videoRes[0].values && videoRes[0].values[0]) {
                fps = parseFloat(videoRes[0].values[0][0]) || 25;
            } else {
                console.warn("No se encontró el FPS en la tabla 'Videos'. Usando fallback de 25.");
            }
        } catch (e) {
            console.warn("Error al leer la tabla 'Videos'. Usando fallback de 25. Detalle: " + e.message);
        }

        // 2. Check if Mediciones table exists
        const tableCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='Mediciones'");
        if (tableCheck.length === 0) {
            throw new Error("No se encontró la tabla 'Mediciones' en el archivo NACMAC.");
        }

        // 3. Extract events
        // Required columns: Categoria (code), TI (start), TF (end), Tclick (fallback)
        const res = db.exec("SELECT Categoria, TI, TF, Tclick FROM Mediciones");
        
        if (res.length === 0 || !res[0].values) {
            return [];
        }

        const columns = res[0].columns;
        const values = res[0].values;

        // Map column indices for safety
        const idxCat = columns.indexOf('Categoria');
        const idxTI = columns.indexOf('TI');
        const idxTF = columns.indexOf('TF');
        const idxTClick = columns.indexOf('Tclick');

        const events = values.map((row, i) => {
            let start = null;
            let end = null;
            const code = row[idxCat] || "Sin Categoría";

            // Rules with FPS conversion (frames to seconds):
            // 1. start = TI / fps
            // 2. if TI missing, use Tclick / fps
            // 3. end = TF / fps
            // 4. if TF missing, use start

            const rawTI = row[idxTI];
            const rawTF = row[idxTF];
            const rawTClick = row[idxTClick];

            // Resolve Start
            if (rawTI !== null && rawTI !== undefined && rawTI !== "") {
                start = parseFloat(rawTI) / fps;
            } else if (rawTClick !== null && rawTClick !== undefined && rawTClick !== "") {
                start = parseFloat(rawTClick) / fps;
            } else {
                start = 0; // Default fallback safety
            }

            // Resolve End
            if (rawTF !== null && rawTF !== undefined && rawTF !== "") {
                end = parseFloat(rawTF) / fps;
            } else {
                end = start; // Fallback to start
            }

            return {
                id: (i + 1).toString(), // Temporary id, will be re-indexed in normalization
                start: start,
                end: end,
                code: String(code)
            };
        });

        // Close db to free memory
        db.close();

        return events;
    } catch (err) {
        throw new Error("Error procesando archivo .nacmac: " + err.message);
    }
};
