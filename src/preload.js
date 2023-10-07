const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const { CodeEquivalenceRelation } = require("./verdict");

const codeEquivalenceRelation = new CodeEquivalenceRelation();

contextBridge.exposeInMainWorld("electronApi", {
    onOpenFile: (callback) => ipcRenderer.on("open-file", callback),
    readFile: readFile,
    acceptMatch: acceptMatch,
    rejectMatch: rejectMatch,
    getVerdict: getVerdict,
    filterProjectPairsByVerdict: filterProjectPairsByVerdict
});

async function readFile(directoryPath, filePath) {
    const combinedPath = path.join(directoryPath, filePath);
    return await fs.readFile(combinedPath, "utf-8");
}

async function acceptMatch(location1, location2) {
    codeEquivalenceRelation.accept(location1, location2);
    // TODO: Persist the change
}

async function rejectMatch(location1, location2) {
    codeEquivalenceRelation.reject(location1, location2);
    // TODO: Persist the change
}

function getVerdict(location1, location2) {
    return codeEquivalenceRelation.getVerdict(location1, location2);
}

/**
 * Removes occurrences, matches, and project pairs that have already been
 * evaluated by the user and accepted or rejected.
 * 
 * @param {Array} projectPairs
 */
function filterProjectPairsByVerdict(projectPairs) {
    return projectPairs
        .map((pp) => {
            const filteredMatches = _filterMatchesByVerdict(pp.matches);
            return {
                project1: pp.project1,
                project2: pp.project2,
                matches: filteredMatches,
                total_num_matches: pp.matches.length
            };
        })
        .filter((pp) => pp && pp.matches && pp.matches.length > 0);
}

function _filterMatchesByVerdict(matches) {
    return matches
        .map((m) => _filterOccurrencesByVerdict(
            m.project1_occurrences, m.project2_occurrences))
        .filter((m) => m
            && m.project1_occurrences
            && m.project1_occurrences.length > 0
            && m.project2_occurrences
            && m.project2_occurrences.length > 0);
}

function _filterOccurrencesByVerdict(project1Occurrences, project2Occurrences) {
    // TODO: Simplify the project pairs structure ahead of time so we don't
    // need to deal with this complexity?
    const shouldKeep1 = project1Occurrences.map(() => false);
    const shouldKeep2 = project1Occurrences.map(() => false);
    for (let i = 0; i < project1Occurrences.length; i++) {
        // TODO: Update verdict.js so this conversion isn't necessary
        const occurrence1 = project1Occurrences[i];
        const location1 = {
            file: occurrence1.file,
            startByte: occurrence1.span.start,
            endByte: occurrence1.span.end
        };
        for (let j = 0; j < project2Occurrences.length; j++) {
            const occurrence2 = project2Occurrences[j];
            const location2 = {
                file: occurrence2.file,
                startByte: occurrence2.span.start,
                endByte: occurrence2.span.end
            };
            if (getVerdict(location1, location2) === "unknown") {
                shouldKeep1[i] = true;
                shouldKeep2[j] = true;
            }
        }
    }
    return {
        project1_occurrences: project1Occurrences.filter(
            (_, i) => shouldKeep1[i]),
        project2_occurrences: project2Occurrences.filter(
            (_, i) => shouldKeep2[i])
    }
}
