const { VerdictSet } = require("./verdict.js");

test("Symmetry: no match", () => {
    const vs = new VerdictSet();
    const location1 = { file: "file1.s", startByte: 0, endByte: 100 };
    const location2 = { file: "file2.s", startByte: 100, endByte: 200 };

    vs.markNoMatch(location1, location2);

    expect(vs.getVerdict(location1, location2)).toStrictEqual("no-match");
    expect(vs.getVerdict(location2, location1)).toStrictEqual("no-match");
});

test("Symmetry: match without plagiarism", () => {
    const vs = new VerdictSet();
    const location1 = { file: "myfile.s", startByte: 123, endByte: 456 };
    const location2 = { file: "theirfile.s", startByte: 789, endByte: 1012 };

    vs.markMatchWithoutPlagiarism(location1, location2);

    const expectedVerdict = "match-without-plagiarism";
    expect(vs.getVerdict(location1, location2)).toStrictEqual(expectedVerdict);
    expect(vs.getVerdict(location2, location1)).toStrictEqual(expectedVerdict);
});

test("Symmetry: plagiarism", () => {
    const vs = new VerdictSet();
    const location1 = { file: "myfile.s", startByte: 111, endByte: 222 };
    const location2 = { file: "theirfile.s", startByte: 333, endByte: 444 };

    vs.markPlagiarism(location1, location2);

    expect(vs.getVerdict(location1, location2)).toStrictEqual("plagiarism");
    expect(vs.getVerdict(location2, location1)).toStrictEqual("plagiarism");
});

test("Verdict for unknown location", () => {
    const vs = new VerdictSet();
    const location1 = { file: "file1.s", startByte: 0, endByte: 42 };
    const location2 = { file: "file2.s", startByte: 0, endByte: 42 };
    const location3 = { file: "file3.s", startByte: 0, endByte: 42 };

    vs.markPlagiarism(location1, location2);

    expect(vs.getVerdict(location1, location3)).toStrictEqual("unknown");
});

test("Contradictory verdicts: no match", () => {
    const vs = new VerdictSet();
    const location1 = { file: "student1.s", startByte: 500, endByte: 573 };
    const location2 = { file: "student2.s", startByte: 943, endByte: 1024 };

    vs.markNoMatch(location1, location2);

    expect(() => vs.markMatchWithoutPlagiarism(location1, location2))
        .toThrow("Contradictory verdicts.");
    expect(() => vs.markMatchWithoutPlagiarism(location2, location1))
        .toThrow("Contradictory verdicts.");
    expect(() => vs.markPlagiarism(location1, location2))
        .toThrow("Contradictory verdicts.");
    expect(() => vs.markPlagiarism(location2, location1))
        .toThrow("Contradictory verdicts.");
    // No exception for the same verdict
    vs.markNoMatch(location1, location2);
    vs.markNoMatch(location2, location1);
});

test("Contradictory verdicts: match without plagiarism", () => {
    const vs = new VerdictSet();
    const location1 = { file: "student1.s", startByte: 500, endByte: 573 };
    const location2 = { file: "student2.s", startByte: 943, endByte: 1024 };

    vs.markMatchWithoutPlagiarism(location1, location2);

    expect(() => vs.markNoMatch(location1, location2))
        .toThrow("Contradictory verdicts.");
    expect(() => vs.markNoMatch(location2, location1))
        .toThrow("Contradictory verdicts.");
    expect(() => vs.markPlagiarism(location1, location2))
        .toThrow("Contradictory verdicts.");
    expect(() => vs.markPlagiarism(location2, location1))
        .toThrow("Contradictory verdicts.");
    // No exception for the same verdict
    vs.markMatchWithoutPlagiarism(location1, location2);
    vs.markMatchWithoutPlagiarism(location2, location1);
});

test("Contradictory verdicts: plagiarism", () => {
    const vs = new VerdictSet();
    const location1 = { file: "student1.s", startByte: 500, endByte: 573 };
    const location2 = { file: "student2.s", startByte: 943, endByte: 1024 };

    vs.markPlagiarism(location1, location2);

    expect(() => vs.markNoMatch(location1, location2))
        .toThrow("Contradictory verdicts.");
    expect(() => vs.markNoMatch(location2, location1))
        .toThrow("Contradictory verdicts.");
    expect(() => vs.markMatchWithoutPlagiarism(location1, location2))
        .toThrow("Contradictory verdicts.");
    expect(() => vs.markMatchWithoutPlagiarism(location2, location1))
        .toThrow("Contradictory verdicts.");
    // No exception for the same verdict
    vs.markPlagiarism(location1, location2);
    vs.markPlagiarism(location2, location1);
});

test("Serialize and then deserialize", () => {
    const vs = new VerdictSet();
    const location1 = { file: "student1.s", startByte: 500, endByte: 573 };
    const location2 = { file: "student2.s", startByte: 943, endByte: 1024 };
    const location3 = { file: "student3.s", startByte: 1000, endByte: 1100 };
    const location4 = { file: "student4.s", startByte: 2000, endByte: 2500 };

    vs.markPlagiarism(location1, location2);
    vs.markPlagiarism(location2, location3);
    vs.markNoMatch(location3, location4);

    const serialized = vs.serialize();
    const deserialized = VerdictSet.deserialize(serialized);
    expect(deserialized).toStrictEqual(vs);
});

test("Deserialize empty", () => {
    const empty = new VerdictSet();
    expect(VerdictSet.deserialize()).toStrictEqual(empty);
    expect(VerdictSet.deserialize(null)).toStrictEqual(empty);
    expect(VerdictSet.deserialize("")).toStrictEqual(empty);
});
