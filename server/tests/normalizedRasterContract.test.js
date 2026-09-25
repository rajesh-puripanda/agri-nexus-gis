"use strict";

// ============================================================
// server/tests/normalizedRasterContract.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.2.2.1  Normalized Raster Contract
//
// ============================================================

const assert = require("node:assert/strict");
const test = require("node:test");

const {
    NORMALIZED_RASTER_CONTRACT_VERSION,
    CANONICAL_BAND_NAMES,
    validateNormalizedRaster,
    createNormalizedRasterContract
} = require("../scientific/remoteSensing/raster/normalizedRasterContract");

function createValidRaster() {
    return {
        contractVersion: NORMALIZED_RASTER_CONTRACT_VERSION,

        width: 2,
        height: 2,
        pixelCount: 4,

        bands: {
            Blue: {
                data: new Float32Array([
                    0.1, 0.2,
                    0.3, 0.4
                ]),
                sourceBand: 1
            },

            Green: {
                data: new Float32Array([
                    0.2, 0.3,
                    0.4, 0.5
                ]),
                sourceBand: 2
            },

            Red: {
                data: new Float32Array([
                    0.3, 0.4,
                    0.5, 0.6
                ]),
                sourceBand: 3
            },

            NIR: {
                data: new Float32Array([
                    0.6, 0.7,
                    0.8, 0.9
                ]),
                sourceBand: 4
            },

            SWIR: {
                data: new Float32Array([
                    0.5, 0.6,
                    0.7, 0.8
                ]),
                sourceBand: 5
            }
        },

        noData: -9999,

        spatialReference: {
            origin: [100, 200, 0],
            resolution: [10, -10, 0],
            boundingBox: [
                100,
                160,
                120,
                200
            ],
            geoKeys: {
                GeographicTypeGeoKey: 4326
            }
        },

        metadata: {
            sourceType: "GeoTIFF",
            sourceFiles: [
                "multiband-fixture.tif"
            ]
        }
    };
}

test("normalized raster contract exposes version 1.0", () => {
    assert.equal(
        NORMALIZED_RASTER_CONTRACT_VERSION,
        "1.0"
    );
});

test("normalized raster contract defines canonical spectral band names", () => {
    assert.deepEqual(
        CANONICAL_BAND_NAMES,
        [
            "Blue",
            "Green",
            "Red",
            "NIR",
            "SWIR"
        ]
    );
});

test("valid normalized raster passes contract validation", () => {
    const result =
        validateNormalizedRaster(
            createValidRaster()
        );

    assert.equal(result.valid, true);
    assert.equal(
        result.contractVersion,
        "1.0"
    );
    assert.equal(result.width, 2);
    assert.equal(result.height, 2);
    assert.equal(result.pixelCount, 4);

    assert.deepEqual(
        result.bandNames,
        [
            "Blue",
            "Green",
            "Red",
            "NIR",
            "SWIR"
        ]
    );
});

test("normalized raster preserves canonical band data", () => {
    const raster =
        createValidRaster();

    const result =
        validateNormalizedRaster(
            raster
        );

    assert.deepEqual(
        Array.from(
            raster.bands.NIR.data
        ),
        Array.from(
            new Float32Array([
                0.6, 0.7,
                0.8, 0.9
            ])
        )
    );

    assert.equal(
        result.valid,
        true
    );
});

test("normalized raster permits a subset of canonical bands", () => {
    const raster =
        createValidRaster();

    raster.bands = {
        Red: raster.bands.Red,
        NIR: raster.bands.NIR
    };

    const result =
        validateNormalizedRaster(
            raster
        );

    assert.equal(
        result.valid,
        true
    );

    assert.deepEqual(
        result.bandNames,
        [
            "Red",
            "NIR"
        ]
    );
});

test("normalized raster requires at least one band", () => {
    const raster =
        createValidRaster();

    raster.bands = {};

    assert.throws(
        () =>
            validateNormalizedRaster(
                raster
            ),
        /must contain at least one band/
    );
});

