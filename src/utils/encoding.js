/**
 * Decode file bytes as UTF-8, or UTF-16 when BOM / byte pattern indicates it.
 * Sportscode and some Windows tools export XML as UTF-16 LE without BOM.
 */
export const decodeFileText = (arrayBuffer) => {
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.length === 0) return '';

    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
        return new TextDecoder('utf-16le').decode(bytes);
    }
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
        return new TextDecoder('utf-16be').decode(bytes);
    }

    const looksUtf16Le =
        bytes.length >= 4 &&
        bytes[0] < 0x80 &&
        bytes[1] === 0 &&
        bytes[2] < 0x80 &&
        bytes[3] === 0;

    if (looksUtf16Le) {
        return new TextDecoder('utf-16le').decode(bytes);
    }

    let text = new TextDecoder('utf-8').decode(bytes);
    if (text.charCodeAt(0) === 0xfeff) {
        text = text.slice(1);
    }
    return text;
};
