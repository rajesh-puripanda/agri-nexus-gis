"use strict";

// ============================================================
// server/scientific/remoteSensing/temporal/
// temporalIndexObservationContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.4.1  Temporal Index Observation Contract
//
// Contract version: 1.0
//
// Purpose:
// Defines the authoritative contract for one validated
// remote-sensing index observation.
//
// This contract represents ONE observation only.
//
// It does NOT:
//   - compare observations
//   - calculate temporal trends
//   - perform seasonal analysis
//   - detect change
//   - perform crop-stage analysis
// ============================================================

const {
    getIndexDefinition
} = require("../indices/indexRegistry");

const TEMPORAL_INDEX_OBSERVATION_CONTRACT_VERSION = "1.0";

const REQUIRED_FIELDS = [
    "contractVersion",
    "observation",
    "raster",
    "index",
    "statistics",
    "spatialContext",
    "processingContext"
];

const OPTIONAL_FIELDS = [
    "metadata"
];

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function isNonEmptyString(value) {
    return (
        typeof value === "string" &&
        value.trim().length > 0
    );
}

function isFiniteNumber(value) {
    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );
}

function isPositiveInteger(value) {
    return (
        Number.isInteger(value) &&
        value > 0
    );
}

function validateTemporalIndexObservation(
    observation
) {
    const errors = [];

    if (!isPlainObject(observation)) {
        return [
            "Temporal index observation must be a plain object."
        ];
    }

    if (
        observation.contractVersion !==
        TEMPORAL_INDEX_OBSERVATION_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be "${TEMPORAL_INDEX_OBSERVATION_CONTRACT_VERSION}".`
        );
    }

    if (!isPlainObject(observation.observation)) {
        errors.push(
            "observation must be a plain object."
        );
    } else {
        const value =
            observation.observation;

        if (!isNonEmptyString(value.observationDate)) {
            errors.push(
                "observation.observationDate must be a non-empty string."
            );
        }

        if (!isNonEmptyString(value.acquisitionDate)) {
            errors.push(
                "observation.acquisitionDate must be a non-empty string."
            );
        }

        if (!isNonEmptyString(value.sensor)) {
            errors.push(
                "observation.sensor must be a non-empty string."
            );
        }

        if (!isNonEmptyString(value.sceneId)) {
            errors.push(
                "observation.sceneId must be a non-empty string."
            );
        }

        if (!isNonEmptyString(value.indexCode)) {
            errors.push(
                "observation.indexCode must be a non-empty string."
            );
        } else if (
            !getIndexDefinition(
                value.indexCode.trim().toUpperCase()
            )
        ) {
            errors.push(
                `observation.indexCode "${value.indexCode}" is not registered.`
            );
        }
    }

    if (!isPlainObject(observation.raster)) {
        errors.push(
            "raster must be a plain object."
        );
    } else {
        const raster =
            observation.raster;

        if (!isNonEmptyString(raster.rasterId)) {
            errors.push(
                "raster.rasterId must be a non-empty string."
            );
        }

        if (!isPositiveInteger(raster.width)) {
            errors.push(
                "raster.width must be a positive integer."
            );
        }

        if (!isPositiveInteger(raster.height)) {
            errors.push(
                "raster.height must be a positive integer."
            );
        }

        if (!isPositiveInteger(raster.pixelCount)) {
            errors.push(
                "raster.pixelCount must be a positive integer."
            );
        }

        if (
            isPositiveInteger(raster.width) &&
            isPositiveInteger(raster.height) &&
            raster.pixelCount !==
                raster.width * raster.height
        ) {
            errors.push(
                "raster.pixelCount must equal width * height."
            );
        }

        if (
            raster.noData !== undefined &&
            !isFiniteNumber(raster.noData)
        ) {
            errors.push(
                "raster.noData must be a finite number when provided."
            );
        }
    }

    if (!isPlainObject(observation.index)) {
        errors.push(
            "index must be a plain object."
        );
    } else {
        const index =
            observation.index;

        if (!isNonEmptyString(index.code)) {
            errors.push(
                "index.code must be a non-empty string."
            );
        }

        if (!isNonEmptyString(index.name)) {
            errors.push(
                "index.name must be a non-empty string."
            );
        }

        if (
            !isPlainObject(index.validRange)
        ) {
            errors.push(
                "index.validRange must be a plain object."
            );
        } else {
            if (
                !isFiniteNumber(
                    index.validRange.min
                )
            ) {
                errors.push(
                    "index.validRange.min must be a finite number."
                );
            }

            if (
                !isFiniteNumber(
                    index.validRange.max
                )
            ) {
                errors.push(
                    "index.validRange.max must be a finite number."
                );
            }

            if (
                isFiniteNumber(index.validRange.min) &&
                isFiniteNumber(index.validRange.max) &&
                index.validRange.min >=
                    index.validRange.max
            ) {
                errors.push(
                    "index.validRange.min must be less than max."
                );
            }
        }

        const observationIndexCode =
            isNonEmptyString(
                observation.observation?.indexCode
            )
                ? observation.observation.indexCode
                    .trim()
                    .toUpperCase()
                : null;

        const indexCode =
            isNonEmptyString(index.code)
                ? index.code
                    .trim()
                    .toUpperCase()
                : null;

        if (
            isNonEmptyString(index.code) &&
            index.code.trim() !== indexCode
        ) {
            errors.push(
                "index.code must use canonical uppercase form."
            );
        }

        if (
            observationIndexCode &&
            indexCode &&
            observationIndexCode !== indexCode
        ) {
            errors.push(
                "index.code must correspond to observation.indexCode."
            );
        }
    }

    if (!isPlainObject(observation.statistics)) {
        errors.push(
            "statistics must be a plain object."
        );
    } else {
        const statistics =
            observation.statistics;

        const countFields = [
            "validPixelCount",
            "noDataPixelCount"
        ];

        for (const field of countFields) {
            if (
                !Number.isInteger(
                    statistics[field]
                ) ||
                statistics[field] < 0
            ) {
                errors.push(
                    `statistics.${field} must be a non-negative integer.`
                );
            }
        }

        const numericFields = [
            "minimum",
            "maximum",
            "mean"
        ];

        for (const field of numericFields) {
            if (
                !isFiniteNumber(
                    statistics[field]
                )
            ) {
                errors.push(
                    `statistics.${field} must be a finite number.`
                );
            }
        }

        if (
            Number.isInteger(
                statistics.validPixelCount
            ) &&
            Number.isInteger(
                statistics.noDataPixelCount
            ) &&
            isPositiveInteger(
                observation.raster?.pixelCount
            ) &&
            statistics.validPixelCount +
                statistics.noDataPixelCount !==
                observation.raster.pixelCount
        ) {
            errors.push(
                "statistics validPixelCount + noDataPixelCount must equal raster.pixelCount."
            );
        }

        if (
            isFiniteNumber(statistics.minimum) &&
            isFiniteNumber(statistics.maximum) &&
            statistics.minimum >
                statistics.maximum
        ) {
            errors.push(
                "statistics.minimum must not exceed maximum."
            );
        }

        if (
            isFiniteNumber(statistics.mean) &&
            isFiniteNumber(statistics.minimum) &&
            isFiniteNumber(statistics.maximum) &&
            (
                statistics.mean <
                    statistics.minimum ||
                statistics.mean >
                    statistics.maximum
            )
        ) {
            errors.push(
                "statistics.mean must fall within minimum and maximum."
            );
        }
    }

    if (
        !isPlainObject(
            observation.spatialContext
        )
    ) {
        errors.push(
            "spatialContext must be a plain object."
        );
    }

    if (
        !isPlainObject(
            observation.processingContext
        )
    ) {
        errors.push(
            "processingContext must be a plain object."
        );
    }

    if (
        observation.metadata !== undefined &&
        !isPlainObject(observation.metadata)
    ) {
        errors.push(
            "metadata must be a plain object when provided."
        );
    }

    return errors;
}

function createTemporalIndexObservation(
    observation
) {
    const errors =
        validateTemporalIndexObservation(
            observation
        );

    if (errors.length > 0) {
        const error =
            new TypeError(
                "Invalid temporal index observation: " +
                errors.join("; ")
            );

        error.code =
            "INVALID_TEMPORAL_INDEX_OBSERVATION";

        error.validationErrors =
            errors;

        throw error;
    }

    return {
        ...observation,
        observation: {
            ...observation.observation,
            indexCode:
                observation.observation.indexCode
                    .trim()
                    .toUpperCase()
        },
        index: {
            ...observation.index,
            code:
                observation.index.code
                    .trim()
                    .toUpperCase()
        }
    };
}

module.exports = {
    TEMPORAL_INDEX_OBSERVATION_CONTRACT_VERSION,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    validateTemporalIndexObservation,
    createTemporalIndexObservation
};
