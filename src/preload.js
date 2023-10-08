const { contextBridge, ipcRenderer, dialog } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const { CodeEquivalenceRelation } = require("./verdict");

const codeEquivalenceRelation = new CodeEquivalenceRelation();

console.log(dialog);

contextBridge.exposeInMainWorld("electronApi", {
    onOpenFile: (callback) => ipcRenderer.on("open-file", callback),
    readFile,
    askToConfirm,
    acceptMatch,
    rejectMatch,
    getVerdict
});

async function readFile(directoryPath, filePath) {
    const combinedPath = path.join(directoryPath, filePath);
    return await fs.readFile(combinedPath, "utf-8");
}

/**
 * @returns {boolean}
 */
async function askToConfirm(message) {
    const options = {
        message,
        buttons: ["Yes", "No"],
        title: "Confirm"
    };
    const output = await ipcRenderer.invoke("dialog:showMessageBox", options);
    return output.response === 0;
}

async function acceptMatch(location1, location2) {
    codeEquivalenceRelation.accept(location1, location2);
    // TODO: Persist the change
}

async function rejectMatch(location1, location2) {
    codeEquivalenceRelation.reject(location1, location2);
    // TODO: Persist the change
}

function getVerdict(location1, location2) {
    return codeEquivalenceRelation.getVerdict(location1, location2);
}
