"use strict";

// ============================================================
// server/services/remoteSensing/temporal/
//     temporalObservationWorkflowService.js
// ============================================================
//
// AgriNexus-GIS
//
// Phase 5.1.5.3.2
// Temporal Observation Workflow Service
//
// Responsibilities:
//   - Orchestrate the existing raster-processing pipeline
//   - Preserve temporal observation identity
//   - Adapt raster calculation results into the
//     Temporal Index Observation Contract
//   - Produce continuous and classification GeoTIFF outputs
//
// This service does NOT:
//   - calculate scientific index formulas
//   - calculate statistics independently
//   - define classification thresholds
//   - compare temporal observations
//   - perform trend/change/seasonal analysis
//   - interpolate, reproject, or resample rasters
//   - modify raster scientific values
//   - infer raster identity
//
// ============================================================

const path = require("node:path");

const {
    readGeoTiff
} = require("../raster/rasterReaderService");

const {
    validateRaster
} = require("../raster/rasterValidationService");

const {
    normalizeRaster
} = require("../raster/rasterNormalizationService");

const {
    processRasterIndex
} = require("../raster/rasterIndexProcessingService");

const {
    processRasterIndexClassification
} = require("../raster/rasterIndexClassificationService");

const {
    writeRasterOutput
} = require("../raster/rasterOutputService");

const {
    getIndexDefinition
} = require("../../../scientific/remoteSensing/indices/indexRegistry");

const {
    createTemporalObservationWorkflowRequestContract
} = require("../../../scientific/remoteSensing/temporal/temporalObservationWorkflowRequestContract");

const {
    createTemporalIndexObservation
} = require("../../../scientific/remoteSensing/temporal/temporalIndexObservationContract");

const TEMPORAL_OBSERVATION_WORKFLOW_SERVICE_VERSION = "1.0";

/* ============================================================
   VALIDATION RASTER ADAPTER
   ============================================================ */

function createValidationRaster({ raster, bandMapping }) {
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

        bands[bandName] = raster.data[sourceIndex];
    }

    return {
        width: raster.width,
        height: raster.height,
        bands
    };
}

/* ============================================================
   REQUIRED BAND CHECK
   ============================================================ */

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

/* ============================================================
   OUTPUT RASTER ADAPTERS
   ============================================================ */

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

/* ============================================================
   OUTPUT PATHS
   ============================================================ */

function buildOutputPaths({
    outputDirectory,
    indexCode
}) {
    return {
        continuous: path.join(
            outputDirectory,
            `${indexCode}_index.tif`
        ),
        classification: path.join(
            outputDirectory,
            `${indexCode}_classification.tif`
        )
    };
}

/* ============================================================
   TEMPORAL OBSERVATION ADAPTER
   ============================================================ */

function buildTemporalIndexObservation({
    temporalIdentity,
    rasterIdentity,
    definition,
    calculationResult,
    normalizedRaster,
    processingContext
}) {
    return createTemporalIndexObservation({
        contractVersion: "1.0",

        observation: {
            observationDate: temporalIdentity.observationDate,
            acquisitionDate: temporalIdentity.acquisitionDate,
            sensor: temporalIdentity.sensor,
            sceneId: temporalIdentity.sceneId,
            indexCode: definition.code
        },

        raster: {
            rasterId: rasterIdentity.rasterId,
            width: normalizedRaster.width,
            height: normalizedRaster.height,
            pixelCount: normalizedRaster.pixelCount,
            noData: normalizedRaster.noData
        },

        index: {
            code: definition.code,
            name: definition.name,
            validRange: definition.validRange
        },

        statistics: {
            validPixelCount:
                calculationResult.statistics.validPixelCount,

            noDataPixelCount:
                calculationResult.statistics.noDataPixelCount,

            minimum:
                calculationResult.statistics.min,

            maximum:
                calculationResult.statistics.max,

            mean:
                calculationResult.statistics.mean
        },

        spatialContext:
            calculationResult.spatialContext,

        processingContext
    });
}

/* ============================================================
   TEMPORAL OBSERVATION WORKFLOW
   ============================================================ */

