"use strict";

// ============================================================
// server/tests/rasterIndexBatchWorkflowIntegration.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.4.3
// Batch Raster Workflow Real HTTP Integration Regression
//
// Real integration:
//
//   HTTP POST
//      -> Batch Controller
//      -> Batch Workflow Service
//      -> Single-Index Workflow  N
//      -> GeoTIFF Reader
//      -> Validation
//      -> Normalization
//      -> Index Calculation
//      -> Classification
//      -> GeoTIFF Output
//      -> HTTP Response
//
// No workflow-service mocking is used.
// ============================================================

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const request = require("supertest");
const geotiff = require("geotiff");

const {
    app
} = require("../server");

const {
    readGeoTiff
} = require(
    "../services/remoteSensing/raster/" +
    "rasterReaderService"
);

const {
    getIndexDefinition
} = require(
    "../scientific/remoteSensing/indices/" +
    "indexRegistry"
);

// ------------------------------------------------------------
// Fixture spatial reference
// ------------------------------------------------------------

const spatialReference = {
    origin: [100, 200, 0],

    resolution: [10, -10, 0],

    boundingBox: [
        100,
        180,
        140,
        200
    ],

    geoKeys: {
        GeographicTypeGeoKey: 4326,
        GTModelTypeGeoKey: 2,
        GTRasterTypeGeoKey: 1
    }
};

// ------------------------------------------------------------
// Five-band deterministic fixture
// ------------------------------------------------------------

const sourceBands = {
    Blue: new Float32Array([
        0.05, 0.05,
        0.06, 0.06,
        0.07, 0.07,
        0.08, 0.08
    ]),

    Green: new Float32Array([
        0.10, 0.10,
        0.12, 0.12,
        0.14, 0.14,
        0.16, 0.16
    ]),

    Red: new Float32Array([
        0.10, 0.10,
        0.20, 0.20,
        0.30, 0.30,
        0.40, 0.40
    ]),

    NIR: new Float32Array([
        0.30, 0.30,
        0.40, 0.40,
        0.50, 0.50,
        0.60, 0.60
    ]),

    SWIR: new Float32Array([
        0.15, 0.15,
        0.20, 0.20,
        0.25, 0.25,
        0.30, 0.30
    ])
};

// ------------------------------------------------------------
// All registered raster indices
// ------------------------------------------------------------

const indexCodes = [
    "NDVI",
    "EVI",
    "SAVI",
    "GNDVI",
    "ARVI",
    "NDWI",
    "NDMI"
];

// ------------------------------------------------------------
// Common source-band mapping
// ------------------------------------------------------------

const bandMapping = {
    Blue: 1,
    Green: 2,
    Red: 3,
    NIR: 4,
    SWIR: 5
};

// ------------------------------------------------------------
// Fixture GeoTIFF
// ------------------------------------------------------------

async function createFixtureGeoTiff(filePath) {
    const width = 4;
    const height = 2;
    const pixelCount =
        width * height;

    const interleaved =
        new Float32Array(
            pixelCount * 5
        );

    for (
        let i = 0;
        i < pixelCount;
        i++
    ) {
        interleaved[(i * 5) + 0] =
            sourceBands.Blue[i];

        interleaved[(i * 5) + 1] =
            sourceBands.Green[i];

        interleaved[(i * 5) + 2] =
            sourceBands.Red[i];

        interleaved[(i * 5) + 3] =
            sourceBands.NIR[i];

        interleaved[(i * 5) + 4] =
            sourceBands.SWIR[i];
    }

    const arrayBuffer =
        await geotiff.writeArrayBuffer(
            interleaved,
            {
                width,
                height,

                SamplesPerPixel: 5,

                BitsPerSample: [
                    32,
                    32,
                    32,
                    32,
                    32
                ],

                SampleFormat: [
                    3,
                    3,
                    3,
                    3,
                    3
                ],

                PlanarConfiguration: 1,

                PhotometricInterpretation: 1,

                ModelPixelScale: [
                    10,
                    10,
                    0
                ],

                ModelTiepoint: [
                    0, 0, 0,
                    100, 200, 0
                ],

                GeographicTypeGeoKey: 4326,

                GTModelTypeGeoKey: 2,

                GTRasterTypeGeoKey: 1,

                GDAL_NODATA: "-9999"
            }
        );

    await fs.promises.writeFile(
        filePath,
        Buffer.from(arrayBuffer)
    );
}

// ------------------------------------------------------------
// Expected scalar calculations
// ------------------------------------------------------------

function expectedNormalizedDifference(
    first,
    second
) {
    return (
        (first - second) /
        (first + second)
    );
}

function expectedEVI(
    red,
    nir,
    blue
) {
    return (
        2.5 *
        (nir - red) /
        (
            nir +
            6 * red -
            7.5 * blue +
            1
        )
    );
}

