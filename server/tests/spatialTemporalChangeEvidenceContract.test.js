"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    SPATIAL_TEMPORAL_CHANGE_EVIDENCE_CONTRACT_VERSION,
    EVIDENCE_TYPE,
    REQUIRED_FIELDS,
    validateSpatialTemporalChangeEvidence,
    createSpatialTemporalChangeEvidence
} = require("../scientific/cropIntelligence/spatialTemporalChangeEvidenceContract");

function createValidEvidence() {
    return {
        contractVersion:
            SPATIAL_TEMPORAL_CHANGE_EVIDENCE_CONTRACT_VERSION,

        evidenceType: EVIDENCE_TYPE,

        identity: {
            indexCode: "NDVI",

            baseline: {
                sceneId: "S2_BASELINE",
                date: "2026-09-08",
                indexCode: "NDVI"
            },

            comparison: {
                sceneId: "S2_COMPARISON",
                date: "2026-09-28",
                indexCode: "NDVI"
            },

            commonFootprint: {
                boundingBox: [
                    699960,
                    1890240,
                    809760,
                    1996230
                ],
                width: 10980,
                height: 10599,
                windows: [
                    [0, 0, 10980, 10599],
                    [0, 0, 10980, 10599]
                ],
                spatialContext: {
                    origin: [699960, 1996230, 0],
                    resolution: [10, -10, 0],
                    projectedCrsCode: 32644,
                    rasterType: 1
                }
            }
        },

        spatialReference: {
            origin: [699960, 1996230, 0],
            resolution: [10, -10, 0],
            geoKeys: {
                GTModelTypeGeoKey: 1,
                GTRasterTypeGeoKey: 1,
                ProjectedCSTypeGeoKey: 32644
            }
        },

        raster: {
            fileName: "NDVI_CHANGE.tif",
            productCode: "NDVI_TEMPORAL_CHANGE",
            format: "GeoTIFF",
            dataType: "Float32",
            noData: -9999,
            width: 10980,
            height: 10599,
            pixelCount: 116377020,
            byteLength: 465593744,
            sha256: "b".repeat(64)
        },

        evidence: {
            statistics: {
                totalPixelCount: 116377020,
                validPixelCount: 104359135,
                noDataPixelCount: 12017885,
                validCoveragePercent: 89.6733178079315,
                noDataCoveragePercent: 10.326682192068501,
                min: -1.8681999444961548,
                max: 1.8373695611953735,
                mean: -0.054725106096682095
            },
            method: "comparison_minus_baseline",
            calibrationStatus: "not_calibrated"
        },

        processingContext: {
            processingVersion: "1.0.0"
        }
    };
}

test("exports the Spatial Temporal Change Evidence contract definition", () => {
    assert.equal(
        SPATIAL_TEMPORAL_CHANGE_EVIDENCE_CONTRACT_VERSION,
        "1.0"
    );

    assert.equal(
        EVIDENCE_TYPE,
        "SPATIAL_TEMPORAL_CHANGE"
    );

    assert.deepEqual(
        REQUIRED_FIELDS,
        [
            "contractVersion",
            "evidenceType",
            "identity",
            "spatialReference",
            "raster",
            "evidence",
            "processingContext"
        ]
    );
});

test("accepts valid spatial temporal change evidence", () => {
    const validation =
        validateSpatialTemporalChangeEvidence(
            createValidEvidence()
        );

    assert.equal(validation.valid, true);
    assert.deepEqual(validation.errors, []);
});

test("rejects a non-object evidence envelope", () => {
    const validation =
        validateSpatialTemporalChangeEvidence(null);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.length > 0);
});

test("rejects an invalid contract version", () => {
    const evidence = createValidEvidence();
    evidence.contractVersion = "9.9";

    const validation =
        validateSpatialTemporalChangeEvidence(evidence);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some(
        error => error.includes("contractVersion")
    ));
});

test("rejects an invalid evidence type", () => {
    const evidence = createValidEvidence();
    evidence.evidenceType = "OTHER";

    const validation =
        validateSpatialTemporalChangeEvidence(evidence);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some(
        error => error.includes("evidenceType")
    ));
});

test("rejects non-NDVI evidence", () => {
    const evidence = createValidEvidence();
    evidence.identity.indexCode = "BSI";

    const validation =
        validateSpatialTemporalChangeEvidence(evidence);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some(
        error => error.includes("identity.indexCode")
    ));
});

test("rejects invalid observation dates", () => {
    const evidence = createValidEvidence();
    evidence.identity.baseline.date = "2026-02-30";

    const validation =
        validateSpatialTemporalChangeEvidence(evidence);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some(
        error => error.includes("baseline.date")
    ));
});

