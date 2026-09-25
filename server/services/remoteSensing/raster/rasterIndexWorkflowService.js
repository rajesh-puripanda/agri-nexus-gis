"use strict";

// ============================================================
// server/services/remoteSensing/raster/rasterIndexWorkflowService.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.3.5
// Raster Index Workflow Service
//
// Orchestration only.
//
// This service coordinates:
//   GeoTIFF Reader
//   -> Raster Validation
//   -> Raster Normalization
//   -> Raster Index Processing
//   -> Raster Index Classification
//   -> GeoTIFF Output
//
// Scientific calculations, classification thresholds,
// interpolation, reprojection, resampling, and value
// modification remain in their respective services.
// ============================================================

const path = require("node:path");

const {
    readGeoTiff
} = require("./rasterReaderService");

const {
    validateRaster
} = require("./rasterValidationService");

const {
    normalizeRaster
} = require("./rasterNormalizationService");

const {
    processRasterIndex
} = require("./rasterIndexProcessingService");

const {
    processRasterIndexClassification
} = require("./rasterIndexClassificationService");

const {
    writeRasterOutput
} = require("./rasterOutputService");

const {
    getIndexDefinition
} = require("../../../scientific/remoteSensing/indices/indexRegistry");

const {
    RASTER_INDEX_CLASSIFICATION_CONTRACT_VERSION
} = require(
    "../../../scientific/remoteSensing/raster/rasterIndexClassificationContract"
);

const {
    validateRasterIndexWorkflowResult,
    createRasterIndexWorkflowResultContract
} = require(
    "../../../scientific/remoteSensing/raster/rasterIndexWorkflowContract"
);

const WORKFLOW_VERSION = "1.0";

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

function assertObject(value, name) {
    if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        throw new TypeError(
            `${name} must be an object`
        );
    }
}

function assertBandMapping(bandMapping) {
    assertObject(
        bandMapping,
        "bandMapping"
    );

    const entries =
        Object.entries(bandMapping);

    if (entries.length === 0) {
        throw new TypeError(
            "bandMapping must contain at least one band"
        );
    }
}

function createValidationRaster({
    raster,
    bandMapping
}) {
    const bands = {};

    for (const [bandName, sourceBand] of Object.entries(bandMapping)) {
        const sourceIndex = sourceBand - 1;

        if (
            sourceIndex < 0 ||
            sourceIndex >= raster.data.length
        ) {
            throw new Error(
                `Source band ${sourceBand} for "${bandName}" is outside the raster band range.`
            );
        }

        bands[bandName] =
            raster.data[sourceIndex];
    }

    return {
        width: raster.width,
        height: raster.height,
        bands
    };
}

function assertOutputDirectory(outputDirectory) {
    assertNonEmptyString(
        outputDirectory,
        "outputDirectory"
    );
}

function assertRequiredIndexBands({
    normalizedRaster,
    definition
}) {
    for (const bandName of definition.requiredBands) {
        if (
            !normalizedRaster.bands ||
            !Object.prototype.hasOwnProperty.call(
                normalizedRaster.bands,
                bandName
            )
        ) {
            throw new Error(
                `Raster validation failed: raster is missing required band for ` +
                `${definition.code}: ${bandName}`
            );
        }
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

async function processRasterIndexWorkflow({
    inputPath,
    indexCode,
    bandMapping,
    noData,
    parameters,
    processingContext,
    spatialContext,
    outputDirectory
}) {
    assertNonEmptyString(
        inputPath,
        "inputPath"
    );

    assertNonEmptyString(
        indexCode,
        "indexCode"
    );

    assertBandMapping(
        bandMapping
    );

    assertOutputDirectory(
        outputDirectory
    );

    const definition =
        getIndexDefinition(
            indexCode
        );

    if (!definition) {
        throw new Error(
            `Unknown remote sensing index: ${indexCode}`
        );
    }

    const normalizedIndexCode =
        definition.code;

    const readerRaster =
        await readGeoTiff(
            inputPath
        );

    const validationRaster =
        createValidationRaster({
            raster: readerRaster,
            bandMapping
        });

    const validation =
        validateRaster({
            raster: validationRaster,
            bandMapping,
            noData:
                noData !== undefined
                    ? noData
                    : readerRaster.noData
        });

    if (!validation.valid) {
        throw new Error(
            `Raster validation failed: ` +
            validation.errors.join("; ")
        );
    }

    const normalizedRaster =
        normalizeRaster({
            raster: readerRaster,
            bandMapping,
            noData
        });
    
        assertRequiredIndexBands({
        normalizedRaster,
        definition
    });

    const calculationResult =
        processRasterIndex({
            indexCode: normalizedIndexCode,
            raster: normalizedRaster,
            parameters,
            processingContext,
            spatialContext
        });

    const continuousRaster =
    calculationResult.results.raster;

    const continuousOutputRaster =
        createContinuousOutputRaster({
            raster: continuousRaster,
            indexCode: normalizedIndexCode
        });

    const classificationResult =
        processRasterIndexClassification({
            indexCode: normalizedIndexCode,
            raster: continuousRaster,
            processingContext,
            spatialContext
        });

    const classificationRaster =
    classificationResult
        .classification
        .raster;

    const classificationOutputRaster =
        createClassificationOutputRaster({
            raster: classificationRaster,
            indexCode: normalizedIndexCode
        });

    const outputPaths =
        buildOutputPaths({
            outputDirectory,
            indexCode: normalizedIndexCode
        });

    const continuousOutputMetadata = {
        format: "GeoTIFF",
        indexName: definition.name,
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
                indexCode:
                    normalizedIndexCode,
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
        indexName: definition.name,
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
                indexCode:
                    normalizedIndexCode,
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

    const workflowResult =
        createRasterIndexWorkflowResultContract({
        workflowVersion:
            WORKFLOW_VERSION,

        indexCode:
            normalizedIndexCode,

        input: {
            filePath: inputPath,
            width: readerRaster.width,
            height: readerRaster.height,
            pixelCount:
                readerRaster.width *
                readerRaster.height
        },

        processing: {
            indexCode:
                normalizedIndexCode,

            indexName:
                definition.name,

            classificationMethod:
                classificationResult
                    .classification
                    .method
        },

        continuousOutput,

        classificationOutput
    });

    const workflowValidation =
        validateRasterIndexWorkflowResult(
            workflowResult
        );

    if (!workflowValidation.valid) {
        throw new Error(
            `Raster index workflow result validation failed: ` +
            workflowValidation.errors.join("; ")
        );
    }

    return workflowResult;
}

module.exports = {
    WORKFLOW_VERSION,
    buildOutputPaths,
    processRasterIndexWorkflow
};



