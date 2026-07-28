import { app, BrowserWindow, ipcMain, net, protocol } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const APP_PROTOCOL = "midk";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..");
const DIST_ROOT = path.join(APP_ROOT, "dist");
const STORAGE_ROOT = path.join(app.getPath("userData"), "game-data");

const STORAGE_SCOPES = {
  "current-state": path.join(STORAGE_ROOT, "current-state"),
  "save-slots": path.join(STORAGE_ROOT, "save-slots"),
  "command-log": path.join(STORAGE_ROOT, "command-log"),
  "state-snapshots": path.join(STORAGE_ROOT, "state-snapshots")
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

function encodeKey(key) {
  return encodeURIComponent(key);
}

function decodeKey(encodedKey) {
  return decodeURIComponent(encodedKey);
}

function filePathFor(scope, key) {
  const baseDir = STORAGE_SCOPES[scope];

  if (!baseDir) {
    throw new Error(`Escopo de storage inválido: ${scope}`);
  }

  return path.join(baseDir, `${encodeKey(key)}.json`);
}

async function ensureScopeDir(scope) {
  const baseDir = STORAGE_SCOPES[scope];

  if (!baseDir) {
    throw new Error(`Escopo de storage inválido: ${scope}`);
  }

  await fs.mkdir(baseDir, { recursive: true });
  return baseDir;
}

async function writeJsonAtomic(filePath, value) {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });

  const tempPath = `${filePath}.tmp`;
  const payload = JSON.stringify(value);
  await fs.writeFile(tempPath, payload, "utf8");
  await fs.copyFile(tempPath, filePath);
  await fs.rm(tempPath, { force: true });
}

async function readJsonFile(filePath) {
  try {
    const payload = await fs.readFile(filePath, "utf8");
    return JSON.parse(payload);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function listScope(scope) {
  const directory = await ensureScopeDir(scope);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name));

  const items = [];

  for (const file of files) {
    const fullPath = path.join(directory, file.name);
    const value = await readJsonFile(fullPath);

    if (value === null) {
      continue;
    }

    items.push({
      key: decodeKey(file.name.slice(0, -5)),
      value
    });
  }

  return items;
}

async function clearScope(scope) {
  const directory = await ensureScopeDir(scope);
  const entries = await fs.readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => fs.rm(path.join(directory, entry.name), { force: true }))
  );
}

async function ensureDistReady() {
  try {
    await fs.access(path.join(DIST_ROOT, "index.html"));
  } catch {
    throw new Error("Build web não encontrado. Execute `npm run build` antes de abrir o app desktop.");
  }
}

async function registerAppProtocol() {
  protocol.handle(APP_PROTOCOL, async (request) => {
    const url = new URL(request.url);
    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const resolvedPath = path.resolve(DIST_ROOT, `.${requestedPath}`);
    const relative = path.relative(DIST_ROOT, resolvedPath);

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return new Response("Not found", { status: 404 });
    }

    try {
      await fs.access(resolvedPath);
    } catch {
      return new Response("Not found", { status: 404 });
    }

    return net.fetch(pathToFileURL(resolvedPath).toString());
  });
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1540,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#d8ccb2",
    autoHideMenuBar: true,
    title: "Epochs Idle PC",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.mjs")
    }
  });

  window.loadURL(`${APP_PROTOCOL}://app/index.html`);
  return window;
}

function registerStorageHandlers() {
  ipcMain.handle("storage:read", async (_event, payload) => {
    const filePath = filePathFor(payload.scope, payload.key);
    return readJsonFile(filePath);
  });

  ipcMain.handle("storage:write", async (_event, payload) => {
    const filePath = filePathFor(payload.scope, payload.key);
    await writeJsonAtomic(filePath, payload.value);
  });

  ipcMain.handle("storage:delete", async (_event, payload) => {
    const filePath = filePathFor(payload.scope, payload.key);
    await fs.rm(filePath, { force: true });
  });

  ipcMain.handle("storage:list", async (_event, payload) => {
    return listScope(payload.scope);
  });

  ipcMain.handle("storage:clear", async (_event, payload) => {
    await clearScope(payload.scope);
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.whenReady().then(async () => {
  process.env.MIDK_STORAGE_ROOT = STORAGE_ROOT;
  process.env.MIDK_IS_PACKAGED = app.isPackaged ? "1" : "0";

  await ensureScopeDir("current-state");
  await ensureScopeDir("save-slots");
  await ensureScopeDir("command-log");
  await ensureScopeDir("state-snapshots");
  await ensureDistReady();
  registerStorageHandlers();
  await registerAppProtocol();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}).catch((error) => {
  console.error("Falha ao iniciar shell desktop", error);
  app.quit();
});
