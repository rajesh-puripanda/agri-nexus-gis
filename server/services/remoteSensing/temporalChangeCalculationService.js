"use strict";

// ============================================================
// AgriNexus GIS
// server/services/remoteSensing/temporalChangeCalculationService.js
// ============================================================
//
// Phase 5.1.7.14  Temporal Change Scientific Calculation Service
//
// Calculates first-to-last temporal change from a validated
// TemporalComposition using observation-level mean values.
//
// Intentionally independent of:
// - database access
// - HTTP/API routes
// - raster I/O
// - UI
// - workflow orchestration
//
// ============================================================

const {
    validateTemporalComposition
} = require("../../scientific/remoteSensing/temporal/temporalCompositionContract");

const {
    createTemporalChangeCalculationResult
} = require("../../scientific/remoteSensing/temporal/temporalChangeCalculationContract");

function assertValidComposition(composition) {
    const validation =
        validateTemporalComposition(composition);

    if (!validation.valid) {
        const error = new Error(
            "Invalid temporal composition."
        );

        error.code =
            "INVALID_TEMPORAL_CHANGE_CALCULATION_INPUT";

        error.errors = validation.errors;

        throw error;
    }
}

function assertFiniteMean(observation, position) {
    const mean =
        observation &&
        observation.statistics &&
        observation.statistics.mean;

    if (!Number.isFinite(mean)) {
        const error = new Error(
            `Observation ${position} mean must be a finite number.`
        );

        error.code =
            "INVALID_TEMPORAL_CHANGE_CALCULATION_INPUT";

        throw error;
    }

    return mean;
}

function calculateTemporalChange(composition) {
    assertValidComposition(composition);

    const observations =
        composition.observations;

    if (observations.length < 2) {
        const error = new Error(
            "Temporal CHANGE requires at least two observations."
        );

        error.code =
            "INSUFFICIENT_TEMPORAL_OBSERVATIONS";

        throw error;
    }

    const firstObservation =
        observations[0];

    const lastObservation =
        observations[observations.length - 1];

    const startMean =
        assertFiniteMean(firstObservation, "start");

    const endMean =
        assertFiniteMean(lastObservation, "end");

    const absoluteChange =
        endMean - startMean;

    let percentageChange;
    let percentageChangeStatus;

    if (startMean === 0) {
        percentageChange = null;
        percentageChangeStatus =
            "undefined_zero_baseline";
    } else {
        percentageChange =
            (absoluteChange / Math.abs(startMean)) * 100;

        percentageChangeStatus = "normal";
    }

    let direction;

    if (absoluteChange > 0) {
        direction = "increase";
    } else if (absoluteChange < 0) {
        direction = "decrease";
    } else {
        direction = "no_change";
    }

    return createTemporalChangeCalculationResult({
        contractVersion: "1.0",
        analysisType: "CHANGE",
        compositionId: composition.compositionId,
        indexCode: composition.indexCode,
        comparison: {
            startDate:
                firstObservation.observation.observationDate,
            endDate:
                lastObservation.observation.observationDate,
            startMean,
            endMean
        },
        absoluteChange,
        percentageChange,
        percentageChangeStatus,
        direction
    });
}

module.exports = {
    TEMPORAL_CHANGE_CALCULATION_SERVICE_VERSION: "1.0",
    calculateTemporalChange
};
