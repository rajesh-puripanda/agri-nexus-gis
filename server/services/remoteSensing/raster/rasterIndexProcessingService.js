"use strict";

// ============================================================
// server/services/remoteSensing/raster/rasterIndexProcessingService.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.3.2
// Raster Index Processing Service
//
// Applies an existing registered remote-sensing scalar index
// calculation across every pixel of a normalized raster.
//
// Scientific formulas remain authoritative in:
//   server/services/remoteSensing/indexCalculationService.js
//
// This service performs:
//   - request validation
//   - required-band resolution
//   - pixel iteration
//   - NoData propagation
//   - scalar index delegation
//   - result-range validation
//   - deterministic statistics
//
// This service does NOT:
//   - reproject
//   - resample
//   - interpolate
//   - classify
//   - redefine scientific formulas
// ============================================================

const {
    getIndexDefinition
} = require("../../../scientific/remoteSensing/indices/indexRegistry");

const {
    validateRasterIndexProcessingRequest,
    createRasterIndexProcessingResultContract
} = require("../../../scientific/remoteSensing/raster/rasterIndexProcessingContract");

const {
    calculateScalarIndex
} = require("../indexCalculationService");

function isNoDataValue(value, noData) {
    if (noData === undefined || noData === null) {
        return false;
    }

    return Object.is(value, noData) || value === noData;
}

function assertRasterBandData(raster, bandName) {
    const band = raster &&
        raster.bands &&
        raster.bands[bandName];

    if (!band || band.data === undefined) {
        throw new Error(
            `Raster is missing data for required band: ${bandName}`
        );
    }

    return band.data;
}

function getRasterNoData(raster) {
    if (
        raster &&
        Object.prototype.hasOwnProperty.call(raster, "noData")
    ) {
        return raster.noData;
    }

    return null;
}

function calculateStatistics(values, noDataValue) {
    let validPixelCount = 0;
    let noDataPixelCount = 0;
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;

    for (const value of values) {
        if (isNoDataValue(value, noDataValue)) {
            noDataPixelCount += 1;
            continue;
        }

        if (!Number.isFinite(value)) {
            noDataPixelCount += 1;
            continue;
        }

        validPixelCount += 1;
        min = Math.min(min, value);
        max = Math.max(max, value);
        sum += value;
    }

    return {
        validPixelCount,
        noDataPixelCount,
        min: validPixelCount > 0 ? min : null,
        max: validPixelCount > 0 ? max : null,
        mean: validPixelCount > 0
            ? sum / validPixelCount
            : null
    };
}

function calculatePixelIndex({
    indexCode,
    bandValues,
    parameters
}) {
    return calculateScalarIndex({
        indexCode,
        inputs: bandValues,
        parameters
    });
}

function processRasterIndex(request) {
    const validation =
        validateRasterIndexProcessingRequest(request);

    if (!validation.valid) {
        throw new Error(
            `Invalid raster index processing request: ${validation.errors.join("; ")}`
        );
    }

    const {
        indexCode,
        definition
    } = validation;

    const raster = request.raster;
    const parameters = request.parameters || {};
    const noData = getRasterNoData(raster);

    const width = raster.width;
    const height = raster.height;
    const pixelCount = raster.pixelCount;

    const requiredBands = definition.requiredBands;

    const bandData = {};

    for (const bandName of requiredBands) {
        bandData[bandName] =
            assertRasterBandData(raster, bandName);

        if (bandData[bandName].length !== pixelCount) {
            throw new Error(
                `Raster band ${bandName} length ${bandData[bandName].length} does not match pixelCount ${pixelCount}`
            );
        }
    }

    const output = new Float32Array(pixelCount);

    for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
        let pixelIsNoData = false;
        const inputs = {};

        for (const bandName of requiredBands) {
            const value = bandData[bandName][pixelIndex];

            if (
                isNoDataValue(value, noData) ||
                !Number.isFinite(value)
            ) {
                pixelIsNoData = true;
                break;
            }

            inputs[bandName] = value;
        }

        if (pixelIsNoData) {
            output[pixelIndex] =
                noData !== null && noData !== undefined
                    ? noData
                    : NaN;

            continue;
        }

        const value = calculatePixelIndex({
            indexCode,
            bandValues: inputs,
            parameters
        });

        if (!Number.isFinite(value)) {
            output[pixelIndex] =
                noData !== null && noData !== undefined
                    ? noData
                    : NaN;

            continue;
        }

        output[pixelIndex] = value;
    }

    const statistics =
        calculateStatistics(output, noData);

    const normalizedRaster = {
        contractVersion: raster.contractVersion,
        width,
        height,
        pixelCount,
        bands: {
            [indexCode]: {
                data: output,
                sourceBand: 1
            }
        },
        noData,
        spatialReference: raster.spatialReference,
        metadata: {
            ...(raster.metadata || {}),
            sourceType: "Calculated Raster Index",
            indexCode,
            indexName: definition.name
        }
    };

    return createRasterIndexProcessingResultContract({
        indexCode,
        inputContext: {
            width,
            height,
            pixelCount,
            requiredBands: [...requiredBands]
        },
        spatialContext:
            request.spatialContext ||
            raster.spatialReference ||
            {},
        parameters: {
            ...parameters
        },
        results: {
            raster: normalizedRaster
        },
        classification: {},
        statistics,
        metadata: {
            processingType: "pixelwise_scalar_index",
            indexCode,
            indexName: definition.name,
            sourceRasterContractVersion:
                raster.contractVersion,
            noData
        }
    });
}

module.exports = {
    isNoDataValue,
    calculateStatistics,
    calculatePixelIndex,
    processRasterIndex
};
