class ProjectPair {
    /**
     * @param {string} project1Name
     * @param {string} project2Name
     * @param {[Match]} matches
     * @param {number} totalNumMatches
     * @param {string} key
     */
    constructor(project1Name, project2Name, matches, totalNumMatches, key) {
        this.project1Name = project1Name;
        this.project2Name = project2Name;
        this.matches = matches;
        this.totalNumMatches = totalNumMatches;
        this.key = key || crypto.randomUUID();
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

class ProjectPairsViewState {
    constructor(projectsDirectoryPath, projectPairs) {
        projectPairs = projectPairs || [];
        this._projectPairByKey = new Map(projectPairs.map((p) => [p.key, p]));
        this.projectsDirectoryPath = projectsDirectoryPath || "";

        this.currentProjectPairIndex = 0;
        this.currentMatchIndex = 0;
        this.verdictsToShow = new Set(["no-verdict"]);
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
     * @param {ProjectPair} projectPair
     * @returns {{
     *      numPlagiarism: number,
     *      numPotentialPlagiarism: number,
     *      numNoVerdict: number
     * }}
     */
    countVerdicts(key) {
        const projectPair = this._projectPairByKey.get(key);
        if (!projectPair) {
            return {
                numPlagiarism: 0,
                numPotentialPlagiarism: 0,
                numNoVerdict: 0
            };
        }
        let numPlagiarism = 0;
        let numPotentialPlagiarism = 0;
        let numNoVerdict = 0;
        for (const m of projectPair.matches) {
            const verdict = window.electronApi.getVerdict(m.location1, m.location2);
            if (verdict === "plagiarism") numPlagiarism++;
            else if (verdict === "potential-plagiarism") numPotentialPlagiarism++;
            else if (verdict === "no-verdict") numNoVerdict += 1;
        }
        return { numPlagiarism, numPotentialPlagiarism, numNoVerdict };
    }

    get projectPairs() {
        if (!this._projectPairByKey) return [];

        return Array.from(this._projectPairByKey.values())
            .map((pp) =>
                new ProjectPair(
                    pp.project1Name,
                    pp.project2Name,
                    pp.matches.filter((m) => this.verdictsToShow.has(
                        window.electronApi
                            .getVerdict(m.location1, m.location2))),
                    pp.totalNumMatches,
                    pp.key,
                )
            )
            .filter((pp) => pp && pp.matches && pp.matches.length > 0);
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

let state = new ProjectPairsViewState();

window.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("prev-match-btn").addEventListener(
        "click", selectPreviousMatch);
    document.getElementById("next-match-btn").addEventListener(
        "click", selectNextMatch);
    document.getElementById("filter-matches-open-btn").addEventListener(
        "click", openMatchFiltersDialog);
    document.getElementById("filter-matches-apply-btn").addEventListener(
        "click", applyMatchFilters);
    document.getElementById("filter-matches-cancel-btn").addEventListener(
        "click", cancelMatchFilters);
    document.getElementById("no-plagiarism-btn").addEventListener(
        "click", markNoPlagiarism);
    document.getElementById("potential-plagiarism-btn").addEventListener(
        "click", markPotentialPlagiarism);
    document.getElementById("plagiarism-btn").addEventListener(
        "click", markPlagiarism);
});

function setProjectPairs(directory, projectPairs) {
    state = new ProjectPairsViewState(directory, projectPairs);
}

async function showProjectPairsView() {
    document.getElementById("project-pairs-view").classList.remove("hide");
    const noResultsElement = document.getElementById("no-results-msg");
    const projectPairsContainer
        = document.getElementById("outer-project-pair-container");
    if (state.projectPairs.length === 0) {
        projectPairsContainer.classList.add("hide");
        noResultsElement.classList.remove("hide");
    }
    else {
        noResultsElement.classList.add("hide");
        projectPairsContainer.classList.remove("hide");
        state.clampIndices();
        displayProjectPairs(state.projectPairs);
        await selectProjectPair(state.currentProjectPairIndex);
    }
}

function hideProjectPairsView() {
    document.getElementById("project-pairs-view").classList.add("hide");
}

/**
 * Updates the sidebar with all the project pairs.
 */
function displayProjectPairs(projectPairs) {
    const projectPairsContainer = document.getElementById("project-pair-list");

    _removeAllChildren(projectPairsContainer);

    for (let i = 0; i < projectPairs.length; i++) {
        const projectPair = projectPairs[i];

        const projectPairElement = document.createElement("div");
        projectPairElement.className = "project-pair";
        projectPairElement.id = `project-pair${i}`;
        projectPairElement.addEventListener(
            "click",
            () => selectProjectPair(i, projectPairElement)
        );

        const project1NameElement = document.createElement("p");
        project1NameElement.innerText = projectPair.project1Name;
        projectPairElement.appendChild(project1NameElement);

        const project2NameElement = document.createElement("p");
        project2NameElement.innerText = projectPair.project2Name;
        projectPairElement.appendChild(project2NameElement);

        const numMatchesElement = document.createElement("p");
        const { numPlagiarism, numPotentialPlagiarism, numNoVerdict } =
            state.countVerdicts(projectPair.key);
        numMatchesElement.innerHTML =
            `<i>Matches:</i> ${numPlagiarism} (&#10004;) `
            + `| ${numPotentialPlagiarism} (<b><i>?</i></b>) `
            + `| ${numNoVerdict} (<b><i>-</i></b>)`;
        projectPairElement.appendChild(numMatchesElement);

        // TODO: Add tooltip to explain numbers?

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

async function openMatchFiltersDialog() {
    // Show the user their current filters
    document.getElementById("filter-matches-no-verdict-checkbox").checked =
        state.verdictsToShow.has("no-verdict");
    document.getElementById("filter-matches-no-plagiarism-checkbox").checked =
        state.verdictsToShow.has("no-plagiarism");
    document.getElementById("filter-matches-potential-plagiarism-checkbox")
        .checked = state.verdictsToShow.has("no-plagiarism");
    document.getElementById("filter-matches-plagiarism-checkbox").checked =
        state.verdictsToShow.has("plagiarism");

    document.getElementById("filter-matches-dialog").showModal();
}

async function applyMatchFilters() {
    const newVerdictsToShow = new Set();
    if (document.getElementById("filter-matches-no-verdict-checkbox").checked) {
        newVerdictsToShow.add("no-verdict");
    }
    if (document
        .getElementById("filter-matches-no-plagiarism-checkbox")
        .checked
    ) {
        newVerdictsToShow.add("no-plagiarism");
    }
    if (document
        .getElementById("filter-matches-potential-plagiarism-checkbox")
        .checked
    ) {
        newVerdictsToShow.add("potential-plagiarism");
    }
    if (document.getElementById("filter-matches-plagiarism-checkbox").checked) {
        newVerdictsToShow.add("plagiarism");
    }

    if (!_areSetsIdentical(newVerdictsToShow, state.verdictsToShow)) {
        state.verdictsToShow = newVerdictsToShow;
        showProjectPairsView();
    }

    // TODO: Find some way to allow changing filters even when there are no
    //       matches
    document.getElementById("filter-matches-dialog").close();
}

async function cancelMatchFilters() {
    document.getElementById("filter-matches-dialog").close();
}

function showMatchVerdict() {
    const noPlagiarismButton = document.getElementById("no-plagiarism-btn");
    const potentialPlagiarismButton
        = document.getElementById("potential-plagiarism-btn");
    const plagiarismButton = document.getElementById("plagiarism-btn");
    const verdictText = document.getElementById("match-verdict");

    const verdict = window.electronApi.getVerdict(
        state.currentMatch.location1, state.currentMatch.location2);
    if (verdict === "no-plagiarism") {
        verdictText.innerHTML = "No Plagiarism (&#10008;)";
        _setVerdictButtonEmphasis(noPlagiarismButton, true);
        _setVerdictButtonEmphasis(potentialPlagiarismButton, false);
        _setVerdictButtonEmphasis(plagiarismButton, false);
    }
    else if (verdict === "potential-plagiarism") {
        verdictText.innerHTML = "Potential Plagiarism (<b><i>?</i></b>)";
        _setVerdictButtonEmphasis(noPlagiarismButton, false);
        _setVerdictButtonEmphasis(potentialPlagiarismButton, true);
        _setVerdictButtonEmphasis(plagiarismButton, false);
    }
    else if (verdict === "plagiarism") {
        verdictText.innerHTML = "Plagiarism (&#10004;)";
        _setVerdictButtonEmphasis(noPlagiarismButton, false);
        _setVerdictButtonEmphasis(potentialPlagiarismButton, false);
        _setVerdictButtonEmphasis(plagiarismButton, true);
    }
    else {
        verdictText.innerHTML = "";
        _setVerdictButtonEmphasis(noPlagiarismButton, null);
        _setVerdictButtonEmphasis(potentialPlagiarismButton, null);
        _setVerdictButtonEmphasis(plagiarismButton, null);
    }
}

async function markNoPlagiarism() {
    await window.electronApi.setVerdict(state.currentMatch.location1,
        state.currentMatch.location2, "no-plagiarism");
    await showProjectPairsView();
}

async function markPotentialPlagiarism() {
    await window.electronApi.setVerdict(state.currentMatch.location1,
        state.currentMatch.location2, "potential-plagiarism");
    await showProjectPairsView();
}

async function markPlagiarism() {
    await window.electronApi.setVerdict(state.currentMatch.location1,
        state.currentMatch.location2, "plagiarism");
    await showProjectPairsView();
}

function _setVerdictButtonEmphasis(button, emphasized) {
    if (emphasized === true) {
        button.classList.add("emphasized");
    }
    else {
        button.classList.remove("emphasized")
    }

    if (emphasized === false) {
        button.classList.add("deemphasized");
    }
    else {
        button.classList.remove("deemphasized");
    }
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
    _removeAllChildren(codeBlock);
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
 * Removes all children of the given element.
 *
 * @param {HTMLElement} element
 */
function _removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * @param {Set<string>} set1
 * @param {Set<string>} set2
 */
function _areSetsIdentical(set1, set2) {
    if (set1.size !== set2.size) return false;
    for (const x of set1) {
        if (!set2.has(x)) return false;
    }
    return true;
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

export {
    ProjectPair,
    Match,
    CodeLocation,
    setProjectPairs,
    showProjectPairsView,
    hideProjectPairsView
};
