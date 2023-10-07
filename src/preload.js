const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const { CodeEquivalenceRelation } = require("./verdict");

const codeEquivalenceRelation = new CodeEquivalenceRelation();

contextBridge.exposeInMainWorld("electronApi", {
    onOpenFile: (callback) => ipcRenderer.on("open-file", callback),
    readFile: readFile,
    acceptMatch: acceptMatch,
    rejectMatch: rejectMatch,
    getVerdict: getVerdict
});

async function readFile(directoryPath, filePath) {
    const combinedPath = path.join(directoryPath, filePath);
    return await fs.readFile(combinedPath, "utf-8");
}

async function acceptMatch(location1, location2) {
    codeEquivalenceRelation.accept(location1, location2);
}

async function rejectMatch(location1, location2) {
    codeEquivalenceRelation.reject(location1, location2);
}

function getVerdict(location1, location2) {
    return codeEquivalenceRelation.getVerdict(location1, location2);
}
