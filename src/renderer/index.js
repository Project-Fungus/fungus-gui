import { showWarningsView, hideWarningsView } from "./warnings-view.js";
import {
    showProjectPairsView,
    hideProjectPairsView
} from "./project-pairs-view.js";
import { showOpenFilesView, hideOpenFilesView } from "./open-files-view.js";
import { showHelpView, hideHelpView } from "./help-view.js";

window.addEventListener("DOMContentLoaded", async () => {
    window.electronApi.onShowOpenFilesView(() => showView("open-files"));
    window.electronApi.onShowProjectPairsView(() => showView("project-pairs"));
    window.electronApi.onShowWarningsView(() => showView("warnings"));
    window.electronApi.onShowHelpView(() => showView("help"));
    await showView("open-files");
});

// Call this function when switching views (e.g., from project pairs view to
// warnings view).
async function showView(view) {
    (view === "open-files" ? showOpenFilesView : hideOpenFilesView)();
    (view === "project-pairs" ? showProjectPairsView : hideProjectPairsView)();
    (view === "warnings" ? showWarningsView : hideWarningsView)();
    (view === "help" ? showHelpView : hideHelpView)();
}

export { showView };
