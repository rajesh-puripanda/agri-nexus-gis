"use strict";

// ============================================================
// server/tests/temporalRasterMetadataContract.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.2  Temporal Raster Metadata Contract
//
// Scope:
//   - Contract structure
//   - Required fields
//   - Raster dimensions
//   - Pixel-count validation
//   - Spatial reference validation
//   - NoData validation
//   - Band mapping validation
//   - Acquisition context validation
//   - Processing context validation
//   - Optional metadata
//   - Contract factory
//
// Scientific raster processing is intentionally NOT tested here.
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    TEMPORAL_RASTER_METADATA_CONTRACT_VERSION,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    validateTemporalRasterMetadata,
    createTemporalRasterMetadataContract
} = require("../scientific/remoteSensing/temporal/temporalRasterMetadataContract");

function createValidMetadata(overrides = {}) {
    return {
        contractVersion: "1.0",
        rasterId: "S2A_TEST_SCENE_001_NDVI",
        sourcePath: "data/rasters/S2A_TEST_SCENE_001_NDVI.tif",

        width: 100,
        height: 80,
        pixelCount: 8000,
        bandCount: 1,

        spatialReference: {
            crs: "EPSG:4326",
            origin: [83.20, 17.75],
            resolution: {
                x: 0.0001,
                y: 0.0001
            },
            boundingBox: [
                83.20,
                17.65,
                83.30,
                17.75
            ]
        },

        noData: -9999,

        bandMapping: {
            output: 1
        },

        acquisitionContext: {
            observationDate: "2026-01-15",
            acquisitionDate: "2026-01-15T05:30:00Z",
            sensor: "Sentinel-2",
            sceneId: "S2A_TEST_SCENE_001"
        },

        processingContext: {
            processingVersion: "1.0",
            source: "test"
        },

        ...overrides
    };
}

test("contract exposes version 1.0", () => {
    assert.equal(
        TEMPORAL_RASTER_METADATA_CONTRACT_VERSION,
        "1.0"
    );
});

test("contract declares ten required fields and three optional fields", () => {
    assert.equal(REQUIRED_FIELDS.length, 10);
    assert.equal(OPTIONAL_FIELDS.length, 3);

    assert.deepEqual(
        REQUIRED_FIELDS,
        [
            "contractVersion",
            "rasterId",
            "sourcePath",
            "width",
            "height",
            "pixelCount",
            "bandCount",
            "spatialReference",
            "acquisitionContext",
            "processingContext"
        ]
    );

    assert.deepEqual(
        OPTIONAL_FIELDS,
        [
            "noData",
            "bandMapping",
            "metadata"
        ]
    );
});

test("valid temporal raster metadata passes validation", () => {
    const result =
        validateTemporalRasterMetadata(
            createValidMetadata()
        );

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
});

test("missing required fields are rejected", () => {
    const metadata =
        createValidMetadata();

    delete metadata.rasterId;
    delete metadata.sourcePath;
    delete metadata.spatialReference;
    delete metadata.acquisitionContext;

    const result =
        validateTemporalRasterMetadata(
            metadata
        );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("rasterId")
        )
    );

    assert.ok(
        result.errors.some(error =>
            error.includes("sourcePath")
        )
    );

    assert.ok(
        result.errors.some(error =>
            error.includes("spatialReference")
        )
    );

    assert.ok(
        result.errors.some(error =>
            error.includes("acquisitionContext")
        )
    );
});

test("invalid raster dimensions are rejected", () => {
    const result =
        validateTemporalRasterMetadata(
            createValidMetadata({
                width: 0,
                height: 80,
                pixelCount: 0
            })
        );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("width must be a positive integer")
        )
    );
});

test("pixel count mismatch is rejected", () => {
    const result =
        validateTemporalRasterMetadata(
            createValidMetadata({
                pixelCount: 7999
            })
        );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes(
                "pixelCount must equal width * height"
            )
        )
    );
});

