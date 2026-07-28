import { contextBridge, ipcRenderer } from "electron";

const bridge = {
  runtime: {
    isDesktop: true,
    appVersion: process.versions.electron,
    isPackaged: Boolean(process.env.MIDK_IS_PACKAGED === "1"),
    storageRoot: process.env.MIDK_STORAGE_ROOT ?? ""
  },
  storage: {
    read: (scope, key) => ipcRenderer.invoke("storage:read", { scope, key }),
    write: (scope, key, value) => ipcRenderer.invoke("storage:write", { scope, key, value }),
    delete: (scope, key) => ipcRenderer.invoke("storage:delete", { scope, key }),
    list: (scope) => ipcRenderer.invoke("storage:list", { scope }),
    clear: (scope) => ipcRenderer.invoke("storage:clear", { scope })
  }
};

contextBridge.exposeInMainWorld("midkDesktop", bridge);
