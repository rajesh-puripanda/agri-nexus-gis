"use strict";

// ============================================================
// server/scientific/remoteSensing/raster/rasterIndexClassificationContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.3.3.1
// Raster Index Classification Contract
//
// Defines the structural contract for classifying a calculated
// remote-sensing raster index.
//
// Classification rules remain authoritative in the registered
// remote-sensing index definition.
//
// This contract validates structure only.
// It does not classify pixels.
// ============================================================

const {
    getIndexDefinition
} = require("../indices/indexRegistry");

const RASTER_INDEX_CLASSIFICATION_CONTRACT_VERSION = "1.0";

const SUPPORTED_CLASSIFICATION_METHODS = [
    "baseline_qualitative"
];

const RESULT_REQUIRED_FIELDS = [
    "analysisType",
    "analysisVersion",
    "timestamp",
    "inputContext",
    "spatialContext",
    "parameters",
    "results",
    "classification",
    "statistics",
    "metadata"
];

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function normalizeIndexCode(indexCode) {
    if (
        typeof indexCode !== "string" ||
        !indexCode.trim()
    ) {
        throw new Error(
            "indexCode must be a non-empty string"
        );
    }

    return indexCode.trim().toUpperCase();
}

function validateCalculatedIndexRaster(
    raster,
    indexCode
) {
    const errors = [];

    if (!isPlainObject(raster)) {
        return ["raster must be an object"];
    }

    if (
        !Number.isInteger(raster.width) ||
        raster.width <= 0
    ) {
        errors.push(
            "raster.width must be a positive integer"
        );
    }

    if (
        !Number.isInteger(raster.height) ||
        raster.height <= 0
    ) {
        errors.push(
            "raster.height must be a positive integer"
        );
    }

    if (
        !Number.isInteger(raster.pixelCount) ||
        raster.pixelCount <= 0
    ) {
        errors.push(
            "raster.pixelCount must be a positive integer"
        );
    }

    if (
        Number.isInteger(raster.width) &&
        Number.isInteger(raster.height) &&
        raster.width > 0 &&
        raster.height > 0 &&
        Number.isInteger(raster.pixelCount) &&
        raster.pixelCount !==
            raster.width * raster.height
    ) {
        errors.push(
            `raster.pixelCount ${raster.pixelCount} does not match width  height ${raster.width * raster.height}`
        );
    }

    if (!isPlainObject(raster.bands)) {
        errors.push(
            "raster.bands must be an object"
        );

        return errors;
    }

    const indexBand =
        raster.bands[indexCode];

    if (!indexBand) {
        errors.push(
            `raster is missing calculated index band: ${indexCode}`
        );

        return errors;
    }

    if (!isPlainObject(indexBand)) {
        errors.push(
            `raster calculated index band ${indexCode} must be an object`
        );

        return errors;
    }

    if (indexBand.data === undefined) {
        errors.push(
            `raster calculated index band ${indexCode} is missing data`
        );
    } else if (
        typeof indexBand.data.length !== "number"
    ) {
        errors.push(
            `raster calculated index band ${indexCode} data must have a length`
        );
    } else if (
        Number.isInteger(raster.pixelCount) &&
        indexBand.data.length !== raster.pixelCount
    ) {
        errors.push(
            `raster calculated index band ${indexCode} contains ${indexBand.data.length} pixels; expected ${raster.pixelCount}`
        );
    }

    return errors;
}

function validateClassificationRules(definition) {
    const errors = [];

    if (!definition.classificationRules) {
        return [
            "index definition is missing classificationRules"
        ];
    }

    const rules = definition.classificationRules;

    if (!isPlainObject(rules)) {
        return [
            "classificationRules must be an object"
        ];
    }

    if (
        typeof rules.method !== "string" ||
        !rules.method.trim()
    ) {
        errors.push(
            "classificationRules.method must be a non-empty string"
        );
    } else if (
        !SUPPORTED_CLASSIFICATION_METHODS.includes(
            rules.method
        )
    ) {
        errors.push(
            `Unsupported classification method: ${rules.method}`
        );
    }

    if (!Array.isArray(rules.classes)) {
        errors.push(
            "classificationRules.classes must be an array"
        );

        return errors;
    }

    if (rules.classes.length === 0) {
        errors.push(
            "classificationRules.classes must not be empty"
        );

        return errors;
    }

    const validRange =
        definition.validRange;

    let previousMax = null;

    rules.classes.forEach((classification, index) => {
        const prefix =
            `classificationRules.classes[${index}]`;

        if (!isPlainObject(classification)) {
            errors.push(
                `${prefix} must be an object`
            );
            return;
        }

        if (
            typeof classification.code !== "string" ||
            !classification.code.trim()
        ) {
            errors.push(
                `${prefix}.code must be a non-empty string`
            );
        }

        if (
            typeof classification.label !== "string" ||
            !classification.label.trim()
        ) {
            errors.push(
                `${prefix}.label must be a non-empty string`
            );
        }

        if (
            typeof classification.min !== "number" ||
            !Number.isFinite(classification.min)
        ) {
            errors.push(
                `${prefix}.min must be a finite number`
            );
        }

        if (
            typeof classification.max !== "number" ||
            !Number.isFinite(classification.max)
        ) {
            errors.push(
                `${prefix}.max must be a finite number`
            );
        }

        if (
            typeof classification.min === "number" &&
            typeof classification.max === "number" &&
            Number.isFinite(classification.min) &&
            Number.isFinite(classification.max)
        ) {
            if (classification.min >= classification.max) {
                errors.push(
                    `${prefix}.min must be less than max`
                );
            }

            if (
                validRange &&
                Number.isFinite(validRange.min) &&
                classification.min < validRange.min
            ) {
                errors.push(
                    `${prefix}.min is below index validRange.min`
                );
            }

            if (
                validRange &&
                Number.isFinite(validRange.max) &&
                classification.max > validRange.max
            ) {
                errors.push(
                    `${prefix}.max is above index validRange.max`
                );
            }

            if (
                previousMax !== null &&
                classification.min < previousMax
            ) {
                errors.push(
                    `${prefix}.min overlaps the previous classification range`
                );
            }

            previousMax = classification.max;
        }
    });

    return errors;
}

