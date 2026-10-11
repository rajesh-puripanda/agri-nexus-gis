"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const {
    writeAnalysisClassificationRaster,
    CLASSIFICATION_METHOD
} = require("../services/remoteSensing/raster/analysisClassificationRasterWriter");

const { readGeoTiff } = require("../services/remoteSensing/raster/rasterReaderService");

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

function request() {
    return {
        raster: {
            width: 4,
            height: 2,
            pixelCount: 8,
            data: new Uint8Array([1, 2, 3, 0, 1, 2, 3, 0]),
            noData: 0,
            spatialReference,
            metadata: { sourceType: "Paired NDVI/BSI evidence" }
        },
        classification: {
            method: CLASSIFICATION_METHOD,
            calibrationStatus: "provisional_uncalibrated"
        },
        outputMetadata: {
            timestamp: "2026-10-11T00:00:00.000Z"
        }
    };
}

test("writes and reads an analysis classification GeoTIFF", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "agrinexus-analysis-class-"));
    const outputPath = path.join(directory, "soil_vegetation_classification.tif");

    try {
        const result = await writeAnalysisClassificationRaster({
            request: request(),
            outputPath
        });

        assert.equal(result.format, "GeoTIFF");
        assert.equal(result.dataType, "Uint8");
        assert.equal(result.noData, 0);
        assert.equal(result.pixelCount, 8);

        const raster = await readGeoTiff(outputPath);

        assert.equal(raster.width, 4);
        assert.equal(raster.height, 2);
        assert.equal(raster.samplesPerPixel, 1);
        assert.deepEqual(Array.from(raster.data[0]), [1, 2, 3, 0, 1, 2, 3, 0]);
        assert.equal(raster.noData, 0);
        assert.deepEqual(raster.origin, [100, 200, 0]);
        assert.deepEqual(raster.resolution, [10, -10, 0]);
        assert.deepEqual(raster.boundingBox, [100, 180, 140, 200]);
        assert.equal(raster.geoKeys.GeographicTypeGeoKey, 4326);

        const citation = raster.geoKeys.GTCitationGeoKey;
        assert.match(citation, /provisional_uncalibrated/);
        assert.match(citation, /vegetation_dominant_evidence/);
        assert.match(citation, /bare_soil_dominant_evidence/);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test("rejects unsupported classification codes", async () => {
    const input = request();
    input.raster.data[0] = 4;

    await assert.rejects(
        () => writeAnalysisClassificationRaster({
            request: input,
            outputPath: path.join(os.tmpdir(), "soil_vegetation_classification.tif")
        }),
        /Unsupported classification code 4/
    );
});

test("rejects an output filename that does not match the analysis", async () => {
    await assert.rejects(
        () => writeAnalysisClassificationRaster({
            request: request(),
            outputPath: path.join(os.tmpdir(), "NDVI_classification.tif")
        }),
        /Output filename must be soil_vegetation_classification/
    );
});
