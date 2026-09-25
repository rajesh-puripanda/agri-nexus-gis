"use strict";

// ============================================================
// server/tests/rasterNormalizationService.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.2.2.2  Raster Normalization Service
//
// ============================================================

const assert = require("node:assert/strict");
const test = require("node:test");

const {
    normalizeRaster
} = require("../services/remoteSensing/raster/rasterNormalizationService");

function createReaderRaster() {
    return {
        width: 2,
        height: 2,
        samplesPerPixel: 5,

        data: [
            new Float32Array([
                0.10, 0.20,
                0.30, 0.40
            ]),

            new Float32Array([
                0.20, 0.30,
                0.40, 0.50
            ]),

            new Float32Array([
                0.30, 0.40,
                0.50, 0.60
            ]),

            new Float32Array([
                0.60, 0.70,
                0.80, 0.90
            ]),

            new Float32Array([
                0.50, 0.60,
                0.70, 0.80
            ])
        ],

        noData: -9999,

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

        metadata: {
            fileName:
                "multiband-fixture.tif",
            imageCount: 1
        }
    };
}

const STANDARD_MAPPING = {
    Blue: 1,
    Green: 2,
    Red: 3,
    NIR: 4,
    SWIR: 5
};

test("normalization creates a canonical normalized raster", () => {
    const raster =
        normalizeRaster({
            raster:
                createReaderRaster(),
            bandMapping:
                STANDARD_MAPPING
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

    assert.deepEqual(
        Object.keys(
            raster.bands
        ),
        [
            "Blue",
            "Green",
            "Red",
            "NIR",
            "SWIR"
        ]
    );
});

test("normalization maps source band numbers correctly", () => {
    const raster =
        normalizeRaster({
            raster:
                createReaderRaster(),
            bandMapping:
                STANDARD_MAPPING
        });

    assert.equal(
        raster.bands.Blue.sourceBand,
        1
    );

    assert.equal(
        raster.bands.Green.sourceBand,
        2
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
        raster.bands.SWIR.sourceBand,
        5
    );
});

test("normalization preserves pixel values exactly", () => {
    const source =
        createReaderRaster();

    const raster =
        normalizeRaster({
            raster: source,
            bandMapping:
                STANDARD_MAPPING
        });

    assert.deepEqual(
        Array.from(
            raster.bands.Red.data
        ),
        Array.from(
            source.data[2]
        )
    );

    assert.deepEqual(
        Array.from(
            raster.bands.NIR.data
        ),
        Array.from(
            source.data[3]
        )
    );
});

test("normalization preserves source typed-array references", () => {
    const source =
        createReaderRaster();

    const raster =
        normalizeRaster({
            raster: source,
            bandMapping:
                STANDARD_MAPPING
        });

    assert.strictEqual(
        raster.bands.Blue.data,
        source.data[0]
    );

    assert.strictEqual(
        raster.bands.NIR.data,
        source.data[3]
    );
});

test("normalization supports a subset of required bands", () => {
    const source =
        createReaderRaster();

    const raster =
        normalizeRaster({
            raster: source,
            bandMapping: {
                Red: 3,
                NIR: 4
            }
        });

    assert.deepEqual(
        Object.keys(
            raster.bands
        ),
        [
            "Red",
            "NIR"
        ]
    );

    assert.equal(
        raster.bands.Red.sourceBand,
        3
    );

    assert.equal(
        raster.bands.NIR.sourceBand,
        4
    );
});

test("normalization preserves NoData from the source raster", () => {
    const source =
        createReaderRaster();

    const raster =
        normalizeRaster({
            raster: source,
            bandMapping:
                STANDARD_MAPPING
        });

    assert.equal(
        raster.noData,
        -9999
    );
});

test("normalization accepts an explicit NoData override", () => {
    const source =
        createReaderRaster();

    const raster =
        normalizeRaster({
            raster: source,
            bandMapping:
                STANDARD_MAPPING,
            noData: -32768
        });

    assert.equal(
        raster.noData,
        -32768
    );
});

test("normalization preserves spatial reference information", () => {
    const source =
        createReaderRaster();

    const raster =
        normalizeRaster({
            raster: source,
            bandMapping:
                STANDARD_MAPPING
        });

    assert.deepEqual(
        raster.spatialReference.origin,
        [
            100,
            200,
            0
        ]
    );

    assert.deepEqual(
        raster.spatialReference.resolution,
        [
            10,
            -10,
            0
        ]
    );

    assert.deepEqual(
        raster.spatialReference.boundingBox,
        [
            100,
            160,
            120,
            200
        ]
    );

    assert.equal(
        raster.spatialReference
            .geoKeys
            .GeographicTypeGeoKey,
        4326
    );
});

test("normalization preserves source metadata", () => {
    const source =
        createReaderRaster();

    const raster =
        normalizeRaster({
            raster: source,
            bandMapping:
                STANDARD_MAPPING
        });

    assert.equal(
        raster.metadata.fileName,
        "multiband-fixture.tif"
    );

    assert.equal(
        raster.metadata.imageCount,
        1
    );

    assert.equal(
        raster.metadata.sourceType,
        "GeoTIFF"
    );
});

test("normalization rejects a missing raster", () => {
    assert.throws(
        () =>
            normalizeRaster({
                raster: null,
                bandMapping:
                    STANDARD_MAPPING
            }),
        {
            name: "TypeError"
        }
    );
});

test("normalization rejects missing raster data", () => {
    const source =
        createReaderRaster();

    delete source.data;

    assert.throws(
        () =>
            normalizeRaster({
                raster: source,
                bandMapping:
                    STANDARD_MAPPING
            }),
        /Raster data must be an array of source bands/
    );
});

test("normalization rejects an empty raster data array", () => {
    const source =
        createReaderRaster();

    source.data = [];

    assert.throws(
        () =>
            normalizeRaster({
                raster: source,
                bandMapping:
                    STANDARD_MAPPING
            }),
        /must contain at least one source band/
    );
});

test("normalization rejects a missing band mapping", () => {
    assert.throws(
        () =>
            normalizeRaster({
                raster:
                    createReaderRaster()
            }),
        {
            name: "TypeError"
        }
    );
});

test("normalization rejects an unsupported canonical band name", () => {
    assert.throws(
        () =>
            normalizeRaster({
                raster:
                    createReaderRaster(),
                bandMapping: {
                    Thermal: 1
                }
            }),
        /Unsupported normalized raster band "Thermal"/
    );
});

test("normalization rejects a non-positive source band number", () => {
    assert.throws(
        () =>
            normalizeRaster({
                raster:
                    createReaderRaster(),
                bandMapping: {
                    NIR: 0
                }
            }),
        /Band mapping for "NIR" must be a positive integer/
    );
});

test("normalization rejects a source band outside the raster range", () => {
    assert.throws(
        () =>
            normalizeRaster({
                raster:
                    createReaderRaster(),
                bandMapping: {
                    NIR: 6
                }
            }),
        /Source band 6 for "NIR" is outside the raster band range/
    );
});

test("normalization rejects a source band with incorrect pixel count", () => {
    const source =
        createReaderRaster();

    source.data[3] =
        new Float32Array([
            0.6,
            0.7,
            0.8
        ]);

    assert.throws(
        () =>
            normalizeRaster({
                raster: source,
                bandMapping: {
                    NIR: 4
                }
            }),
        /Source band 4 for "NIR" contains 3 pixels; expected 4/
    );
});

test("normalization preserves NoData pixel values without converting them", () => {
    const source =
        createReaderRaster();

    source.data[3][2] =
        -9999;

    const raster =
        normalizeRaster({
            raster: source,
            bandMapping: {
                NIR: 4
            }
        });

    assert.equal(
        raster.bands.NIR.data[2],
        -9999
    );
});

test("normalization preserves zero as a legitimate pixel value", () => {
    const source =
        createReaderRaster();

    source.data[3][0] =
        0;

    const raster =
        normalizeRaster({
            raster: source,
            bandMapping: {
                NIR: 4
            }
        });

    assert.equal(
        raster.bands.NIR.data[0],
        0
    );
});
