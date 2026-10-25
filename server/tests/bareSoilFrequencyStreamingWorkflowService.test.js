"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const geotiff = require("geotiff");

const {
    calculateBareSoilFrequencyStreaming
} = require("../services/remoteSensing/temporal/bareSoilFrequencyStreamingWorkflowService");

const {
    writeBareSoilFrequencyStreamingRaster
} = require("../services/remoteSensing/temporal/bareSoilFrequencyStreamingRasterWriter");

const NO_DATA = -9999;

async function createRaster(filePath, width, height, originY, values) {
    async function* rows() {
        for (let y = 0; y < height; y++) {
            yield new Float32Array(values.slice(y * width, (y + 1) * width));
        }
    }

    await writeBareSoilFrequencyStreamingRaster({
        width,
        height,
        rows: rows(),
        outputPath: filePath,
        spatialReference: {
            origin: [100, originY, 0],
            resolution: [10, -10, 0],
            geoKeys: {
                GTModelTypeGeoKey: 1,
                GTRasterTypeGeoKey: 1,
                ProjectedCSTypeGeoKey: 32644
            }
        },
        productMetadata: {
            productCode: "BARE_SOIL_FREQUENCY",
            units: "percent",
            calibrationStatus: "provisional_uncalibrated",
            method: "test",
            thresholds: {},
            observationDates: ["2026-09-08", "2026-09-28"]
        }
    });
}

test("streams aligned overlapping rasters and writes bare-soil frequency", async () => {
    const directory = await fs.mkdtemp(
        path.join(os.tmpdir(), "agrinexus-frequency-workflow-")
    );

    const files = {
        ndvi1: path.join(directory, "input-ndvi-20260908", "BARE_SOIL_FREQUENCY.tif"),
        bsi1: path.join(directory, "input-bsi-20260908", "BARE_SOIL_FREQUENCY.tif"),
        ndvi2: path.join(directory, "input-ndvi-20260928", "BARE_SOIL_FREQUENCY.tif"),
        bsi2: path.join(directory, "input-bsi-20260928", "BARE_SOIL_FREQUENCY.tif"),
        output: path.join(directory, "temporal", "BARE_SOIL_FREQUENCY.tif")
    };

    try {
        // First date: 3x3, origin Y=130. Common grid starts at Y=120.
        await createRaster(files.ndvi1, 3, 3, 130, [
            0.1, 0.1, 0.1,
            0.1, 0.1, NO_DATA,
            NO_DATA, 0.3, 0.1
        ]);
        await createRaster(files.bsi1, 3, 3, 130, [
            0.3, 0.3, 0.3,
            0.3, 0.1, 0.3,
            0.3, 0.3, 0.4
        ]);

        // Second date: 3x2, origin Y=120; already on the common grid.
        await createRaster(files.ndvi2, 3, 2, 120, [
            0.1, 0.1, 0.1,
            NO_DATA, 0.1, 0.1
        ]);
        await createRaster(files.bsi2, 3, 2, 120, [
            0.1, 0.3, 0.3,
            0.3, NO_DATA, 0.1
        ]);

        const result = await calculateBareSoilFrequencyStreaming({
            observations: [
                {
                    date: "2026-09-08",
                    ndviPath: files.ndvi1,
                    bsiPath: files.bsi1
                },
                {
                    date: "2026-09-28",
                    ndviPath: files.ndvi2,
                    bsiPath: files.bsi2
                }
            ],
            outputPath: files.output,
            chunkRows: 1
        });

        assert.equal(result.pixelCount, 6);

        const tiff = await geotiff.fromFile(files.output);
        try {
            const image = await tiff.getImage();

            assert.equal(image.getWidth(), 3);
            assert.equal(image.getHeight(), 2);
            assert.deepEqual(image.getOrigin().slice(0, 2), [100, 120]);
            assert.deepEqual(image.getResolution().slice(0, 2), [10, -10]);
            assert.equal(image.getGDALNoData(), NO_DATA);

            assert.deepEqual(
                Array.from(await image.readRasters({ interleave: true })),
                [50, 50, 100, NO_DATA, 0, 50]
            );

            const keys = image.getGeoKeys();
            assert.equal(keys.ProjectedCSTypeGeoKey, 32644);
            assert.match(keys.GTCitationGeoKey, /BARE_SOIL_FREQUENCY/);
        } finally {
            await tiff.close();
        }
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});