test("invalid band count is rejected", () => {
    const result =
        validateTemporalRasterMetadata(
            createValidMetadata({
                bandCount: 0
            })
        );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes(
                "bandCount must be a positive integer"
            )
        )
    );
});

test("invalid spatial reference object is rejected", () => {
    const result =
        validateTemporalRasterMetadata(
            createValidMetadata({
                spatialReference: null
            })
        );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes(
                "spatialReference must be a plain object"
            )
        )
    );
});

test("invalid CRS is rejected", () => {
    const result =
        validateTemporalRasterMetadata(
            createValidMetadata({
                spatialReference: {
                    crs: "",
                    origin: [83.20, 17.75],
                    resolution: {
                        x: 0.0001,
                        y: 0.0001
                    },
                    boundingBox: [
                        83.20,
                        17.65,
                        83.30,
                        17.75
                    ]
                }
            })
        );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes(
                "spatialReference.crs"
            )
        )
    );
});

test("invalid spatial origin is rejected", () => {
    const result =
        validateTemporalRasterMetadata(
            createValidMetadata({
                spatialReference: {
                    ...createValidMetadata().spatialReference,
                    origin: [83.20]
                }
            })
        );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes(
                "spatialReference.origin"
            )
        )
    );
});

test("invalid spatial resolution is rejected", () => {
    const result =
        validateTemporalRasterMetadata(
            createValidMetadata({
                spatialReference: {
                    ...createValidMetadata().spatialReference,
                    resolution: {
                        x: 0,
                        y: 0.0001
                    }
                }
            })
        );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes(
                "spatialReference.resolution.x"
            )
        )
    );
});

test("invalid bounding box is rejected", () => {
    const result =
        validateTemporalRasterMetadata(
            createValidMetadata({
                spatialReference: {
                    ...createValidMetadata().spatialReference,
                    boundingBox: [
                        83.20,
                        17.65,
                        83.30
                    ]
                }
            })
        );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes(
                "spatialReference.boundingBox"
            )
        )
    );
});

test("invalid noData value is rejected", () => {
    const result =
        validateTemporalRasterMetadata(
            createValidMetadata({
                noData: "NO_DATA"
            })
        );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes(
                "noData must be a finite number"
            )
        )
    );
});

test("invalid band mapping is rejected", () => {
    const result =
        validateTemporalRasterMetadata(
            createValidMetadata({
                bandMapping: []
            })
        );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes(
                "bandMapping must be a plain object"
            )
        )
    );
});

test("missing acquisition context is rejected", () => {
    const result =
        validateTemporalRasterMetadata(
            createValidMetadata({
                acquisitionContext: null
            })
        );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes(
                "acquisitionContext must be a plain object"
            )
        )
    );
});

test("missing processing context is rejected", () => {
    const result =
        validateTemporalRasterMetadata(
            createValidMetadata({
                processingContext: null
            })
        );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes(
                "processingContext must be a plain object"
            )
        )
    );
});

test("optional metadata is accepted", () => {
    const result =
        validateTemporalRasterMetadata(
            createValidMetadata({
                metadata: {
                    platform: "Sentinel-2A",
                    orbit: "TEST"
                }
            })
        );

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
});

test("factory returns a validated raster metadata contract", () => {
    const result =
        createTemporalRasterMetadataContract(
            createValidMetadata()
        );

    assert.equal(
        result.contractVersion,
        "1.0"
    );

    assert.equal(
        result.rasterId,
        "S2A_TEST_SCENE_001_NDVI"
    );

    assert.equal(
        result.width,
        100
    );

    assert.equal(
        result.height,
        80
    );

    assert.equal(
        result.pixelCount,
        8000
    );

    assert.equal(
        result.bandCount,
        1
    );
});

test("factory rejects invalid raster metadata", () => {
    assert.throws(
        () =>
            createTemporalRasterMetadataContract(
                createValidMetadata({
                    pixelCount: 7999
                })
            ),
        /Invalid temporal raster metadata/
    );
});
