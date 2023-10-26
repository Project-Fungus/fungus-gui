// TODO: The example code seems buggy in a few ways (wrong ranges highlighted,
//       first match duplicated)

import { showWarningsView, hideWarningsView } from "./warnings-view.js";
import {
    showProjectPairsView,
    hideProjectPairsView
} from "./project-pairs-view.js";
import { showOpenFilesView, hideOpenFilesView } from "./open-files-view.js";

window.addEventListener("DOMContentLoaded", async () => {
    window.electronApi.onShowOpenFilesView(() => showView("open-files"));
    window.electronApi.onShowProjectPairsView(() => showView("project-pairs"));
    window.electronApi.onShowWarningsView(() => showView("warnings"));
    await showView("open-files");
});

// Call this function when switching views (e.g., from project pairs view to
// warnings view).
async function showView(view) {
    if (view === "open-files") {
        hideProjectPairsView();
        hideWarningsView();
        await showOpenFilesView();
    }
    else if (view === "project-pairs") {
        hideOpenFilesView();
        hideWarningsView();
        await showProjectPairsView();
    }
    else {
        hideOpenFilesView();
        hideProjectPairsView();
        showWarningsView();
    }
}

export { showView };
