import MDBReader from 'mdb-reader';
import { Buffer } from 'buffer';

/**
 * Parser for .nac (older Nacsport) files.
 * These files are Microsoft Access (Jet) databases, with the same
 * Videos / Mediciones tables as the SQLite-based .nacmac.
 */
export const parseNacFile = async (arrayBuffer) => {
    try {
        const reader = new MDBReader(Buffer.from(arrayBuffer));

        let fps = 25; // Standard fallback
        try {
            const videos = reader.getTable('Videos').getData();
            fps = parseFloat(videos[0]?.fps) || 25;
        } catch (e) {
            console.warn("Error al leer la tabla 'Videos'. Usando fallback de 25. Detalle: " + e.message);
        }

        if (!reader.getTableNames().includes('Mediciones')) {
            throw new Error("No se encontró la tabla 'Mediciones' en el archivo NAC.");
        }

        const isSet = (v) => v !== null && v !== undefined && v !== "";

        return reader.getTable('Mediciones').getData().map((row, i) => {
            const start = isSet(row.TI)
                ? parseFloat(row.TI) / fps
                : isSet(row.Tclick) ? parseFloat(row.Tclick) / fps : 0;
            const end = isSet(row.TF) ? parseFloat(row.TF) / fps : start;
            return {
                id: (i + 1).toString(),
                start,
                end,
                code: String(row.Categoria || "Sin Categoría")
            };
        });
    } catch (err) {
        throw new Error("Error procesando archivo .nac: " + err.message);
    }
};
