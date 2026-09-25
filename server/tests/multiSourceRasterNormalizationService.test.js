"use strict";

// ============================================================
// server/tests/multiSourceRasterNormalizationService.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.2.3.2
// Multi-Source Raster Normalization Service
//
// ============================================================

const assert = require("node:assert/strict");
const test = require("node:test");

const {
    normalizeMultiSourceRaster
} = require(
    "../services/remoteSensing/raster/multiSourceRasterNormalizationService"
);

function createRaster(
    values,
    overrides = {}
) {
    return {
        width: 2,
        height: 2,

        data: [
            Float32Array.from(values)
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
            fileName: "band.tif"
        },

        ...overrides
    };
}

function createSource(
    band,
    values,
    overrides = {}
) {
    return {
        band,
        raster:
            createRaster(
                values,
                overrides
            )
    };
}

test("normalizes two compatible source rasters", () => {
    const result =
        normalizeMultiSourceRaster([
            createSource(
                "Red",
                [1, 2, 3, 4]
            ),
            createSource(
                "NIR",
                [5, 6, 7, 8]
            )
        ]);

    assert.equal(
        result.contractVersion,
        "1.0"
    );

    assert.equal(
        result.width,
        2
    );

    assert.equal(
        result.height,
        2
    );

    assert.equal(
        result.pixelCount,
        4
    );

    assert.deepEqual(
        Object.keys(result.bands),
        [
            "Red",
            "NIR"
        ]
    );
});

test("preserves source pixel arrays", () => {
    const redData =
        Float32Array.from([
            1, 2, 3, 4
        ]);

    const nirData =
        Float32Array.from([
            5, 6, 7, 8
        ]);

    const red =
        createSource(
            "Red",
            redData
        );

    const nir =
        createSource(
            "NIR",
            nirData
        );

    /*
     * createSource wraps supplied values
     * through createRaster. Verify values
     * remain unchanged rather than being
     * recalculated or transformed.
     */
    const result =
        normalizeMultiSourceRaster([
            red,
            nir
        ]);

    assert.deepEqual(
        Array.from(
            result.bands.Red.data
        ),
        [
            1, 2, 3, 4
        ]
    );

    assert.deepEqual(
        Array.from(
            result.bands.NIR.data
        ),
        [
            5, 6, 7, 8
        ]
    );
});

test("supports canonical band names case-insensitively", () => {
    const result =
        normalizeMultiSourceRaster([
            createSource(
                "red",
                [1, 2, 3, 4]
            ),
            createSource(
                "nir",
                [5, 6, 7, 8]
            )
        ]);

    assert.ok(
        result.bands.Red
    );

    assert.ok(
        result.bands.NIR
    );
});

test("supports a complete five-band raster set", () => {
    const result =
        normalizeMultiSourceRaster([
            createSource(
                "Blue",
                [1, 2, 3, 4]
            ),
            createSource(
                "Green",
                [5, 6, 7, 8]
            ),
            createSource(
                "Red",
                [9, 10, 11, 12]
            ),
            createSource(
                "NIR",
                [13, 14, 15, 16]
            ),
            createSource(
                "SWIR",
                [17, 18, 19, 20]
            )
        ]);

    assert.deepEqual(
        Object.keys(result.bands),
        [
            "Blue",
            "Green",
            "Red",
            "NIR",
            "SWIR"
        ]
    );
});

test("preserves common spatial reference", () => {
    const result =
        normalizeMultiSourceRaster([
            createSource(
                "Red",
                [1, 2, 3, 4]
            ),
            createSource(
                "NIR",
                [5, 6, 7, 8]
            )
        ]);

    assert.deepEqual(
        result.spatialReference,
        {
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
            }
        }
    );
});

test("preserves common NoData value", () => {
    const result =
        normalizeMultiSourceRaster([
            createSource(
                "Red",
                [1, 2, 3, 4]
            ),
            createSource(
                "NIR",
                [5, 6, 7, 8]
            )
        ]);

    assert.equal(
        result.noData,
        -9999
    );
});

test("records multi-source metadata", () => {
    const result =
        normalizeMultiSourceRaster([
            createSource(
                "Red",
                [1, 2, 3, 4],
                {
                    metadata: {
                        fileName: "red.tif"
                    }
                }
            ),
            createSource(
                "NIR",
                [5, 6, 7, 8],
                {
                    metadata: {
                        fileName: "nir.tif"
                    }
                }
            )
        ]);

    assert.equal(
        result.metadata.sourceType,
        "Multi-Source GeoTIFF"
    );

    assert.equal(
        result.metadata.sourceCount,
        2
    );

    assert.deepEqual(
        result.metadata.sourceBands,
        [
            "Red",
            "NIR"
        ]
    );

    assert.equal(
        result.metadata.sourceMetadata[0]
            .metadata.fileName,
        "red.tif"
    );

    assert.equal(
        result.metadata.sourceMetadata[1]
            .metadata.fileName,
        "nir.tif"
    );
});

