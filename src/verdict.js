function _getKey(location1, location2) {
    const f1 = location1.file.replace("\\", "\\\\").replace("|", "\\|");
    const f2 = location2.file.replace("\\", "\\\\").replace("|", "\\|");
    const key1 = `${f1}|${location1.startByte}|${location1.endByte}`;
    const key2 = `${f2}|${location2.startByte}|${location2.endByte}`;
    return key1.localeCompare(key2) <= 0
        ? `${key1}|${key2}`
        : `${key2}|${key1}`;
}

function _isLocationValid(location) {
    if (!location) return false;

    if (typeof (location.file) !== "string"
        && !(location.file instanceof String)) return false;
    if (!location.file) return false;

    if (typeof location.startByte !== "number") return false;
    if (location.startByte < 0) return false;

    if (typeof location.endByte !== "number") return false;
    if (location.endByte <= 0) return false;

    return true;
}

const _VALID_VERDICTS = new Set([
    "no-plagiarism", "potential-plagiarism", "plagiarism"
]);

class VerdictSet {
    constructor(verdicts) {
        this.verdicts = verdicts || {};
    }

    /**
     * Sets the verdict for the given pair of code snippets.
     *
     * @param {{file: string, startByte: number, endByte: number}} location1
     * @param {{file: string, startByte: number, endByte: number}} location2
     * @param {("no-plagiarism"|"potential-plagiarism"|"plagiarism")} verdict
     */
    setVerdict(location1, location2, verdict) {
        if (!_isLocationValid(location1)) {
            throw `Invalid location ${JSON.stringify(location1)}.`;
        }
        if (!_isLocationValid(location2)) {
            throw `Invalid location ${JSON.stringify(location2)}.`;
        }
        if (!_VALID_VERDICTS.has(verdict)) {
            throw `Invalid verdict '${verdict}'.`;
        }

        const key = _getKey(location1, location2);
        this.verdicts[key] = verdict;
    }

    /**
     * Returns the verdict for the given pair of code snippets.
     *
     * @param {{file: string, startByte: number, endByte: number}} location1
     * @param {{file: string, startByte: number, endByte: number}} location2
     * @returns {
     *      ("no-verdict"|"no-plagiarism"|"potential-plagiarism"|"plagiarism")
     * }
     */
    getVerdict(location1, location2) {
        const key = _getKey(location2, location1);
        const verdict2 = this.verdicts[key];
        return verdict2 || "no-verdict";
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
        return new VerdictSet(r.verdicts);
    }
}

module.exports = { VerdictSet };
