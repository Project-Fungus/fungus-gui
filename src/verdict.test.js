const { VerdictSet } = require("./verdict.js");

describe("VerdictSet", () => {
    it("returns appropriate value for unknown location", () => {
        const vs = new VerdictSet();
        const location1 = { file: "file1.s", startByte: 0, endByte: 42 };
        const location2 = { file: "file2.s", startByte: 0, endByte: 42 };
        const location3 = { file: "file3.s", startByte: 0, endByte: 42 };

        vs.setVerdict(location1, location2, "plagiarism");

        expect(vs.getVerdict(location1, location3)).toStrictEqual("no-verdict");
    });

    it.each([
        "no-plagiarism", "potential-plagiarism", "plagiarism"
    ])("respects symmetry for verdict '%s'", (verdict) => {
        const vs = new VerdictSet();
        const location1 = { file: "file1.s", startByte: 0, endByte: 100 };
        const location2 = { file: "file2.s", startByte: 100, endByte: 200 };

        vs.setVerdict(location1, location2, verdict);

        expect(vs.getVerdict(location1, location2)).toStrictEqual(verdict);
    });

    it.each([
        null, undefined, "", "my-silly-verdict", "no-verdict"
    ])("rejects invalid verdicts", (verdict) => {
        const vs = new VerdictSet();
        const location1 = { file: "student1.s", startByte: 500, endByte: 573 };
        const location2 = { file: "student2.s", startByte: 943, endByte: 1024 };

        expect(() => vs.setVerdict(location1, location2, verdict))
            .toThrow(`Invalid verdict '${verdict}'.`);
    });

    it.each([
        null,
        undefined,
        Object.create(null),
        { file: "a.s", startByte: 100 },
        { file: "a.s", startByte: 100, endByte: null },
        { file: "a.s", startByte: 100, endByte: 0 },
        { file: "a.s", startByte: 100, endByte: -1 },
        { file: "a.s", startByte: 100, endByte: [1, 2] },
        { file: "b.s", endByte: 200 },
        { file: "b.s", startByte: null, endByte: 200 },
        { file: "b.s", startByte: -1, endByte: 200 },
        { file: "b.s", startByte: [1, 2], endByte: 200 },
        { startByte: 100, endByte: 200 },
        { file: null, startByte: 100, endByte: 200 },
        { file: "", startByte: 100, endByte: 200 },
        { file: ["hello", "bye"], startByte: 100, endByte: 200 },
    ])("rejects invalid location %p", (invalidLocation) => {
        const vs = new VerdictSet();
        const validLocation = { file: "a", startByte: 0, endByte: 1 };

        const verdict = "potential-plagiarism";
        expect(() => vs.setVerdict(validLocation, invalidLocation, verdict))
            .toThrow(`Invalid location ${JSON.stringify(invalidLocation)}.`);
        expect(() => vs.setVerdict(invalidLocation, validLocation, verdict))
            .toThrow(`Invalid location ${JSON.stringify(invalidLocation)}.`);
    });

    it.each([
        ["no-plagiarism", "no-plagiarism", true],
        ["no-plagiarism", "no-plagiarism", false],
        ["no-plagiarism", "potential-plagiarism", true],
        ["no-plagiarism", "potential-plagiarism", false],
        ["no-plagiarism", "plagiarism", true],
        ["no-plagiarism", "plagiarism", false],
        ["potential-plagiarism", "no-plagiarism", true],
        ["potential-plagiarism", "no-plagiarism", false],
        ["potential-plagiarism", "potential-plagiarism", true],
        ["potential-plagiarism", "potential-plagiarism", false],
        ["potential-plagiarism", "plagiarism", true],
        ["potential-plagiarism", "plagiarism", false],
        ["plagiarism", "no-plagiarism", true],
        ["plagiarism", "no-plagiarism", false],
        ["plagiarism", "potential-plagiarism", true],
        ["plagiarism", "potential-plagiarism", false],
        ["plagiarism", "plagiarism", true],
        ["plagiarism", "plagiarism", false],
    ])("allows changing verdict from '%s' to '%s' (same location order: %s)",
        (verdict1, verdict2, sameOrder) => {
            const vs = new VerdictSet();
            const location1 = { file: "a.s", startByte: 500, endByte: 573 };
            const location2 = { file: "b.s", startByte: 943, endByte: 1024 };
            vs.setVerdict(location1, location2, verdict1);

            if (sameOrder) vs.setVerdict(location1, location2, verdict2);
            else vs.setVerdict(location2, location1, verdict2);

            expect(vs.getVerdict(location1, location2)).toStrictEqual(verdict2);
            expect(vs.getVerdict(location2, location1)).toStrictEqual(verdict2);
        });

    it("can serialize and then deserialize", () => {
        const vs = new VerdictSet();
        const location1 = { file: "s1.s", startByte: 500, endByte: 573 };
        const location2 = { file: "s2.s", startByte: 943, endByte: 1024 };
        const location3 = { file: "s3.s", startByte: 1000, endByte: 1100 };
        const location4 = { file: "s4.s", startByte: 2000, endByte: 2500 };

        vs.setVerdict(location1, location2, "no-plagiarism");
        vs.setVerdict(location2, location3, "potential-plagiarism");
        vs.setVerdict(location3, location4, "plagiarism");

        const serialized = vs.serialize();
        const deserialized = VerdictSet.deserialize(serialized);
        expect(deserialized).toStrictEqual(vs);
    });

    it("can deserialize an empty file", () => {
        const empty = new VerdictSet();
        expect(VerdictSet.deserialize()).toStrictEqual(empty);
        expect(VerdictSet.deserialize(null)).toStrictEqual(empty);
        expect(VerdictSet.deserialize("")).toStrictEqual(empty);
    });
});
