export const Diagnostic = {
  trace: (code: string, message: string, data?: any) => {
    console.log(`%c[${code}]%c ${message}`, "color: #bada55; background: #222; padding: 2px 4px; border-radius: 3px; font-weight: bold;", "color: inherit;", data !== undefined ? data : "");
  },
  system: (code: string, message: string, data?: any) => {
    console.log(`%c[${code}]%c ${message}`, "color: #00e5ff; background: #002233; padding: 2px 4px; border-radius: 3px; font-weight: bold;", "color: inherit;", data !== undefined ? data : "");
  },
  warn: (code: string, message: string, data?: any) => {
    console.warn(`[${code}] ${message}`, data !== undefined ? data : "");
  },
  error: (code: string, message: string, data?: any) => {
    console.error(`[${code}] ${message}`, data !== undefined ? data : "");
  }
};