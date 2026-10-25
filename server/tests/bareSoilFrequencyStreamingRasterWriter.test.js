"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const geotiff = require("geotiff");

const {
    writeBareSoilFrequencyStreamingRaster
} = require("../services/remoteSensing/temporal/bareSoilFrequencyStreamingRasterWriter");

test("streaming writer preserves pixels, NoData and GeoTIFF spatial metadata", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bare-soil-stream-"));
    const outputPath = path.join(directory, "BARE_SOIL_FREQUENCY.tif");

    const metadata = {
        productCode: "BARE_SOIL_FREQUENCY",
        units: "percent",
        calibrationStatus: "provisional_uncalibrated",
        method: "test",
        thresholds: {},
        observationDates: ["2026-09-08", "2026-10-03"]
    };

    async function* rows() {
        yield new Float32Array([0, 25, 100]);
        yield new Float32Array([-9999, 50, 75]);
    }

    try {
        const result = await writeBareSoilFrequencyStreamingRaster({
            width: 3,
            height: 2,
            rows: rows(),
            outputPath,
            spatialReference: {
                origin: [699960, 2000040, 0],
                resolution: [10, -10, 0],
                geoKeys: {
                    GTModelTypeGeoKey: 1,
                    GTRasterTypeGeoKey: 1,
                    ProjectedCSTypeGeoKey: 32644
                }
            },
            productMetadata: metadata
        });

        assert.equal(result.pixelCount, 6);

        const tiff = await geotiff.fromFile(outputPath);
        const image = await tiff.getImage();

        assert.equal(image.getWidth(), 3);
        assert.equal(image.getHeight(), 2);
        assert.deepEqual(
            Array.from(await image.readRasters({ interleave: true })),
            [0, 25, 100, -9999, 50, 75]
        );

        const keys = image.getGeoKeys();
        assert.equal(keys.ProjectedCSTypeGeoKey, 32644);
        assert.equal(keys.GTModelTypeGeoKey, 1);

        const directoryTags = image.getFileDirectory();
        assert.deepEqual(image.getResolution().slice(0, 2), [10, -10]);
        assert.deepEqual(image.getOrigin().slice(0, 2), [699960, 2000040]);
        assert.equal(image.getGDALNoData(), -9999);
        assert.match(keys.GTCitationGeoKey, /BARE_SOIL_FREQUENCY/);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});
