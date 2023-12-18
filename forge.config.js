const fs = require("fs");
const path = require("path");
const glob = require("glob");

module.exports = {
    hooks: {
        // github.com/electron/packager/issues/1444#issuecomment-1690130930
        packageAfterPrune(_, buildPath) {
            if (process.platform !== "darwin") return;
            const dirs = glob.sync(
                path.join(buildPath, "node_modules/**/node_gyp_bins"),
                { onlyDirectories: true }
            );
            for (const directory of dirs) {
                fs.rmdirSync(directory, { recursive: true, force: true });
            }
        },
    },
    packagerConfig: {
        asar: true,
    },
    rebuildConfig: {},
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            config: {},
        },
        {
            name: "@electron-forge/maker-zip",
            platforms: ["darwin", "linux", "win32"],
        },
        {
            name: "@electron-forge/maker-deb",
            config: {},
        },
        {
            name: "@electron-forge/maker-rpm",
            config: {},
        },
        {
            name: "@electron-forge/maker-dmg",
            platforms: ["darwin"]
        }
    ],
    plugins: [
        {
            name: "@electron-forge/plugin-auto-unpack-natives",
            config: {},
        },
    ],
};