test("rejects duplicate canonical bands", () => {
    assert.throws(
        () =>
            normalizeMultiSourceRaster([
                createSource(
                    "Red",
                    [1, 2, 3, 4]
                ),
                createSource(
                    "red",
                    [5, 6, 7, 8]
                )
            ]),
        /Duplicate canonical band: Red/
    );
});

test("rejects unsupported canonical band", () => {
    assert.throws(
        () =>
            normalizeMultiSourceRaster([
                createSource(
                    "Thermal",
                    [1, 2, 3, 4]
                )
            ]),
        /Unsupported canonical band: Thermal/
    );
});

test("rejects incompatible width", () => {
    assert.throws(
        () =>
            normalizeMultiSourceRaster([
                createSource(
                    "Red",
                    [1, 2, 3, 4]
                ),
                createSource(
                    "NIR",
                    [5, 6, 7, 8],
                    {
                        width: 3,
                        data: [
                            Float32Array.from([
                                5, 6, 7, 8, 9, 10
                            ])
                        ]
                    }
                )
            ]),
        /compatibility validation failed/
    );
});

test("rejects incompatible resolution", () => {
    assert.throws(
        () =>
            normalizeMultiSourceRaster([
                createSource(
                    "Red",
                    [1, 2, 3, 4]
                ),
                createSource(
                    "NIR",
                    [5, 6, 7, 8],
                    {
                        resolution: [
                            20,
                            -20,
                            0
                        ]
                    }
                )
            ]),
        /compatibility validation failed/
    );
});

test("rejects incompatible coordinate reference", () => {
    assert.throws(
        () =>
            normalizeMultiSourceRaster([
                createSource(
                    "Red",
                    [1, 2, 3, 4]
                ),
                createSource(
                    "NIR",
                    [5, 6, 7, 8],
                    {
                        geoKeys: {
                            GeographicTypeGeoKey: 32644
                        }
                    }
                )
            ]),
        /compatibility validation failed/
    );
});

test("rejects incompatible NoData semantics", () => {
    assert.throws(
        () =>
            normalizeMultiSourceRaster([
                createSource(
                    "Red",
                    [1, 2, 3, 4],
                    {
                        noData: -9999
                    }
                ),
                createSource(
                    "NIR",
                    [5, 6, 7, 8],
                    {
                        noData: -999
                    }
                )
            ]),
        /compatibility validation failed/
    );
});

test("rejects missing source array", () => {
    assert.throws(
        () =>
            normalizeMultiSourceRaster(
                null
            ),
        {
            name: "TypeError"
        }
    );
});

test("rejects source without band", () => {
    assert.throws(
        () =>
            normalizeMultiSourceRaster([
                {
                    raster:
                        createRaster([
                            1, 2, 3, 4
                        ])
                }
            ]),
        /must define a canonical band/
    );
});

test("rejects source without raster", () => {
    assert.throws(
        () =>
            normalizeMultiSourceRaster([
                {
                    band: "Red"
                }
            ]),
        /must contain a raster object/
    );
});

test("rejects raster with no pixel data", () => {
    assert.throws(
        () =>
            normalizeMultiSourceRaster([
                createSource(
                    "Red",
                    [1, 2, 3, 4],
                    {
                        data: []
                    }
                )
            ]),
        /contains no band data/
    );
});

test("rejects multi-band source", () => {
    assert.throws(
        () =>
            normalizeMultiSourceRaster([
                createSource(
                    "Red",
                    [1, 2, 3, 4],
                    {
                        data: [
                            Float32Array.from([
                                1, 2, 3, 4
                            ]),
                            Float32Array.from([
                                5, 6, 7, 8
                            ])
                        ]
                    }
                )
            ]),
        /must contain exactly one source band/
    );
});

test("rejects incorrect pixel data length", () => {
    assert.throws(
        () =>
            normalizeMultiSourceRaster([
                createSource(
                    "Red",
                    [1, 2, 3, 4],
                    {
                        data: [
                            Float32Array.from([
                                1, 2, 3
                            ])
                        ]
                    }
                )
            ]),
        /invalid pixel data length/
    );
});

test("supports direct single-band typed-array data", () => {
    const raster =
        createRaster(
            [1, 2, 3, 4]
        );

    raster.data =
        Float32Array.from([
            1, 2, 3, 4
        ]);

    const result =
        normalizeMultiSourceRaster([
            {
                band: "Red",
                raster
            }
        ]);

    assert.deepEqual(
        Array.from(
            result.bands.Red.data
        ),
        [
            1, 2, 3, 4
        ]
    );
});

