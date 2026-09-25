"use strict";

// ============================================================
// server/services/remoteSensing/raster/rasterIndexClassificationService.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.3.3.2
// Raster Index Classification Service
//
// Responsibilities:
//   - Validate the classification request.
//   - Resolve the authoritative registered index definition.
//   - Classify an already-calculated continuous index raster.
//   - Preserve NoData / non-finite values.
//   - Use classification thresholds from the registered definition.
//   - Produce a compact Uint8Array classification raster.
//   - Produce class definitions and class statistics.
//
// Scientific authority:
//   server/scientific/remoteSensing/indices/indexRegistry.js
//
// This service does NOT:
//   - recalculate the index
//   - redefine classification thresholds
//   - reproject
//   - resample
//   - interpolate
//   - modify the continuous index raster
//
// ============================================================

const {
    validateRasterIndexClassificationRequest,
    createRasterIndexClassificationResultContract
} = require("../../../scientific/remoteSensing/raster/rasterIndexClassificationContract");

function isNoDataValue(value, noData) {
    if (noData === undefined || noData === null) {
        return false;
    }

    return Object.is(value, noData) || value === noData;
}

function getRasterNoData(raster, requestNoData) {
    if (requestNoData !== undefined) {
        return requestNoData;
    }

    if (raster && raster.noData !== undefined) {
        return raster.noData;
    }

    return null;
}

function assertClassificationBand(raster, indexCode) {
    if (!raster || typeof raster !== "object") {
        throw new Error("Invalid calculated index raster.");
    }

    if (!raster.bands || typeof raster.bands !== "object") {
        throw new Error("Calculated index raster must contain bands.");
    }

    const band = raster.bands[indexCode];

    if (!band || typeof band !== "object") {
        throw new Error(
            `Calculated index raster does not contain band "${indexCode}".`
        );
    }

    if (!band.data || typeof band.data.length !== "number") {
        throw new Error(
            `Calculated index raster band "${indexCode}" must contain data.`
        );
    }

    return band;
}

function matchesClassificationRange(value, classification, isFinalClass) {
    if (isFinalClass) {
        return value >= classification.min &&
               value <= classification.max;
    }

    return value >= classification.min &&
           value < classification.max;
}

function findClassification(value, classes) {
    for (let index = 0; index < classes.length; index += 1) {
        const classification = classes[index];
        const isFinalClass = index === classes.length - 1;

        if (
            matchesClassificationRange(
                value,
                classification,
                isFinalClass
            )
        ) {
            return {
                classification,
                classValue: index + 1
            };
        }
    }

    return null;
}

function createClassDefinitions(classes) {
    return classes.map((classification, index) => ({
        classValue: index + 1,
        classCode: classification.code,
        label: classification.label,
        min: classification.min,
        max: classification.max
    }));
}

function createEmptyClassStatistics(classes) {
    return classes.map((classification, index) => ({
        classValue: index + 1,
        classCode: classification.code,
        label: classification.label,
        min: classification.min,
        max: classification.max,
        pixelCount: 0,
        percentage: 0
    }));
}

function calculateClassStatistics({
    classStatistics,
    validPixelCount
}) {
    return classStatistics.map((classification) => ({
        ...classification,
        percentage: validPixelCount > 0
            ? (classification.pixelCount / validPixelCount) * 100
            : 0
    }));
}

function classifyRasterIndex({
    indexCode,
    raster,
    classificationRules,
    noData
}) {
    const band = assertClassificationBand(raster, indexCode);

    const pixelCount = raster.width * raster.height;

    if (band.data.length !== pixelCount) {
        throw new Error(
            `Calculated index raster band "${indexCode}" contains ` +
            `${band.data.length} pixels; expected ${pixelCount}.`
        );
    }

    const classRaster = new Uint8Array(pixelCount);

    let validPixelCount = 0;
    let noDataPixelCount = 0;

    const classStatistics = createEmptyClassStatistics(
        classificationRules.classes
    );

    for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
        const value = band.data[pixelIndex];

        if (
            isNoDataValue(value, noData) ||
            !Number.isFinite(value)
        ) {
            classRaster[pixelIndex] = 0;
            noDataPixelCount += 1;
            continue;
        }

        const match = findClassification(
            value,
            classificationRules.classes
        );

        if (!match) {
            classRaster[pixelIndex] = 0;
            noDataPixelCount += 1;
            continue;
        }

        classRaster[pixelIndex] = match.classValue;
        validPixelCount += 1;

        classStatistics[match.classValue - 1].pixelCount += 1;
    }

    return {
        raster: {
            width: raster.width,
            height: raster.height,
            pixelCount,
            bands: {
                [indexCode]: {
                    data: classRaster,
                    sourceBand: 1
                }
            },
            noData: 0,
            spatialReference: raster.spatialReference,
            metadata: {
                sourceType: "Raster Index Classification",
                indexCode
            }
        },
        validPixelCount,
        noDataPixelCount,
        classStatistics: calculateClassStatistics({
            classStatistics,
            validPixelCount
        })
    };
}

function processRasterIndexClassification(request) {
    const validation =
        validateRasterIndexClassificationRequest(request);

    if (!validation.valid) {
        throw new Error(
            `Invalid raster index classification request: ` +
            validation.errors.join("; ")
        );
    }

    const {
        indexCode,
        definition
    } = validation;

    const {
        raster,
        parameters = {},
        processingContext = {},
        spatialContext = {}
    } = request;

    const classificationRules =
        definition.classificationRules;

    const noData = getRasterNoData(
        raster,
        parameters.noData
    );

    const classificationResult = classifyRasterIndex({
        indexCode,
        raster,
        classificationRules,
        noData
    });

    const classDefinitions =
        createClassDefinitions(
            classificationRules.classes
        );

    const results = {
        raster: classificationResult.raster
    };

    const classification = {
        method: classificationRules.method,
        classDefinitions,
        raster: classificationResult.raster,
        statistics: {
            validPixelCount:
                classificationResult.validPixelCount,

            noDataPixelCount:
                classificationResult.noDataPixelCount,

            totalPixelCount:
                raster.width * raster.height,

            classes:
                classificationResult.classStatistics
        }
    };

    const statistics = {
        validPixelCount:
            classificationResult.validPixelCount,

        noDataPixelCount:
            classificationResult.noDataPixelCount,

        totalPixelCount:
            raster.width * raster.height
    };

    return createRasterIndexClassificationResultContract({
        indexCode,
        timestamp: new Date().toISOString(),

        inputContext: {
            indexCode,
            indexName: definition.name,
            processingContext
        },

        spatialContext,

        parameters: {
            ...parameters,
            classificationMethod:
                classificationRules.method
        },

        results,

        classification,

        statistics,

        metadata: {
            processingType:
                "pixelwise_raster_classification",

            indexCode,

            indexName:
                definition.name,

            classificationMethod:
                classificationRules.method,

            sourceRasterContractVersion:
                raster.contractVersion || null,

            noData
        }
    });
}

module.exports = {
    isNoDataValue,
    getRasterNoData,
    findClassification,
    createClassDefinitions,
    calculateClassStatistics,
    classifyRasterIndex,
    processRasterIndexClassification
};


