const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const path = require("path");

ipcMain.handle("dialog:showErrorBox", (_, options) => {
    dialog.showErrorBox(options.title || "Error", options.content);
});
app.whenReady().then(() => {
    createApplicationMenu();
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
    ipcMain.handle("dialog:showOpenDialog", async (event, options) => {
        const browserWindow = BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showOpenDialog(browserWindow, options);
        const noInput =
            result.canceled
            || !result.filePaths
            || result.filePaths.length <= 0;
        return noInput ? null : result.filePaths[0];
    });
    ipcMain.handle("dialog:showSaveDialog", async (event, options) => {
        const browserWindow = BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showSaveDialog(browserWindow, options);
        const noInput = result.canceled || !result.filePath;
        return noInput ? null : result.filePath;
    });
    ipcMain.handle("app:getPath", (_, name) => app.getPath(name));
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

function createWindow() {
    const window = new BrowserWindow({
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            // Allow the preload script to read local files
            sandbox: false,
        },
        show: false,
    });
    window.maximize();
    window.loadFile(path.join(__dirname, "renderer/index.html"));
    window.show();
}

function createApplicationMenu() {
    const isMac = process.platform === "darwin";

    const menu = Menu.buildFromTemplate([
        // { role: 'appMenu' }
        ...(isMac
            ? [
                {
                    label: app.name,
                    submenu: [
                        { role: "about" },
                        { type: "separator" },
                        { role: "services" },
                        { type: "separator" },
                        { role: "hide" },
                        { role: "hideOthers" },
                        { role: "unhide" },
                        { type: "separator" },
                        { role: "quit" },
                    ],
                },
            ]
            : []),
        // { role: 'fileMenu' }
        {
            label: "&File",
            submenu: [
                {
                    label: isMac ? "Open..." : "Open",
                    accelerator: "CmdOrCtrl+O",
                    click: (_, browserWindow) => {
                        browserWindow.webContents.send("show-open-files-view");
                    },
                },
                isMac ? { role: "close" } : { role: "quit" },
            ],
        },
        // { role: 'editMenu' }
        {
            label: "&Edit",
            submenu: [
                { role: "undo" },
                { role: "redo" },
                { type: "separator" },
                { role: "cut" },
                { role: "copy" },
                { role: "paste" },
                ...(isMac
                    ? [
                        { role: "pasteAndMatchStyle" },
                        { role: "delete" },
                        { role: "selectAll" },
                        { type: "separator" },
                        {
                            label: "Speech",
                            submenu: [
                                { role: "startSpeaking" },
                                { role: "stopSpeaking" }
                            ],
                        },
                    ]
                    : [
                        { role: "delete" },
                        { type: "separator" },
                        { role: "selectAll" }
                    ]),
            ],
        },
        // { role: 'viewMenu' }
        {
            label: "View",
            submenu: [
                {
                    label: "Matches",
                    accelerator: "CmdOrCtrl+M",
                    click: (_, browserWindow) => {
                        browserWindow.webContents.send(
                            "show-project-pairs-view"
                        );
                    },
                },
                {
                    label: "Warnings",
                    accelerator: "CmdOrCtrl+W",
                    click: (_, browserWindow) => {
                        browserWindow.webContents.send("show-warnings-view");
                    },
                },
                { type: "separator" },
                { role: "reload" },
                { role: "forceReload" },
                { role: "toggleDevTools" },
                { type: "separator" },
                { role: "resetZoom" },
                { role: "zoomIn" },
                { role: "zoomOut" },
                { type: "separator" },
                { role: "togglefullscreen" },
            ],
        },
        // { role: 'windowMenu' }
        {
            label: "Window",
            submenu: [
                { role: "minimize" },
                { role: "zoom" },
                ...(isMac
                    ? [
                        { type: "separator" },
                        { role: "front" },
                        { type: "separator" },
                        { role: "window" },
                    ]
                    : [{ role: "close" }]),
            ],
        },
        {
            role: "help",
            submenu: [
                {
                    label: "Get Help?",
                    click: (_, browserWindow) => {
                        browserWindow.webContents.send("show-help-view");
                    },
                },
            ],
        },
    ]);
    Menu.setApplicationMenu(menu);
}
