const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const { CodeEquivalenceRelation } = require("./verdict");

let currentCodeEquivalenceRelation = new CodeEquivalenceRelation();
let verdictsFilePath = null;

contextBridge.exposeInMainWorld("electronApi", {
    onOpenFile: (callback) => ipcRenderer.on("open-file", callback),
    readFile,
    askToConfirm,
    loadVerdicts,
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

async function loadVerdicts(filePath) {
    if (!filePath) {
        return;
    }

    let verdictsFileHandle;
    try {
        verdictsFileHandle = await fs.open(filePath, "a+");
        const data = await verdictsFileHandle.readFile("utf-8");
        currentCodeEquivalenceRelation
            = CodeEquivalenceRelation.deserialize(data);
        verdictsFilePath = filePath;
    }
    catch (e) {
        ipcRenderer.invoke("dialog:showErrorBox", {
            content: "Failed to load the match verdicts. Changes you make will "
                + `not be saved.\n\n${e}`
        });
    }
    finally {
        if (verdictsFileHandle) {
            await verdictsFileHandle.close();
        }
    }
}

async function acceptMatch(location1, location2) {
    currentCodeEquivalenceRelation.accept(location1, location2);
    await _saveVerdicts(currentCodeEquivalenceRelation, verdictsFilePath);
}

async function rejectMatch(location1, location2) {
    currentCodeEquivalenceRelation.reject(location1, location2);
    await _saveVerdicts(currentCodeEquivalenceRelation, verdictsFilePath);
}

function getVerdict(location1, location2) {
    return currentCodeEquivalenceRelation.getVerdict(location1, location2);
}

async function _saveVerdicts(codeEquivalenceRelation, filePath) {
    if (!codeEquivalenceRelation || !filePath) {
        return;
    }

    try {
        const data = codeEquivalenceRelation.serialize();
        await fs.writeFile(filePath, data, "utf-8");
    }
    catch (e) {
        await ipcRenderer.invoke("dialog:showErrorBox", {
            content: `Failed to save the verdict.\n\n${e}`
        });
    }
}
