"use strict";

// ============================================================
// server/tests/rasterOutputService.test.js
// ============================================================
//
// Phase 13.6.2.3.4.2
// GeoTIFF Writer Service
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const {
    writeRasterOutput,
    createModelPixelScale,
    createModelTiepoint
} = require("../services/remoteSensing/raster/rasterOutputService");

const {
    readGeoTiff
} = require("../services/remoteSensing/raster/rasterReaderService");

const spatialReference = {
    origin: [100, 200, 0],
    resolution: [10, -10, 0],
    boundingBox: [100, 180, 140, 200],
    geoKeys: {
        GeographicTypeGeoKey: 4326,
        GTModelTypeGeoKey: 2,
        GTRasterTypeGeoKey: 1
    }
};

function continuousRequest() {
    return {
        outputType: "continuous_index",
        indexCode: "NDVI",
        raster: {
            width: 4,
            height: 2,
            pixelCount: 8,
            bands: {
                NDVI: {
                    data: new Float32Array([
                        0.10,
                        0.20,
                        0.30,
                        0.40,
                        0.50,
                        -9999,
                        0.70,
                        0.80
                    ]),
                    dataType: "Float32"
                }
            },
            noData: -9999,
            spatialReference,
            metadata: {
                sourceType: "Calculated Raster Index"
            }
        },
        outputMetadata: {
            format: "GeoTIFF",
            indexName:
                "Normalized Difference Vegetation Index",
            processingType:
                "pixelwise_scalar_index",
            analysisVersion: "1.0",
            sourceRasterContractVersion: "1.0",
            timestamp: "2026-09-25T00:00:00.000Z"
        }
    };
}

function classificationRequest() {
    return {
        outputType: "classification",
        indexCode: "NDVI",
        raster: {
            width: 4,
            height: 2,
            pixelCount: 8,
            bands: {
                NDVI: {
                    data: new Uint8Array([
                        1,
                        2,
                        3,
                        4,
                        5,
                        0,
                        3,
                        5
                    ]),
                    dataType: "Uint8"
                }
            },
            noData: 0,
            spatialReference,
            metadata: {
                sourceType:
                    "Calculated Raster Classification"
            }
        },
        classification: {
            method: "baseline_qualitative",
            classDefinitions: [
                {
                    code: "very_low",
                    label: "Very Low",
                    min: -1,
                    max: 0
                },
                {
                    code: "low",
                    label: "Low",
                    min: 0,
                    max: 0.2
                },
                {
                    code: "moderate",
                    label: "Moderate",
                    min: 0.2,
                    max: 0.5
                },
                {
                    code: "high",
                    label: "High",
                    min: 0.5,
                    max: 0.8
                },
                {
                    code: "very_high",
                    label: "Very High",
                    min: 0.8,
                    max: 1
                }
            ]
        },
        outputMetadata: {
            format: "GeoTIFF",
            indexName:
                "Normalized Difference Vegetation Index",
            processingType:
                "pixelwise_raster_classification",
            classificationMethod:
                "baseline_qualitative",
            sourceRasterContractVersion: "1.0",
            timestamp: "2026-09-25T00:00:00.000Z"
        }
    };
}

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

test("creates ModelPixelScale from raster resolution", () => {
    assert.deepEqual(
        createModelPixelScale([10, -10, 0]),
        [10, 10, 0]
    );
});

test("creates ModelTiepoint from raster origin", () => {
    assert.deepEqual(
        createModelTiepoint([100, 200, 0]),
        [0, 0, 0, 100, 200, 0]
    );
});

test("writes continuous Float32 GeoTIFF", async () => {
    const tempDirectory =
        await fs.mkdtemp(
            path.join(
                os.tmpdir(),
                "agrinexus-raster-output-"
            )
        );

    const outputPath =
        path.join(
            tempDirectory,
            "NDVI_index.tif"
        );

    const result =
        await writeRasterOutput({
            request: continuousRequest(),
            outputPath
        });

    assert.equal(result.format, "GeoTIFF");
    assert.equal(result.outputType, "continuous_index");
    assert.equal(result.indexCode, "NDVI");
    assert.equal(result.dataType, "Float32");
    assert.equal(result.width, 4);
    assert.equal(result.height, 2);
    assert.equal(result.pixelCount, 8);

    const stat =
        await fs.stat(outputPath);

    assert.ok(stat.size > 0);
});

