
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    validateEvidenceQuality,
    createEvidenceQuality
} = require("../scientific/cropIntelligence/evidenceQualityContract");

function validQuality() {
    return {
        evidenceStatus: "available",
        qualityMetrics: {
            pixelCount: 4,
            validPixelCount: 3,
            noDataPixelCount: 1,
            outOfRangePixelCount: 0,
            validPixelFraction: 0.75
        },
        provenance: {
            source: "published_index_raster",
            workflowVersion: "1.0"
        }
    };
}

test("creates valid evidence quality and derives contract version", () => {
    const result = createEvidenceQuality(validQuality());

    assert.equal(result.contractVersion, "1.0");
    assert.equal(validateEvidenceQuality(result).valid, true);
});

test("rejects unreconciled pixel counts", () => {
    const value = validQuality();
    value.qualityMetrics.noDataPixelCount = 2;

    assert.equal(validateEvidenceQuality({
        ...value,
        contractVersion: "1.0"
    }).valid, false);
});

test("rejects invalid valid-pixel fraction", () => {
    const value = validQuality();
    value.qualityMetrics.validPixelFraction = 0.5;

    const result = validateEvidenceQuality({
        ...value,
        contractVersion: "1.0"
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error =>
        error.includes("validPixelFraction")
    ));
});

test("rejects out-of-range count greater than valid count", () => {
    const value = validQuality();
    value.qualityMetrics.outOfRangePixelCount = 4;

    assert.equal(validateEvidenceQuality({
        ...value,
        contractVersion: "1.0"
    }).valid, false);
});

test("accepts explicit insufficient evidence without inventing a threshold", () => {
    const value = validQuality();
    value.evidenceStatus = "insufficient";
    value.qualityMetrics = {};

    assert.equal(validateEvidenceQuality({
        ...value,
        contractVersion: "1.0"
    }).valid, true);
});

test("rejects unknown evidence status", () => {
    const value = validQuality();
    value.evidenceStatus = "diagnosed";

    assert.equal(validateEvidenceQuality({
        ...value,
        contractVersion: "1.0"
    }).valid, false);
});

test("rejects missing provenance object", () => {
    const value = validQuality();
    delete value.provenance;

    assert.equal(validateEvidenceQuality({
        ...value,
        contractVersion: "1.0"
    }).valid, false);
});

test("factory derives valid-pixel fraction", () => {
    const value = validQuality();
    delete value.qualityMetrics.validPixelFraction;
    const result = createEvidenceQuality(value);
    assert.equal(result.qualityMetrics.validPixelFraction, 0.75);
});

test("rejects valid-pixel count above total", () => {
    const value = validQuality();
    value.qualityMetrics.validPixelCount = 5;
    value.qualityMetrics.noDataPixelCount = 0;
    const result = validateEvidenceQuality({
        ...value,
        contractVersion: "1.0"
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error =>
        error.includes("validPixelCount cannot exceed pixelCount")
    ));
});

test("rejects no-data count above total", () => {
    const value = validQuality();
    value.qualityMetrics.validPixelCount = 0;
    value.qualityMetrics.noDataPixelCount = 5;
    delete value.qualityMetrics.validPixelFraction;
    const result = validateEvidenceQuality({
        ...value,
        contractVersion: "1.0"
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error =>
        error.includes("noDataPixelCount cannot exceed pixelCount")
    ));
});
