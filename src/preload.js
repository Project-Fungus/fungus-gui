const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs/promises");
const path = require("path");

contextBridge.exposeInMainWorld("electronApi", {
    onOpenFile: (callback) => ipcRenderer.on("open-file", callback),
    readFile: readFile
});

async function readFile(directoryPath, filePath) {
    const combinedPath = path.join(directoryPath, filePath);
    return await fs.readFile(combinedPath, "utf-8");
}
