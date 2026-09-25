"use strict";

// ============================================================
// server/tests/multiSourceRasterContract.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.2.3.1
// Multi-Source Raster Compatibility Contract
//
// ============================================================

const assert = require("node:assert/strict");
const test = require("node:test");

const {
    MULTI_SOURCE_RASTER_CONTRACT_VERSION,
    REQUIRED_COMPATIBILITY_FIELDS,
    validateMultiSourceRasterCompatibility
} = require("../scientific/remoteSensing/raster/multiSourceRasterContract");

function createRaster(overrides = {}) {
    return {
        width: 2,
        height: 2,
        pixelCount: 4,

        origin: [
            100,
            200,
            0
        ],

        resolution: [
            10,
            -10,
            0
        ],

        boundingBox: [
            100,
            160,
            120,
            200
        ],

        geoKeys: {
            GeographicTypeGeoKey: 4326
        },

        ...overrides
    };
}

test("multi-source contract exposes version 1.0", () => {
    assert.equal(
        MULTI_SOURCE_RASTER_CONTRACT_VERSION,
        "1.0"
    );
});

test("multi-source contract defines required compatibility fields", () => {
    assert.deepEqual(
        REQUIRED_COMPATIBILITY_FIELDS,
        [
            "width",
            "height",
            "pixelCount",
            "origin",
            "resolution",
            "boundingBox",
            "geoKeys"
        ]
    );
});

test("compatible raster sources pass validation", () => {
    const result =
        validateMultiSourceRasterCompatibility([
            createRaster(),
            createRaster()
        ]);

    assert.equal(
        result.valid,
        true
    );

    assert.equal(
        result.sourceCount,
        2
    );

    assert.equal(
        result.referenceIndex,
        0
    );

    assert.equal(
        result.comparisons.length,
        1
    );

    assert.equal(
        result.comparisons[0].compatible,
        true
    );
});

test("single raster source is valid", () => {
    const result =
        validateMultiSourceRasterCompatibility([
            createRaster()
        ]);

    assert.equal(
        result.valid,
        true
    );

    assert.equal(
        result.sourceCount,
        1
    );

    assert.deepEqual(
        result.comparisons,
        []
    );
});

test("width mismatch is detected", () => {
    const result =
        validateMultiSourceRasterCompatibility([
            createRaster(),
            createRaster({
                width: 3,
                pixelCount: 6
            })
        ]);

    assert.equal(
        result.valid,
        false
    );

    assert.deepEqual(
        result.mismatches,
        [
            {
                candidateIndex: 1,
                fields: [
                    "width",
                    "pixelCount"
                ]
            }
        ]
    );
});

test("height mismatch is detected", () => {
    const result =
        validateMultiSourceRasterCompatibility([
            createRaster(),
            createRaster({
                height: 3,
                pixelCount: 6
            })
        ]);

    assert.equal(
        result.valid,
        false
    );

    assert.deepEqual(
        result.mismatches,
        [
            {
                candidateIndex: 1,
                fields: [
                    "height",
                    "pixelCount"
                ]
            }
        ]
    );
});

test("origin mismatch is detected", () => {
    const result =
        validateMultiSourceRasterCompatibility([
            createRaster(),
            createRaster({
                origin: [
                    101,
                    200,
                    0
                ]
            })
        ]);

    assert.equal(
        result.valid,
        false
    );

    assert.deepEqual(
        result.mismatches,
        [
            {
                candidateIndex: 1,
                fields: [
                    "origin"
                ]
            }
        ]
    );
});

test("resolution mismatch is detected", () => {
    const result =
        validateMultiSourceRasterCompatibility([
            createRaster(),
            createRaster({
                resolution: [
                    20,
                    -20,
                    0
                ]
            })
        ]);

    assert.equal(
        result.valid,
        false
    );

    assert.deepEqual(
        result.mismatches,
        [
            {
                candidateIndex: 1,
                fields: [
                    "resolution"
                ]
            }
        ]
    );
});

test("bounding box mismatch is detected", () => {
    const result =
        validateMultiSourceRasterCompatibility([
            createRaster(),
            createRaster({
                boundingBox: [
                    100,
                    150,
                    120,
                    200
                ]
            })
        ]);

    assert.equal(
        result.valid,
        false
    );

    assert.deepEqual(
        result.mismatches,
        [
            {
                candidateIndex: 1,
                fields: [
                    "boundingBox"
                ]
            }
        ]
    );
});

