const { CodeEquivalenceRelation } = require("./verdict.js");

test("Reflexivity", () => {
    const r = new CodeEquivalenceRelation();
    const location = { file: "file1.s", startByte: 75, endByte: 130 };
    expect(r.getVerdict(location, location)).toStrictEqual("accept");
});

test("Symmetry: acceptance", () => {
    const r = new CodeEquivalenceRelation();
    const location1 = { file: "file1.s", startByte: 0, endByte: 100 };
    const location2 = { file: "file2.s", startByte: 100, endByte: 200 };
    r.accept(location1, location2);
    expect(r.getVerdict(location1, location2)).toStrictEqual("accept");
    expect(r.getVerdict(location2, location1)).toStrictEqual("accept");
});

test("Symmetry: rejection", () => {
    const r = new CodeEquivalenceRelation();
    const location1 = { file: "myfile.s", startByte: 123, endByte: 456 };
    const location2 = { file: "theirfile.s", startByte: 789, endByte: 1012 };
    r.reject(location1, location2);
    expect(r.getVerdict(location1, location2)).toStrictEqual("reject");
    expect(r.getVerdict(location2, location1)).toStrictEqual("reject");
});

test("Transitivity: a = b = c", () => {
    const r = new CodeEquivalenceRelation();
    const locationA = { file: "A.s", startByte: 0, endByte: 50 };
    const locationB = { file: "B.s", startByte: 0, endByte: 50 };
    const locationC = { file: "C.s", startByte: 0, endByte: 50 };
    r.accept(locationA, locationB);
    r.accept(locationB, locationC);
    expect(r.getVerdict(locationA, locationC)).toStrictEqual("accept");
});

test("Transitivity: a = b != c", () => {
    const r = new CodeEquivalenceRelation();
    const locationA = { file: "A.s", startByte: 5, endByte: 50 };
    const locationB = { file: "B.s", startByte: 10, endByte: 55 };
    const locationC = { file: "C.s", startByte: 15, endByte: 60 };
    r.accept(locationA, locationB);
    r.reject(locationB, locationC);
    expect(r.getVerdict(locationA, locationC)).toStrictEqual("reject");
});

test("Transitivity: a != b != c", () => {
    const r = new CodeEquivalenceRelation();
    const locationA = { file: "A.s", startByte: 5, endByte: 50 };
    const locationB = { file: "B.s", startByte: 10, endByte: 55 };
    const locationC = { file: "C.s", startByte: 15, endByte: 60 };
    r.reject(locationA, locationB);
    r.reject(locationB, locationC);
    expect(r.getVerdict(locationA, locationC)).toStrictEqual("unknown");
});

test("Transitivity: (a = b) = (c = d)", () => {
    const r = new CodeEquivalenceRelation();
    const location1 = { file: "file1.s", startByte: 0, endByte: 42 };
    const location2 = { file: "file2.s", startByte: 0, endByte: 42 };
    const location3 = { file: "file3.s", startByte: 0, endByte: 42 };
    const location4 = { file: "file4.s", startByte: 0, endByte: 42 };

    r.accept(location1, location2);
    r.accept(location3, location4);
    r.accept(location1, location3);

    expect(r.getVerdict(location1, location3)).toStrictEqual("accept");
    expect(r.getVerdict(location1, location4)).toStrictEqual("accept");
    expect(r.getVerdict(location2, location3)).toStrictEqual("accept");
    expect(r.getVerdict(location2, location4)).toStrictEqual("accept");
    expect(r.getVerdict(location3, location4)).toStrictEqual("accept");
});

test("Transitivity: (a = b) != (c = d)", () => {
    const r = new CodeEquivalenceRelation();
    const location1 = { file: "file1.s", startByte: 0, endByte: 42 };
    const location2 = { file: "file2.s", startByte: 0, endByte: 42 };
    const location3 = { file: "file3.s", startByte: 0, endByte: 42 };
    const location4 = { file: "file4.s", startByte: 0, endByte: 42 };

    r.accept(location1, location2);
    r.accept(location3, location4);
    r.reject(location1, location3);

    expect(r.getVerdict(location1, location2)).toStrictEqual("accept");
    expect(r.getVerdict(location3, location4)).toStrictEqual("accept");
    expect(r.getVerdict(location1, location3)).toStrictEqual("reject");
    expect(r.getVerdict(location1, location4)).toStrictEqual("reject");
    expect(r.getVerdict(location2, location3)).toStrictEqual("reject");
    expect(r.getVerdict(location2, location4)).toStrictEqual("reject");
});

test("Duplicate accept", () => {
    const r = new CodeEquivalenceRelation();
    const location1 = { file: "file1.s", startByte: 0, endByte: 42 };
    const location2 = { file: "file2.s", startByte: 0, endByte: 42 };
    const location3 = { file: "file3.s", startByte: 0, endByte: 42 };

    r.accept(location1, location2);
    r.accept(location1, location3);
    r.accept(location2, location3);

    expect(r.getVerdict(location1, location2)).toStrictEqual("accept");
    expect(r.getVerdict(location1, location3)).toStrictEqual("accept");
    expect(r.getVerdict(location2, location3)).toStrictEqual("accept");
});

test("Verdict for unknown location", () => {
    const r = new CodeEquivalenceRelation();
    const location1 = { file: "file1.s", startByte: 0, endByte: 42 };
    const location2 = { file: "file2.s", startByte: 0, endByte: 42 };
    const location3 = { file: "file3.s", startByte: 0, endByte: 42 };

    r.accept(location1, location2);

    expect(r.getVerdict(location1, location3)).toStrictEqual("unknown");
});

test("Contradictory verdicts: accept then reject", () => {
    const r = new CodeEquivalenceRelation();
    const location1 = { file: "student1.s", startByte: 500, endByte: 573 };
    const location2 = { file: "student2.s", startByte: 943, endByte: 1024 };
    const location3 = { file: "student3.s", startByte: 1000, endByte: 1100 };
    r.accept(location1, location2);
    r.accept(location2, location3);
    expect(() => r.reject(location1, location2))
        .toThrow("Contradictory verdict.");
    expect(() => r.reject(location1, location3))
        .toThrow("Contradictory verdict.");
    expect(() => r.reject(location2, location3))
        .toThrow("Contradictory verdict.");
});

test("Contradictory verdicts: reject then accept", () => {
    const r = new CodeEquivalenceRelation();
    const location1 = { file: "student1.s", startByte: 500, endByte: 573 };
    const location2 = { file: "student2.s", startByte: 943, endByte: 1024 };
    const location3 = { file: "student3.s", startByte: 1000, endByte: 1100 };
    r.accept(location1, location2);
    r.reject(location2, location3);
    expect(() => r.accept(location1, location3))
        .toThrow("Contradictory verdict.");
    expect(() => r.accept(location2, location3))
        .toThrow("Contradictory verdict.");
});

test("Serialize and then deserialize", () => {
    const r = new CodeEquivalenceRelation();
    const location1 = { file: "student1.s", startByte: 500, endByte: 573 };
    const location2 = { file: "student2.s", startByte: 943, endByte: 1024 };
    const location3 = { file: "student3.s", startByte: 1000, endByte: 1100 };
    r.accept(location1, location2);
    r.reject(location2, location3);
    const serialized = r.serialize();
    const deserializedRelation = CodeEquivalenceRelation.deserialize(
        serialized);
    expect(deserializedRelation).toStrictEqual(r);
});
