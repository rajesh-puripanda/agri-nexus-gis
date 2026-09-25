"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
    isNoDataValue,
    calculateStatistics,
    calculatePixelIndex,
    processRasterIndex
} = require("../services/remoteSensing/raster/rasterIndexProcessingService");

function createRaster({ bands, noData = -9999 }) {
    const normalizedBands = {};

    for (const [name, data] of Object.entries(bands)) {
        normalizedBands[name] = {
            data,
            sourceBand: Object.keys(bands).indexOf(name) + 1
        };
    }

    return {
        contractVersion: "1.0",
        width: 2,
        height: 2,
        pixelCount: 4,
        bands: normalizedBands,
        noData,
        spatialReference: {
            origin: [100, 200, 0],
            resolution: [10, -10, 0],
            boundingBox: [100, 160, 120, 200],
            geoKeys: {
                GeographicTypeGeoKey: 4326
            }
        },
        metadata: {
            sourceType: "Test Raster"
        }
    };
}

function ndviRaster(noData = -9999) {
    return createRaster({
        noData,
        bands: {
            Red: new Float32Array([0.2, 0.3, 0.4, 0.5]),
            NIR: new Float32Array([0.6, 0.7, 0.8, 0.9])
        }
    });
}

test("detects explicit NoData", () => {
    assert.equal(isNoDataValue(-9999, -9999), true);
    assert.equal(isNoDataValue(0, -9999), false);
    assert.equal(isNoDataValue(0, null), false);
});

test("calculates statistics for valid pixels", () => {
    const result = calculateStatistics(
        new Float32Array([1, 2, 3, 4]),
        -9999
    );

    assert.equal(result.validPixelCount, 4);
    assert.equal(result.noDataPixelCount, 0);
    assert.equal(result.min, 1);
    assert.equal(result.max, 4);
    assert.equal(result.mean, 2.5);
});

test("calculates statistics excluding NoData", () => {
    const result = calculateStatistics(
        new Float32Array([1, -9999, 3, -9999]),
        -9999
    );

    assert.equal(result.validPixelCount, 2);
    assert.equal(result.noDataPixelCount, 2);
    assert.equal(result.min, 1);
    assert.equal(result.max, 3);
    assert.equal(result.mean, 2);
});

test("returns null statistics for all-NoData values", () => {
    const result = calculateStatistics(
        new Float32Array([-9999, -9999]),
        -9999
    );

    assert.equal(result.validPixelCount, 0);
    assert.equal(result.noDataPixelCount, 2);
    assert.equal(result.min, null);
    assert.equal(result.max, null);
    assert.equal(result.mean, null);
});

test("calculates an NDVI pixel through the scalar engine", () => {
    const value = calculatePixelIndex({
        indexCode: "NDVI",
        bandValues: {
            Red: 0.2,
            NIR: 0.6
        },
        parameters: {}
    });

    assert.ok(Math.abs(value - 0.5) < 1e-12);
});

test("processes a complete NDVI raster", () => {
    const result = processRasterIndex({
        indexCode: "NDVI",
        raster: ndviRaster()
    });

    assert.equal(result.analysisType, "remote_sensing_raster_index");
    assert.equal(result.analysisVersion, "1.0");

    const output = result.results.raster.bands.NDVI.data;

    assert.equal(output.length, 4);
    assert.ok(Math.abs(output[0] - 0.5) < 1e-6);
    assert.equal(result.statistics.validPixelCount, 4);
    assert.equal(result.statistics.noDataPixelCount, 0);
});

test("preserves raster dimensions", () => {
    const result = processRasterIndex({
        indexCode: "NDVI",
        raster: ndviRaster()
    });

    const outputRaster = result.results.raster;

    assert.equal(outputRaster.width, 2);
    assert.equal(outputRaster.height, 2);
    assert.equal(outputRaster.pixelCount, 4);
});

test("preserves spatial reference", () => {
    const raster = ndviRaster();

    const result = processRasterIndex({
        indexCode: "NDVI",
        raster
    });

    assert.deepEqual(
        result.results.raster.spatialReference,
        raster.spatialReference
    );
});

test("propagates NoData pixels", () => {
    const raster = createRaster({
        bands: {
            Red: new Float32Array([0.2, -9999, 0.4, 0.5]),
            NIR: new Float32Array([0.6, 0.7, 0.8, 0.9])
        }
    });

    const result = processRasterIndex({
        indexCode: "NDVI",
        raster
    });

    const output = result.results.raster.bands.NDVI.data;

    assert.equal(output[1], -9999);
    assert.equal(result.statistics.validPixelCount, 3);
    assert.equal(result.statistics.noDataPixelCount, 1);
});

