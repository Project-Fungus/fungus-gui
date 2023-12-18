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
