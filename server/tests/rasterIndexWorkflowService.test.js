"use strict";

// ============================================================
// server/tests/rasterIndexWorkflowService.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.3.5
// Raster Index Workflow Service Regression
//
// Real integration test:
//   GeoTIFF
//   -> Reader
//   -> Validation
//   -> Normalization
//   -> Index Processing
//   -> Classification
//   -> GeoTIFF Output
// ============================================================

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const geotiff = require("geotiff");

const {
    processRasterIndexWorkflow
} = require("../services/remoteSensing/raster/rasterIndexWorkflowService");

const {
    readGeoTiff
} = require("../services/remoteSensing/raster/rasterReaderService");

const {
    getIndexDefinition
} = require("../scientific/remoteSensing/indices/indexRegistry");

// ------------------------------------------------------------
// Test fixture
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

const sourceBands = {
    Blue: new Float32Array([
        0.05, 0.05,
        0.05, 0.05,
        0.05, 0.05,
        0.05, 0.05
    ]),

    Green: new Float32Array([
        0.10, 0.10,
        0.10, 0.10,
        0.10, 0.10,
        0.10, 0.10
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
    ])
};

async function createFixtureGeoTiff(filePath) {
    const width = 4;
    const height = 2;

    const pixelCount =
        width * height;

    const interleaved =
        new Float32Array(
            pixelCount * 4
        );

    for (let i = 0; i < pixelCount; i++) {
        interleaved[(i * 4) + 0] =
            sourceBands.Blue[i];

        interleaved[(i * 4) + 1] =
            sourceBands.Green[i];

        interleaved[(i * 4) + 2] =
            sourceBands.Red[i];

        interleaved[(i * 4) + 3] =
            sourceBands.NIR[i];
    }

    const arrayBuffer =
        await geotiff.writeArrayBuffer(
            interleaved,
            {
                width,
                height,

                SamplesPerPixel: 4,

                BitsPerSample: [
                    32,
                    32,
                    32,
                    32
                ],

                SampleFormat: [
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
// Analytical metadata helper
// ------------------------------------------------------------

function readAnalyticalCitation(raster) {
    const citation =
        raster.geoKeys?.GTCitationGeoKey;

    assert.equal(
        typeof citation,
        "string"
    );

    const prefix =
        "AgriNexus GIS | ";

    assert.ok(
        citation.startsWith(prefix)
    );

    return JSON.parse(
        citation.slice(prefix.length)
    );
}

// ------------------------------------------------------------
// Expected NDVI
// ------------------------------------------------------------

function expectedNDVI(red, nir) {
    return (
        (nir - red) /
        (nir + red)
    );
}

// ------------------------------------------------------------
// Tests
// ------------------------------------------------------------

test(
    "processRasterIndexWorkflow performs complete NDVI GeoTIFF workflow",
    async () => {
        const tempDirectory =
            await fs.promises.mkdtemp(
                path.join(
                    os.tmpdir(),
                    "agrinexus-raster-workflow-"
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

            const result =
                await processRasterIndexWorkflow({
                    inputPath,

                    indexCode:
                        "NDVI",

                    bandMapping: {
                        Blue: 1,
                        Green: 2,
                        Red: 3,
                        NIR: 4
                    },

                    noData: -9999,

                    outputDirectory
                });

            // ------------------------------------------------
            // Workflow contract
            // ------------------------------------------------

            assert.equal(
                result.workflowVersion,
                "1.0"
            );

            assert.equal(
                result.indexCode,
                "NDVI"
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
                "NDVI"
            );

            assert.equal(
                result.processing.indexName,
                getIndexDefinition("NDVI").name
            );

            assert.equal(
                result.processing.classificationMethod,
                "baseline_qualitative"
            );

            // ------------------------------------------------
            // Output paths
            // ------------------------------------------------

            assert.equal(
                path.basename(
                    result.continuousOutput.outputPath
                ),
                "NDVI_index.tif"
            );

            assert.equal(
                path.basename(
                    result.classificationOutput.outputPath
                ),
                "NDVI_classification.tif"
            );

            assert.equal(
                result.continuousOutput.dataType,
                "Float32"
            );

            assert.equal(
                result.classificationOutput.dataType,
                "Uint8"
            );

            assert.ok(
                await fs.promises
                    .access(
                        result.continuousOutput.outputPath
                    )
                    .then(() => true)
                    .catch(() => false)
            );

            assert.ok(
                await fs.promises
                    .access(
                        result.classificationOutput.outputPath
                    )
                    .then(() => true)
                    .catch(() => false)
            );

            // ------------------------------------------------
            // Continuous output round-trip
            // ------------------------------------------------

            const continuous =
                await readGeoTiff(
                    result.continuousOutput.outputPath
                );

            assert.equal(
                continuous.width,
                4
            );

            assert.equal(
                continuous.height,
                2
            );

            assert.equal(
                continuous.samplesPerPixel,
                1
            );

            assert.equal(
                continuous.noData,
                -9999
            );

            assert.deepEqual(
                continuous.origin,
                [100, 200, 0]
            );

            assert.deepEqual(
                continuous.resolution,
                [10, -10, 0]
            );

            assert.deepEqual(
                continuous.boundingBox,
                [100, 180, 140, 200]
            );

            assert.equal(
                continuous.geoKeys.GeographicTypeGeoKey,
                4326
            );

            const continuousValues =
                continuous.data[0];

            const expectedValues = [
                expectedNDVI(0.10, 0.30),
                expectedNDVI(0.10, 0.30),
                expectedNDVI(0.20, 0.40),
                expectedNDVI(0.20, 0.40),
                expectedNDVI(0.30, 0.50),
                expectedNDVI(0.30, 0.50),
                expectedNDVI(0.40, 0.60),
                expectedNDVI(0.40, 0.60)
            ];

            assert.equal(
                continuousValues.length,
                expectedValues.length
            );

            for (
                let i = 0;
                i < expectedValues.length;
                i++
            ) {
                assert.ok(
                    Math.abs(
                        continuousValues[i] -
                        expectedValues[i]
                    ) < 0.00001,
                    `NDVI mismatch at pixel ${i}: ` +
                    `expected ${expectedValues[i]}, ` +
                    `received ${continuousValues[i]}`
                );
            }

            // ------------------------------------------------
            // Continuous analytical metadata
            // ------------------------------------------------

            const continuousCitation =
                readAnalyticalCitation(
                    continuous
                );

            assert.equal(
                continuousCitation.application,
                "AgriNexus GIS"
            );

            assert.equal(
                continuousCitation.outputType,
                "continuous_index"
            );

            assert.equal(
                continuousCitation.indexCode,
                "NDVI"
            );

            assert.equal(
                continuousCitation.indexName,
                "Normalized Difference Vegetation Index"
            );

            assert.equal(
                continuousCitation.processingType,
                "pixelwise_scalar_index"
            );

            assert.equal(
                continuousCitation.analysisVersion,
                "1.0"
            );

            assert.equal(
                continuousCitation.sourceRasterContractVersion,
                "1.0"
            );

            assert.equal(
                continuousCitation.sourceType,
                "Calculated Raster Index"
            );

            // ------------------------------------------------
            // Classification output round-trip
            // ------------------------------------------------

            const classification =
                await readGeoTiff(
                    result.classificationOutput.outputPath
                );

            assert.equal(
                classification.width,
                4
            );

            assert.equal(
                classification.height,
                2
            );

            assert.equal(
                classification.samplesPerPixel,
                1
            );

            assert.equal(
                classification.noData,
                0
            );

            assert.deepEqual(
                classification.origin,
                [100, 200, 0]
            );

            assert.deepEqual(
                classification.resolution,
                [10, -10, 0]
            );

            assert.deepEqual(
                classification.boundingBox,
                [100, 180, 140, 200]
            );

            assert.equal(
                classification.geoKeys.GeographicTypeGeoKey,
                4326
            );

            // NDVI values:
            //
            // 0.50 -> high (4)
            // 0.50 -> high (4)
            // 0.333 -> moderate (3)
            // 0.333 -> moderate (3)
            // 0.25 -> moderate (3)
            // 0.25 -> moderate (3)
            // 0.20 -> moderate (3)
            // 0.20 -> moderate (3)
            //
            // Exact 0.5 is "high" because
            // classification boundaries are:
            // non-final: min <= value < max
            // final:      min <= value <= max

            assert.deepEqual(
                Array.from(classification.data[0]),
                [
                    4, 4,
                    3, 3,
                    3, 3,
                    3, 3
                ]
            );

            // ------------------------------------------------
            // Classification analytical metadata
            // ------------------------------------------------

            const classificationCitation =
                readAnalyticalCitation(
                    classification
                );

            assert.equal(
                classificationCitation.application,
                "AgriNexus GIS"
            );

            assert.equal(
                classificationCitation.outputType,
                "classification"
            );

            assert.equal(
                classificationCitation.indexCode,
                "NDVI"
            );

            assert.equal(
                classificationCitation.indexName,
                "Normalized Difference Vegetation Index"
            );

            assert.equal(
                classificationCitation.processingType,
                "pixelwise_raster_classification"
            );

            assert.equal(
                classificationCitation.analysisVersion,
                "1.0"
            );

            assert.equal(
                classificationCitation.sourceRasterContractVersion,
                "1.0"
            );

            assert.equal(
                classificationCitation.classificationMethod,
                "baseline_qualitative"
            );

            assert.equal(
                classificationCitation.sourceType,
                "Calculated Raster Classification"
            );
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

test(
    "processRasterIndexWorkflow rejects unknown index",
    async () => {
        await assert.rejects(
            () =>
                processRasterIndexWorkflow({
                    inputPath:
                        "source.tif",

                    indexCode:
                        "UNKNOWN",

                    bandMapping: {
                        Red: 3,
                        NIR: 4
                    },

                    outputDirectory:
                        "output"
                }),
            /Unknown remote sensing index: UNKNOWN/
        );
    }
);

test(
    "processRasterIndexWorkflow rejects empty band mapping",
    async () => {
        await assert.rejects(
            () =>
                processRasterIndexWorkflow({
                    inputPath:
                        "source.tif",

                    indexCode:
                        "NDVI",

                    bandMapping: {},

                    outputDirectory:
                        "output"
                }),
            /bandMapping must contain at least one band/
        );
    }
);

test(
    "processRasterIndexWorkflow rejects missing required NIR band",
    async () => {
        const tempDirectory =
            await fs.promises.mkdtemp(
                path.join(
                    os.tmpdir(),
                    "agrinexus-raster-workflow-invalid-"
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

            await assert.rejects(
                () =>
                    processRasterIndexWorkflow({
                        inputPath,

                        indexCode:
                            "NDVI",

                        bandMapping: {
                            Blue: 1,
                            Green: 2,
                            Red: 3
                        },

                        noData: -9999,

                        outputDirectory
                    }),
                /Raster validation failed/
            );
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



