import { Buffer } from 'buffer';

// mdb-reader (via readable-stream) espera `process` y `Buffer` globales de Node
globalThis.Buffer ??= Buffer;

if (typeof globalThis.process === 'undefined') {
  globalThis.process = {
    browser: true,
    env: {},
    version: '',
    versions: {},
    nextTick: (fn, ...args) => queueMicrotask(() => fn(...args)),
  };
}
