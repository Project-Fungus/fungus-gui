class ProjectPair {
    /**
     * @param {string} project1Name
     * @param {string} project2Name
     * @param {[Match]} matches
     * @param {number} totalNumMatches
     */
    constructor(project1Name, project2Name, matches, totalNumMatches) {
        this.project1Name = String(project1Name);
        this.project2Name = String(project2Name);
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
        this._warnType = warnType;
        this._file = file;
        this._message = message;
    }

    /**
     * @type string
     */
    get warnType() {
        return this._warnType;
    }

    /**
     * @type string
     */
    get file() {
        return this._file;
    }

    /**
     * @type string
     */
    get message() {
        return this._message;
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

window.addEventListener("DOMContentLoaded", function () {
    window.electronApi.onOpenFile((event, file) => openFile(file));
    document.getElementById("select-view").addEventListener(
        "change", (event) => showView(event.target));
    document.getElementById("prev-match-btn").addEventListener(
        "click", selectPreviousMatch);
    document.getElementById("next-match-btn").addEventListener(
        "click", selectNextMatch);
    document.getElementById("accept-match-btn").addEventListener(
        "click", acceptMatch);
    document.getElementById("reject-match-btn").addEventListener(
        "click", rejectMatch);
});

/**
 * Displays a new plagiarism results file.
 *
 * @param {object} file
 * @param {string} file.filePath Full path to the plagiarism results file.
 * @param {string} file.fileName Name of the plagiarism results file.
 * @param {object} file.fileContents Contents of the plagiarism results file.
 * @param {string} file.directoryPath Path to the directory of student projects.
 */
async function openFile(file) {
    if (!Array.isArray(file.fileContents.project_pairs)) {
        window.alert(
            "This file does not contain a project pair list. Please select a"
            + " JSON file generated by the plagiarism detection tool.");
        return;
    }

    state = new GuiState(
        file.fileName,
        file.directoryPath,
        file.fileContents.project_pairs,
        file.fileContents.warnings);

    document.getElementById("current-file-msg").innerHTML =
        `<b>File:</b> ${file.filePath}<br/>
        <b>Projects directory:</b> ${file.directoryPath}`;
    await showView();
}

// Call this function when switching views (e.g., from project pairs view to
// warnings view).
async function showView() {
    const noResultsElement = document.getElementById("no-results-msg");
    const projectPairsContainer
        = document.getElementById("outer-project-pair-container");
    const noWarningsElement = document.getElementById("no-warnings-msg");
    const warningsContainer = document.getElementById("warnings-container");
    const view = document.getElementById("select-view").value;
    if (view === "warnings") {
        noResultsElement.style.display = "none";
        projectPairsContainer.style.display = "none";
        if (state.warnings.length === 0) {
            warningsContainer.style.display = "none";
            noWarningsElement.style.display = "block";
        }
        else {
            noWarningsElement.style.display = "none";
            warningsContainer.style.display = "block";
            displayWarnings(state.warnings);
        }
    }
    else {
        noWarningsElement.style.display = "none";
        warningsContainer.style.display = "none";
        await showProjectPairView();
    }
}

/* PROJECT PAIRS ------------------------------------------------------------ */

async function showProjectPairView() {
    state.projectPairs = _filterProjectPairsByVerdict(state.projectPairs);

    // TODO: Avoid this duplication
    const noResultsElement = document.getElementById("no-results-msg");
    const projectPairsContainer
        = document.getElementById("outer-project-pair-container");
    if (state.projectPairs.length === 0) {
        projectPairsContainer.style.display = "none";
        noResultsElement.style.display = "block";
    }
    else {
        noResultsElement.style.display = "none";
        projectPairsContainer.style.display = "flex";
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
    const acceptButton = document.getElementById("accept-match-btn");
    const rejectButton = document.getElementById("reject-match-btn");
    const verdictText = document.getElementById("match-verdict");

    const verdict = window.electronApi.getVerdict(
        state.currentMatch.location1, state.currentMatch.location2);
    if (verdict === "accept") {
        verdictText.innerHTML = "Accepted &#10004;";
        verdictText.className = "show";
        acceptButton.className = "hide";
        rejectButton.className = "hide";
    }
    else if (verdict === "reject") {
        verdictText.innerHTML = "Rejected &#10008;";
        verdictText.className = "show";
        acceptButton.className = "hide";
        rejectButton.className = "hide";
    }
    else {
        verdictText.className = "hide";
        acceptButton.className = "show";
        rejectButton.className = "show";
    }
}

async function acceptMatch() {
    const shouldAccept = await window.electronApi.askToConfirm(
        "Are you sure you want to mark the current match as plagiarism?");
    if (!shouldAccept) {
        return;
    }
    await window.electronApi.acceptMatch(
        state.currentMatch.location1, state.currentMatch.location2);
    await showProjectPairView();
}

async function rejectMatch() {
    const shouldAccept = await window.electronApi.askToConfirm(
        "Are you sure you want to mark the current match as *not* being "
        + "plagiarism?");
    if (!shouldAccept) {
        return;
    }
    await window.electronApi.rejectMatch(
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
        // TODO: Will this be absurdly slow?
        window.electronApi.getVerdict(m.location1, m.location2) === "unknown");
}

/* WARNINGS ----------------------------------------------------------------- */

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
        if (!pp.project1) {
            badAttributes.push("project1");
        }
        if (!pp.project2) {
            badAttributes.push("project2");
        }
        if (!Array.isArray(pp.matches)) {
            badAttributes.push("matches");
        }
        if (badAttributes.length > 0) {
            const w = new Warning(
                "Load JSON",
                fileName,
                `[Project pair at index ${i}] Missing or invalid attributes: `
                + `${badAttributes.join(", ")}. That project pair has been `
                + "discarded.");
            allWarnings.push(w);
        }
        else {
            const { matches, warnings }
                = _convertMatches(pp.matches, fileName);
            allWarnings = allWarnings.concat(warnings);
            if (matches.length === 0) {
                const w = new Warning(
                    "Load JSON",
                    fileName,
                    `[Project pair at index ${i}] No valid matches. That `
                    + "project pair has been discarded.");
                allWarnings.push(w);
            }
            else {
                const convertedProjectPair = new ProjectPair(
                    pp.project1, pp.project2, matches, matches.length);
                projectPairs.push(convertedProjectPair);
            }
        }
    }
    return { projectPairs, warnings: allWarnings };
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
        if (!Array.isArray(m.project1_occurrences)) {
            badAttributes.push("project1_occurrences");
        }
        if (!Array.isArray(m.project2_occurrences)) {
            badAttributes.push("project2_occurrences");
        }
        if (badAttributes.length > 0) {
            const w = new Warning(
                "Load JSON",
                fileName,
                `[Project pair at index ${projectPairIndex}, match at index `
                + `${i}] Missing or invalid attributes: `
                + `${badAttributes.join(", ")}. That match has been discarded.`
            );
            allWarnings.push(w);
        }
        else {
            const { locations: project1Locations, warnings: project1Warnings }
                = _convertLocations(m.project1_occurrences, fileName,
                    projectPairIndex, i, 1);
            allWarnings = allWarnings.concat(project1Warnings);
            const { locations: project2Locations, warnings: project2Warnings }
                = _convertLocations(m.project2_occurrences, fileName,
                    projectPairIndex, i, 2);
            allWarnings = allWarnings.concat(project2Warnings);
            for (const loc1 of project1Locations) {
                for (const loc2 of project2Locations) {
                    matches.push(new Match(loc1, loc2));
                }
            }
        }
    }
    return { matches, warnings: allWarnings };
}