test("normalized raster rejects unsupported band names", () => {
    const raster =
        createValidRaster();

    raster.bands.Thermal = {
        data: new Float32Array([
            1, 2, 3, 4
        ])
    };

    assert.throws(
        () =>
            validateNormalizedRaster(
                raster
            ),
        /Unsupported normalized raster band "Thermal"/
    );
});

test("normalized raster requires pixelCount to match dimensions", () => {
    const raster =
        createValidRaster();

    raster.pixelCount = 3;

    assert.throws(
        () =>
            validateNormalizedRaster(
                raster
            ),
        /pixelCount must equal width  height/
    );
});

test("normalized raster rejects incorrect band length", () => {
    const raster =
        createValidRaster();

    raster.bands.NIR.data =
        new Float32Array([
            0.6, 0.7, 0.8
        ]);

    assert.throws(
        () =>
            validateNormalizedRaster(
                raster
            ),
        /contains 3 pixels; expected 4/
    );
});

test("normalized raster preserves NoData without interpreting it", () => {
    const raster =
        createValidRaster();

    raster.bands.NIR.data[2] =
        -9999;

    const result =
        validateNormalizedRaster(
            raster
        );

    assert.equal(
        result.valid,
        true
    );

    assert.equal(
        raster.bands.NIR.data[2],
        -9999
    );

    assert.equal(
        result.noData,
        -9999
    );
});

test("normalized raster accepts zero pixel values", () => {
    const raster =
        createValidRaster();

    raster.bands.Red.data[0] =
        0;

    const result =
        validateNormalizedRaster(
            raster
        );

    assert.equal(
        result.valid,
        true
    );
});

test("normalized raster rejects non-finite NoData", () => {
    const raster =
        createValidRaster();

    raster.noData =
        Number.NaN;

    assert.throws(
        () =>
            validateNormalizedRaster(
                raster
            ),
        /NoData value must be finite/
    );
});

test("normalized raster rejects invalid source band numbers", () => {
    const raster =
        createValidRaster();

    raster.bands.NIR.sourceBand =
        0;

    assert.throws(
        () =>
            validateNormalizedRaster(
                raster
            ),
        /sourceBand must be a positive integer/
    );
});

test("normalized raster accepts bands without sourceBand", () => {
    const raster =
        createValidRaster();

    delete raster.bands.NIR.sourceBand;

    const result =
        validateNormalizedRaster(
            raster
        );

    assert.equal(
        result.valid,
        true
    );
});

test("normalized raster rejects invalid spatialReference", () => {
    const raster =
        createValidRaster();

    raster.spatialReference =
        "EPSG:4326";

    assert.throws(
        () =>
            validateNormalizedRaster(
                raster
            ),
        /spatialReference must be an object/
    );
});

test("normalized raster rejects invalid metadata", () => {
    const raster =
        createValidRaster();

    raster.metadata =
        "GeoTIFF";

    assert.throws(
        () =>
            validateNormalizedRaster(
                raster
            ),
        /metadata must be an object/
    );
});

test("normalized raster rejects missing raster object", () => {
    assert.throws(
        () =>
            validateNormalizedRaster(
                null
            ),
        {
            name: "TypeError"
        }
    );
});

test("factory creates and validates a normalized raster", () => {
    const raster =
        createNormalizedRasterContract({
            width: 2,
            height: 2,

            bands: {
                Red: {
                    data: new Float32Array([
                        0.1, 0.2,
                        0.3, 0.4
                    ]),
                    sourceBand: 3
                },

                NIR: {
                    data: new Float32Array([
                        0.5, 0.6,
                        0.7, 0.8
                    ]),
                    sourceBand: 4
                }
            },

            noData: -9999,

            spatialReference: {
                geoKeys: {
                    GeographicTypeGeoKey: 4326
                }
            },

            metadata: {
                sourceType: "GeoTIFF"
            }
        });

    assert.equal(
        raster.contractVersion,
        "1.0"
    );

    assert.equal(
        raster.width,
        2
    );

    assert.equal(
        raster.height,
        2
    );

    assert.equal(
        raster.pixelCount,
        4
    );

    assert.equal(
        raster.bands.Red.sourceBand,
        3
    );

    assert.equal(
        raster.bands.NIR.sourceBand,
        4
    );

    assert.equal(
        raster.noData,
        -9999
    );
});
