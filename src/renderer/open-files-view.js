import { Warning, setWarnings } from "./warnings-view.js";
import {
    ProjectPair,
    Match,
    CodeLocation,
    setProjectPairs,
} from "./project-pairs-view.js";
import { showView } from "./index.js";

window.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("plagiarism-results-file-btn").addEventListener(
        "click", selectPlagiarismResultsFile);
    document.getElementById("projects-directory-btn").addEventListener(
        "click", selectProjectsDirectory);
    document.getElementById("verdicts-file-btn").addEventListener(
        "click", selectVerdictsFile);
    document.getElementById("open-files-btn").addEventListener(
        "click", openFiles);
});

async function showOpenFilesView() {
    document.getElementById("open-files-view").classList.remove("hide");

    const previousPaths = await _readPreviousPaths();
    if (previousPaths.plagiarismResultsFile) {
        document.getElementById("plagiarism-results-file-path").innerText =
            previousPaths.plagiarismResultsFile;
    }
    if (previousPaths.projectsDirectory) {
        document.getElementById("projects-directory-path").innerText =
            previousPaths.projectsDirectory;
    }
    if (previousPaths.verdictsFile) {
        document.getElementById("verdicts-file-path").innerText =
            previousPaths.verdictsFile;
    }
}

function hideOpenFilesView() {
    document.getElementById("open-files-view").classList.add("hide");
}

async function openFiles() {
    const plagiarismResultsFile =
        document.getElementById("plagiarism-results-file-path").innerText;
    const projectsDirectory =
        document.getElementById("projects-directory-path").innerText;
    const verdictsFile =
        document.getElementById("verdicts-file-path").innerText;

    let anyFileMissing = false;
    if (!plagiarismResultsFile) {
        document.getElementById("plagiarism-results-file-label").classList
            .add("error-msg");
        anyFileMissing = true;
    }
    else {
        document.getElementById("plagiarism-results-file-label").classList
            .remove("error-msg");
    }
    if (!projectsDirectory) {
        document.getElementById("projects-directory-label").classList
            .add("error-msg");
        anyFileMissing = true;
    }
    else {
        document.getElementById("projects-directory-label").classList
            .remove("error-msg");
    }
    if (!verdictsFile) {
        document.getElementById("verdicts-file-label").classList
            .add("error-msg");
        anyFileMissing = true;
    }
    else {
        document.getElementById("verdicts-file-label").classList
            .remove("error-msg");
    }
    if (anyFileMissing) {
        document.getElementById("open-files-error-msg").innerText =
            "Some files were not selected. All the files are required.";
        document.getElementById("open-files-error-msg").classList
            .remove("hide");
        return;
    }

    const fileContents = await window.electronApi
        .readFile("", plagiarismResultsFile);
    let plagiarismResults;
    try {
        plagiarismResults = JSON.parse(fileContents);
    }
    catch (e) {
        document.getElementById("open-files-error-msg").innerText =
            "Failed to parse the plagiarism results file. Please make sure you "
            + "selected a file generated by the plagiarism detection tool.";
        return;
    }
    if (!Array.isArray(plagiarismResults.project_pairs)) {
        document.getElementById("open-files-error-msg").innerText =
            "This file does not contain a project pair list. Please select a"
            + " JSON file generated by the plagiarism detection tool.";
        return;
    }

    const { projectPairs: convertedProjectPairs, warnings: conversionWarnings }
        = _convertProjectPairs(
            plagiarismResults.project_pairs || [], plagiarismResultsFile);
    setProjectPairs(projectsDirectory, convertedProjectPairs);
    setWarnings((plagiarismResults.warnings || [])
        .map((w) => new Warning(w.warn_type, w.file, w.message))
        .concat(conversionWarnings));

    await window.electronApi.loadVerdicts(verdictsFile);
    document.getElementById("document-title").innerText = plagiarismResultsFile;
    document.getElementById("open-files-error-msg").classList.add("hide");
    _savePaths(plagiarismResultsFile, projectsDirectory, verdictsFile);

    await showView("project-pairs");
}

