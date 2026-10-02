"use strict";

const fs = require("node:fs");
const path = require("node:path");

const {
    processRasterIndexWorkflow
} = require(
    "./rasterIndexWorkflowService"
);

const DEFAULT_PREPARED_SENTINEL2_DIRECTORY =
    path.resolve(
        __dirname,
        "../../../../data/remote-sensing/acquisitions/sentinel2"
    );

const DEFAULT_RASTER_OUTPUT_DIRECTORY =
    path.resolve(
        __dirname,
        "../../../../data/remote-sensing/outputs"
    );

const DEFAULT_PREPARED_SENTINEL2_FILE =
    "S2C_MSIL2A_20260908T044701_N0512_R076_T44QQE_20260908T094920_NDVI_prepared.tif";

const ENSURE_RASTER_INDEX_SERVICE_VERSION =
    "1.0";

const SENTINEL2_NDVI_BAND_MAPPING =
    Object.freeze({
        Red: 1,
        NIR: 2
    });

function buildOutputPath({
    indexCode,
    outputDirectory
}) {
    return path.join(
        outputDirectory,
        `${indexCode}_index.tif`
    );
}

async function ensureRasterIndex({
    indexCode = "NDVI",
    outputDirectory =
        DEFAULT_RASTER_OUTPUT_DIRECTORY,
    preparedInputPath =
        path.join(
            DEFAULT_PREPARED_SENTINEL2_DIRECTORY,
            DEFAULT_PREPARED_SENTINEL2_FILE
        ),
    rasterWorkflowImpl =
        processRasterIndexWorkflow
} = {}) {
    const normalizedIndexCode =
        String(indexCode)
            .trim()
            .toUpperCase();

    const outputPath =
        buildOutputPath({
            indexCode:
                normalizedIndexCode,
            outputDirectory
        });

    if (fs.existsSync(outputPath)) {
        return {
            serviceVersion:
                ENSURE_RASTER_INDEX_SERVICE_VERSION,

            status:
                "ready",

            built:
                false,

            indexCode:
                normalizedIndexCode,

            outputPath
        };
    }

    if (!fs.existsSync(preparedInputPath)) {
        const error = new Error(
            `Prepared Sentinel-2 input was not found: ${preparedInputPath}`
        );

        error.code =
            "PREPARED_SENTINEL2_INPUT_NOT_FOUND";

        throw error;
    }

    const rasterWorkflow =
        await rasterWorkflowImpl({
            inputPath:
                preparedInputPath,

            indexCode:
                normalizedIndexCode,

            bandMapping:
                SENTINEL2_NDVI_BAND_MAPPING,

            outputDirectory
        });

    return {
        serviceVersion:
            ENSURE_RASTER_INDEX_SERVICE_VERSION,

        status:
            "ready",

        built:
            true,

        indexCode:
            normalizedIndexCode,

        outputPath:
            rasterWorkflow
                .continuousOutput
                .outputPath,

        classificationOutputPath:
            rasterWorkflow
                .classificationOutput
                .outputPath
    };
}

module.exports = {
    ENSURE_RASTER_INDEX_SERVICE_VERSION,
    DEFAULT_PREPARED_SENTINEL2_DIRECTORY,
    DEFAULT_RASTER_OUTPUT_DIRECTORY,
    DEFAULT_PREPARED_SENTINEL2_FILE,
    SENTINEL2_NDVI_BAND_MAPPING,
    buildOutputPath,
    ensureRasterIndex
};
