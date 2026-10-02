"use strict";

// ============================================================
// server/services/remoteSensing/raster/rasterIndexPostProcessingService.js
// ============================================================
//
// AgriNexus GIS
//
// Shared Raster Index Post-Processing Service
//
// Responsibilities:
//   - Classify an already-calculated continuous index raster.
//   - Build continuous output raster representation.
//   - Build classification output raster representation.
//   - Write continuous index GeoTIFF.
//   - Write classification GeoTIFF.
//
// This service does NOT:
//   - read input rasters
//   - validate source rasters
//   - normalize source rasters
//   - resample
//   - reproject
//   - calculate scientific indices
//   - redefine classification thresholds
//
// Scientific calculation remains in:
//   rasterIndexProcessingService
//
// Classification remains in:
//   rasterIndexClassificationService
//
// GeoTIFF writing remains in:
//   rasterOutputService
// ============================================================

const path = require("node:path");

const {
    processRasterIndexClassification
} = require("./rasterIndexClassificationService");

const {
    writeRasterOutput
} = require("./rasterOutputService");

const {
    RASTER_INDEX_CLASSIFICATION_CONTRACT_VERSION
} = require(
    "../../../scientific/remoteSensing/raster/rasterIndexClassificationContract"
);

function assertNonEmptyString(value, name) {
    if (
        typeof value !== "string" ||
        value.trim() === ""
    ) {
        throw new TypeError(
            `${name} must be a non-empty string`
        );
    }
}

function createContinuousOutputRaster({
    raster,
    indexCode
}) {
    return {
        ...raster,

        bands: {
            ...raster.bands,

            [indexCode]: {
                ...raster.bands[indexCode],
                dataType: "Float32"
            }
        }
    };
}

function createClassificationOutputRaster({
    raster,
    indexCode
}) {
    return {
        ...raster,

        bands: {
            ...raster.bands,

            [indexCode]: {
                ...raster.bands[indexCode],
                dataType: "Uint8"
            }
        }
    };
}

function buildOutputPaths({
    outputDirectory,
    indexCode
}) {
    assertNonEmptyString(
        outputDirectory,
        "outputDirectory"
    );

    assertNonEmptyString(
        indexCode,
        "indexCode"
    );

    return {
        continuous:
            path.join(
                outputDirectory,
                `${indexCode}_index.tif`
            ),

        classification:
            path.join(
                outputDirectory,
                `${indexCode}_classification.tif`
            )
    };
}

async function processAndWriteRasterIndexOutputs({
    indexCode,
    indexName,
    calculationResult,
    outputDirectory,
    processingContext,
    spatialContext
}) {
    assertNonEmptyString(
        indexCode,
        "indexCode"
    );

    assertNonEmptyString(
        indexName,
        "indexName"
    );

    assertNonEmptyString(
        outputDirectory,
        "outputDirectory"
    );

    if (
        !calculationResult ||
        typeof calculationResult !== "object"
    ) {
        throw new TypeError(
            "calculationResult must be an object"
        );
    }

    if (
        !calculationResult.results ||
        !calculationResult.results.raster
    ) {
        throw new Error(
            "calculationResult must contain results.raster"
        );
    }

    const continuousRaster =
        calculationResult.results.raster;

    const continuousOutputRaster =
        createContinuousOutputRaster({
            raster:
                continuousRaster,

            indexCode
        });

    const classificationResult =
        processRasterIndexClassification({
            indexCode,

            raster:
                continuousRaster,

            processingContext,

            spatialContext
        });

    const classificationRaster =
        classificationResult
            .classification
            .raster;

    const classificationOutputRaster =
        createClassificationOutputRaster({
            raster:
                classificationRaster,

            indexCode
        });

    const outputPaths =
        buildOutputPaths({
            outputDirectory,
            indexCode
        });

    const continuousOutputMetadata = {
        format: "GeoTIFF",

        indexName,

        processingType:
            "pixelwise_scalar_index",

        analysisVersion:
            calculationResult.analysisVersion,

        sourceRasterContractVersion:
            continuousRaster.contractVersion,

        timestamp:
            calculationResult.timestamp
    };

    const continuousOutput =
        await writeRasterOutput({
            request: {
                outputType:
                    "continuous_index",

                indexCode,

                raster:
                    continuousOutputRaster,

                outputMetadata:
                    continuousOutputMetadata
            },

            outputPath:
                outputPaths.continuous
        });

    const classificationOutputMetadata = {
        format: "GeoTIFF",

        indexName,

        processingType:
            "pixelwise_raster_classification",

        classificationMethod:
            classificationResult
                .classification
                .method,

        analysisVersion:
            RASTER_INDEX_CLASSIFICATION_CONTRACT_VERSION,

        sourceRasterContractVersion:
            continuousRaster.contractVersion,

        timestamp:
            classificationResult.timestamp
    };

    const classificationOutput =
        await writeRasterOutput({
            request: {
                outputType:
                    "classification",

                indexCode,

                raster:
                    classificationOutputRaster,

                classification: {
                    method:
                        classificationResult
                            .classification
                            .method,

                    classDefinitions:
                        classificationResult
                            .classification
                            .classDefinitions
                },

                outputMetadata:
                    classificationOutputMetadata
            },

            outputPath:
                outputPaths.classification
        });

    return {
        continuousRaster,
        classificationResult,

        continuousOutputRaster,
        classificationOutputRaster,

        outputPaths,

        continuousOutput,
        classificationOutput
    };
}

module.exports = {
    createContinuousOutputRaster,
    createClassificationOutputRaster,
    buildOutputPaths,
    processAndWriteRasterIndexOutputs
};
