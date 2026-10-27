"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    retrieveLaiFromNdvi
} = require(
    "../../../scientific/remoteSensing/biophysical/laiRetrievalService"
);

const model = {
    id: "ndvi-lai-empirical-v1",
    name: "Configurable NDVI-to-LAI empirical model",
    source: "Replace with verified publication or calibration record",
    vegetationScope: "Unspecified; provisional only",
    calibrationStatus: "provisional_uncalibrated",
    parameters: {
        ndviBackground: 0.15,
        ndviAsymptote: 0.93,
        extinctionCoefficient: 1.58
    }
};

test("calculates LAI and preserves raster dimensions", () => {
    const result = retrieveLaiFromNdvi({
        ndviRaster: {
            width: 2,
            height: 2,
            data: Float32Array.from([0.15, 0.54, -9999, 0.93]),
            noData: -9999,
            spatialReference: { epsg: 32644 }
        },
        model
    });

    assert.equal(result.width, 2);
    assert.equal(result.height, 2);
    assert.equal(result.pixelCount, 4);
    assert.ok(Math.abs(result.data[0]) < 1e-6);
    assert.ok(result.data[1] > 0);
    assert.equal(result.data[2], -9999);
    assert.equal(result.data[3], -9999);
    assert.deepEqual(result.spatialReference, { epsg: 32644 });
    assert.equal(result.metadata.validPixelCount, 2);
    assert.equal(result.metadata.excludedPixelCount, 2);
});

test("rejects invalid model parameters", () => {
    assert.throws(() => retrieveLaiFromNdvi({
        ndviRaster: {
            width: 1,
            height: 1,
            data: [0.5]
        },
        model: {
            ...model,
            parameters: {
                ...model.parameters,
                extinctionCoefficient: 0
            }
        }
    }), /extinctionCoefficient/);
});

test("rejects mismatched pixel count", () => {
    assert.throws(() => retrieveLaiFromNdvi({
        ndviRaster: { width: 2, height: 2, data: [0.5] },
        model
    }), /data length/);
});

test("excludes NDVI values outside the model domain", () => {
    const result = retrieveLaiFromNdvi({
        ndviRaster: {
            width: 3,
            height: 1,
            data: [-1.1, 0.1, 0.93],
            noData: -9999
        },
        model
    });

    assert.deepEqual(Array.from(result.data), [-9999, -9999, -9999]);
    assert.equal(result.metadata.validPixelCount, 0);
    assert.equal(result.metadata.excludedPixelCount, 3);
});