function expectedSAVI(
    red,
    nir
) {
    const L = 0.5;

    return (
        (
            (nir - red) /
            (nir + red + L)
        ) *
        (1 + L)
    );
}

function expectedARVI(
    red,
    nir,
    blue
) {
    const rb =
        2 * red - blue;

    return (
        (nir - rb) /
        (nir + rb)
    );
}

// ------------------------------------------------------------
// Expected first-pixel values
// ------------------------------------------------------------

function expectedFirstPixel(indexCode) {
    const blue =
        sourceBands.Blue[0];

    const green =
        sourceBands.Green[0];

    const red =
        sourceBands.Red[0];

    const nir =
        sourceBands.NIR[0];

    const swir =
        sourceBands.SWIR[0];

    switch (indexCode) {
        case "NDVI":
            return expectedNormalizedDifference(
                nir,
                red
            );

        case "EVI":
            return expectedEVI(
                red,
                nir,
                blue
            );

        case "SAVI":
            return expectedSAVI(
                red,
                nir
            );

        case "GNDVI":
            return expectedNormalizedDifference(
                nir,
                green
            );

        case "ARVI":
            return expectedARVI(
                red,
                nir,
                blue
            );

        case "NDWI":
            return expectedNormalizedDifference(
                green,
                nir
            );

        case "NDMI":
            return expectedNormalizedDifference(
                nir,
                swir
            );

        default:
            throw new Error(
                `Unsupported test index: ${indexCode}`
            );
    }
}

// ------------------------------------------------------------
// GeoTIFF output verification
// ------------------------------------------------------------

async function verifyContinuousOutput(
    outputPath,
    indexCode
) {
    assert.equal(
        await fs.promises
            .access(outputPath)
            .then(() => true)
            .catch(() => false),
        true
    );

    assert.ok(
        outputPath.endsWith(
            `${indexCode}_index.tif`
        )
    );

    const raster =
        await readGeoTiff(
            outputPath
        );

    assert.equal(
        raster.width,
        4
    );

    assert.equal(
        raster.height,
        2
    );

    assert.equal(
        raster.samplesPerPixel,
        1
    );

    assert.equal(
        raster.noData,
        -9999
    );

    assert.deepEqual(
        raster.origin,
        spatialReference.origin
    );

    assert.deepEqual(
        raster.resolution,
        spatialReference.resolution
    );

    assert.deepEqual(
        raster.boundingBox,
        spatialReference.boundingBox
    );

    assert.equal(
        raster.geoKeys
            .GeographicTypeGeoKey,
        4326
    );

    assert.equal(
        raster.geoKeys
            .GTModelTypeGeoKey,
        2
    );

    assert.equal(
        raster.geoKeys
            .GTRasterTypeGeoKey,
        1
    );

    const values =
        raster.data[0];

    assert.equal(
        values.length,
        8
    );

    assert.ok(
        Number.isFinite(
            values[0]
        )
    );

    const expected =
        expectedFirstPixel(
            indexCode
        );

    assert.ok(
        Math.abs(
            values[0] - expected
        ) < 1e-6
    );

    const citation =
        raster.geoKeys
            .GTCitationGeoKey;

    assert.equal(
        typeof citation,
        "string"
    );

    assert.ok(
        citation.startsWith(
            "AgriNexus GIS | "
        )
    );

    const metadata =
        JSON.parse(
            citation.slice(
                "AgriNexus GIS | ".length
            )
        );

    assert.equal(
        metadata.application,
        "AgriNexus GIS"
    );

    assert.equal(
        metadata.outputType,
        "continuous_index"
    );

    assert.equal(
        metadata.indexCode,
        indexCode
    );

    return raster;
}

async function verifyClassificationOutput(
    outputPath,
    indexCode
) {
    assert.equal(
        await fs.promises
            .access(outputPath)
            .then(() => true)
            .catch(() => false),
        true
    );

    assert.ok(
        outputPath.endsWith(
            `${indexCode}_classification.tif`
        )
    );

    const raster =
        await readGeoTiff(
            outputPath
        );

    assert.equal(
        raster.width,
        4
    );

    assert.equal(
        raster.height,
        2
    );

    assert.equal(
        raster.samplesPerPixel,
        1
    );

    assert.equal(
        raster.noData,
        0
    );

    assert.deepEqual(
        raster.origin,
        spatialReference.origin
    );

    assert.deepEqual(
        raster.resolution,
        spatialReference.resolution
    );

    assert.deepEqual(
        raster.boundingBox,
        spatialReference.boundingBox
    );

    const values =
        raster.data[0];

    assert.equal(
        values.length,
        8
    );

    assert.ok(
        values.every(
            value =>
                Number.isInteger(value) &&
                value >= 1 &&
                value <= 5
        )
    );

    const citation =
        raster.geoKeys
            .GTCitationGeoKey;

    assert.equal(
        typeof citation,
        "string"
    );

    assert.ok(
        citation.startsWith(
            "AgriNexus GIS | "
        )
    );

    const metadata =
        JSON.parse(
            citation.slice(
                "AgriNexus GIS | ".length
            )
        );

    assert.equal(
        metadata.application,
        "AgriNexus GIS"
    );

    assert.equal(
        metadata.outputType,
        "classification"
    );

    assert.equal(
        metadata.indexCode,
        indexCode
    );

    assert.equal(
        metadata.classificationMethod,
        "baseline_qualitative"
    );

    return raster;
}

