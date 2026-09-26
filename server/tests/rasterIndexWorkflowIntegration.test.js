"use strict";

// ============================================================
// server/tests/rasterIndexWorkflowIntegration.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.4.1
// Raster Workflow Real HTTP Integration Regression
//
// Real integration:
//
//   HTTP POST
//      -> Controller
//      -> Workflow Service
//      -> GeoTIFF Reader
//      -> Validation
//      -> Normalization
//      -> NDVI Calculation
//      -> Classification
//      -> GeoTIFF Output
//      -> HTTP Response
//
// No workflow-service mocking is used in this test.
// ============================================================

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const request = require("supertest");
const geotiff = require("geotiff");

const { app } = require("../server");

const {
    readGeoTiff
} = require(
    "../services/remoteSensing/raster/" +
    "rasterReaderService"
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
// Fixture GeoTIFF
// ------------------------------------------------------------

async function createFixtureGeoTiff(filePath) {
    const width = 4;
    const height = 2;
    const pixelCount = width * height;

    const interleaved =
        new Float32Array(
            pixelCount * 5
        );

    for (let i = 0; i < pixelCount; i++) {
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
// Expected NDVI
// ------------------------------------------------------------

function expectedNDVI(red, nir) {
    return (
        (nir - red) /
        (nir + red)
    );
}

// ------------------------------------------------------------
// Test
// ------------------------------------------------------------

test(
    "POST raster workflow performs real NDVI GeoTIFF integration",
    async () => {
        const tempDirectory =
            await fs.promises.mkdtemp(
                path.join(
                    os.tmpdir(),
                    "agrinexus-raster-api-"
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
                        "/api/remote-sensing/raster/index-workflow"
                    )
                    .send({
                        inputPath,
                        indexCode: "NDVI",
                        bandMapping: {
                            Red: 3,
                            NIR: 4
                        },
                        noData: -9999,
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

            assert.equal(
                response.body.workflowVersion,
                "1.0"
            );

            assert.equal(
                response.body.indexCode,
                "NDVI"
            );

            assert.equal(
                response.body.input.width,
                4
            );

            assert.equal(
                response.body.input.height,
                2
            );

            assert.equal(
                response.body.input.pixelCount,
                8
            );

            assert.equal(
                response.body.processing.indexCode,
                "NDVI"
            );

            assert.equal(
                response.body.processing.indexName,
                "Normalized Difference Vegetation Index"
            );

            assert.equal(
                response.body.processing.classificationMethod,
                "baseline_qualitative"
            );

            assert.equal(
                response.body.continuousOutput.outputType,
                "continuous_index"
            );

            assert.equal(
                response.body.continuousOutput.dataType,
                "Float32"
            );

            assert.equal(
                response.body.classificationOutput.outputType,
                "classification"
            );

            assert.equal(
                response.body.classificationOutput.dataType,
                "Uint8"
            );

            // ------------------------------------------------
            // Verify physical output files
            // ------------------------------------------------

            const continuousPath =
                response.body
                    .continuousOutput
                    .outputPath;

            const classificationPath =
                response.body
                    .classificationOutput
                    .outputPath;

            assert.equal(
                await fs.promises
                    .access(
                        continuousPath
                    )
                    .then(() => true)
                    .catch(() => false),
                true
            );

            assert.equal(
                await fs.promises
                    .access(
                        classificationPath
                    )
                    .then(() => true)
                    .catch(() => false),
                true
            );

            assert.ok(
                continuousPath.endsWith(
                    "NDVI_index.tif"
                )
            );

            assert.ok(
                classificationPath.endsWith(
                    "NDVI_classification.tif"
                )
            );

            // ------------------------------------------------
            // Verify continuous GeoTIFF
            // ------------------------------------------------

            const continuousRaster =
                await readGeoTiff(
                    continuousPath
                );

            assert.equal(
                continuousRaster.width,
                4
            );

            assert.equal(
                continuousRaster.height,
                2
            );

            assert.equal(
                continuousRaster.samplesPerPixel,
                1
            );

            const continuousValues =
                continuousRaster.data[0];

            assert.equal(
                continuousValues.length,
                8
            );

            assert.equal(
                continuousRaster.noData,
                -9999
            );

            assert.deepEqual(
                continuousRaster.origin,
                spatialReference.origin
            );

            assert.deepEqual(
                continuousRaster.resolution,
                spatialReference.resolution
            );

            assert.deepEqual(
                continuousRaster.boundingBox,
                spatialReference.boundingBox
            );

            assert.equal(
                continuousRaster
                    .geoKeys
                    .GeographicTypeGeoKey,
                4326
            );

            assert.equal(
                continuousRaster
                    .geoKeys
                    .GTModelTypeGeoKey,
                2
            );

            assert.equal(
                continuousRaster
                    .geoKeys
                    .GTRasterTypeGeoKey,
                1
            );

            const firstExpected =
                expectedNDVI(
                    sourceBands.Red[0],
                    sourceBands.NIR[0]
                );

            assert.ok(
                Math.abs(
                    continuousValues[0] -
                    firstExpected
                ) < 1e-6
            );

            const lastExpected =
                expectedNDVI(
                    sourceBands.Red[7],
                    sourceBands.NIR[7]
                );

            assert.ok(
                Math.abs(
                    continuousValues[7] -
                    lastExpected
                ) < 1e-6
            );

            // ------------------------------------------------
            // Verify analytical provenance
            // ------------------------------------------------

            const citation =
                continuousRaster
                    .geoKeys
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

            const analyticalMetadata =
                JSON.parse(
                    citation.slice(
                        "AgriNexus GIS | ".length
                    )
                );

            assert.equal(
                analyticalMetadata.application,
                "AgriNexus GIS"
            );

            assert.equal(
                analyticalMetadata.outputType,
                "continuous_index"
            );

            assert.equal(
                analyticalMetadata.indexCode,
                "NDVI"
            );

            // ------------------------------------------------
            // Verify classification GeoTIFF
            // ------------------------------------------------

            const classificationRaster =
                await readGeoTiff(
                    classificationPath
                );

            assert.equal(
                classificationRaster.width,
                4
            );

            assert.equal(
                classificationRaster.height,
                2
            );

            assert.equal(
                classificationRaster.samplesPerPixel,
                1
            );

            const classificationValues =
                classificationRaster.data[0];

            assert.equal(
                classificationValues.length,
                8
            );

            assert.equal(
                classificationRaster.noData,
                0
            );

            assert.deepEqual(
                classificationRaster.origin,
                spatialReference.origin
            );

            assert.deepEqual(
                classificationRaster.resolution,
                spatialReference.resolution
            );

            assert.deepEqual(
                classificationRaster.boundingBox,
                spatialReference.boundingBox
            );

            assert.ok(
                classificationValues.every(
                    (value) =>
                        Number.isInteger(value) &&
                        value >= 1 &&
                        value <= 5
                )
            );

            const classificationCitation =
                classificationRaster
                    .geoKeys
                    .GTCitationGeoKey;

            assert.equal(
                typeof classificationCitation,
                "string"
            );

            assert.ok(
                classificationCitation.startsWith(
                    "AgriNexus GIS | "
                )
            );

            const classificationMetadata =
                JSON.parse(
                    classificationCitation.slice(
                        "AgriNexus GIS | ".length
                    )
                );

            assert.equal(
                classificationMetadata.application,
                "AgriNexus GIS"
            );

            assert.equal(
                classificationMetadata.outputType,
                "classification"
            );

            assert.equal(
                classificationMetadata.indexCode,
                "NDVI"
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

console.log(
    "Raster Workflow Real HTTP Integration tests loaded."
);

