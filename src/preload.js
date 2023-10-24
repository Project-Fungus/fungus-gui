const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const { VerdictSet } = require("./verdict");

let currentVerdictSet = new VerdictSet();
let verdictsFilePath = null;

contextBridge.exposeInMainWorld("electronApi", {
    onShowOpenFilesView: (callback) => {
        ipcRenderer.on("show-open-files-view", callback);
    },
    onShowProjectPairsView: (callback) => {
        ipcRenderer.on("show-project-pairs-view", callback);
    },
    onShowWarningsView: (callback) => {
        ipcRenderer.on("show-warnings-view", callback);
    },
    showOpenDialog,
    showSaveDialog,
    readFile,
    readUserData,
    writeUserData,
    loadVerdicts,
    setVerdict,
    getVerdict
});

async function showOpenDialog(options) {
    return await ipcRenderer.invoke("dialog:showOpenDialog", options);
}

async function showSaveDialog(options) {
    return await ipcRenderer.invoke("dialog:showSaveDialog", options);
}

async function readFile(directoryPath, filePath) {
    const combinedPath = path.join(directoryPath, filePath);
    return await fs.readFile(combinedPath, "utf-8");
}

async function readUserData(filename) {
    const userDataFolder = await ipcRenderer.invoke("app:getPath", "userData");
    const filePath = path.join(userDataFolder, filename);
    return await fs.readFile(filePath, "utf-8");
}

async function writeUserData(filename, data) {
    const userDataFolder = await ipcRenderer.invoke("app:getPath", "userData");
    const filePath = path.join(userDataFolder, filename);
    await fs.writeFile(filePath, data, "utf-8");
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

async function setVerdict(location1, location2, verdict) {
    currentVerdictSet.setVerdict(location1, location2, verdict);
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
