class GuiState {
    constructor(projectsDirectoryPath, projectPairs, warnings) {
        this.projectsDirectoryPath = projectsDirectoryPath || "";
        this.projectPairs = projectPairs || [];
        this.warnings = warnings || [];
        this.currentProjectPair = 0;
        this.currentMatchIndex = 0;
        this.currentMatch = null;
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
});

/**
 * Displays a new plagiarism results file.
 *
 * @param {object} file
 * @param {string} file.filePath Path to the plagiarism results file.
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
        file.directoryPath,
        file.fileContents.project_pairs,
        file.fileContents.warnings);

    document.getElementById("current-file-msg").innerHTML =
        `<b>File:</b> ${file.filePath}<br/>
        <b>Projects directory:</b> ${file.directoryPath}`;
    await showView();
}

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
        if (state.projectPairs.length === 0) {
            projectPairsContainer.style.display = "none";
            noResultsElement.style.display = "block";
        }
        else {
            noResultsElement.style.display = "none";
            projectPairsContainer.style.display = "flex";
            displayProjectPairs(state.projectPairs);
            await selectProjectPair(0);
        }
    }
}

/* PROJECT PAIRS ------------------------------------------------------------ */

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

        const project1NameElement = document.createElement("span");
        project1NameElement.innerText = projectPairs[i].project1;
        projectPairElement.appendChild(project1NameElement);

        projectPairElement.appendChild(document.createElement("br"));

        const project2NameElement = document.createElement("span");
        project2NameElement.innerText = projectPairs[i].project2;
        projectPairElement.appendChild(project2NameElement);

        projectPairElement.appendChild(document.createElement("br"));

        const numMatchesElement = document.createElement("span");
        const numMatches = projectPairs[i].num_matches;
        const matchOrMatches = numMatches === 1 ? "match" : "matches";
        numMatchesElement.innerText = `${numMatches} ${matchOrMatches}`;
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
    state.currentProjectPair = state.projectPairs[idx];

    const element = document.getElementById(`project-pair${idx}`);

    const selectedProjectPairElements = document.getElementsByClassName(
        "current-project-pair");
    for (let i = 0; i < selectedProjectPairElements.length; i++) {
        selectedProjectPairElements[i].classList.remove("current-project-pair");
    }
    element.classList.add("current-project-pair");

    await selectMatch(0);
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
async function selectMatch(matchIndex, project1OccurrenceIndex,
    project2OccurrenceIndex) {

    const isProject1OccurrenceGiven = project1OccurrenceIndex
        || project1OccurrenceIndex === 0;
    if (state.currentMatchIndex === matchIndex && !isProject1OccurrenceGiven) {
        project1OccurrenceIndex = state.currentProject1OccurrenceIndex;
    }
    project1OccurrenceIndex = project1OccurrenceIndex || 0;
    const isProject2OccurrenceGiven = project2OccurrenceIndex
        || project2OccurrenceIndex === 0;
    if (state.currentMatchIndex === matchIndex && !isProject2OccurrenceGiven) {
        project2OccurrenceIndex = state.currentProject2OccurrenceIndex;
    }
    project2OccurrenceIndex = project2OccurrenceIndex || 0;

    const isValidIndex =
        matchIndex >= 0
        && matchIndex < state.currentProjectPair.matches.length;
    if (!isValidIndex) {
        return;
    }
    state.currentMatchIndex = matchIndex;
    state.currentMatch = state.currentProjectPair.matches[matchIndex];

    const totalNumMatches = state.currentProjectPair.matches.length;
    document.getElementById("match-count").innerText =
        `Match ${matchIndex + 1}/${totalNumMatches}`;

    await Promise.all([
        showCodeLocation(project1OccurrenceIndex, 1),
        showCodeLocation(project2OccurrenceIndex, 2)
    ]);
}

async function selectPreviousMatch() {
    await selectMatch(state.currentMatchIndex - 1);
}

async function selectNextMatch() {
    await selectMatch(state.currentMatchIndex + 1);
}