function validateRasterIndexClassificationRequest(
    request
) {
    const errors = [];

    if (!isPlainObject(request)) {
        return {
            valid: false,
            errors: ["request must be an object"],
            indexCode: null,
            definition: null
        };
    }

    let indexCode = null;
    let definition = null;

    if (
        !Object.prototype.hasOwnProperty.call(
            request,
            "indexCode"
        )
    ) {
        errors.push(
            "request is missing required field: indexCode"
        );
    } else {
        try {
            indexCode =
                normalizeIndexCode(request.indexCode);
        } catch (error) {
            errors.push(error.message);
        }
    }

    if (indexCode) {
        definition =
            getIndexDefinition(indexCode);

        if (!definition) {
            errors.push(
                `Unknown remote sensing index: ${indexCode}`
            );
        }
    }

    if (
        !Object.prototype.hasOwnProperty.call(
            request,
            "raster"
        )
    ) {
        errors.push(
            "request is missing required field: raster"
        );
    } else if (indexCode) {
        errors.push(
            ...validateCalculatedIndexRaster(
                request.raster,
                indexCode
            )
        );
    }

    if (definition) {
        errors.push(
            ...validateClassificationRules(
                definition
            )
        );
    }

    return {
        valid: errors.length === 0,
        errors,
        indexCode,
        definition
    };
}

function createRasterIndexClassificationResultContract({
    indexCode,
    timestamp = new Date().toISOString(),
    inputContext = {},
    spatialContext = {},
    parameters = {},
    results = {},
    classification = {},
    statistics = {},
    metadata = {}
}) {
    const normalizedIndexCode =
        normalizeIndexCode(indexCode);

    if (!getIndexDefinition(normalizedIndexCode)) {
        throw new Error(
            `Unknown remote sensing index: ${normalizedIndexCode}`
        );
    }

    const objects = {
        inputContext,
        spatialContext,
        parameters,
        results,
        classification,
        statistics,
        metadata
    };

    for (const [name, value] of Object.entries(objects)) {
        if (!isPlainObject(value)) {
            throw new Error(
                `${name} must be an object`
            );
        }
    }

    return {
        analysisType:
            "remote_sensing_raster_index_classification",
        analysisVersion:
            RASTER_INDEX_CLASSIFICATION_CONTRACT_VERSION,
        timestamp,
        inputContext,
        spatialContext,
        parameters,
        results,
        classification,
        statistics,
        metadata
    };
}

function validateRasterIndexClassificationResult(
    result
) {
    const errors = [];

    if (!isPlainObject(result)) {
        return {
            valid: false,
            errors: ["result must be an object"]
        };
    }

    for (const field of RESULT_REQUIRED_FIELDS) {
        if (
            !Object.prototype.hasOwnProperty.call(
                result,
                field
            )
        ) {
            errors.push(
                `result is missing required field: ${field}`
            );
        }
    }

    if (
        result.analysisType !== undefined &&
        result.analysisType !==
            "remote_sensing_raster_index_classification"
    ) {
        errors.push(
            "result.analysisType must be remote_sensing_raster_index_classification"
        );
    }

    if (
        result.analysisVersion !== undefined &&
        result.analysisVersion !==
            RASTER_INDEX_CLASSIFICATION_CONTRACT_VERSION
    ) {
        errors.push(
            `result.analysisVersion must be ${RASTER_INDEX_CLASSIFICATION_CONTRACT_VERSION}`
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

module.exports = {
    RASTER_INDEX_CLASSIFICATION_CONTRACT_VERSION,
    SUPPORTED_CLASSIFICATION_METHODS,
    validateClassificationRules,
    validateRasterIndexClassificationRequest,
    createRasterIndexClassificationResultContract,
    validateRasterIndexClassificationResult
};
