"use strict";

// ============================================================
// AgriNexus GIS
//
// Sentinel-2 NDVI Production Preparation Workflow
//
// Responsibility:
//   Acquire authoritative Sentinel-2 B04/B08 assets,
//   decode source DN samples, apply authoritative radiometric
//   metadata, preserve authoritative CRS, and write the
//   prepared Float32 GeoTIFF.
//
// This service does NOT:
//   - define Sentinel-2 scientific metadata
//   - calculate NDVI
//   - classify pixels
//   - reproject
//   - resample
//   - modify source CRS
// ============================================================

const path = require("node:path");

const {
    acquireNDVIBands
} = require("./sentinel2AcquisitionService");

const {
    decodeSentinel2Jp2
} = require("./sentinel2Jp2DecoderService");

const {
    prepareSentinel2Raster
} = require("./sentinel2RadiometricPreparationService");

const {
    writeSentinel2PreparedRaster
} = require("./sentinel2PreparedRasterWriterService");

const SENTINEL2_NDVI_PREPARATION_WORKFLOW_VERSION = "1.0";

async function prepareSentinel2NdviRaster({
    request,
    outputDirectory,
    outputFileName,
    acquisitionImpl = acquireNDVIBands,
    decodeImpl = decodeSentinel2Jp2,
    prepareImpl = prepareSentinel2Raster,
    writeImpl = writeSentinel2PreparedRaster
} = {}) {
    if (!request || typeof request !== "object") {
        throw new TypeError(
            "Sentinel-2 acquisition request must be an object."
        );
    }

    if (
        typeof outputDirectory !== "string" ||
        outputDirectory.trim().length === 0
    ) {
        throw new TypeError(
            "outputDirectory must be a non-empty string."
        );
    }

    if (
        typeof outputFileName !== "string" ||
        outputFileName.trim().length === 0
    ) {
        throw new TypeError(
            "outputFileName must be a non-empty string."
        );
    }

    const acquisition =
        await acquisitionImpl({
            request,
            outputDirectory
        });

    const redDecoded =
        await decodeImpl(
            acquisition.red.path
        );

    const nirDecoded =
        await decodeImpl(
            acquisition.nir.path
        );

    if (
        redDecoded.width !== nirDecoded.width ||
        redDecoded.height !== nirDecoded.height ||
        redDecoded.pixelCount !== nirDecoded.pixelCount
    ) {
        throw new Error(
            "Sentinel-2 Red and NIR decoded rasters do not have matching dimensions."
        );
    }

    const preparedRaster =
        prepareImpl({
            sceneId:
                acquisition.sceneId,

            acquisitionDate:
                acquisition.acquisitionDate,

            width:
                redDecoded.width,

            height:
                redDecoded.height,

            redSamples:
                redDecoded.samples,

            nirSamples:
                nirDecoded.samples,

            scale:
                acquisition.radiometry.scale,

            offset:
                acquisition.radiometry.offset,

            sourceNoData:
                acquisition.radiometry.noData,

            spatialReference:
                acquisition.spatialReference,

            metadata: {
                sceneId:
                    acquisition.sceneId,

                redAsset:
                    acquisition.red.assetKey,

                nirAsset:
                    acquisition.nir.assetKey,

                decoderDataType:
                    redDecoded.dataType,

                workflow:
                    SENTINEL2_NDVI_PREPARATION_WORKFLOW_VERSION
            }
        });

    const outputPath =
        path.join(
            outputDirectory,
            outputFileName
        );

    const written =
        await writeImpl({
            preparedRaster,
            outputPath
        });

    return {
        workflowVersion:
            SENTINEL2_NDVI_PREPARATION_WORKFLOW_VERSION,

        sceneId:
            acquisition.sceneId,

        acquisitionDate:
            acquisition.acquisitionDate,

        spatialReference:
            acquisition.spatialReference,

        radiometry:
            acquisition.radiometry,

        outputPath:
            written.outputPath,

        width:
            written.width,

        height:
            written.height,

        pixelCount:
            written.pixelCount,

        bandCount:
            written.bandCount,

        dataType:
            written.dataType
    };
}

module.exports = {
    SENTINEL2_NDVI_PREPARATION_WORKFLOW_VERSION,
    prepareSentinel2NdviRaster
};
