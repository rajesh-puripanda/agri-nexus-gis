"use strict";

// ============================================================
// server/tests/rasterValidationService.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.2.1  Raster Validation Service
//
// ============================================================

const assert = require("node:assert/strict");
const test = require("node:test");

const {
    validateRaster
} = require("../services/remoteSensing/raster/rasterValidationService");

function createRaster(overrides = {}) {
    return {
        width: 2,
        height: 2,
        noData: -9999,
        bands: {
            Blue: {
                data: new Float32Array([
                    0.1, 0.2,
                    0.3, 0.4
                ])
            },
            Red: {
                data: new Float32Array([
                    0.2, 0.3,
                    0.4, 0.5
                ])
            },
            NIR: {
                data: new Float32Array([
                    0.6, 0.7,
                    0.8, 0.9
                ])
            }
        },
        ...overrides
    };
}

const STANDARD_MAPPING = {
    Blue: 1,
    Red: 2,
    NIR: 3
};

test("raster validation accepts a valid raster", () => {
    const result = validateRaster({
        raster: createRaster(),
        bandMapping: STANDARD_MAPPING,
        noData: -9999
    });

    assert.equal(result.valid, true);
    assert.equal(result.width, 2);
    assert.equal(result.height, 2);
    assert.equal(result.pixelCount, 4);
    assert.equal(result.noData, -9999);
});

test("raster validation preserves mapped source band numbers", () => {
    const result = validateRaster({
        raster: createRaster(),
        bandMapping: STANDARD_MAPPING
    });

    assert.equal(result.bands.Blue.sourceBand, 1);
    assert.equal(result.bands.Red.sourceBand, 2);
    assert.equal(result.bands.NIR.sourceBand, 3);
});

test("raster validation preserves pixel data", () => {
    const result = validateRaster({
        raster: createRaster(),
        bandMapping: STANDARD_MAPPING
    });

    assert.deepEqual(
        Array.from(result.bands.NIR.data),
        Array.from(new Float32Array([
            0.6, 0.7, 0.8, 0.9
        ]))
    );
});

test("raster validation accepts NoData without treating it as invalid", () => {
    const raster = createRaster();

    raster.bands.NIR.data[2] = -9999;

    const result = validateRaster({
        raster,
        bandMapping: STANDARD_MAPPING,
        noData: -9999
    });

    assert.equal(result.valid, true);
    assert.equal(result.bands.NIR.data[2], -9999);
});

test("raster validation does not treat zero as NoData", () => {
    const raster = createRaster();

    raster.bands.NIR.data[0] = 0;

    const result = validateRaster({
        raster,
        bandMapping: STANDARD_MAPPING,
        noData: -9999
    });

    assert.equal(result.valid, true);
    assert.equal(result.bands.NIR.data[0], 0);
});

test("raster validation rejects a missing raster", () => {
    assert.throws(
        () => validateRaster({
            raster: null,
            bandMapping: STANDARD_MAPPING
        }),
        {
            name: "TypeError"
        }
    );
});

test("raster validation rejects invalid dimensions", () => {
    const raster = createRaster({
        width: 0
    });

    assert.throws(
        () => validateRaster({
            raster,
            bandMapping: STANDARD_MAPPING
        }),
        /Raster width must be a positive integer/
    );
});

test("raster validation rejects a missing required band", () => {
    const raster = createRaster();

    delete raster.bands.NIR;

    assert.throws(
        () => validateRaster({
            raster,
            bandMapping: STANDARD_MAPPING
        }),
        /Required raster band "NIR" is missing/
    );
});

test("raster validation rejects a band with the wrong pixel count", () => {
    const raster = createRaster();

    raster.bands.NIR.data = new Float32Array([
        0.6, 0.7, 0.8
    ]);

    assert.throws(
        () => validateRaster({
            raster,
            bandMapping: STANDARD_MAPPING
        }),
        /Raster band "NIR" contains 3 pixels; expected 4/
    );
});

test("raster validation rejects non-finite pixel values", () => {
    const raster = createRaster();

    raster.bands.NIR.data[1] = Number.NaN;

    assert.throws(
        () => validateRaster({
            raster,
            bandMapping: STANDARD_MAPPING,
            noData: -9999
        }),
        /non-finite pixel value at index 1/
    );
});

test("raster validation rejects an invalid band mapping", () => {
    assert.throws(
        () => validateRaster({
            raster: createRaster(),
            bandMapping: {
                NIR: 0
            }
        }),
        /Band mapping for "NIR" must be a positive integer/
    );
});

test("raster validation rejects a missing band mapping", () => {
    assert.throws(
        () => validateRaster({
            raster: createRaster()
        }),
        {
            name: "TypeError"
        }
    );
});

test("raster validation rejects a non-finite NoData value", () => {
    assert.throws(
        () => validateRaster({
            raster: createRaster(),
            bandMapping: STANDARD_MAPPING,
            noData: Number.NaN
        }),
        /Raster NoData value must be finite/
    );
});

test("raster validation accepts band objects with direct typed-array data", () => {
    const raster = createRaster();

    raster.bands = {
        Blue: new Float32Array([0.1, 0.2, 0.3, 0.4]),
        Red: new Float32Array([0.2, 0.3, 0.4, 0.5]),
        NIR: new Float32Array([0.6, 0.7, 0.8, 0.9])
    };

    const result = validateRaster({
        raster,
        bandMapping: STANDARD_MAPPING
    });

    assert.equal(result.valid, true);
    assert.equal(result.pixelCount, 4);
});

