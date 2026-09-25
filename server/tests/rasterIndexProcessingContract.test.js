"use strict";

// ============================================================
// server/tests/rasterIndexProcessingContract.test.js
// ============================================================

const assert = require("node:assert/strict");
const test = require("node:test");

const {
    RASTER_INDEX_PROCESSING_CONTRACT_VERSION,
    validateRasterIndexProcessingRequest,
    createRasterIndexProcessingResultContract,
    validateRasterIndexProcessingResult
} = require("../scientific/remoteSensing/raster/rasterIndexProcessingContract");

function createRaster(bands = ["Red", "NIR"]) {
    const raster = {
        contractVersion: "1.0",
        width: 2,
        height: 2,
        pixelCount: 4,
        bands: {},
        noData: null,
        spatialReference: {
            origin: [0, 0],
            resolution: [10, -10],
            boundingBox: [0, -20, 20, 0],
            geoKeys: {
                GeographicTypeGeoKey: 4326
            }
        },
        metadata: {}
    };

    for (const band of bands) {
        raster.bands[band] = {
            data: new Float32Array([1, 2, 3, 4]),
            sourceBand: bands.indexOf(band) + 1
        };
    }

    return raster;
}

test("contract version is 1.0", () => {
    assert.equal(
        RASTER_INDEX_PROCESSING_CONTRACT_VERSION,
        "1.0"
    );
});

test("validates NDVI raster request", () => {
    const result =
        validateRasterIndexProcessingRequest({
            indexCode: "NDVI",
            raster: createRaster(),
            parameters: {},
            processingContext: {
                source: "test"
            },
            spatialContext: {
                crs: 4326
            }
        });

    assert.equal(result.valid, true);
    assert.equal(result.indexCode, "NDVI");
    assert.equal(result.definition.code, "NDVI");
});

test("normalizes index code case and whitespace", () => {
    const result =
        validateRasterIndexProcessingRequest({
            indexCode: " ndvi ",
            raster: createRaster()
        });

    assert.equal(result.valid, true);
    assert.equal(result.indexCode, "NDVI");
});

test("rejects missing indexCode", () => {
    const result =
        validateRasterIndexProcessingRequest({
            raster: createRaster()
        });

    assert.equal(result.valid, false);
    assert.ok(
        result.errors.some(
            error => error.includes("indexCode")
        )
    );
});

test("rejects unknown index", () => {
    const result =
        validateRasterIndexProcessingRequest({
            indexCode: "UNKNOWN",
            raster: createRaster()
        });

    assert.equal(result.valid, false);
    assert.ok(
        result.errors.some(
            error => error.includes("Unknown remote sensing index")
        )
    );
});

test("rejects missing raster", () => {
    const result =
        validateRasterIndexProcessingRequest({
            indexCode: "NDVI"
        });

    assert.equal(result.valid, false);
    assert.ok(
        result.errors.some(
            error => error.includes("raster")
        )
    );
});

test("rejects NDVI raster missing Red", () => {
    const result =
        validateRasterIndexProcessingRequest({
            indexCode: "NDVI",
            raster: createRaster(["NIR"])
        });

    assert.equal(result.valid, false);
    assert.ok(
        result.errors.some(
            error => error.includes("Red")
        )
    );
});

test("rejects NDVI raster missing NIR", () => {
    const result =
        validateRasterIndexProcessingRequest({
            indexCode: "NDVI",
            raster: createRaster(["Red"])
        });

    assert.equal(result.valid, false);
    assert.ok(
        result.errors.some(
            error => error.includes("NIR")
        )
    );
});

test("accepts EVI with required Blue, Red and NIR", () => {
    const result =
        validateRasterIndexProcessingRequest({
            indexCode: "EVI",
            raster: createRaster(["Blue", "Red", "NIR"])
        });

    assert.equal(result.valid, true);
});

test("rejects EVI when Blue is missing", () => {
    const result =
        validateRasterIndexProcessingRequest({
            indexCode: "EVI",
            raster: createRaster(["Red", "NIR"])
        });

    assert.equal(result.valid, false);
    assert.ok(
        result.errors.some(
            error => error.includes("Blue")
        )
    );
});

test("accepts NDMI with NIR and SWIR", () => {
    const result =
        validateRasterIndexProcessingRequest({
            indexCode: "NDMI",
            raster: createRaster(["NIR", "SWIR"])
        });

    assert.equal(result.valid, true);
});

test("rejects non-object parameters", () => {
    const result =
        validateRasterIndexProcessingRequest({
            indexCode: "NDVI",
            raster: createRaster(),
            parameters: []
        });

    assert.equal(result.valid, false);
    assert.ok(
        result.errors.some(
            error => error.includes("parameters")
        )
    );
});

test("rejects non-finite parameters", () => {
    const result =
        validateRasterIndexProcessingRequest({
            indexCode: "NDVI",
            raster: createRaster(),
            parameters: {
                scale: NaN
            }
        });

    assert.equal(result.valid, false);
});

test("accepts empty optional contexts", () => {
    const result =
        validateRasterIndexProcessingRequest({
            indexCode: "NDVI",
            raster: createRaster(),
            parameters: {},
            processingContext: {},
            spatialContext: {}
        });

    assert.equal(result.valid, true);
});

test("creates processing result contract", () => {
    const result =
        createRasterIndexProcessingResultContract({
            indexCode: "NDVI",
            inputContext: {
                width: 2,
                height: 2
            },
            spatialContext: {},
            parameters: {},
            results: {
                raster: {}
            },
            classification: {},
            statistics: {
                validPixelCount: 4
            },
            metadata: {}
        });

    assert.equal(
        result.analysisType,
        "remote_sensing_raster_index"
    );

    assert.equal(
        result.analysisVersion,
        "1.0"
    );

    assert.ok(result.timestamp);
});

test("rejects unknown index when creating result", () => {
    assert.throws(
        () =>
            createRasterIndexProcessingResultContract({
                indexCode: "UNKNOWN"
            }),
        /Unknown remote sensing index/
    );
});

test("validates a correctly formed result", () => {
    const result =
        createRasterIndexProcessingResultContract({
            indexCode: "NDVI"
        });

    const validation =
        validateRasterIndexProcessingResult(result);

    assert.equal(validation.valid, true);
    assert.deepEqual(validation.errors, []);
});

test("rejects invalid analysisType", () => {
    const result =
        createRasterIndexProcessingResultContract({
            indexCode: "NDVI"
        });

    result.analysisType = "wrong";

    const validation =
        validateRasterIndexProcessingResult(result);

    assert.equal(validation.valid, false);
});

test("rejects invalid analysisVersion", () => {
    const result =
        createRasterIndexProcessingResultContract({
            indexCode: "NDVI"
        });

    result.analysisVersion = "9.9";

    const validation =
        validateRasterIndexProcessingResult(result);

    assert.equal(validation.valid, false);
});