async function selectPlagiarismResultsFile() {
    const path = await window.electronApi.showOpenDialog({
        title: "Select the plagiarism results file",
        filters: [
            { name: "FUNGUS File", extensions: ["json"] }
        ],
        properties: ["openFile"]
    });
    if (!path) return;

    document.getElementById("plagiarism-results-file-path").innerText = path;
}

async function selectProjectsDirectory() {
    const path = await window.electronApi.showOpenDialog({
        title: "Select the directory containing the projects being compared",
        properties: ["openDirectory"]
    });
    if (!path) return;

    document.getElementById("projects-directory-path").innerText = path;
}

async function selectVerdictsFile() {
    const isNewFile =
        document.getElementById("is-verdicts-file-new-checkbox").checked;

    let path;
    if (isNewFile) {
        path = await window.electronApi.showSaveDialog({
            title: "Select the file in which to save the match verdicts "
                + "(accept/reject).",
            filters: [
                { name: "Verdicts File", extensions: ["json"] },
            ]
        });
    }
    else {
        path = await window.electronApi.showOpenDialog({
            title: "Select the file in which to save the match verdicts "
                + "(accept/reject).",
            filters: [
                { name: "Verdicts File", extensions: ["json"] },
            ],
            properties: ["openFile"]
        });
    }
    if (!path) return;

    document.getElementById("verdicts-file-path").innerText = path;
}

/**
 * Tries to read the previous file paths that the user opened.
 *
 * @returns {{
 *      plagiarismResultsFile: string | null,
 *      projectsDirectory: string | null,
 *      verdictsFile: string | null
 * }}
 */
async function _readPreviousPaths() {
    try {
        const stringifiedData = await window.electronApi.readUserData(
            "previous_paths.json");
        const data = JSON.parse(stringifiedData);
        return data;
    }
    catch (e) {
        console.log(e);
        return {
            plagiarismResultsFile: null,
            projectsDirectory: null,
            verdictsFile: null
        };
    }
}

/**
 * Tries to save the file paths that the user just opened.
 *
 * @param {string} plagiarismResultsFile
 * @param {string} projectsDirectory
 * @param {string} verdictsFile
 */
async function _savePaths(plagiarismResultsFile, projectsDirectory,
    verdictsFile) {

    try {
        const data = { plagiarismResultsFile, projectsDirectory, verdictsFile };
        const stringifiedData = JSON.stringify(data);
        await window.electronApi.writeUserData(
            "previous_paths.json", stringifiedData);
    }
    catch (e) {
        console.log(e);
    }
}

/**
 * @param {Array} projectPairsFromFile
 * @param {string} fileName
 * @returns {{projectPairs: [ProjectPair], warnings: [Warning]}}
 */
function _convertProjectPairs(projectPairsFromFile, fileName) {
    const projectPairs = [];
    let allWarnings = [];

    for (let i = 0; i < projectPairsFromFile.length; i++) {
        const pp = projectPairsFromFile[i];
        const badAttributes = [];
        if (!pp.project1) badAttributes.push("project1");
        if (!pp.project2) badAttributes.push("project2");
        if (!Array.isArray(pp.matches)) badAttributes.push("matches");
        if (badAttributes.length > 0) {
            allWarnings.push(new Warning(
                "Load JSON",
                fileName,
                `[Project pair at index ${i}] Missing or invalid attributes: `
                + `${badAttributes.join(", ")}. That project pair has been `
                + "discarded."));
            continue;
        }

        const { matches, warnings } = _convertMatches(pp.matches, fileName, i);
        allWarnings = allWarnings.concat(warnings);
        if (matches.length === 0) {
            allWarnings.push(new Warning(
                "Load JSON",
                fileName,
                `[Project pair at index ${i}] No valid matches. That `
                + "project pair has been discarded."));
            continue;
        }

        projectPairs.push(new ProjectPair(
            pp.project1, pp.project2, matches, matches.length));
    }

    return {
        projectPairs: projectPairs.sort(_compareProjectPairs),
        warnings: allWarnings
    };
}

/**
 * @param {Array} matchesFromFile
 * @param {string} fileName
 * @param {number} projectPairIndex
 * @returns {{matches: [Match], warnings: [Warning]}}
 */
