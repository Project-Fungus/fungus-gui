class ProjectPair {
    /**
     * @param {string} project1Name
     * @param {string} project2Name
     * @param {[Match]} matches
     * @param {number} totalNumMatches
     */
    constructor(project1Name, project2Name, matches, totalNumMatches) {
        this.project1Name = project1Name;
        this.project2Name = project2Name;
        this.matches = matches;
        this.totalNumMatches = totalNumMatches;
    }
}

class Match {
    /**
     * @param {CodeLocation} location1
     * @param {CodeLocation} location2
     */
    constructor(location1, location2) {
        this.location1 = location1;
        this.location2 = location2;
    }
}

class CodeLocation {
    /**
     * @param {string} file
     * @param {number} startByte
     * @param {number} endByte
     */
    constructor(file, startByte, endByte) {
        this.file = file;
        this.startByte = startByte;
        this.endByte = endByte;
    }
}

class Warning {
    /**
     * @param {string} warnType
     * @param {string} file
     * @param {string} message
     */
    constructor(warnType, file, message) {
        this.warnType = warnType;
        this.file = file;
        this.message = message;
    }
}

class GuiState {
    constructor(fileName, projectsDirectoryPath, projectPairs, warnings) {
        this.projectsDirectoryPath = projectsDirectoryPath || "";
        this.warnings = (warnings || []).map((w) =>
            new Warning(w.warn_type, w.file, w.message));
        projectPairs = projectPairs || [];
        const {
            projectPairs: convertedProjectPairs,
            warnings: conversionWarnings
        } = _convertProjectPairs(projectPairs, fileName);
        this.projectPairs = convertedProjectPairs;
        this.warnings = this.warnings.concat(conversionWarnings);
        this.warnings = this.warnings.sort(_compareWarnings);

        this.currentProjectPairIndex = 0;
        this.currentMatchIndex = 0;
    }

    /**
     * Update the indices to all be within their allowed ranges.
     */
    clampIndices() {
        if (this.projectPairs.length === 0) {
            return;
        }
        this.currentProjectPairIndex = _clamp(this.currentProjectPairIndex,
            0, this.projectPairs.length - 1);
        this.currentMatchIndex = _clamp(this.currentMatchIndex,
            0, this.currentProjectPair.matches.length - 1);
    }

    /**
     * @returns {ProjectPair}
     */
    get currentProjectPair() {
        return this.projectPairs[this.currentProjectPairIndex];
    }

    /**
     * @returns {Match}
     */
    get currentMatch() {
        return this.currentProjectPair.matches[this.currentMatchIndex];
    }
}

let state = new GuiState();

window.addEventListener("DOMContentLoaded", async () => {
    window.electronApi.onShowOpenFilesView(() => showView("open-files"));
    window.electronApi.onShowProjectPairsView(() => showView("project-pairs"));
    window.electronApi.onShowWarningsView(() => showView("warnings"));
    // Open files view
    document.getElementById("plagiarism-results-file-btn").addEventListener(
        "click", selectPlagiarismResultsFile);
    document.getElementById("projects-directory-btn").addEventListener(
        "click", selectProjectsDirectory);
    document.getElementById("verdicts-file-btn").addEventListener(
        "click", selectVerdictsFile);
    document.getElementById("open-files-btn").addEventListener(
        "click", openFiles);
    // Project pairs view
    document.getElementById("prev-match-btn").addEventListener(
        "click", selectPreviousMatch);
    document.getElementById("next-match-btn").addEventListener(
        "click", selectNextMatch);
    document.getElementById("no-match-btn").addEventListener(
        "click", markNoMatch);
    document.getElementById("match-without-plagiarism-btn").addEventListener(
        "click", markMatchWithoutPlagiarism);
    document.getElementById("plagiarism-btn").addEventListener(
        "click", markPlagiarism);

    await showView("open-files");
});

// Call this function when switching views (e.g., from project pairs view to
// warnings view).
async function showView(view) {
    const openFilesView = document.getElementById("open-files-view");
    const projectPairsView = document.getElementById("project-pairs-view");
    const warningsView = document.getElementById("warnings-view");

    if (view === "open-files") {
        projectPairsView.className = "hide";
        warningsView.className = "hide";
        openFilesView.className = "show";
        await showOpenFilesView();
    }
    else if (view === "project-pairs") {
        openFilesView.className = "hide";
        warningsView.className = "hide";
        projectPairsView.className = "show";
        await showProjectPairView();
    }
    else {
        openFilesView.className = "hide";
        projectPairsView.className = "hide";
        warningsView.className = "show";
        showWarningsView();
    }
}

