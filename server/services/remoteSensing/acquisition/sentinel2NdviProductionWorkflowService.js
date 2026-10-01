"use strict";

// ============================================================
// AgriNexus GIS
//
// Sentinel-2 NDVI Production Workflow
//
// Composition boundary:
//
//   Copernicus STAC
//       
//   Sentinel-2 B04/B08 acquisition
//       
//   JP2 decode
//       
//   authoritative radiometric preparation
//       
//   prepared Float32 GeoTIFF
//       
//   existing raster index workflow
//       
//   NDVI + classification GeoTIFF
//
// This service performs orchestration only.
// Scientific calculations remain in authoritative services.
// ============================================================

const {
    prepareSentinel2NdviRaster
} = require("./sentinel2NdviPreparationWorkflowService");

const {
    processRasterIndexWorkflow
} = require("../raster/rasterIndexWorkflowService");

const SENTINEL2_NDVI_PRODUCTION_WORKFLOW_VERSION = "1.0";

const SENTINEL2_NDVI_BAND_MAPPING = Object.freeze({
    Red: 1,
    NIR: 2
});

async function processSentinel2NdviProductionWorkflow({
    request,
    acquisitionOutputDirectory,
    preparedOutputFileName,
    rasterOutputDirectory,
    preparationImpl = prepareSentinel2NdviRaster,
    rasterWorkflowImpl = processRasterIndexWorkflow
} = {}) {
    const preparation =
        await preparationImpl({
            request,
            outputDirectory:
                acquisitionOutputDirectory,
            outputFileName:
                preparedOutputFileName
        });

    const rasterWorkflow =
        await rasterWorkflowImpl({
            inputPath:
                preparation.outputPath,

            indexCode:
                "NDVI",

            bandMapping:
                SENTINEL2_NDVI_BAND_MAPPING,

            outputDirectory:
                rasterOutputDirectory
        });

    return {
        workflowVersion:
            SENTINEL2_NDVI_PRODUCTION_WORKFLOW_VERSION,

        sceneId:
            preparation.sceneId,

        acquisitionDate:
            preparation.acquisitionDate,

        preparation,

        rasterWorkflow
    };
}

module.exports = {
    SENTINEL2_NDVI_PRODUCTION_WORKFLOW_VERSION,
    SENTINEL2_NDVI_BAND_MAPPING,
    processSentinel2NdviProductionWorkflow
};