function _convertMatches(matchesFromFile, fileName, projectPairIndex) {
    const matches = [];
    let allWarnings = [];

    for (let i = 0; i < matchesFromFile.length; i++) {
        const m = matchesFromFile[i];
        const badAttributes = [];
        if (!m.project_1_location) badAttributes.push("project_1_location");
        if (!m.project_2_location) badAttributes.push("project_2_location");
        if (badAttributes.length > 0) {
            allWarnings.push(new Warning(
                "Load JSON",
                fileName,
                `[Project pair at index ${projectPairIndex}, match at index `
                + `${i}] Missing or invalid attributes: `
                + `${badAttributes.join(", ")}. This match has been `
                + "discarded."));
            continue;
        }

        const { location: location1, warnings: warnings1 } = _convertLocation(
            m.project_1_location, projectPairIndex, i, 1);
        allWarnings = allWarnings.concat(warnings1);
        if (!location1) {
            allWarnings.push(new Warning(
                "Load JSON",
                fileName,
                `[Project pair at index ${projectPairIndex}, match at index `
                + `${i}] Failed to convert project 1 location. This match has `
                + "been discarded."));
            continue;
        }

        const { location: location2, warnings: warnings2 } = _convertLocation(
            m.project_2_location, projectPairIndex, i, 2);
        allWarnings = allWarnings.concat(warnings2);
        if (!location2) {
            allWarnings.push(new Warning(
                "Load JSON",
                fileName,
                `[Project pair at index ${projectPairIndex}, match at index `
                + `${i}] Failed to convert project 2 location. This match has `
                + "been discarded."));
            continue;
        }

        matches.push(new Match(location1, location2));
    }

    return {
        matches: matches.sort(_compareMatches),
        warnings: allWarnings
    };
}

/**
 * @param {{file: string, span: {start: number, end: number}}} locationFromFile
 * @param {string} fileName
 * @param {number} projectPairIndex
 * @param {number} matchIndex
 * @param {number} projectNumber
 * @returns {{location: CodeLocation, warnings: [Warning]}}
 */
function _convertLocation(locationFromFile, fileName, projectPairIndex,
    matchIndex, projectNumber) {

    const badAttributes = [];
    if (!locationFromFile.file) {
        badAttributes.push("file");
    }
    if (!locationFromFile.span) {
        badAttributes.push("span");
    }
    else {
        const start = locationFromFile.span.start;
        const end = locationFromFile.span.end;
        if (!Number.isFinite(start) || start < 0) {
            badAttributes.push("span.start");
        }
        if (!Number.isFinite(end) || end <= start) {
            badAttributes.push("span.end");
        }
    }
    if (badAttributes.length > 0) {
        return {
            location: null,
            warnings: [new Warning(
                "Load JSON",
                fileName,
                `[Project pair at index ${projectPairIndex}, match at index`
                + `${matchIndex}, project ${projectNumber}] Missing or invalid`
                + `attributes: ${badAttributes.join(", ")}.`)]
        };
    }
    else {
        return {
            location: new CodeLocation(
                locationFromFile.file,
                locationFromFile.span.start,
                locationFromFile.span.end),
            warnings: []
        };
    }
}

/**
 * @param {ProjectPair} projectPair1
 * @param {ProjectPair} projectPair2
 */
function _compareProjectPairs(projectPair1, projectPair2) {
    return projectPair2.totalNumMatches - projectPair1.totalNumMatches;
}

/**
 * @param {Match} match1
 * @param {Match} match2
 */
function _compareMatches(match1, match2) {
    return _compareLocations(match1.location1, match2.location1)
        || _compareLocations(match1.location2, match2.location2);
}

/**
 * @param {CodeLocation} location1
 * @param {CodeLocation} location2
 */
function _compareLocations(location1, location2) {
    return (("" + location1.file).localeCompare(location2.file))
        || (location1.startByte - location2.startByte)
        || (location1.endByte - location2.endByte);
}

export {
    showOpenFilesView,
    hideOpenFilesView,
};