/* OPEN FILES --------------------------------------------------------------- */

async function showOpenFilesView() {
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

    state = new GuiState(
        plagiarismResultsFile,
        projectsDirectory,
        plagiarismResults.project_pairs,
        plagiarismResults.warnings);
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

/* PROJECT PAIRS ------------------------------------------------------------ */

async function showProjectPairView() {
    state.projectPairs = _filterProjectPairsByVerdict(state.projectPairs);

    const noResultsElement = document.getElementById("no-results-msg");
    const projectPairsContainer
        = document.getElementById("outer-project-pair-container");
    if (state.projectPairs.length === 0) {
        projectPairsContainer.className = "hide";
        noResultsElement.className = "show";
    }
    else {
        noResultsElement.className = "hide";
        projectPairsContainer.className = "show";
        state.clampIndices();
        displayProjectPairs(state.projectPairs);
        await selectProjectPair(state.currentProjectPairIndex);
    }
}

/**
 * Updates the sidebar with all the project pairs.
 */
function displayProjectPairs(projectPairs) {
    const projectPairsContainer = document.getElementById("project-pair-list");

    removeAllChildren(projectPairsContainer);

    for (let i = 0; i < projectPairs.length; i++) {
        const projectPairElement = document.createElement("div");
        projectPairElement.className = "project-pair";
        projectPairElement.id = `project-pair${i}`;
        projectPairElement.addEventListener(
            "click",
            () => selectProjectPair(i, projectPairElement)
        );

        const project1NameElement = document.createElement("p");
        project1NameElement.innerText = projectPairs[i].project1Name;
        projectPairElement.appendChild(project1NameElement);

        const project2NameElement = document.createElement("p");
        project2NameElement.innerText = projectPairs[i].project2Name;
        projectPairElement.appendChild(project2NameElement);

        const numMatchesElement = document.createElement("p");
        const numUnconfirmedMatches = projectPairs[i].matches.length;
        const totalNumMatches = projectPairs[i].totalNumMatches;
        numMatchesElement.innerText =
            `Matches: ${numUnconfirmedMatches}/${totalNumMatches} unconfirmed`;
        projectPairElement.appendChild(numMatchesElement);

        projectPairsContainer.appendChild(projectPairElement);
    }
}

/**
 * Sets the given project pair as the selected one and updates the display
 * accordingly.
 *
 * @param {number} idx Index of the project pair in the list of project pairs.
 */
async function selectProjectPair(idx) {
    if (idx < 0 || idx >= state.projectPairs.length) {
        return;
    }
    const previousProjectPairIndex = state.currentProjectPairIndex;
    state.currentProjectPairIndex = idx;

    const element = document.getElementById(`project-pair${idx}`);

    const selectedProjectPairElements = document.getElementsByClassName(
        "current-project-pair");
    for (let i = 0; i < selectedProjectPairElements.length; i++) {
        selectedProjectPairElements[i].classList.remove("current-project-pair");
    }
    element.classList.add("current-project-pair");

    if (state.currentProjectPairIndex == previousProjectPairIndex) {
        await selectMatch(state.currentMatchIndex);
    }
    else {
        await selectMatch(0);
    }
}

/**
 * Sets the given match as the selected one and updates the display accordingly.
 *
 * @param {number} matchIndex              Index of the match in the list of
 *                                         matches for the current project pair.
 * @param {number} project1OccurrenceIndex Index of the occurrence from project
 *                                         1 to show at first.
 * @param {number} project2OccurrenceIndex Index of the occurrence from project
 *                                         2 to show at first.
 */
async function selectMatch(matchIndex) {
    const isValidIndex =
        matchIndex >= 0
        && matchIndex < state.currentProjectPair.matches.length;
    if (!isValidIndex) {
        return;
    }
    state.currentMatchIndex = matchIndex;

    const totalNumMatches = state.currentProjectPair.matches.length;
    document.getElementById("match-count").innerText =
        `Match ${matchIndex + 1}/${totalNumMatches}`;

    await Promise.all([_showCodeLocation(1), _showCodeLocation(2)]);
    showMatchVerdict();
}

async function selectPreviousMatch() {
    await selectMatch(state.currentMatchIndex - 1);
}

async function selectNextMatch() {
    await selectMatch(state.currentMatchIndex + 1);
}

function showMatchVerdict() {
    const noMatchButton = document.getElementById("no-match-btn");
    const matchWithoutPlagiarismButton
        = document.getElementById("match-without-plagiarism-btn");
    const plagiarismButton = document.getElementById("plagiarism-btn");
    const verdictText = document.getElementById("match-verdict");

    const verdict = window.electronApi.getVerdict(
        state.currentMatch.location1, state.currentMatch.location2);
    if (verdict === "no-match") {
        verdictText.innerHTML = "No Match &#10008;";
        noMatchButton.className = "hide";
        matchWithoutPlagiarismButton.className = "hide";
        plagiarismButton.className = "hide";
        verdictText.className = "show";
    }
    else if (verdict === "match-without-plagiarism") {
        verdictText.innerHTML = "Match Without Plagiarism &#10008;";
        noMatchButton.className = "hide";
        matchWithoutPlagiarismButton.className = "hide";
        plagiarismButton.className = "hide";
        verdictText.className = "show";
    }
    else if (verdict === "plagiarism") {
        verdictText.innerHTML = "Plagiarism &#10004;";
        noMatchButton.className = "hide";
        matchWithoutPlagiarismButton.className = "hide";
        plagiarismButton.className = "hide";
        verdictText.className = "show";
    }
    else {
        verdictText.className = "hide";
        noMatchButton.className = "show";
        matchWithoutPlagiarismButton.className = "show";
        plagiarismButton.className = "show";
    }
}

async function markNoMatch() {
    await window.electronApi.markNoMatch(
        state.currentMatch.location1, state.currentMatch.location2);
    await showProjectPairView();
}

async function markMatchWithoutPlagiarism() {
    await window.electronApi.markMatchWithoutPlagiarism(
        state.currentMatch.location1, state.currentMatch.location2);
    await showProjectPairView();
}

async function markPlagiarism() {
    await window.electronApi.markPlagiarism(
        state.currentMatch.location1, state.currentMatch.location2);
    await showProjectPairView();
}

async function _showCodeLocation(pane) {
    const currentLocation = pane === 1
        ? state.currentMatch.location1
        : state.currentMatch.location2;
    // Only highlight code that's part of a match in the current project pair
    // and file
    const rangesToHighlight = state.currentProjectPair.matches.flatMap(
        (match, matchIndex) => {
            const location = pane === 1 ? match.location1 : match.location2;
            return location.file === currentLocation.file
                ? [{
                    startByte: location.startByte,
                    endByte: location.endByte,
                    matchIndex
                }]
                : [];
        });

    const location = pane === 1
        ? state.currentMatch.location1
        : state.currentMatch.location2;
    await _loadAndDisplayCode(state.projectsDirectoryPath, location.file,
        rangesToHighlight, pane);

    _scrollToLocation(currentLocation.startByte, currentLocation.endByte, pane);
}

async function _loadAndDisplayCode(projectsDirectoryPath, filePath,
    rangesToHighlight, pane) {

    let fileContents;
    try {
        fileContents = await window.electronApi.readFile(
            projectsDirectoryPath, filePath);
    }
    catch (e) {
        fileContents =
            `⚠️ Failed to load file ⚠️
            \n
            \n${e}`;
        rangesToHighlight = [];
    }

    let highlightedCodeElements;
    try {
        highlightedCodeElements = _annotateCode(
            fileContents, rangesToHighlight, pane);
    }
    catch (e) {
        window.alert(`Failed to highlight the code for file "${filePath}".`);
        const spanElement = document.createElement("span");
        spanElement.innerText = fileContents;
        highlightedCodeElements = [spanElement];
    }

    const codeBlock = document.getElementById(`project${pane}-code`);
    removeAllChildren(codeBlock);
    for (const child of highlightedCodeElements) {
        codeBlock.appendChild(child);
    }

    const filenameElement = document.getElementById(`project${pane}-filename`);
    filenameElement.innerText = filePath;
}

/**
 * Turns the given plaintext code into HTML that can be highlighted, clicked,
 * etc.
 *
 * @param {string} code The plaintext code to annotate.
 * @param {{
 *      startByte: number,
 *      endByte: number,
 *      matchIndex: number
 * }[]} rangesToHighlight The locations to highlight.
 * @returns {HTMLElement[]} HTML elements representing the annotated code.
 */
function _annotateCode(code, rangesToHighlight) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const codeBytes = encoder.encode(code);

    const allRanges = _partition(codeBytes.length, rangesToHighlight);

    return allRanges.map((r) => {
        const element = document.createElement("span");
        element.innerText = decoder.decode(
            codeBytes.slice(r.startByte, r.endByte));
        element.dataset.startByte = r.startByte;
        element.dataset.endByte = r.endByte;
        if (r.highlight) {
            element.className = "unselected-highlighted";
            // A given highlighted span might overlap with code from multiple
            // code snippets. When the user clicks on a span, send them to the
            // earliest one of those code snippets.
            const overlappingHighlightedRanges = rangesToHighlight
                .filter((rth) =>
                    (rth.startByte >= r.startByte && rth.startByte < r.endByte)
                    || (rth.endByte > r.startByte && rth.endByte <= r.endByte)
                );
            const earliestRange = overlappingHighlightedRanges
                .reduce(
                    (prev, current) =>
                        !prev || current.startByte < prev.startByte
                            ? current
                            : prev,
                    null);
            if (earliestRange) {
                element.onclick = () => selectMatch(earliestRange.matchIndex);
            }
        }
        return element;
    });
}

