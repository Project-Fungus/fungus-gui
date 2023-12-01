# electron-gui

Desktop GUI written using the Electron framework.

This relies on the [FUNGUS command-line tool](https://github.com/Project-Fungus/fungus-cli).

## Development Tasks

To start the app, run
```
npm run start
```

To check lints, run
```
npm run lint
```

To run the automated unit tests, run
```
npm run test
```

For manual testing, run the app normally and then open one of the JSON files in `/test/` along with the `/test/projects/` directory. Play around and check that everything looks normal. Note that `unreadable-file.json` is meant to simulate what happens when the user tries to open a file that can't be read, so you should make sure you do *not* have permission to read it.