async function processTemporalObservationWorkflow(request) {
    const normalizedRequest =
        createTemporalObservationWorkflowRequestContract(
            request
        );

    const {
        temporalIdentity,
        rasterIdentity,
        workflowRequest
    } = normalizedRequest;

    const normalizedIndexCode =
        workflowRequest.indexCode;

    const definition =
        getIndexDefinition(normalizedIndexCode);

    if (!definition) {
        throw new Error(
            `Unknown remote sensing index: ${normalizedIndexCode}`
        );
    }

    /* --------------------------------------------------------
       1. Read GeoTIFF
       -------------------------------------------------------- */

    const readerRaster =
        await readGeoTiff(
            workflowRequest.inputPath
        );

    /* --------------------------------------------------------
       2. Validate raster
       -------------------------------------------------------- */

    const validationRaster =
        createValidationRaster({
            raster: readerRaster,
            bandMapping:
                workflowRequest.bandMapping
        });

    validateRaster({
        raster: validationRaster,
        bandMapping:
            workflowRequest.bandMapping,
        noData:
            workflowRequest.noData !== undefined
                ? workflowRequest.noData
                : readerRaster.noData
    });

    /* --------------------------------------------------------
       3. Normalize raster
       -------------------------------------------------------- */

    const normalizedRaster =
        normalizeRaster({
            raster: readerRaster,
            bandMapping:
                workflowRequest.bandMapping,
            noData:
                workflowRequest.noData
        });

    /* --------------------------------------------------------
       4. Verify required scientific bands
       -------------------------------------------------------- */

    assertRequiredIndexBands({
        normalizedRaster,
        definition
    });

    /* --------------------------------------------------------
       5. Calculate continuous index
       -------------------------------------------------------- */

    const calculationResult =
        processRasterIndex({
            indexCode: normalizedIndexCode,
            raster: normalizedRaster,
            parameters:
                workflowRequest.parameters,
            processingContext:
                workflowRequest.processingContext,
            spatialContext:
                workflowRequest.spatialContext
        });

    const continuousRaster =
        calculationResult.results.raster;

    /* --------------------------------------------------------
       6. Classify continuous index raster
       -------------------------------------------------------- */

    const classificationResult =
        processRasterIndexClassification({
            indexCode: normalizedIndexCode,
            raster: continuousRaster,
            processingContext:
                workflowRequest.processingContext,
            spatialContext:
                calculationResult.spatialContext
        });

    /* --------------------------------------------------------
       7. Prepare output rasters
       -------------------------------------------------------- */

    const continuousOutputRaster =
        createContinuousOutputRaster({
            raster: continuousRaster,
            indexCode: normalizedIndexCode
        });

    const classificationRaster =
        classificationResult.classification.raster;

    const classificationOutputRaster =
        createClassificationOutputRaster({
            raster: classificationRaster,
            indexCode: normalizedIndexCode
        });

    /* --------------------------------------------------------
       8. Build output paths
       -------------------------------------------------------- */

    const outputPaths =
        buildOutputPaths({
            outputDirectory:
                workflowRequest.outputDirectory,
            indexCode:
                normalizedIndexCode
        });

    /* --------------------------------------------------------
       9. Write continuous GeoTIFF
       -------------------------------------------------------- */

    const continuousOutput =
        await writeRasterOutput({
            request: {
                indexCode: normalizedIndexCode,
                outputType: "continuous_index",
                raster: continuousOutputRaster
            },
            outputPath:
                outputPaths.continuous
        });

    /* --------------------------------------------------------
       10. Write classification GeoTIFF
       -------------------------------------------------------- */

    const classificationOutput =
        await writeRasterOutput({
            request: {
                indexCode: normalizedIndexCode,
                outputType: "classification",
                raster: classificationOutputRaster
            },
            outputPath:
                outputPaths.classification
        });

    /* --------------------------------------------------------
       11. Build temporal observation
       -------------------------------------------------------- */

    const observation =
        buildTemporalIndexObservation({
            temporalIdentity,
            rasterIdentity,
            definition,
            calculationResult,
            normalizedRaster,
            processingContext:
                workflowRequest.processingContext
        });

    /* --------------------------------------------------------
       12. Service-level result
       -------------------------------------------------------- */

    return {
        observation,
        continuousOutput,
        classificationOutput
    };
}

/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
    TEMPORAL_OBSERVATION_WORKFLOW_SERVICE_VERSION,

    createValidationRaster,
    assertRequiredIndexBands,
    createContinuousOutputRaster,
    createClassificationOutputRaster,
    buildOutputPaths,
    buildTemporalIndexObservation,

    processTemporalObservationWorkflow
};