async function showCodeLocation(occurrenceIndex, pane) {
    const occurrenceList = pane === 1
        ? state.currentMatch.project1_occurrences
        : state.currentMatch.project2_occurrences;
    if (occurrenceIndex < 0 || occurrenceIndex >= occurrenceList.length) {
        return;
    }
    const currentOccurrence = occurrenceList[occurrenceIndex];
    if (pane === 1) {
        state.currentProject1OccurrenceIndex = occurrenceIndex;
    }
    else {
        state.currentProject2OccurrenceIndex = occurrenceIndex;
    }

    // Only highlight code that's part of a match in the current project pair
    // and file
    const rangesToHighlight = state.currentProjectPair.matches.flatMap(
        (m, im) => {
            const occurrencesInThisMatch = pane === 1
                ? m.project1_occurrences
                : m.project2_occurrences;
            return occurrencesInThisMatch
                .map((occ, iocc) => ({ data: occ, index: iocc }))
                .filter((obj) => obj.data.file === currentOccurrence.file)
                .map((obj) => ({
                    startByte: obj.data.span.start,
                    endByte: obj.data.span.end,
                    matchIndex: im,
                    occurrenceIndex: obj.index
                }));
        });

    await loadAndDisplayCode(state.projectsDirectoryPath,
        currentOccurrence.file, rangesToHighlight, pane);

    showOtherOccurrences(occurrenceList, occurrenceIndex, pane);

    // Scroll to the right location only after showing the other occurrences.
    // Otherwise, if the location is near the bottom of the file, the other
    // occurrences may hide the highlighted code.
    scrollToLocation(
        currentOccurrence.span.start, currentOccurrence.span.end, pane);
}

async function loadAndDisplayCode(projectsDirectoryPath, filePath,
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
        highlightedCodeElements = annotateCode(
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

async function showOtherOccurrences(occurrenceList, occurrenceIndex, pane) {
    const otherOccurrences = occurrenceList
        .map((o, i) => ({ occurrence: o, index: i }))
        .filter(x => x.index != occurrenceIndex);
    const otherOccurrencesContainerElement =
        document.getElementById(`project${pane}-other-occurrences-container`);
    const otherOccurrencesListElement =
        document.getElementById(`project${pane}-other-occurrences`);
    if (otherOccurrences.length === 0) {
        otherOccurrencesContainerElement.style.display = "none";
        removeAllChildren(otherOccurrencesListElement);
    }
    else {
        removeAllChildren(otherOccurrencesListElement);
        for (const o of otherOccurrences) {
            const occurrence = o.occurrence;
            const index = o.index;
            const liElement = document.createElement("li");
            const anchorElement = document.createElement("a");
            anchorElement.href = "#";
            anchorElement.onclick = () => showCodeLocation(index, pane);
            anchorElement.innerHTML =
                `${occurrence.file}:
                ${occurrence.span.start}&ndash;${occurrence.span.end}`;
            liElement.appendChild(anchorElement);
            otherOccurrencesListElement.appendChild(liElement);
        }
        otherOccurrencesContainerElement.style.display = "block";
    }
}

/**
 * Turns the given plaintext code into HTML that can be highlighted, clicked,
 * etc.
 *
 * @param {string} code The plaintext code to annotate.
 * @param {{
 *      startByte: number,
 *      endByte: number,
 *      matchIndex: number,
 *      occurrenceIndex: number
 * }[]} rangesToHighlight The locations to highlight.
 * @returns {HTMLElement[]} HTML elements representing the annotated code.
 */
function annotateCode(code, rangesToHighlight, pane) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const codeBytes = encoder.encode(code);

    const allRanges = partition(codeBytes.length, rangesToHighlight);

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
                element.onclick = () => selectMatch(
                    earliestRange.matchIndex,
                    pane === 1 ? earliestRange.occurrenceIndex : undefined,
                    pane === 1 ? undefined : earliestRange.occurrenceIndex);
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
function partition(totalNumBytes, rangesToHighlight) {
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

function scrollToLocation(startByte, endByte, pane) {
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
        typeCell.innerText = warning.warn_type;
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
