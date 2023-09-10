let state = {
    projectsDirectoryPath: null,
    projectPairs: [],
    currentProjectPair: null,
    currentMatchIndex: null,
    currentMatch: null
};

window.addEventListener("DOMContentLoaded", function () {
    window.electronApi.onOpenFile((event, file) => openFile(file));
    document.getElementById("prev-match-btn").addEventListener("click", selectPreviousMatch);
    document.getElementById("next-match-btn").addEventListener("click", selectNextMatch);
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
    document.getElementById("current-file-msg").innerHTML = `<b>File:</b> ${file.filePath}<br/><b>Projects directory:</b> ${file.directoryPath}`;
    document.getElementById("outer-container").style.visibility = "visible";

    state.projectsDirectoryPath = file.directoryPath;
    state.projectPairs = file.fileContents.project_pairs;
    displayProjectPairs(state.projectPairs);

    await selectProjectPair(0);
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

        const project1NameElement = document.createElement("span");
        project1NameElement.innerText = projectPairs[i].project1;
        projectPairElement.appendChild(project1NameElement);

        projectPairElement.appendChild(document.createElement("br"));

        const project2NameElement = document.createElement("span");
        project2NameElement.innerText = projectPairs[i].project2;
        projectPairElement.appendChild(project2NameElement);

        projectPairElement.appendChild(document.createElement("br"));

        const numMatchesElement = document.createElement("span");
        numMatchesElement.innerText = `${projectPairs[i].num_matches} matches`;
        projectPairElement.appendChild(numMatchesElement);

        projectPairsContainer.appendChild(projectPairElement);
    }
}

/**
 * Sets the given project pair as the selected one and updates the display accordingly.
 * 
 * @param {number} idx Index of the project pair in the list of project pairs.
 */
async function selectProjectPair(idx) {
    if (idx < 0 || idx >= state.projectPairs.length) {
        return;
    }
    state.currentProjectPair = state.projectPairs[idx];

    const element = document.getElementById(`project-pair${idx}`);

    const selectedProjectPairElements = document.getElementsByClassName("current-project-pair");
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

    project1OccurrenceIndex = project1OccurrenceIndex || 0;
    project2OccurrenceIndex = project2OccurrenceIndex || 0;

    // TODO: Clearly document the output format of the backend?
    if (matchIndex < 0 || matchIndex >= state.currentProjectPair.matches.length) {
        return;
    }
    state.currentMatchIndex = matchIndex;
    state.currentMatch = state.currentProjectPair.matches[matchIndex];

    const totalNumMatches = state.currentProjectPair.matches.length;
    document.getElementById("match-count").innerText = `Match ${matchIndex + 1}/${totalNumMatches}`;

    await Promise.allSettled([
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
    // TODO: Don't reload and re-highlight the whole file if it's already being
    // shown.

    const occurrenceList = pane === 1
        ? state.currentMatch.project1_occurrences
        : state.currentMatch.project2_occurrences;
    if (occurrenceIndex < 0 || occurrenceIndex >= occurrenceList.length) {
        return;
    }
    const currentOccurrence = occurrenceList[occurrenceIndex];

    // TODO: Handle errors here?
    const fileContents = await window.electronApi.readFile(
        state.projectsDirectoryPath,
        currentOccurrence.file
    );

    // Highlight all the locations in the current file that are relevant for
    // the current project pair
    const rangesToHighlight = [];
    for (let i = 0; i < state.currentProjectPair.matches.length; i++) {
        const match = state.currentProjectPair.matches[i];
        const locationsForThisPane = pane === 1
            ? match.project1_occurrences
            : match.project2_occurrences;
        for (let j = 0; j < locationsForThisPane.length; j++) {
            if (locationsForThisPane[j].file === currentOccurrence.file) {
                rangesToHighlight.push({
                    startByte: locationsForThisPane[j].span.start,
                    endByte: locationsForThisPane[j].span.end
                });
            }
        }
    }
    const highlightedCode = annotateCode(fileContents, rangesToHighlight);

    const codeBlock = document.getElementById(`project${pane}-code`);
    codeBlock.innerHTML = highlightedCode;

    const filenameElement = document.getElementById(`project${pane}-filename`);
    filenameElement.innerText = currentOccurrence.file;

    scrollToLocation(currentOccurrence.span.start, currentOccurrence.span.end, pane);

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
            anchorElement.innerHTML = `${occurrence.file}: ${occurrence.span.start}&ndash;${occurrence.span.end}`;
            liElement.appendChild(anchorElement);
            otherOccurrencesListElement.appendChild(liElement);
        }
        otherOccurrencesContainerElement.style.display = "block";
    }

    // TODO: Test that overlapping highlighted regions are handled properly
}

/**
 * Turns the given plaintext code into HTML that can be highlighted, clicked, etc.
 * 
 * @param {string} code The plaintext code to annotate.
 * @param {{startByte: number, endByte: number}[]} rangesToHighlight The locations to highlight.
 * @returns {string} A string representing the annotated code in HTML.
 */
function annotateCode(code, rangesToHighlight) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const codeBytes = encoder.encode(code);

    const allRanges = partition(codeBytes.length, rangesToHighlight);

    const htmlElementStrings = allRanges.map((r) =>
        // TODO: Let the user click on a highlighted piece of code to jump to that match
        `<span
            ${r.highlight ? "class='unselected-highlighted'" : ""}
            data-start-byte="${r.startByte}"
            data-end-byte="${r.endByte}"
        >${decoder.decode(codeBytes.slice(r.startByte, r.endByte))}</span>`
    );

    return htmlElementStrings.join("");
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
 * @param {{startByte: number, endByte: number}[]} rangesToHighlight The ranges that must be highlighted.
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
            for (let i = 0; i < updatedRanges.length; i++) {
                sortedRanges = sortedRanges
                    .filter((r) => r.startByte < updatedRanges[i].startByte)
                    .concat([updatedRanges[i]])
                    .concat(
                        sortedRanges.filter((r) =>
                            r.startByte >= updatedRanges[i].startByte
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
        (node.dataset.startByte >= startByte && node.dataset.startByte < endByte)
        || (node.dataset.endByte > startByte && node.dataset.endByte <= endByte)
    );

    const previouslySelectedSpans = Array.from(
        codeBlock.getElementsByClassName("selected-highlighted")
    );
    previouslySelectedSpans.forEach((s) =>
        s.className = "unselected-highlighted"
    );
    spansToSelect.forEach((s) => s.className = "selected-highlighted");

    if (spansToSelect.length >= 1) {
        spansToSelect[0].scrollIntoView();
    }
}

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