test("coordinate reference mismatch is detected", () => {
    const result =
        validateMultiSourceRasterCompatibility([
            createRaster(),
            createRaster({
                geoKeys: {
                    GeographicTypeGeoKey: 32644
                }
            })
        ]);

    assert.equal(
        result.valid,
        false
    );

    assert.deepEqual(
        result.mismatches,
        [
            {
                candidateIndex: 1,
                fields: [
                    "geoKeys"
                ]
            }
        ]
    );
});

test("multiple compatibility mismatches are reported together", () => {
    const result =
        validateMultiSourceRasterCompatibility([
            createRaster(),
            createRaster({
                width: 3,
                height: 3,
                pixelCount: 9,
                resolution: [
                    20,
                    -20,
                    0
                ],
                geoKeys: {
                    GeographicTypeGeoKey: 32644
                }
            })
        ]);

    assert.equal(
        result.valid,
        false
    );

    assert.deepEqual(
        result.mismatches,
        [
            {
                candidateIndex: 1,
                fields: [
                    "width",
                    "height",
                    "pixelCount",
                    "resolution",
                    "geoKeys"
                ]
            }
        ]
    );
});

test("multiple candidate rasters are compared against the first raster", () => {
    const result =
        validateMultiSourceRasterCompatibility([
            createRaster(),

            createRaster({
                origin: [
                    101,
                    200,
                    0
                ]
            }),

            createRaster({
                resolution: [
                    20,
                    -20,
                    0
                ]
            })
        ]);

    assert.equal(
        result.valid,
        false
    );

    assert.equal(
        result.comparisons.length,
        2
    );

    assert.deepEqual(
        result.mismatches,
        [
            {
                candidateIndex: 1,
                fields: [
                    "origin"
                ]
            },
            {
                candidateIndex: 2,
                fields: [
                    "resolution"
                ]
            }
        ]
    );
});

test("missing raster array is rejected", () => {
    assert.throws(
        () =>
            validateMultiSourceRasterCompatibility(
                null
            ),
        {
            name: "TypeError"
        }
    );
});

test("empty raster array is rejected", () => {
    assert.throws(
        () =>
            validateMultiSourceRasterCompatibility(
                []
            ),
        /At least one raster source is required/
    );
});

test("invalid raster source is rejected", () => {
    assert.throws(
        () =>
            validateMultiSourceRasterCompatibility([
                null
            ]),
        {
            name: "TypeError"
        }
    );
});

test("invalid width is rejected", () => {
    assert.throws(
        () =>
            validateMultiSourceRasterCompatibility([
                createRaster({
                    width: 0
                })
            ]),
        /invalid width/
    );
});

test("invalid pixel count is rejected", () => {
    assert.throws(
        () =>
            validateMultiSourceRasterCompatibility([
                createRaster({
                    pixelCount: 3
                })
            ]),
        /invalid pixelCount/
    );
});

test("missing origin is rejected", () => {
    const raster =
        createRaster();

    delete raster.origin;

    assert.throws(
        () =>
            validateMultiSourceRasterCompatibility([
                raster
            ]),
        /invalid origin/
    );
});

test("non-finite coordinate value is rejected", () => {
    const raster =
        createRaster();

    raster.resolution[0] =
        Number.NaN;

    assert.throws(
        () =>
            validateMultiSourceRasterCompatibility([
                raster
            ]),
        /non-finite resolution value/
    );
});

test("missing geoKeys object is rejected", () => {
    const raster =
        createRaster();

    delete raster.geoKeys;

    assert.throws(
        () =>
            validateMultiSourceRasterCompatibility([
                raster
            ]),
        /invalid geoKeys/
    );
});

test("NoData mismatch is detected", () => {
    const result =
        validateMultiSourceRasterCompatibility([
            createRaster({
                noData: -9999
            }),
            createRaster({
                noData: -999
            })
        ]);

    assert.equal(
        result.valid,
        false
    );

    assert.deepEqual(
        result.mismatches,
        [
            {
                candidateIndex: 1,
                fields: [
                    "noData"
                ]
            }
        ]
    );
});

test("missing and null NoData are treated as equivalent absence", () => {
    const first =
        createRaster();

    delete first.noData;

    const second =
        createRaster({
            noData: null
        });

    const result =
        validateMultiSourceRasterCompatibility([
            first,
            second
        ]);

    assert.equal(
        result.valid,
        true
    );
});

test("typed-array coordinate values can be compared", () => {
    const first =
        createRaster({
            origin:
                new Float64Array([
                    100,
                    200,
                    0
                ])
        });

    const second =
        createRaster({
            origin:
                new Float64Array([
                    100,
                    200,
                    0
                ])
        });

    const result =
        validateMultiSourceRasterCompatibility([
            first,
            second
        ]);

    assert.equal(
        result.valid,
        true
    );
});

