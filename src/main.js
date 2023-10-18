const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const path = require("path");

ipcMain.handle("dialog:showErrorBox", (_, options) => {
    dialog.showErrorBox(options.title || "Error", options.content);
});
app.whenReady().then(() => {
    createApplicationMenu();
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
    ipcMain.handle("dialog:showOpenDialog", async (event, options) => {
        const browserWindow = BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showOpenDialog(browserWindow, options);
        const noInput = result.canceled
            || !result.filePaths
            || result.filePaths.length <= 0;
        return noInput ? null : result.filePaths[0];
    });
    ipcMain.handle("dialog:showSaveDialog", async (event, options) => {
        const browserWindow = BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showSaveDialog(browserWindow, options);
        const noInput = result.canceled || !result.filePath;
        return noInput ? null : result.filePaths;
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
    window.loadFile(path.join(__dirname, "index.html"));
    window.show();
}

function createApplicationMenu() {
    const menu = Menu.buildFromTemplate([
        {
            label: "&File",
            submenu: [
                {
                    label: "Open",
                    accelerator: "CmdOrCtrl+O",
                    click: (_, browserWindow) => {
                        browserWindow.webContents.send("show-open-files-view");
                    }
                },
                { role: "quit" }
            ]
        },
        {
            label: "&View",
            submenu: [
                {
                    label: "Matches",
                    accelerator: "CmdOrCtrl+M",
                    click: (_, browserWindow) => {
                        browserWindow.webContents
                            .send("show-project-pairs-view");
                    }
                },
                {
                    label: "Warnings",
                    accelerator: "CmdOrCtrl+W",
                    click: (_, browserWindow) => {
                        browserWindow.webContents.send("show-warnings-view");
                    }
                },
                { type: "separator" },
                { role: "zoomIn", accelerator: "CmdOrCtrl+=" },
                { role: "zoomOut" },
                { role: "resetZoom" },
                { role: "togglefullscreen" },
                { role: "toggleDevTools" },
            ]
        }
    ]);
    Menu.setApplicationMenu(menu);
}