test("rejects a non-chronological comparison", () => {
    const evidence = createValidEvidence();
    evidence.identity.comparison.date = "2026-09-01";

    const validation =
        validateSpatialTemporalChangeEvidence(evidence);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some(
        error => error.includes("later than baseline")
    ));
});

test("rejects an invalid common footprint", () => {
    const evidence = createValidEvidence();
    evidence.identity.commonFootprint.width = 0;

    const validation =
        validateSpatialTemporalChangeEvidence(evidence);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some(
        error => error.includes("commonFootprint.width")
    ));
});

test("rejects an invalid output spatial reference", () => {
    const evidence = createValidEvidence();
    evidence.spatialReference.resolution[0] = 0;

    const validation =
        validateSpatialTemporalChangeEvidence(evidence);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some(
        error => error.includes("spatialReference.resolution")
    ));
});

test("rejects missing required GeoTIFF GeoKeys", () => {
    const evidence = createValidEvidence();
    delete evidence.spatialReference.geoKeys.ProjectedCSTypeGeoKey;

    const validation =
        validateSpatialTemporalChangeEvidence(evidence);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some(
        error => error.includes("ProjectedCSTypeGeoKey")
    ));
});

test("rejects raster dimensions that differ from the common footprint", () => {
    const evidence = createValidEvidence();
    evidence.raster.width = 100;

    const validation =
        validateSpatialTemporalChangeEvidence(evidence);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some(
        error => error.includes("raster.width must match")
    ));
});

test("rejects an invalid raster checksum format", () => {
    const evidence = createValidEvidence();
    evidence.raster.sha256 = "invalid";

    const validation =
        validateSpatialTemporalChangeEvidence(evidence);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some(
        error => error.includes("raster.sha256")
    ));
});

test("rejects inconsistent pixel counts", () => {
    const evidence = createValidEvidence();
    evidence.evidence.statistics.validPixelCount = 100;

    const validation =
        validateSpatialTemporalChangeEvidence(evidence);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some(
        error => error.includes("sum to totalPixelCount")
    ));
});

test("rejects invalid coverage percentages", () => {
    const evidence = createValidEvidence();
    evidence.evidence.statistics.validCoveragePercent = 120;

    const validation =
        validateSpatialTemporalChangeEvidence(evidence);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some(
        error => error.includes("validCoveragePercent")
    ));
});

test("accepts empty valid-pixel statistics with null min, max and mean", () => {
    const evidence = createValidEvidence();

    evidence.evidence.statistics.validPixelCount = 0;
    evidence.evidence.statistics.noDataPixelCount =
        evidence.evidence.statistics.totalPixelCount;
    evidence.evidence.statistics.validCoveragePercent = 0;
    evidence.evidence.statistics.noDataCoveragePercent = 100;
    evidence.evidence.statistics.min = null;
    evidence.evidence.statistics.max = null;
    evidence.evidence.statistics.mean = null;

    const validation =
        validateSpatialTemporalChangeEvidence(evidence);

    assert.equal(validation.valid, true);
    assert.deepEqual(validation.errors, []);
});

test("rejects an unsupported change method", () => {
    const evidence = createValidEvidence();
    evidence.evidence.method = "baseline_minus_comparison";

    const validation =
        validateSpatialTemporalChangeEvidence(evidence);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some(
        error => error.includes("evidence.method")
    ));
});

test("rejects an unsupported calibration status", () => {
    const evidence = createValidEvidence();
    evidence.evidence.calibrationStatus = "calibrated";

    const validation =
        validateSpatialTemporalChangeEvidence(evidence);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some(
        error => error.includes("calibrationStatus")
    ));
});

test("rejects a missing processing version", () => {
    const evidence = createValidEvidence();
    evidence.processingContext.processingVersion = "";

    const validation =
        validateSpatialTemporalChangeEvidence(evidence);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some(
        error => error.includes("processingVersion")
    ));
});

test("factory normalizes contract version and evidence type", () => {
    const evidence = createValidEvidence();
    evidence.contractVersion = "0.1";
    evidence.evidenceType = "OTHER";

    const result =
        createSpatialTemporalChangeEvidence(evidence);

    assert.equal(result.contractVersion, "1.0");
    assert.equal(result.evidenceType, "SPATIAL_TEMPORAL_CHANGE");
});

test("factory rejects invalid evidence with a typed error", () => {
    const evidence = createValidEvidence();
    evidence.raster.width = 0;

    assert.throws(
        () => createSpatialTemporalChangeEvidence(evidence),
        error => {
            assert.equal(
                error.code,
                "INVALID_SPATIAL_TEMPORAL_CHANGE_EVIDENCE"
            );

            assert.ok(Array.isArray(error.validationErrors));
            return true;
        }
    );
});