test("continuous GeoTIFF round-trips through reader", async () => {
    const tempDirectory =
        await fs.mkdtemp(
            path.join(
                os.tmpdir(),
                "agrinexus-raster-output-"
            )
        );

    const outputPath =
        path.join(
            tempDirectory,
            "NDVI_index.tif"
        );

    await writeRasterOutput({
        request: continuousRequest(),
        outputPath
    });

    const raster =
        await readGeoTiff(outputPath);

    const analyticalMetadata =
        readAnalyticalCitation(raster);

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

    assert.equal(
        analyticalMetadata.indexName,
        "Normalized Difference Vegetation Index"
    );

    assert.equal(
        analyticalMetadata.processingType,
        "pixelwise_scalar_index"
    );

    assert.equal(
        analyticalMetadata.analysisVersion,
        "1.0"
    );

    assert.equal(
        analyticalMetadata.sourceRasterContractVersion,
        "1.0"
    );

    assert.equal(
        analyticalMetadata.classificationMethod,
        null
    );

    assert.equal(
        analyticalMetadata.timestamp,
        "2026-09-25T00:00:00.000Z"
    );

    assert.equal(
        analyticalMetadata.sourceType,
        "Calculated Raster Index"
    );

    assert.equal(raster.width, 4);
    assert.equal(raster.height, 2);
    assert.equal(raster.samplesPerPixel, 1);

    assert.deepEqual(
        Array.from(raster.data[0]),
        Array.from(
            new Float32Array([
                0.1,
                0.2,
                0.3,
                0.4,
                0.5,
                -9999,
                0.7,
                0.8
            ])
        )
    );

    assert.equal(raster.noData, -9999);

    assert.deepEqual(
        raster.origin,
        [100, 200, 0]
    );

    assert.deepEqual(
        raster.resolution,
        [10, -10, 0]
    );

    assert.deepEqual(
        raster.boundingBox,
        [100, 180, 140, 200]
    );

    assert.equal(
        raster.geoKeys.GeographicTypeGeoKey,
        4326
    );
});

test("writes Uint8 classification GeoTIFF", async () => {
    const tempDirectory =
        await fs.mkdtemp(
            path.join(
                os.tmpdir(),
                "agrinexus-raster-output-"
            )
        );

    const outputPath =
        path.join(
            tempDirectory,
            "NDVI_classification.tif"
        );

    const result =
        await writeRasterOutput({
            request: classificationRequest(),
            outputPath
        });

    assert.equal(
        result.outputType,
        "classification"
    );

    assert.equal(
        result.dataType,
        "Uint8"
    );

    assert.equal(result.width, 4);
    assert.equal(result.height, 2);
});

test("classification GeoTIFF round-trips through reader", async () => {
    const tempDirectory =
        await fs.mkdtemp(
            path.join(
                os.tmpdir(),
                "agrinexus-raster-output-"
            )
        );

    const outputPath =
        path.join(
            tempDirectory,
            "NDVI_classification.tif"
        );

    await writeRasterOutput({
        request: classificationRequest(),
        outputPath
    });

    const raster =
        await readGeoTiff(outputPath);

    const analyticalMetadata =
    readAnalyticalCitation(raster);

    assert.equal(
        analyticalMetadata.application,
        "AgriNexus GIS"
    );

    assert.equal(
        analyticalMetadata.outputType,
        "classification"
    );

    assert.equal(
        analyticalMetadata.indexCode,
        "NDVI"
    );

    assert.equal(
        analyticalMetadata.indexName,
        "Normalized Difference Vegetation Index"
    );

    assert.equal(
        analyticalMetadata.processingType,
        "pixelwise_raster_classification"
    );

    assert.equal(
        analyticalMetadata.analysisVersion,
        null
    );

    assert.equal(
        analyticalMetadata.sourceRasterContractVersion,
        "1.0"
    );

    assert.equal(
        analyticalMetadata.classificationMethod,
        "baseline_qualitative"
    );

    assert.equal(
        analyticalMetadata.timestamp,
        "2026-09-25T00:00:00.000Z"
    );

    assert.equal(
        analyticalMetadata.sourceType,
        "Calculated Raster Classification"
    );


    assert.equal(raster.width, 4);
    assert.equal(raster.height, 2);
    assert.equal(raster.samplesPerPixel, 1);

    assert.deepEqual(
        Array.from(raster.data[0]),
        [1, 2, 3, 4, 5, 0, 3, 5]
    );

    assert.equal(raster.noData, 0);

    assert.deepEqual(
        raster.origin,
        [100, 200, 0]
    );

    assert.deepEqual(
        raster.resolution,
        [10, -10, 0]
    );

    assert.deepEqual(
        raster.boundingBox,
        [100, 180, 140, 200]
    );

    assert.equal(
        raster.geoKeys.GeographicTypeGeoKey,
        4326
    );
});

test("rejects output path with wrong extension", async () => {
    await assert.rejects(
        () =>
            writeRasterOutput({
                request: continuousRequest(),
                outputPath:
                    "NDVI_index.txt"
            }),
        /outputPath must use .tif or .tiff extension/
    );
});

test("rejects output filename inconsistent with output type", async () => {
    await assert.rejects(
        () =>
            writeRasterOutput({
                request: continuousRequest(),
                outputPath:
                    "NDVI_classification.tif"
            }),
        /Output filename must be NDVI_index/
    );
});

test("rejects raster with missing CRS GeoKey", async () => {
    const request = continuousRequest();

    request.raster.spatialReference = {
        ...spatialReference,
        geoKeys: {
            GTModelTypeGeoKey: 2
        }
    };

    await assert.rejects(
        () =>
            writeRasterOutput({
                request,
                outputPath:
                    "NDVI_index.tif"
            }),
        /GeographicTypeGeoKey or ProjectedCSTypeGeoKey/
    );
});
