"use strict";

// ============================================================
// server/tests/rasterOutputContract.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.3.4.1
// Raster Output Contract Tests
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    RASTER_OUTPUT_CONTRACT_VERSION,
    OUTPUT_TYPES,
    DATA_TYPES,
    validateRasterOutputRequest,
    validateRasterOutputResult
} = require("../scientific/remoteSensing/raster/rasterOutputContract");

function createSpatialReference() {
    return {
        origin: [100, 200, 0],
        resolution: [10, -10, 0],
        boundingBox: [100, 160, 140, 200],
        geoKeys: {
            GeographicTypeGeoKey: 4326
        }
    };
}

function createContinuousRequest() {
    return {
        outputType: "continuous_index",
        indexCode: "NDVI",
        raster: {
            width: 2,
            height: 2,
            pixelCount: 4,
            bands: {
                NDVI: {
                    data: new Float32Array([
                        0.1,
                        0.2,
                        0.5,
                        0.8
                    ]),
                    dataType: "Float32"
                }
            },
            noData: -9999,
            spatialReference:
                createSpatialReference(),
            metadata: {
                sourceType:
                    "Calculated Raster Index"
            }
        },
        outputMetadata: {
            format: "GeoTIFF"
        }
    };
}

function createClassificationRequest() {
    return {
        outputType: "classification",
        indexCode: "NDVI",
        raster: {
            width: 2,
            height: 2,
            pixelCount: 4,
            bands: {
                NDVI: {
                    data: new Uint8Array([
                        1,
                        2,
                        3,
                        5
                    ]),
                    dataType: "Uint8"
                }
            },
            noData: 0,
            spatialReference:
                createSpatialReference()
        },
        classification: {
            method:
                "baseline_qualitative",
            classDefinitions: [
                {
                    code: "very_low",
                    label: "Very Low Vegetation",
                    min: -1,
                    max: 0
                },
                {
                    code: "low",
                    label: "Low Vegetation",
                    min: 0,
                    max: 0.2
                },
                {
                    code: "moderate",
                    label: "Moderate Vegetation",
                    min: 0.2,
                    max: 0.5
                },
                {
                    code: "high",
                    label: "High Vegetation",
                    min: 0.5,
                    max: 0.8
                },
                {
                    code: "very_high",
                    label: "Very High Vegetation",
                    min: 0.8,
                    max: 1
                }
            ]
        },
        outputMetadata: {
            format: "GeoTIFF"
        }
    };
}

test(
    "raster output contract exposes version 1.0",
    () => {
        assert.equal(
            RASTER_OUTPUT_CONTRACT_VERSION,
            "1.0"
        );
    }
);

test(
    "raster output contract defines supported output types",
    () => {
        assert.deepEqual(
            OUTPUT_TYPES,
            [
                "continuous_index",
                "classification"
            ]
        );
    }
);

test(
    "raster output contract defines supported data types",
    () => {
        assert.deepEqual(
            DATA_TYPES,
            [
                "Float32",
                "Uint8"
            ]
        );
    }
);

test(
    "valid continuous NDVI output passes",
    () => {
        const result =
            validateRasterOutputRequest(
                createContinuousRequest()
            );

        assert.equal(result.valid, true);
        assert.equal(
            result.outputType,
            "continuous_index"
        );
        assert.equal(
            result.indexCode,
            "NDVI"
        );
        assert.ok(result.definition);
    }
);

test(
    "valid classification NDVI output passes",
    () => {
        const result =
            validateRasterOutputRequest(
                createClassificationRequest()
            );

        assert.equal(result.valid, true);
        assert.equal(
            result.outputType,
            "classification"
        );
        assert.equal(
            result.indexCode,
            "NDVI"
        );
    }
);

test(
    "normalizes index code",
    () => {
        const request =
            createContinuousRequest();

        request.indexCode = " ndvi ";

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, true);
        assert.equal(
            result.indexCode,
            "NDVI"
        );
    }
);