// ------------------------------------------------------------
// Integration test
// ------------------------------------------------------------

test(
    "POST batch raster workflow performs real multi-index GeoTIFF integration",
    async () => {
        const tempDirectory =
            await fs.promises.mkdtemp(
                path.join(
                    os.tmpdir(),
                    "agrinexus-raster-batch-api-"
                )
            );

        try {
            const inputPath =
                path.join(
                    tempDirectory,
                    "source.tif"
                );

            const outputDirectory =
                path.join(
                    tempDirectory,
                    "output"
                );

            await fs.promises.mkdir(
                outputDirectory,
                {
                    recursive: true
                }
            );

            await createFixtureGeoTiff(
                inputPath
            );

            const response =
                await request(app)
                    .post(
                        "/api/remote-sensing/raster/" +
                        "index-batch-workflow"
                    )
                    .send({
                        inputPath,

                        indexCodes,

                        bandMapping,

                        noData: -9999,

                        parameters: {},

                        processingContext: {
                            sensor:
                                "Sentinel-2"
                        },

                        spatialContext: {
                            crs:
                                "EPSG:4326"
                        },

                        outputDirectory
                    })
                    .set(
                        "Content-Type",
                        "application/json"
                    );

            assert.equal(
                response.status,
                200
            );

            const body =
                response.body;

            // ------------------------------------------------
            // Batch result contract
            // ------------------------------------------------

            assert.equal(
                body.batchVersion,
                "1.0"
            );

            assert.equal(
                body.input.filePath,
                inputPath
            );

            assert.deepEqual(
                body.input.indexCodes,
                indexCodes
            );

            assert.equal(
                body.results.length,
                indexCodes.length
            );

            // ------------------------------------------------
            // Verify every delegated workflow result
            // ------------------------------------------------

            for (
                let i = 0;
                i < indexCodes.length;
                i++
            ) {
                const indexCode =
                    indexCodes[i];

                const result =
                    body.results[i];

                const definition =
                    getIndexDefinition(
                        indexCode
                    );

                assert.ok(
                    definition
                );

                assert.equal(
                    result.workflowVersion,
                    "1.0"
                );

                assert.equal(
                    result.indexCode,
                    indexCode
                );

                assert.equal(
                    result.input.filePath,
                    inputPath
                );

                assert.equal(
                    result.input.width,
                    4
                );

                assert.equal(
                    result.input.height,
                    2
                );

                assert.equal(
                    result.input.pixelCount,
                    8
                );

                assert.equal(
                    result.processing.indexCode,
                    indexCode
                );

                assert.equal(
                    result.processing.indexName,
                    definition.name
                );

                assert.equal(
                    result.processing
                        .classificationMethod,
                    "baseline_qualitative"
                );

                assert.equal(
                    result.continuousOutput
                        .outputType,
                    "continuous_index"
                );

                assert.equal(
                    result.continuousOutput
                        .indexCode,
                    indexCode
                );

                assert.equal(
                    result.continuousOutput
                        .dataType,
                    "Float32"
                );

                assert.equal(
                    result.continuousOutput
                        .width,
                    4
                );

                assert.equal(
                    result.continuousOutput
                        .height,
                    2
                );

                assert.equal(
                    result.continuousOutput
                        .pixelCount,
                    8
                );

                assert.equal(
                    result.classificationOutput
                        .outputType,
                    "classification"
                );

                assert.equal(
                    result.classificationOutput
                        .indexCode,
                    indexCode
                );

                assert.equal(
                    result.classificationOutput
                        .dataType,
                    "Uint8"
                );

                assert.equal(
                    result.classificationOutput
                        .width,
                    4
                );

                assert.equal(
                    result.classificationOutput
                        .height,
                    2
                );

                assert.equal(
                    result.classificationOutput
                        .pixelCount,
                    8
                );

                // --------------------------------------------
                // Verify actual GeoTIFF outputs
                // --------------------------------------------

                await verifyContinuousOutput(
                    result.continuousOutput
                        .outputPath,
                    indexCode
                );

                await verifyClassificationOutput(
                    result.classificationOutput
                        .outputPath,
                    indexCode
                );
            }
        } finally {
            await fs.promises.rm(
                tempDirectory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);

console.log(
    "Batch Raster Workflow Real HTTP Integration tests loaded."
);