test("does not treat zero as NoData", () => {
    const raster = createRaster({
        bands: {
            Red: new Float32Array([0, 0.2, 0.4, 0.5]),
            NIR: new Float32Array([0.5, 0.7, 0.8, 0.9])
        }
    });

    const result = processRasterIndex({
        indexCode: "NDVI",
        raster
    });

    assert.equal(result.statistics.validPixelCount, 4);
    assert.notEqual(
        result.results.raster.bands.NDVI.data[0],
        -9999
    );
});

test("supports EVI raster processing", () => {
    const result = processRasterIndex({
        indexCode: "EVI",
        raster: createRaster({
            bands: {
                Blue: new Float32Array([0.1, 0.1, 0.1, 0.1]),
                Red: new Float32Array([0.2, 0.2, 0.2, 0.2]),
                NIR: new Float32Array([0.6, 0.7, 0.8, 0.9])
            }
        })
    });

    assert.equal(result.statistics.validPixelCount, 4);
    assert.equal(result.results.raster.bands.EVI.data.length, 4);
});

test("supports NDMI raster processing", () => {
    const result = processRasterIndex({
        indexCode: "NDMI",
        raster: createRaster({
            bands: {
                NIR: new Float32Array([0.6, 0.7, 0.8, 0.9]),
                SWIR: new Float32Array([0.2, 0.3, 0.4, 0.5])
            }
        })
    });

    assert.equal(result.statistics.validPixelCount, 4);
    assert.equal(result.results.raster.bands.NDMI.data.length, 4);
});

test("preserves custom NoData value", () => {
    const raster = createRaster({
        noData: -32768,
        bands: {
            Red: new Float32Array([0.2, -32768, 0.4, 0.5]),
            NIR: new Float32Array([0.6, 0.7, 0.8, 0.9])
        }
    });

    const result = processRasterIndex({
        indexCode: "NDVI",
        raster
    });

    assert.equal(result.results.raster.noData, -32768);
    assert.equal(
        result.results.raster.bands.NDVI.data[1],
        -32768
    );
});

test("preserves calculated-raster metadata", () => {
    const result = processRasterIndex({
        indexCode: "NDVI",
        raster: ndviRaster()
    });

    const metadata = result.results.raster.metadata;

    assert.equal(metadata.sourceType, "Calculated Raster Index");
    assert.equal(metadata.indexCode, "NDVI");
    assert.equal(metadata.indexName, "Normalized Difference Vegetation Index");
});

test("rejects a missing required band", () => {
    const raster = createRaster({
        bands: {
            Red: new Float32Array([0.2, 0.3, 0.4, 0.5])
        }
    });

    assert.throws(
        () => processRasterIndex({
            indexCode: "NDVI",
            raster
        }),
        /NIR/i
    );
});

test("rejects incorrect band length", () => {
    const raster = createRaster({
        bands: {
            Red: new Float32Array([0.2, 0.3]),
            NIR: new Float32Array([0.6, 0.7, 0.8, 0.9])
        }
    });

    assert.throws(
        () => processRasterIndex({
            indexCode: "NDVI",
            raster
        }),
        /contains 2 pixels; expected 4/
    );
});

test("rejects an unknown index", () => {
    assert.throws(
        () => processRasterIndex({
            indexCode: "UNKNOWN",
            raster: ndviRaster()
        }),
        /Unknown remote sensing index/
    );
});

test("supports supplied SAVI parameters", () => {
    const result = processRasterIndex({
        indexCode: "SAVI",
        raster: createRaster({
            bands: {
                Red: new Float32Array([0.2, 0.2, 0.2, 0.2]),
                NIR: new Float32Array([0.6, 0.6, 0.6, 0.6])
            }
        }),
        parameters: {
            L: 0.5
        }
    });

    const expected =
        ((0.6 - 0.2) / (0.6 + 0.2 + 0.5)) * 1.5;

    assert.ok(
        Math.abs(
            result.results.raster.bands.SAVI.data[0] - expected
        ) < 1e-6
    );
});

test("records processing metadata", () => {
    const result = processRasterIndex({
        indexCode: "NDVI",
        raster: ndviRaster(),
        processingContext: {
            source: "unit-test"
        }
    });

    assert.equal(
        result.metadata.processingType,
        "pixelwise_scalar_index"
    );

    assert.equal(result.metadata.indexCode, "NDVI");
});

test("handles an all-NoData raster", () => {
    const result = processRasterIndex({
        indexCode: "NDVI",
        raster: createRaster({
            bands: {
                Red: new Float32Array([-9999, -9999, -9999, -9999]),
                NIR: new Float32Array([-9999, -9999, -9999, -9999])
            }
        })
    });

    assert.equal(result.statistics.validPixelCount, 0);
    assert.equal(result.statistics.noDataPixelCount, 4);
    assert.equal(result.statistics.min, null);
    assert.equal(result.statistics.max, null);
    assert.equal(result.statistics.mean, null);
});
