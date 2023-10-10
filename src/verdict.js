class VerdictSet {
    constructor(verdicts) {
        this._verdicts = verdicts || {};
    }

    /**
     * Mark a pair of code snippets as being different.
     *
     * @param {{file: string, startByte: number, endByte: number}} location1
     * @param {{file: string, startByte: number, endByte: number}} location2
     */
    markNoMatch(location1, location2) {
        this._setVerdict(location1, location2, "no-match");
    }

    /**
     * Mark a pair of code snippets as being the same, but *not* being
     * plagiarism.
     *
     * @param {{file: string, startByte: number, endByte: number}} location1
     * @param {{file: string, startByte: number, endByte: number}} location2
     */
    markMatchWithoutPlagiarism(location1, location2) {
        this._setVerdict(location1, location2, "match-without-plagiarism");
    }

    /**
     * Mark a pair of code snippets as being plagiarized.
     *
     * @param {{file: string, startByte: number, endByte: number}} location1
     * @param {{file: string, startByte: number, endByte: number}} location2
     */
    markPlagiarism(location1, location2) {
        this._setVerdict(location1, location2, "plagiarism");
    }

    /**
     * Returns the verdict for the given pair of code snippets.
     *
     * @param {{file: string, startByte: number, endByte: number}} location1
     * @param {{file: string, startByte: number, endByte: number}} location2
     * @returns {("no-match"|"match-without-plagiarism"|"plagiarism"|"unknown")}
     */
    getVerdict(location1, location2) {
        const key1 = this._getKey(location1, location2);
        const verdict1 = this._verdicts[key1];
        if (verdict1) {
            return verdict1;
        }

        const key2 = this._getKey(location2, location1);
        const verdict2 = this._verdicts[key2];
        return verdict2 || "unknown";
    }

    /**
     * Converts the equivalence relation to a string (e.g., for storage in a
     * file).
     *
     * @returns {string}
     */
    serialize() {
        return JSON.stringify(this);
    }

    /**
     * Constructs a new `VerdictSet` from the output of a previous call to
     * `serialize`.
     *
     * @param {string} serializedData
     * @returns {VerdictSet}
     */
    static deserialize(serializedData) {
        if (!serializedData) {
            return new VerdictSet();
        }
        const r = JSON.parse(serializedData);
        return new VerdictSet(r._verdicts);
    }

    _getKey(location1, location2) {
        const f1 = location1.file.replace("/", "\\/");
        const f2 = location2.file.replace("/", "\\/");
        return `${f1}/${location1.startByte}/${location1.endByte}`
            + `/${f2}/${location2.startByte}/${location2.endByte}`;
    }

    _setVerdict(location1, location2, verdict) {
        const previousVerdict = this.getVerdict(location1, location2);
        if (previousVerdict === "unknown" || previousVerdict === verdict) {
            const key = this._getKey(location1, location2);
            this._verdicts[key] = verdict;
        }
        else {
            throw "Contradictory verdicts.";
        }
    }
}

module.exports = { VerdictSet };
