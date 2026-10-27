
"use strict";

const fs = require("fs/promises");
const path = require("path");

const { readGeoTiff } = require("../raster/rasterReaderService");
const { writeRasterOutput } = require("../raster/rasterOutputService");
const {
    processSentinel2NdviProductionWorkflow
} = require("../acquisition/sentinel2NdviProductionWorkflowService");
const {
    LAI_MODEL_VERSION,
    retrieveLaiFromNdvi
} = require("../../../scientific/remoteSensing/biophysical/laiRetrievalService");

const LAI_PRODUCTION_WORKFLOW_VERSION = "1.0";

const {
    writeProductionMetadata
} = require("../catalog/sentinel2IndexProductionMetadataService");

async function readValidNdvi(ndviPath, readRasterImpl) {
    const stat = await fs.stat(ndviPath);
    if (!stat.isFile()) throw new Error("NDVI path is not a file.");

    const raster = await readRasterImpl(ndviPath);
    const band = raster.data?.[0];
    const pixelCount = raster.width * raster.height;

    if (
        !Number.isInteger(raster.width) || raster.width <= 0 ||
        !Number.isInteger(raster.height) || raster.height <= 0 ||
        !band || band.length !== pixelCount ||
        !raster.origin || !raster.resolution ||
        !raster.boundingBox || !raster.geoKeys
    ) {
        throw new Error("NDVI GeoTIFF is structurally invalid.");
    }

    return {
        width: raster.width,
        height: raster.height,
        data: band,
        noData: raster.noData ?? -9999,
        spatialReference: {
            origin: raster.origin,
            resolution: raster.resolution,
            boundingBox: raster.boundingBox,
            geoKeys: raster.geoKeys
        }
    };
}

async function processLaiProductionWorkflow({
    outputDirectory,
    model,
    ndviPath,
    regeneration,
    sceneId,
    acquisitionDate,
    targetResolution,
    readRasterImpl = readGeoTiff,
    writeRasterImpl = writeRasterOutput,
    ndviWorkflowImpl = processSentinel2NdviProductionWorkflow
} = {}) {
    if (typeof outputDirectory !== "string" || !outputDirectory.trim()) {
        throw new TypeError("outputDirectory must be a non-empty string.");
    }
    if (!model || typeof model !== "object") {
        throw new TypeError("An explicit LAI model is required.");
    }

    const resolvedNdviPath = path.resolve(
        ndviPath || path.join(outputDirectory, "NDVI_index.tif")
    );

    let ndviRaster;
    let ndviSource = "existing";
    let ndviWorkflowResult = null;
    try {
        ndviRaster = await readValidNdvi(resolvedNdviPath, readRasterImpl);
    } catch (error) {
        if (!regeneration || typeof regeneration !== "object") {
            throw new Error(
                `NDVI is missing or invalid (${error.message}). ` +
                "Supply regeneration details to rebuild it."
            );
        }

        const {
            request,
            acquisitionOutputDirectory,
            preparedOutputFileName,
            rasterOutputDirectory
        } = regeneration;

        const sceneId = request?.acquisitionParameters?.sceneId;
        if (
            !sceneId ||
            !acquisitionOutputDirectory ||
            !preparedOutputFileName ||
            !rasterOutputDirectory
        ) {
            throw new Error(
                "Regeneration requires an explicit sceneId, request, " +
                "acquisitionOutputDirectory, preparedOutputFileName, " +
                "and rasterOutputDirectory."
            );
        }

        ndviWorkflowResult = await ndviWorkflowImpl({
            request,
            acquisitionOutputDirectory,
            preparedOutputFileName,
            rasterOutputDirectory
        });

        const regeneratedPath = path.join(
            rasterOutputDirectory,
            "NDVI_index.tif"
        );
        ndviRaster = await readValidNdvi(regeneratedPath, readRasterImpl);
        ndviSource = "regenerated";
    }

    const lai = retrieveLaiFromNdvi({ ndviRaster, model });
    const outputPath = path.join(outputDirectory, "LAI_index.tif");

    const outputMetadata = {
        productName: "Leaf Area Index",
        processingType: "empirical_biophysical_retrieval",
        analysisVersion: LAI_MODEL_VERSION,
        workflowVersion: LAI_PRODUCTION_WORKFLOW_VERSION,
        inputProduct: "NDVI",
        inputPath: ndviSource === "existing"
            ? resolvedNdviPath
            : path.join(regeneration.rasterOutputDirectory, "NDVI_index.tif"),
        ndviSource,
        ...lai.metadata
    };

    const rasterWrite = await writeRasterImpl({
        request: {
            outputType: "continuous_index",
            productCode: "LAI",
            raster: {
                width: lai.width,
                height: lai.height,
                pixelCount: lai.pixelCount,
                bands: {
                    LAI: { data: lai.data, dataType: "Float32" }
                },
                noData: lai.noData,
                spatialReference: lai.spatialReference
            },
            outputMetadata
        },
        outputPath
    });
    const resolvedSceneId =
    sceneId || ndviWorkflowResult?.sceneId;

    const resolvedAcquisitionDate =
        acquisitionDate || ndviWorkflowResult?.acquisitionDate;

    const resolvedTargetResolution =
        targetResolution ??
        Math.abs(ndviRaster.spatialReference.resolution[0]);

    if (
        resolvedSceneId &&
        resolvedAcquisitionDate &&
        Number.isFinite(resolvedTargetResolution) &&
        resolvedTargetResolution > 0
    ) {
        await writeProductionMetadata({
            workflowResult: {
                productCode: "LAI",
                productName: "Leaf Area Index",
                sceneId: resolvedSceneId,
                acquisitionDate: resolvedAcquisitionDate,
                targetResolution: resolvedTargetResolution,
                workflowVersion: LAI_PRODUCTION_WORKFLOW_VERSION,
                inputProduct: "NDVI",
                model: lai.metadata,
                outputPath: rasterWrite.outputPath || outputPath
            },
            outputDirectory
        });
    }
    return {
        workflowVersion: LAI_PRODUCTION_WORKFLOW_VERSION,
        outputPath: rasterWrite.outputPath || outputPath,
        ndviPath: outputMetadata.inputPath,
        ndviSource,
        model: lai.metadata,
        validPixelCount: lai.metadata.validPixelCount,
        excludedPixelCount: lai.metadata.excludedPixelCount,
        rasterWrite
    };
}

module.exports = {
    LAI_PRODUCTION_WORKFLOW_VERSION,
    processLaiProductionWorkflow
};
