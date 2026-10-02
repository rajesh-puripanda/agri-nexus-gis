"use strict";

require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
    prepareSentinel2NativeResolutionRasters
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2NativeResolutionPreparationWorkflowService"
);

const {
    getAllSentinel2Bands,
    getSentinel2BandDefinition
} = require(
    "../scientific/remoteSensing/bands/" +
    "sentinel2BandCatalog"
);

const {
    decodeSentinel2Jp2
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2Jp2DecoderService"
);

const {
    prepareSentinel2Bands
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2RadiometricPreparationService"
);

const {
    writeSentinel2PreparedRaster
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2PreparedRasterWriterService"
);

const TEST_OUTPUT_DIRECTORY =
    path.resolve("./test-output");

const SCENE_ID =
    "S2C_MSIL2A_20260908T044701_N0512_R076_T44QQE_20260908T094920";

function buildLocalAcquisition() {
    const bands = {};

    for (
        const bandName of getAllSentinel2Bands()
    ) {
        const definition =
            getSentinel2BandDefinition(
                bandName
            );

        const filePath =
            path.join(
                TEST_OUTPUT_DIRECTORY,
                `${SCENE_ID}_${definition.assetKey}.jp2`
            );

        assert.ok(
            fs.existsSync(filePath),
            `Missing local JP2: ${definition.assetKey}`
        );

        bands[bandName] = {
            assetKey:
                definition.assetKey,

            path:
                filePath,

            spatialReference: {
                origin: [
                    699960,
                    2000040,
                    0
                ],

                resolution: [
                    definition.nativeResolution,
                    -definition.nativeResolution,
                    0
                ],

                boundingBox: [
                    699960,
                    1890240,
                    809760,
                    2000040
                ],

                geoKeys: {
                    ProjectedCSTypeGeoKey: 32644,
                    GTModelTypeGeoKey: 1,
                    GTRasterTypeGeoKey: 1
                }
            },

            radiometry: {
                scale: 0.0001,
                offset: -0.1,
                noData: 0,
                sourceDataType: "UINT16"
            }
        };
    }

    return {
        sceneId: SCENE_ID,
        acquisitionDate: "2026-09-08",
        sourceProvider:
            "copernicus-data-space",
        bands
    };
}

test(
    "real Sentinel-2 local JP2 bands produce native-resolution prepared rasters",
    async () => {
        const acquisition =
            buildLocalAcquisition();

        const outputs =
            await prepareSentinel2NativeResolutionRasters({
                request: {
                    temporalContext: {},
                    spatialContext: {}
                },

                outputDirectory:
                    TEST_OUTPUT_DIRECTORY,

                bandNames:
                    getAllSentinel2Bands(),

                acquisitionImpl:
                    async () =>
                        acquisition,

                decodeImpl:
                    decodeSentinel2Jp2,

                prepareImpl:
                    prepareSentinel2Bands,

                writeImpl:
                    writeSentinel2PreparedRaster
            });

        assert.deepEqual(
            Object.keys(outputs.outputs).sort(
                (a, b) => Number(a) - Number(b)
            ),
            ["10", "20", "60"]
        );

        for (
            const resolution of ["10", "20", "60"]
        ) {
            const output = outputs.outputs[resolution];

            assert.ok(
                fs.existsSync(
                    output.outputPath
                ),
                `Missing ${resolution}m prepared raster.`
            );

            assert.ok(
                fs.statSync(
                    output.outputPath
                ).size > 0
            );

            console.log(
                `PASS ${resolution}m:`,
                output.bands.join(", "),
                output.outputPath
            );
        }
    }
);




