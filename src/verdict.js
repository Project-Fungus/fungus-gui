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
    constructor(equivalenceClasses, differentEquivalenceClasses, counter) {
        this.counter = counter ? counter : 0;
        this.equivalenceClasses = equivalenceClasses ? equivalenceClasses : {};
        this.differentEquivalenceClasses = differentEquivalenceClasses
            ? differentEquivalenceClasses
            : new Set();
    }

    /**
     * Marks a pair of code snippets as being plagiarized.
     *
     * @param {{file: string, startByte: int, endByte: int}} location1
     * @param {{file: string, startByte: int, endByte: int}} location2
     */
    accept(location1, location2) {
        const equivalenceClass1 = this._findEquivalenceClass(location1);
        const equivalenceClass2 = this._findEquivalenceClass(location2);
        if (!equivalenceClass1 && !equivalenceClass2) {
            const newId = this._generateNewId();
            this._setEquivalenceClassForNewLocation(location1, newId);
            this._setEquivalenceClassForNewLocation(location2, newId);
        }
        else if (!equivalenceClass1 && equivalenceClass2) {
            this._setEquivalenceClassForNewLocation(
                location1, equivalenceClass2);
        }
        else if (equivalenceClass1 && !equivalenceClass2) {
            this._setEquivalenceClassForNewLocation(
                location2, equivalenceClass1);
        }
        else if (this._areDifferent(equivalenceClass1, equivalenceClass2)) {
            throw "Contradictory verdict.";
        }
        else {
            this._updateEquivalenceClass(equivalenceClass1, equivalenceClass2);
        }
    }

    /**
     * Marks a pair of code snippets as being *not* plagiarized.
     *
     * @param {{file: string, startByte: int, endByte: int}} location1
     * @param {{file: string, startByte: int, endByte: int}} location2
     */
    reject(location1, location2) {
        const equivalenceClass1 = this._findEquivalenceClass(location1);
        const equivalenceClass2 = this._findEquivalenceClass(location2);
        if (!equivalenceClass1 && !equivalenceClass2) {
            const newId1 = this._generateNewId();
            this._setEquivalenceClassForNewLocation(location1, newId1);
            const newId2 = this._generateNewId();
            this._setEquivalenceClassForNewLocation(location2, newId2);
            this._makeDifferent(newId1, newId2);
        }
        else if (!equivalenceClass1 && equivalenceClass2) {
            const newId = this._generateNewId();
            this._setEquivalenceClassForNewLocation(location1, newId);
            this._makeDifferent(equivalenceClass2, newId);
        }
        else if (equivalenceClass1 && !equivalenceClass2) {
            const newId = this._generateNewId();
            this._setEquivalenceClassForNewLocation(location2, newId);
            this._makeDifferent(equivalenceClass1, newId);
        }
        else if (equivalenceClass1 === equivalenceClass2) {
            throw "Contradictory verdict.";
        }
        else {
            this._makeDifferent(equivalenceClass1, equivalenceClass2);
        }
    }

    /**
     * Returns the verdict for the given pair of code snippets - either
     * plagiarized, not plagiarized, or unknown.
     *
     * @returns {("accept"|"reject"|"unknown")}
     */
    getVerdict(location1, location2) {
        const areLocationsIdentical = location1.file === location2.file
            && location1.startByte === location2.startByte
            && location1.endByte === location2.endByte;
        if (areLocationsIdentical) {
            return "accept";
        }

        const equivalenceClass1 = this._findEquivalenceClass(location1);
        const equivalenceClass2 = this._findEquivalenceClass(location2);
        if (!equivalenceClass1 || !equivalenceClass2) {
            return "unknown";
        }
        else if (equivalenceClass1 === equivalenceClass2) {
            return "accept";
        }
        else if (this._areDifferent(equivalenceClass1, equivalenceClass2)) {
            return "reject";
        }
        else {
            return "unknown";
        }
    }

    /**
     * Converts the equivalence relation to a string (e.g., for storage in a
     * file).
     *
     * @returns {string}
     */
    serialize() {
        const objToSerialize = {
            ...this,
            // Set isn't serialized properly by JSON.stringify
            differentEquivalenceClasses: Array.from(
                this.differentEquivalenceClasses)
        };
        return JSON.stringify(objToSerialize);
    }

    /**
     * Constructs a new `CodeEquivalenceRelation` from the output of a previous
     * call to `serialize`.
     *
     * @param {string} serializedData
     * @returns {CodeEquivalenceRelation}
     */
    static deserialize(serializedData) {
        const r = JSON.parse(serializedData);
        return new CodeEquivalenceRelation(r.equivalenceClasses,
            new Set(r.differentEquivalenceClasses), r.counter);
    }

    _generateNewId() {
        this.counter++;
        return this.counter;
    }

    _findEquivalenceClass(location) {
        const key =
            `${location.file}/${location.startByte}/${location.endByte}`;
        const equivalenceClass = this.equivalenceClasses[key];
        return equivalenceClass ? equivalenceClass : null;
    }

    _setEquivalenceClassForNewLocation(location, equivalenceClass) {
        const key =
            `${location.file}/${location.startByte}/${location.endByte}`;
        this.equivalenceClasses[key] = equivalenceClass;
    }

    _updateEquivalenceClass(oldId, newId) {
        if (oldId === newId) {
            return;
        }
        for (const key of Object.keys(this.equivalenceClasses)) {
            if (this.equivalenceClasses[key] === oldId) {
                this.equivalenceClasses[key] = newId;
            }
        }
    }

    _areDifferent(equivalenceClass1, equivalenceClass2) {
        const key1 = `${equivalenceClass1}/${equivalenceClass2}`;
        const key2 = `${equivalenceClass2}/${equivalenceClass1}`;
        return this.differentEquivalenceClasses.has(key1)
            || this.differentEquivalenceClasses.has(key2);
    }

    _makeDifferent(equivalenceClass1, equivalenceClass2) {
        const key = `${equivalenceClass1}/${equivalenceClass2}`;
        this.differentEquivalenceClasses.add(key);
    }
}

module.exports = { CodeEquivalenceRelation };
