const { app, BrowserWindow, Menu, dialog } = require("electron");
const path = require("path");
const fs = require("fs/promises");

app.whenReady().then(() => {
    createApplicationMenu();
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        app.quit();
});

function createWindow() {
    const window = new BrowserWindow({
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            // Allow the preload script to read local files
            sandbox: false
        },
        show: false
    });
    window.maximize();
    window.loadFile(path.join(__dirname, "project-pairs.html"));
    window.show();
}

function createApplicationMenu() {
    const menu = Menu.buildFromTemplate([
        {
            label: "&File",
            submenu: [
                {
                    label: "Open",
                    click: (_, browserWindow) => openFile(browserWindow),
                    accelerator: "CmdOrCtrl+O"
                },
                {
                    label: "Exit",
                    role: "quit"
                }
            ]
        },
        {
            label: "&View",
            submenu: [
                {
                    role: "zoomIn",
                    accelerator: "CmdOrCtrl+="
                },
                {
                    role: "zoomOut"
                },
                {
                    role: "resetZoom"
                },
                {
                    role: "togglefullscreen"
                },
                {
                    role: "toggleDevTools"
                },
            ]
        }
    ]);
    // TODO: Let user run the command-line tool through a GUI?
    Menu.setApplicationMenu(menu);
}

async function openFile(browserWindow) {
    // TODO: Catch exceptions just in case?

    const fileDialogResult = await dialog.showOpenDialog(browserWindow, {
        filters: [
            { name: "FUNGUS File", extensions: ["json"] }
        ],
        properties: ["openFile"]
    });
    const didInputFile = !fileDialogResult.canceled
        && fileDialogResult.filePaths
        && fileDialogResult.filePaths.length >= 0;
    if (!didInputFile) {
        return;
    }
    const filePath = fileDialogResult.filePaths[0];

    const fileText = await fs.readFile(filePath, "utf-8");
    const fileContents = JSON.parse(fileText);

    // TODO: Validate the file?

    const directoryDialogResult = await dialog.showOpenDialog(browserWindow, {
        properties: ["openDirectory"]
    });
    const didInputDirectory = !directoryDialogResult.canceled
        && directoryDialogResult.filePaths
        && directoryDialogResult.filePaths.length >= 0;
    if (!didInputDirectory) {
        return;
    }
    const directoryPath = directoryDialogResult.filePaths[0];

    browserWindow.webContents.send("open-file", {
        filePath: filePath,
        fileContents: fileContents,
        directoryPath: directoryPath,
    });

    // TODO: At what point should the renderer read the students' code?
    // Probably best to load them lazily for the sake of keeping the app
    // scalable (avoid reading megabytes at once) and having fast initial load
    // time.
}
