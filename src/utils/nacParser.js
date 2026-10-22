import MDBReader from 'mdb-reader';
import { Buffer } from 'buffer';

const COMMON_FPS = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];

/**
 * Los .nac no guardan el fps del video (viene en 0). Los clips de Nacsport duran
 * 10 s por defecto (5 s antes + 5 s despues del click), asi que la duracion mas
 * repetida (en cuadros) / 10 da el fps. Se ajusta al fps comun mas cercano.
 */
const inferFps = (rows) => {
    const counts = new Map();
    for (const r of rows) {
        const d = Math.round(parseFloat(r.TF) - parseFloat(r.TI));
        if (d > 0) counts.set(d, (counts.get(d) || 0) + 1);
    }
    if (!counts.size) return 25;
    const [frames] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const est = frames / 10;
    const nearest = COMMON_FPS.reduce((a, b) => Math.abs(b - est) < Math.abs(a - est) ? b : a);
    return Math.abs(nearest - est) / nearest <= 0.03 ? nearest : 25;
};

/**
 * Parser for .nac (older Nacsport) files.
 * These files are Microsoft Access (Jet) databases, with the same
 * Videos / Mediciones tables as the SQLite-based .nacmac.
 */
export const parseNacFile = async (arrayBuffer) => {
    try {
        const reader = new MDBReader(Buffer.from(arrayBuffer));

        if (!reader.getTableNames().includes('Mediciones')) {
            throw new Error("No se encontró la tabla 'Mediciones' en el archivo NAC.");
        }
        const rows = reader.getTable('Mediciones').getData();

        let fps = 0;
        try {
            fps = parseFloat(reader.getTable('Videos').getData()[0]?.fps) || 0;
        } catch (e) {
            console.warn("Error al leer la tabla 'Videos'. Detalle: " + e.message);
        }
        if (!fps) fps = inferFps(rows);

        const isSet = (v) => v !== null && v !== undefined && v !== "";

        return rows.map((row, i) => {
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
