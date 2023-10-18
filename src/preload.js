const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const { VerdictSet } = require("./verdict");

let currentVerdictSet = new VerdictSet();
let verdictsFilePath = null;

contextBridge.exposeInMainWorld("electronApi", {
    onOpenFile: (callback) => ipcRenderer.on("open-file", callback),
    readFile,
    loadVerdicts,
    markNoMatch,
    markMatchWithoutPlagiarism,
    markPlagiarism,
    getVerdict
});

async function readFile(directoryPath, filePath) {
    const combinedPath = path.join(directoryPath, filePath);
    return await fs.readFile(combinedPath, "utf-8");
}

async function loadVerdicts(filePath) {
    if (!filePath) {
        return;
    }

    let verdictsFileHandle;
    try {
        verdictsFileHandle = await fs.open(filePath, "a+");
        const data = await verdictsFileHandle.readFile("utf-8");
        currentVerdictSet = VerdictSet.deserialize(data);
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

async function markNoMatch(location1, location2) {
    currentVerdictSet.markNoMatch(location1, location2);
    await _saveVerdicts(currentVerdictSet, verdictsFilePath);
}

async function markMatchWithoutPlagiarism(location1, location2) {
    currentVerdictSet.markMatchWithoutPlagiarism(location1, location2);
    await _saveVerdicts(currentVerdictSet, verdictsFilePath);
}

async function markPlagiarism(location1, location2) {
    currentVerdictSet.markPlagiarism(location1, location2);
    await _saveVerdicts(currentVerdictSet, verdictsFilePath);
}

function getVerdict(location1, location2) {
    return currentVerdictSet.getVerdict(location1, location2);
}

async function _saveVerdicts(VerdictSet, filePath) {
    if (!VerdictSet || !filePath) {
        return;
    }

    try {
        const data = VerdictSet.serialize();
        await fs.writeFile(filePath, data, "utf-8");
    }
    catch (e) {
        await ipcRenderer.invoke("dialog:showErrorBox", {
            content: `Failed to save the verdict.\n\n${e}`
        });
    }
}
