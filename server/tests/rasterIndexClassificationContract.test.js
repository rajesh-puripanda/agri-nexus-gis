"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    RASTER_INDEX_CLASSIFICATION_CONTRACT_VERSION,
    SUPPORTED_CLASSIFICATION_METHODS,
    validateClassificationRules,
    validateRasterIndexClassificationRequest,
    createRasterIndexClassificationResultContract,
    validateRasterIndexClassificationResult
} = require("../scientific/remoteSensing/raster/rasterIndexClassificationContract");

function createRaster({
    indexCode = "NDVI",
    width = 2,
    height = 2,
    values = [0.1, 0.3, 0.6, 0.9],
    noData = -9999
} = {}) {
    return {
        contractVersion: "1.0",
        width,
        height,
        pixelCount: width * height,
        bands: {
            [indexCode]: {
                data: new Float32Array(values),
                sourceBand: 1
            }
        },
        noData,
        spatialReference: {
            origin: [100, 200],
            resolution: [10, -10],
            boundingBox: [100, 160, 120, 200],
            geoKeys: {
                GeographicTypeGeoKey: 4326
            }
        },
        metadata: {}
    };
}

test("classification contract version is 1.0", () => {
    assert.equal(
        RASTER_INDEX_CLASSIFICATION_CONTRACT_VERSION,
        "1.0"
    );
});

test("baseline qualitative is a supported classification method", () => {
    assert.ok(
        SUPPORTED_CLASSIFICATION_METHODS.includes(
            "baseline_qualitative"
        )
    );
});

test("accepts a valid NDVI classification request", () => {
    const validation =
        validateRasterIndexClassificationRequest({
            indexCode: "NDVI",
            raster: createRaster()
        });

    assert.equal(validation.valid, true);
    assert.equal(validation.errors.length, 0);
    assert.equal(validation.indexCode, "NDVI");
    assert.equal(validation.definition.code, "NDVI");
});

test("normalizes index code", () => {
    const validation =
        validateRasterIndexClassificationRequest({
            indexCode: " ndvi ",
            raster: createRaster()
        });

    assert.equal(validation.valid, true);
    assert.equal(validation.indexCode, "NDVI");
});

test("rejects a missing indexCode", () => {
    const validation =
        validateRasterIndexClassificationRequest({
            raster: createRaster()
        });

    assert.equal(validation.valid, false);
    assert.match(
        validation.errors.join("; "),
        /missing required field: indexCode/
    );
});

test("rejects an unknown index", () => {
    const validation =
        validateRasterIndexClassificationRequest({
            indexCode: "UNKNOWN",
            raster: createRaster()
        });

    assert.equal(validation.valid, false);
    assert.match(
        validation.errors.join("; "),
        /Unknown remote sensing index/
    );
});

test("rejects a missing raster", () => {
    const validation =
        validateRasterIndexClassificationRequest({
            indexCode: "NDVI"
        });

    assert.equal(validation.valid, false);
    assert.match(
        validation.errors.join("; "),
        /missing required field: raster/
    );
});

test("rejects a missing calculated index band", () => {
    const raster = createRaster();
    delete raster.bands.NDVI;

    const validation =
        validateRasterIndexClassificationRequest({
            indexCode: "NDVI",
            raster
        });

    assert.equal(validation.valid, false);
    assert.match(
        validation.errors.join("; "),
        /missing calculated index band: NDVI/
    );
});

test("rejects an incorrect calculated index band length", () => {
    const raster = createRaster({
        values: [0.1, 0.3]
    });

    const validation =
        validateRasterIndexClassificationRequest({
            indexCode: "NDVI",
            raster
        });

    assert.equal(validation.valid, false);
    assert.match(
        validation.errors.join("; "),
        /contains 2 pixels; expected 4/
    );
});

test("validates registered classification rules", () => {
    const validation =
        validateClassificationRules({
            classificationRules: {
                method: "baseline_qualitative",
                classes: [
                    {
                        code: "low",
                        label: "Low",
                        min: 0,
                        max: 0.5
                    },
                    {
                        code: "high",
                        label: "High",
                        min: 0.5,
                        max: 1
                    }
                ]
            },
            validRange: {
                min: -1,
                max: 1
            }
        });

    assert.deepEqual(validation, []);
});

