"use strict";

// ============================================================
// server/scientific/remoteSensing/temporal/
// temporalCompositionContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.5.2  Temporal Composition Contract
//
// Contract version: 1.0
//
// Purpose:
// Defines the authoritative structural contract for a
// chronological composition of validated temporal index
// observations.
//
// This module performs composition-level validation only.
//
// It does NOT:
//   - calculate indices
//   - calculate trends
//   - detect change
//   - perform seasonal analysis
//   - classify observations
//   - modify raster values
//   - resample or reproject rasters
//
// Individual observations are validated by:
// temporalIndexObservationContract.js
// ============================================================

const {
    getIndexDefinition
} = require("../indices/indexRegistry");

const {
    validateTemporalIndexObservation
} = require("./temporalIndexObservationContract");

const {
    validateTemporalDates
} = require("./temporalDateValidation");

const TEMPORAL_COMPOSITION_CONTRACT_VERSION =
    "1.0";

const REQUIRED_FIELDS = [
    "contractVersion",
    "compositionId",
    "indexCode",
    "observations",
    "temporalContext",
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

function normalizeIndexCode(indexCode) {
    return isNonEmptyString(indexCode)
        ? indexCode.trim().toUpperCase()
        : "";
}

function validateTemporalContext(
    temporalContext,
    observationDates,
    errors
) {
    if (!isPlainObject(temporalContext)) {
        errors.push(
            "temporalContext must be a plain object."
        );

        return;
    }

    const startDateValidation =
        isNonEmptyString(temporalContext.startDate)
            ? validateTemporalDates({
                observationDate:
                    temporalContext.startDate,
                acquisitionDate:
                    `${temporalContext.startDate}T00:00:00Z`
            })
            : null;

    const endDateValidation =
        isNonEmptyString(temporalContext.endDate)
            ? validateTemporalDates({
                observationDate:
                    temporalContext.endDate,
                acquisitionDate:
                    `${temporalContext.endDate}T00:00:00Z`
            })
            : null;

    if (!isNonEmptyString(
        temporalContext.startDate
    )) {
        errors.push(
            "temporalContext.startDate must be a non-empty string."
        );
    } else if (
        !startDateValidation.valid
    ) {
        errors.push(
            "temporalContext.startDate must be a valid YYYY-MM-DD calendar date."
        );
    }

    if (!isNonEmptyString(
        temporalContext.endDate
    )) {
        errors.push(
            "temporalContext.endDate must be a non-empty string."
        );
    } else if (
        !endDateValidation.valid
    ) {
        errors.push(
            "temporalContext.endDate must be a valid YYYY-MM-DD calendar date."
        );
    }

    if (
        startDateValidation &&
        startDateValidation.valid &&
        endDateValidation &&
        endDateValidation.valid &&
        temporalContext.startDate >
            temporalContext.endDate
    ) {
        errors.push(
            "temporalContext.startDate must not be later than endDate."
        );
    }

    if (
        !Number.isInteger(
            temporalContext.observationCount
        ) ||
        temporalContext.observationCount <= 0
    ) {
        errors.push(
            "temporalContext.observationCount must be a positive integer."
        );
    }

    if (
        Array.isArray(observationDates) &&
        observationDates.length > 0
    ) {
        const firstDate =
            observationDates[0];

        const lastDate =
            observationDates[
                observationDates.length - 1
            ];

        if (
            startDateValidation &&
            startDateValidation.valid &&
            firstDate !==
                temporalContext.startDate
        ) {
            errors.push(
                "temporalContext.startDate must match the first observation date."
            );
        }

        if (
            endDateValidation &&
            endDateValidation.valid &&
            lastDate !==
                temporalContext.endDate
        ) {
            errors.push(
                "temporalContext.endDate must match the last observation date."
            );
        }

        if (
            Number.isInteger(
                temporalContext.observationCount
            ) &&
            temporalContext.observationCount !==
                observationDates.length
        ) {
            errors.push(
                "temporalContext.observationCount must equal observations.length."
            );
        }
    }
}

function validateTemporalComposition(
    composition
) {
    const errors = [];

    if (!isPlainObject(composition)) {
        return {
            valid: false,
            errors: [
                "composition must be a plain object."
            ]
        };
    }

    for (const field of REQUIRED_FIELDS) {
        if (
            composition[field] === undefined ||
            composition[field] === null
        ) {
            errors.push(
                `${field} is required.`
            );
        }
    }

    if (
        composition.contractVersion !==
        TEMPORAL_COMPOSITION_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be "${TEMPORAL_COMPOSITION_CONTRACT_VERSION}".`
        );
    }

    if (!isNonEmptyString(
        composition.compositionId
    )) {
        errors.push(
            "compositionId must be a non-empty string."
        );
    }

    const normalizedIndexCode =
        normalizeIndexCode(
            composition.indexCode
        );

    if (!normalizedIndexCode) {
        errors.push(
            "indexCode must be a non-empty string."
        );
    } else if (
        !getIndexDefinition(
            normalizedIndexCode
        )
    ) {
        errors.push(
            `indexCode "${normalizedIndexCode}" is not registered.`
        );
    }

    const observationDates = [];

    if (!Array.isArray(
        composition.observations
    )) {
        errors.push(
            "observations must be an array."
        );
    } else if (
        composition.observations.length === 0
    ) {
        errors.push(
            "observations must contain at least one temporal index observation."
        );
    } else {
        composition.observations.forEach(
            (observation, index) => {
                const validation =
                    validateTemporalIndexObservation(
                        observation
                    );

                validation.forEach(error => {
                    errors.push(
                        `observations[${index}]: ${error}`
                    );
                });

                const observationIndexCode =
                    observation &&
                    observation.observation &&
                    isNonEmptyString(
                        observation.observation.indexCode
                    )
                        ? normalizeIndexCode(
                            observation.observation.indexCode
                        )
                        : "";

                if (
                    normalizedIndexCode &&
                    observationIndexCode &&
                    observationIndexCode !==
                        normalizedIndexCode
                ) {
                    errors.push(
                        `observations[${index}].observation.indexCode must match composition.indexCode ${normalizedIndexCode}.`
                    );
                }

                const observationDate =
                    observation &&
                    observation.observation &&
                    observation.observation.observationDate;

                if (
                    validateTemporalDates({
                        observationDate,
                        acquisitionDate:
                            `${observationDate}T00:00:00Z`
                    }).valid
                ) {
                    observationDates.push(
                        observationDate
                    );
                } else {
                    observationDates.push(null);
                }
            }
        );

        for (
            let index = 1;
            index < observationDates.length;
            index++
        ) {
            const previous =
                observationDates[index - 1];

            const current =
                observationDates[index];

            if (
                previous &&
                current &&
                current <= previous
            ) {
                if (current === previous) {
                    errors.push(
                        `observations[${index}] duplicates observation date "${current}".`
                    );
                } else {
                    errors.push(
                        `observations[${index}] must be chronologically after observations[${index - 1}].`
                    );
                }
            }
        }
    }

    validateTemporalContext(
        composition.temporalContext,
        observationDates,
        errors
    );

    if (!isPlainObject(
        composition.spatialContext
    )) {
        errors.push(
            "spatialContext must be a plain object."
        );
    }

    if (!isPlainObject(
        composition.processingContext
    )) {
        errors.push(
            "processingContext must be a plain object."
        );
    }

    if (
        composition.metadata !== undefined &&
        !isPlainObject(
            composition.metadata
        )
    ) {
        errors.push(
            "metadata must be a plain object when provided."
        );
    }

    return {
        valid: errors.length === 0,
        errors,
        indexCode: normalizedIndexCode
    };
}

function createTemporalComposition({
    compositionId,
    indexCode,
    observations,
    temporalContext,
    spatialContext,
    processingContext,
    metadata
}) {
    const result = {
        contractVersion:
            TEMPORAL_COMPOSITION_CONTRACT_VERSION,

        compositionId,

        indexCode:
            normalizeIndexCode(indexCode),

        observations,

        temporalContext,

        spatialContext,

        processingContext
    };

    if (metadata !== undefined) {
        result.metadata = metadata;
    }

    const validation =
        validateTemporalComposition(
            result
        );

    if (!validation.valid) {
        const error =
            new TypeError(
                "Invalid temporal composition: " +
                validation.errors.join("; ")
            );

        error.code =
            "INVALID_TEMPORAL_COMPOSITION";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return result;
}

module.exports = {
    TEMPORAL_COMPOSITION_CONTRACT_VERSION,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    validateTemporalComposition,
    createTemporalComposition
};


