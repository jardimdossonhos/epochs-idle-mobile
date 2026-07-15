"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Diagnostic = void 0;
exports.Diagnostic = {
    trace: (code, message, data) => {
        console.log(`%c[${code}]%c ${message}`, "color: #bada55; background: #222; padding: 2px 4px; border-radius: 3px; font-weight: bold;", "color: inherit;", data !== undefined ? data : "");
    },
    system: (code, message, data) => {
        console.log(`%c[${code}]%c ${message}`, "color: #00e5ff; background: #002233; padding: 2px 4px; border-radius: 3px; font-weight: bold;", "color: inherit;", data !== undefined ? data : "");
    },
    warn: (code, message, data) => {
        console.warn(`[${code}] ${message}`, data !== undefined ? data : "");
    },
    error: (code, message, data) => {
        console.error(`[${code}] ${message}`, data !== undefined ? data : "");
    }
};
