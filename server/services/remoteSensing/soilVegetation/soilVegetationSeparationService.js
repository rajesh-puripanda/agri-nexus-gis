"use strict";

// ============================================================
// server/services/remoteSensing/soilVegetation/
//     soilVegetationSeparationService.js
// ============================================================
//
// AgriNexus GIS
//
// Soil / Vegetation Separation Service
//
// Scientific principle:
//   NDVI = vegetation evidence
//   BSI  = bare-soil evidence
//
// This service compares already-calculated NDVI and BSI
// continuous rasters on a common authoritative grid.
//
// It does NOT:
//   - calculate NDVI or BSI
//   - define NDVI/BSI thresholds
//   - classify crop health
//   - classify soil fertility
//   - estimate soil moisture
//   - resample
//   - reproject
//   - interpolate
//   - create a new spectral index
//
// ============================================================

const {
    validateSoilVegetationSeparationRequest,
    createSoilVegetationSeparationResultContract,
    ANALYSIS_TYPE,
    ANALYSIS_METHOD,
    INTERPRETATION_MODE
} = require(
    "../../../scientific/remoteSensing/soilVegetation/" +
    "soilVegetationSeparationContract"
);

function isNoDataValue(value, noData) {
    if (noData === undefined || noData === null) {
        return false;
    }

    return Object.is(value, noData) || value === noData;
}

function assertFiniteRasterValue(
    value,
    indexCode,
    pixelIndex
) {
    if (!Number.isFinite(value)) {
        throw new Error(
            `${indexCode} contains a non-finite value at pixel ${pixelIndex}.`
        );
    }
}

function calculateMean(values) {
    if (values.length === 0) {
        return null;
    }

    let sum = 0;

    for (const value of values) {
        sum += value;
    }

    return sum / values.length;
}

function calculateMin(values) {
    if (values.length === 0) {
        return null;
    }

    let minimum = values[0];

    for (let index = 1; index < values.length; index += 1) {
        if (values[index] < minimum) {
            minimum = values[index];
        }
    }

    return minimum;
}

function calculateMax(values) {
    if (values.length === 0) {
        return null;
    }

    let maximum = values[0];

    for (let index = 1; index < values.length; index += 1) {
        if (values[index] > maximum) {
            maximum = values[index];
        }
    }

    return maximum;
}

function calculatePearsonCorrelation(
    xValues,
    yValues
) {
    if (
        xValues.length !== yValues.length ||
        xValues.length < 2
    ) {
        return null;
    }

    const xMean = calculateMean(xValues);
    const yMean = calculateMean(yValues);

    let numerator = 0;
    let xVariance = 0;
    let yVariance = 0;

    for (let index = 0; index < xValues.length; index += 1) {
        const xDelta =
            xValues[index] - xMean;

        const yDelta =
            yValues[index] - yMean;

        numerator +=
            xDelta * yDelta;

        xVariance +=
            xDelta * xDelta;

        yVariance +=
            yDelta * yDelta;
    }

    if (
        xVariance === 0 ||
        yVariance === 0
    ) {
        return null;
    }

    return (
        numerator /
        Math.sqrt(
            xVariance * yVariance
        )
    );
}

function analyzePairedEvidence({
    ndviRaster,
    bsiRaster
}) {
    const ndviBand =
        ndviRaster.bands.NDVI;

    const bsiBand =
        bsiRaster.bands.BSI;

    const pixelCount =
        ndviRaster.pixelCount;

    const ndviValues = [];
    const bsiValues = [];

    let validPixelCount = 0;
    let noDataPixelCount = 0;

    for (
        let pixelIndex = 0;
        pixelIndex < pixelCount;
        pixelIndex += 1
    ) {
        const ndviValue =
            ndviBand.data[pixelIndex];

        const bsiValue =
            bsiBand.data[pixelIndex];

        if (
            isNoDataValue(
                ndviValue,
                ndviRaster.noData
            ) ||
            isNoDataValue(
                bsiValue,
                bsiRaster.noData
            ) ||
            !Number.isFinite(ndviValue) ||
            !Number.isFinite(bsiValue)
        ) {
            noDataPixelCount += 1;
            continue;
        }

        assertFiniteRasterValue(
            ndviValue,
            "NDVI",
            pixelIndex
        );

        assertFiniteRasterValue(
            bsiValue,
            "BSI",
            pixelIndex
        );

        ndviValues.push(ndviValue);
        bsiValues.push(bsiValue);

        validPixelCount += 1;
    }

    return {
        pairedPixelCount: pixelCount,

        validPairedPixelCount:
            validPixelCount,

        noDataPairedPixelCount:
            noDataPixelCount,

        ndvi: {
            minimum:
                calculateMin(ndviValues),

            maximum:
                calculateMax(ndviValues),

            mean:
                calculateMean(ndviValues)
        },

        bsi: {
            minimum:
                calculateMin(bsiValues),

            maximum:
                calculateMax(bsiValues),

            mean:
                calculateMean(bsiValues)
        },

        relationship: {
            method:
                "pearson_correlation",

            coefficient:
                calculatePearsonCorrelation(
                    ndviValues,
                    bsiValues
                )
        }
    };
}

function processSoilVegetationSeparation(
    request
) {
    const validation =
        validateSoilVegetationSeparationRequest(
            request
        );

    if (!validation.valid) {
        throw new Error(
            "Invalid soil/vegetation separation request: " +
            validation.errors.join("; ")
        );
    }

    const ndviRaster =
        request.inputs.ndvi.raster;

    const bsiRaster =
        request.inputs.bsi.raster;

    const statistics =
        analyzePairedEvidence({
            ndviRaster,
            bsiRaster
        });

    const results = {
        analysisType:
            ANALYSIS_TYPE,

        method:
            ANALYSIS_METHOD,

        interpretationMode:
            INTERPRETATION_MODE,

        pairedEvidence:
            statistics
    };

    return createSoilVegetationSeparationResultContract({
        timestamp:
            new Date().toISOString(),

        inputs:
            request.inputs,

        spatialContext:
            request.spatialContext,

        parameters:
            request.parameters,

        results,

        statistics,

        metadata: {
            processingType:
                "paired_remote_sensing_evidence_analysis",

            ndviEvidence:
                "vegetation",

            bsiEvidence:
                "bare_soil"
        }
    });
}

module.exports = {
    isNoDataValue,
    calculateMean,
    calculateMin,
    calculateMax,
    calculatePearsonCorrelation,
    analyzePairedEvidence,
    processSoilVegetationSeparation
};