/**
 * @param {Array} occurrences
 * @param {string} fileName
 * @param {number} projectPairIndex
 * @param {number} matchIndex
 * @param {number} projectNumber
 * @returns {{locations: [CodeLocation], warnings: [Warning]}}
 */
function _convertLocations(occurrences, fileName, projectPairIndex,
    matchIndex, projectNumber) {

    const locations = [];
    const warnings = [];
    for (let i = 0; i < occurrences.length; i++) {
        const occ = occurrences[i];
        const badAttributes = [];
        if (!occ.file) {
            badAttributes.push("file");
        }
        if (!occ.span) {
            badAttributes.push("span");
        }
        else {
            const start = occ.span.start;
            const end = occ.span.end;
            if (!Number.isFinite(start) || start < 0) {
                badAttributes.push("span.start");
            }
            if (!Number.isFinite(end) || end <= start) {
                badAttributes.push("span.end");
            }
        }
        if (badAttributes.length > 0) {
            const w = new Warning(
                "Load JSON",
                fileName,
                `[Project pair at index ${projectPairIndex}, match at index `
                + `${matchIndex}, project ${projectNumber}, occurrence ${i}] `
                + `Missing or invalid attributes: ${badAttributes.join(", ")}. `
                + "That occurrence has been discarded.");
            warnings.push(w);
        }
        else {
            locations.push(
                new CodeLocation(occ.file, occ.span.start, occ.span.end));
        }
    }
    return { locations, warnings };
}