/**
 * Partitions the range `[0, totalNumBytes)` such that:
 *   - None of the output ranges overlap and the entire range
 *     `[0, totalNumBytes)` is covered.
 *   - For every input range `r`, there exists an output range `r1` such that
 *     `r1.startByte = r.startByte` and there exists an output range `r2`
 *     (which could be the same as `r1`) such that `r2.endByte = r.endByte`.
 *   - For every output range `r`, `r.highlight = true` iff `r` is contained in
 *     any of the input ranges.
 *
 * The output ranges will be sorted in increasing order of `startByte`.
 *
 * @param {number} totalNumBytes The number of bytes to partition.
 * @param {{startByte: number, endByte: number}[]} rangesToHighlight
 *        The ranges that must be highlighted.
 * @returns {{startByte: number, endByte: number, highlight: boolean}[]}
 */
function _partition(totalNumBytes, rangesToHighlight) {
    const rangesWithHighlight = rangesToHighlight.map((r) =>
        ({ startByte: r.startByte, endByte: r.endByte, highlight: true })
    );
    const allRanges = rangesWithHighlight.concat([
        { startByte: 0, endByte: totalNumBytes, highlight: false }
    ]);
    let sortedRanges = allRanges.sort((a, b) => a.startByte - b.startByte);

    const outputRanges = [];
    while (sortedRanges.length > 0) {
        if (sortedRanges.length === 1) {
            outputRanges.push(sortedRanges.pop());
        }
        else if (sortedRanges[0].startByte < sortedRanges[1].startByte) {
            outputRanges.push({
                startByte: sortedRanges[0].startByte,
                endByte: sortedRanges[1].startByte,
                highlight: sortedRanges[0].highlight
            });
            if (sortedRanges[0].endByte <= sortedRanges[1].startByte) {
                sortedRanges = sortedRanges.slice(1);
            }
            else {
                sortedRanges[0].startByte = sortedRanges[1].startByte;
            }
        }
        else {
            const startByte = sortedRanges[0].startByte;
            const rangesWithSameStart = sortedRanges.filter((r) =>
                r.startByte === startByte
            );
            sortedRanges = sortedRanges.filter((r) => r.startByte > startByte);

            const minEndByte =
                Math.min(...rangesWithSameStart.map((r) => r.endByte));
            const combinedRange = {
                startByte: startByte,
                endByte: minEndByte,
                highlight: rangesWithSameStart.some((r) => r.highlight)
            };
            // Don't add the combined range to the output array immediately
            // because it might overlap with the next range.
            sortedRanges = [combinedRange].concat(sortedRanges);

            const updatedRanges = rangesWithSameStart
                .map((r) => ({
                    startByte: minEndByte,
                    endByte: r.endByte,
                    highlight: r.highlight
                }))
                .filter((r) => r.startByte < r.endByte);
            for (const updatedRange of updatedRanges) {
                sortedRanges = sortedRanges
                    .filter((r) => r.startByte < updatedRange.startByte)
                    .concat([updatedRange])
                    .concat(
                        sortedRanges.filter((r) =>
                            r.startByte >= updatedRange.startByte
                        )
                    );
            }
        }
    }

    return outputRanges;
}

