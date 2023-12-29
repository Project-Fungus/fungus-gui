# fungus-gui

Desktop GUI for the FUNGUS plagiarism detection tool.

## Installation

First, you must [install the FUNGUS command-line tool](https://github.com/Project-Fungus/fungus-cli?tab=readme-ov-file#installation).

Then, to install the GUI, find the artifact for your platform on the [Releases page](https://github.com/Project-Fungus/fungus-gui/releases).

## Development Tasks

- Start the app with `npm run start`.
- Run the linter with `npm run lint`.
- Run the unit tests with `npm run test`.
- For manual testing, run the app normally and then open one of the JSON files in `/test/` along with the `/test/projects/` directory. Play around and check that everything looks normal. Note that `unreadable-file.json` is meant to simulate what happens when the user tries to open a file that can't be read, so you should make sure you do *not* have permission to read it.

## Creating a New Release

1. From the [Actions tab](https://github.com/Project-Fungus/fungus-gui/actions), manually run the CI workflow with the "Build for release?" option enabled. This will generate build artifacts for various platforms.
2. Once the workflow is done, download all the artifacts.
3. In the [Releases section](https://github.com/Project-Fungus/fungus-gui/releases), create a new release and upload the artifacts.