test("rejects an unsupported classification method", () => {
    const errors =
        validateClassificationRules({
            classificationRules: {
                method: "unsupported_method",
                classes: [
                    {
                        code: "low",
                        label: "Low",
                        min: 0,
                        max: 1
                    }
                ]
            },
            validRange: {
                min: -1,
                max: 1
            }
        });

    assert.ok(
        errors.some(
            error =>
                /Unsupported classification method/.test(
                    error
                )
        )
    );
});

test("rejects overlapping classification ranges", () => {
    const errors =
        validateClassificationRules({
            classificationRules: {
                method: "baseline_qualitative",
                classes: [
                    {
                        code: "low",
                        label: "Low",
                        min: 0,
                        max: 0.5
                    },
                    {
                        code: "moderate",
                        label: "Moderate",
                        min: 0.4,
                        max: 0.8
                    }
                ]
            },
            validRange: {
                min: -1,
                max: 1
            }
        });

    assert.ok(
        errors.some(
            error => /overlaps/.test(error)
        )
    );
});

test("rejects a class outside the registered valid range", () => {
    const errors =
        validateClassificationRules({
            classificationRules: {
                method: "baseline_qualitative",
                classes: [
                    {
                        code: "low",
                        label: "Low",
                        min: -1.1,
                        max: 0
                    }
                ]
            },
            validRange: {
                min: -1,
                max: 1
            }
        });

    assert.ok(
        errors.some(
            error => /below index validRange.min/.test(
                error
            )
        )
    );
});

test("rejects a class where min is not less than max", () => {
    const errors =
        validateClassificationRules({
            classificationRules: {
                method: "baseline_qualitative",
                classes: [
                    {
                        code: "invalid",
                        label: "Invalid",
                        min: 0.5,
                        max: 0.5
                    }
                ]
            },
            validRange: {
                min: -1,
                max: 1
            }
        });

    assert.ok(
        errors.some(
            error => /min must be less than max/.test(
                error
            )
        )
    );
});

test("creates a classification result contract", () => {
    const result =
        createRasterIndexClassificationResultContract({
            indexCode: "NDVI",
            inputContext: {
                pixelCount: 4
            },
            results: {
                raster: {}
            },
            classification: {
                method: "baseline_qualitative"
            },
            statistics: {
                validPixelCount: 4
            },
            metadata: {
                processingType:
                    "pixelwise_raster_classification"
            }
        });

    assert.equal(
        result.analysisType,
        "remote_sensing_raster_index_classification"
    );

    assert.equal(
        result.analysisVersion,
        "1.0"
    );

    assert.deepEqual(
        result.classification,
        {
            method: "baseline_qualitative"
        }
    );
});

test("rejects an unknown index when creating result", () => {
    assert.throws(
        () =>
            createRasterIndexClassificationResultContract({
                indexCode: "UNKNOWN"
            }),
        /Unknown remote sensing index/
    );
});

test("validates a structurally complete classification result", () => {
    const result =
        createRasterIndexClassificationResultContract({
            indexCode: "NDVI"
        });

    const validation =
        validateRasterIndexClassificationResult(
            result
        );

    assert.equal(validation.valid, true);
    assert.deepEqual(validation.errors, []);
});

test("rejects an invalid classification result type", () => {
    const result =
        createRasterIndexClassificationResultContract({
            indexCode: "NDVI"
        });

    result.analysisType =
        "remote_sensing_raster_index";

    const validation =
        validateRasterIndexClassificationResult(
            result
        );

    assert.equal(validation.valid, false);
    assert.ok(
        validation.errors.some(
            error =>
                /analysisType must be remote_sensing_raster_index_classification/.test(
                    error
                )
        )
    );
});

test("rejects an incomplete classification result", () => {
    const validation =
        validateRasterIndexClassificationResult({
            analysisType:
                "remote_sensing_raster_index_classification"
        });

    assert.equal(validation.valid, false);
    assert.ok(
        validation.errors.length > 1
    );
});