test(
    "rejects missing output type",
    () => {
        const request =
            createContinuousRequest();

        delete request.outputType;

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "request is missing required field: outputType"
                    )
            )
        );
    }
);

test(
    "rejects unknown output type",
    () => {
        const request =
            createContinuousRequest();

        request.outputType =
            "unsupported";

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "Unsupported raster output type"
                    )
            )
        );
    }
);

test(
    "rejects unknown index",
    () => {
        const request =
            createContinuousRequest();

        request.indexCode =
            "UNKNOWN";

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "Unknown remote sensing index: UNKNOWN"
                    )
            )
        );
    }
);

test(
    "rejects invalid raster dimensions",
    () => {
        const request =
            createContinuousRequest();

        request.raster.width = 0;

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "raster.width must be a positive integer"
                    )
            )
        );
    }
);

test(
    "rejects pixel count mismatch",
    () => {
        const request =
            createContinuousRequest();

        request.raster.pixelCount = 3;

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "does not match width  height"
                    )
            )
        );
    }
);

test(
    "rejects missing output band",
    () => {
        const request =
            createContinuousRequest();

        delete request.raster.bands.NDVI;

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "raster is missing output band: NDVI"
                    )
            )
        );
    }
);

test(
    "rejects incorrect pixel data length",
    () => {
        const request =
            createContinuousRequest();

        request.raster.bands.NDVI.data =
            new Float32Array([0.1, 0.2]);

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "contains 2 pixels; expected 4"
                    )
            )
        );
    }
);

test(
    "rejects incorrect continuous data type",
    () => {
        const request =
            createContinuousRequest();

        request.raster.bands.NDVI.dataType =
            "Uint8";

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "dataType must be Float32"
                    )
            )
        );
    }
);

test(
    "rejects incorrect classification data type",
    () => {
        const request =
            createClassificationRequest();

        request.raster.bands.NDVI.dataType =
            "Float32";

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "dataType must be Uint8"
                    )
            )
        );
    }
);

test(
    "accepts typed array spatial reference values",
    () => {
        const request =
            createContinuousRequest();

        request.raster.spatialReference = {
            origin:
                new Float64Array([
                    100,
                    200,
                    0
                ]),
            resolution:
                new Float64Array([
                    10,
                    -10,
                    0
                ]),
            boundingBox:
                new Float64Array([
                    100,
                    160,
                    140,
                    200
                ]),
            geoKeys: {
                GeographicTypeGeoKey: 4326
            }
        };

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, true);
    }
);

test(
    "rejects missing spatial reference",
    () => {
        const request =
            createContinuousRequest();

        delete request.raster.spatialReference;

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "raster.spatialReference must be an object"
                    )
            )
        );
    }
);

test(
    "rejects non-finite NoData",
    () => {
        const request =
            createContinuousRequest();

        request.raster.noData =
            Number.NaN;

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "raster.noData must be a finite number"
                    )
            )
        );
    }
);

test(
    "accepts absent NoData",
    () => {
        const request =
            createContinuousRequest();

        delete request.raster.noData;

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, true);
    }
);

test(
    "rejects classification output without classification metadata",
    () => {
        const request =
            createClassificationRequest();

        delete request.classification;

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "classification must be an object"
                    )
            )
        );
    }
);

test(
    "rejects empty classification definitions",
    () => {
        const request =
            createClassificationRequest();

        request.classification.classDefinitions =
            [];

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "classification.classDefinitions must not be empty"
                    )
            )
        );
    }
);

test(
    "rejects invalid output metadata",
    () => {
        const request =
            createContinuousRequest();

        request.outputMetadata =
            "GeoTIFF";

        const result =
            validateRasterOutputRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "outputMetadata must be an object"
                    )
            )
        );
    }
);

test(
    "result validation uses the same output contract",
    () => {
        const request =
            createContinuousRequest();

        const result =
            validateRasterOutputResult(
                request
            );

        assert.equal(result.valid, true);
        assert.equal(
            result.indexCode,
            "NDVI"
        );
    }
);
