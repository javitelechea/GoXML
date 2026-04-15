export const escapeXml = (unsafe) => {
    return unsafe.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

export const buildXml = (events) => {
    const HEADER = '<?xml version="1.0" encoding="utf-8"?>';

    // ALL_INSTANCES first
    const instancesXml = events.map(inst => `
    <instance>
      <ID>${inst.id}</ID>
      <start>${inst.start.toFixed(2)}</start>
      <end>${inst.end.toFixed(2)}</end>
      <code>${escapeXml(inst.code)}</code>
    </instance>`).join('');

    // ROWS after — one row per unique category, with only code + RGB (default color)
    const uniqueCodes = [...new Set(events.map(inst => inst.code))];
    const rowsXml = uniqueCodes.map(code => `
    <row>
      <code>${escapeXml(code)}</code>
      <R>20000</R>
      <G>20000</G>
      <B>65535</B>
    </row>`).join('');

    return `${HEADER}\n<file>\n  <ALL_INSTANCES>${instancesXml}\n  </ALL_INSTANCES>\n  <ROWS>${rowsXml}\n  </ROWS>\n</file>`;
};
