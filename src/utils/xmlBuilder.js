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
    const instancesXml = events.map(inst => `
    <instance>
      <ID>${inst.id}</ID>
      <start>${inst.start.toFixed(2)}</start>
      <end>${inst.end.toFixed(2)}</end>
      <code>${escapeXml(inst.code)}</code>
    </instance>`).join('');

    return `${HEADER}\n<file>\n  <ALL_INSTANCES>${instancesXml}\n  </ALL_INSTANCES>\n</file>`;
};
