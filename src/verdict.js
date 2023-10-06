// TODO: Add a way for user to see the equivalence classes so that they can
// understand why certain matches were implicitly accepted or rejected? Or
// maybe some users would prefer to just not have transitivity and handle
// everything explicitly.

// TODO: Allow undo. Maybe keep a copy of the original relation, the current
// relation, and a history of actions so that actions can be discarded and the
// previous relation reconstructed.

// TODO: Handle verdicts for locations that are slightly larger or smaller?
// Hopefully not necessary if we expand and deduplicate matches.
class CodeEquivalenceRelation {
    /**
     * Marks a pair of code snippets as being plagiarized.
     *
     * @param {{file: string, startByte: int, endByte: int}} location1
     * @param {{file: string, startByte: int, endByte: int}} location2
     */
    accept(location1, location2) {
        // TODO
    }

    /**
     * Marks a pair of code snippets as being *not* plagiarized.
     *
     * @param {{file: string, startByte: int, endByte: int}} location1
     * @param {{file: string, startByte: int, endByte: int}} location2
     */
    reject(location1, location2) {
        // TODO
    }

    /**
     * Returns the verdict for the given pair of code snippets - either
     * plagiarized, not plagiarized, or unknown.
     *
     * @returns {("accept"|"reject"|"unknown")}
     */
    getVerdict(location1, location2) {
        // TODO
        return "unknown";
    }

    /**
     * Converts the equivalence relation to a string (e.g., for storage in a
     * file).
     *
     * @returns {string}
     */
    serialize() {
        // TODO
        return "";
    }

    /**
     * Constructs a new `CodeEquivalenceRelation` from the output of a previous
     * call to `serialize`.
     *
     * @param {string} serializedData
     * @returns {CodeEquivalenceRelation}
     */
    static deserialize(serializedData) {
        // TODO
        return new CodeEquivalenceRelation();
    }
}

module.exports = { CodeEquivalenceRelation };