function _scrollToLocation(startByte, endByte, pane) {
    const codeBlock = document.getElementById(`project${pane}-code`);
    const spansToSelect = Array.from(codeBlock.childNodes).filter((node) =>
        (node.dataset.startByte >= startByte && node.dataset.endByte <= endByte)
    );

    const previouslySelectedSpans = Array.from(
        codeBlock.getElementsByClassName("selected-highlighted")
    );
    previouslySelectedSpans.forEach((s) =>
        s.className = "unselected-highlighted"
    );
    spansToSelect.forEach((s) => s.className = "selected-highlighted");

    if (spansToSelect.length >= 1) {
        // Chromium can't smoothly scroll multiple elements into view at the
        // same time :( But somehow scrollTo works
        const spanToScroll = spansToSelect[0];
        // The code block is not a "positioned" element, so
        // spanToScroll.offsetParent === codeBlock.offsetParent === body.
        // But we want the offset of the span compared to the code block, which
        // is why we subtract the code block's offset.
        const topOffset = spanToScroll.offsetTop - codeBlock.offsetTop;
        codeBlock.scrollTo(0, topOffset);
    }
}

/**
 * Removes matches that have already been evaluated by the user and accepted or
 * rejected.
 *
 * @param {[ProjectPair]} projectPairs
 * @returns {[ProjectPair]}
 */
