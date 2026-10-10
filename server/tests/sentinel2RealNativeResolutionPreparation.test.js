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
    getSentinel2BandDefinition
} = require(
    "../scientific/remoteSensing/bands/" +
    "sentinel2BandCatalog"
);

const {
    decodeSentinel2Jp2Window
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2Jp2WindowDecoderService"
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

const TEST_DATA_DIRECTORY =
    path.resolve(
        "./data/remote-sensing/acquisitions"
    );

const TEST_OUTPUT_DIRECTORY =
    path.resolve(
        "./test-output/sentinel2-native-resolution-real"
    );

const SCENE_ID =
    "S2C_MSIL2A_20260908T044701_N0512_R076_T44QQE";

const ACQUISITION_TIMESTAMP =
    "20260908T094920";

const REAL_BAND_NAMES = [
    "Blue",
    "Red",
    "NIR",
    "SWIR1"
];

function buildLocalAcquisition() {
    const bands = {};

    for (
        const bandName of REAL_BAND_NAMES
    ) {
        const definition =
            getSentinel2BandDefinition(
                bandName
            );

        const filePath =
            path.join(
                TEST_DATA_DIRECTORY,
                `${SCENE_ID}_${ACQUISITION_TIMESTAMP}_${definition.assetKey}.jp2`
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
        sceneId:
            SCENE_ID,

        acquisitionDate:
            "2026-09-08",

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
                    spatialContext: {
                        bbox: {
                            west: 82.87915734882289,
                            south: 17.075692993378123,
                            east: 83.9261271945331,
                            north: 18.0798197936174
                        }
                    }
                },

                outputDirectory:
                    TEST_OUTPUT_DIRECTORY,

                bandNames:
                    REAL_BAND_NAMES,

                acquisitionImpl:
                    async () =>
                        acquisition,

                decodeImpl:
                    decodeSentinel2Jp2Window,

                prepareImpl:
                    prepareSentinel2Bands,

                writeImpl:
                    writeSentinel2PreparedRaster
            });

        assert.deepEqual(
            Object.keys(outputs.outputs).sort(
                (a, b) => Number(a) - Number(b)
            ),
            [
                "10",
                "20"
            ]
        );

        for (
            const resolution of [
                "10",
                "20"
            ]
        ) {
            const output =
                outputs.outputs[
                    resolution
                ];

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
