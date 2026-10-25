"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const {
    writeBareSoilFrequencyRaster,
    NO_DATA_VALUE
} = require("../services/remoteSensing/temporal/bareSoilFrequencyRasterWriter");
const { readGeoTiff } = require("../services/remoteSensing/raster/rasterReaderService");

function request() {
    return {
        raster: {
            width: 4,
            height: 1,
            pixelCount: 4,
            data: new Float32Array([0, 50, 100, NO_DATA_VALUE]),
            noData: NO_DATA_VALUE,
            spatialReference: {
                origin: [100, 200, 0],
                resolution: [10, -10, 0],
                boundingBox: [100, 190, 140, 200],
                geoKeys: {
                    ProjectedCSTypeGeoKey: 32644,
                    GTModelTypeGeoKey: 1,
                    GTRasterTypeGeoKey: 1
                }
            }
        },
        productMetadata: {
            productCode: "BARE_SOIL_FREQUENCY",
            units: "percent",
            method: "provisional_ndvi_bsi_evidence_rules",
            calibrationStatus: "provisional_uncalibrated",
            thresholds: {
                ndviMaximumExclusive: 0.2,
                bsiMinimum: 0.2
            },
            observationDates: ["2026-09-08", "2026-10-03"],
            observationCount: 2
        }
    };
}

test("writes and reads a Float32 bare-soil frequency GeoTIFF", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "agrinexus-bsf-"));
    const outputPath = path.join(directory, "BARE_SOIL_FREQUENCY.tif");

    try {
        const result = await writeBareSoilFrequencyRaster({
            request: request(),
            outputPath
        });

        assert.equal(result.dataType, "Float32");
        assert.equal(result.noData, NO_DATA_VALUE);
        assert.equal(result.pixelCount, 4);

        const raster = await readGeoTiff(outputPath);

        assert.equal(raster.width, 4);
        assert.equal(raster.height, 1);
        assert.deepEqual(Array.from(raster.data[0]), [0, 50, 100, NO_DATA_VALUE]);
        assert.equal(raster.noData, NO_DATA_VALUE);
        assert.deepEqual(raster.origin, [100, 200, 0]);
        assert.deepEqual(raster.resolution, [10, -10, 0]);
        assert.equal(raster.geoKeys.ProjectedCSTypeGeoKey, 32644);
        assert.match(raster.geoKeys.GTCitationGeoKey, /BARE_SOIL_FREQUENCY/);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test("rejects an invalid frequency value", async () => {
    const input = request();
    input.raster.data[0] = 101;

    await assert.rejects(
        () => writeBareSoilFrequencyRaster({
            request: input,
            outputPath: path.join(os.tmpdir(), "BARE_SOIL_FREQUENCY.tif")
        }),
        /Invalid bare-soil frequency value/
    );
});

test("rejects a mismatched output filename", async () => {
    await assert.rejects(
        () => writeBareSoilFrequencyRaster({
            request: request(),
            outputPath: path.join(os.tmpdir(), "NDVI_index.tif")
        }),
        /Output filename must be BARE_SOIL_FREQUENCY/
    );
});