function _filterProjectPairsByVerdict(projectPairs) {
    return projectPairs
        .map((pp) => {
            return new ProjectPair(
                pp.project1Name,
                pp.project2Name,
                _filterMatchesByVerdict(pp.matches),
                pp.totalNumMatches
            );
        })
        .filter((pp) => pp && pp.matches && pp.matches.length > 0);
}

function _filterMatchesByVerdict(matches) {
    return matches.filter((m) =>
        window.electronApi.getVerdict(m.location1, m.location2) === "unknown");
}

/* WARNINGS ----------------------------------------------------------------- */

function showWarningsView() {
    const noWarningsElement = document.getElementById("no-warnings-msg");
    const warningsContainer = document.getElementById("warnings-container");
    if (state.warnings && state.warnings.length > 0) {
        noWarningsElement.className = "hide";
        warningsContainer.className = "show";
        displayWarnings(state.warnings);
    }
    else {
        warningsContainer.className = "hide";
        noWarningsElement.className = "show";
    }
}

function displayWarnings(warnings) {
    const warningsTableBody = document.getElementById("warnings-tbody");

    const children = Array.from(warningsTableBody.childNodes);
    for (const child of children) {
        if (child.id !== "warnings-tbody-header") {
            warningsTableBody.removeChild(child);
        }
    }

    for (const warning of warnings) {
        const rowElement = document.createElement("tr");

        const typeCell = document.createElement("td");
        typeCell.innerText = warning.warnType;
        rowElement.appendChild(typeCell);

        const fileCell = document.createElement("td");
        fileCell.innerText = warning.file;
        rowElement.appendChild(fileCell);

        const messageCell = document.createElement("td");
        messageCell.innerText = warning.message;
        rowElement.appendChild(messageCell);

        warningsTableBody.appendChild(rowElement);
    }
}

/* HELPERS ------------------------------------------------------------------ */

/**
 * Removes all children of the given element.
 *
 * @param {HTMLElement} element
 */
function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function _clamp(x, min, max) {
    if (x < min) {
        return min;
    }
    else if (x > max) {
        return max;
    }
    else {
        return x;
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

/**
 * @param {Warning} warning1
 * @param {Warning} warning2
 */
function _compareWarnings(warning1, warning2) {
    return warning1.warnType.localeCompare(warning2.warnType)
        || warning1.file.localeCompare(warning2.file)
        || warning1.message.localeCompare(warning2.message);
}
