"use strict";

// ============================================================
// server/scientific/remoteSensing/temporal/
// temporalDateValidation.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.3  Date / Acquisition Validation
//
// Contract version: 1.0
//
// Purpose:
// Provides strict temporal validation for remote-sensing
// observation and acquisition dates.
//
// This module performs temporal validation only.
//
// It does NOT:
//   - compare separate observations
//   - calculate elapsed temporal trends
//   - perform seasonal analysis
//   - detect change
//   - perform crop-stage analysis
// ============================================================

const TEMPORAL_DATE_VALIDATION_VERSION = "1.0";

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function isValidCalendarDate(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const [year, month, day] =
        value.split("-").map(Number);

    const date = new Date(
        Date.UTC(year, month - 1, day)
    );

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

function parseAcquisitionDate(value) {
    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        return null;
    }

    const match = value.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/
    );

    if (!match) {
        return null;
    }

    const [
        ,
        yearText,
        monthText,
        dayText,
        hourText,
        minuteText,
        secondText,
        fractionText
    ] = match;

    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second =
        secondText === undefined
            ? 0
            : Number(secondText);

    const milliseconds =
        fractionText === undefined
            ? 0
            : Number(
                fractionText.padEnd(3, "0")
            );

    if (
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31 ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59 ||
        second < 0 ||
        second > 59
    ) {
        return null;
    }

    const calendarDate =
        `${yearText}-${monthText}-${dayText}`;

    if (!isValidCalendarDate(calendarDate)) {
        return null;
    }

    const timestamp = Date.parse(value);

    if (!Number.isFinite(timestamp)) {
        return null;
    }

    return {
        value: new Date(timestamp),
        calendarDate
    };
}

function validateTemporalDates(
    temporalDates
) {
    const errors = [];

    if (!isPlainObject(temporalDates)) {
        return {
            valid: false,
            errors: [
                "temporalDates must be a plain object."
            ],
            normalized: null
        };
    }

    const {
        observationDate,
        acquisitionDate
    } = temporalDates;

    if (
        typeof observationDate !== "string" ||
        observationDate.trim().length === 0
    ) {
        errors.push(
            "observationDate is required."
        );
    } else if (
        !isValidCalendarDate(observationDate)
    ) {
        errors.push(
            "observationDate must be a valid YYYY-MM-DD calendar date."
        );
    }

    if (
        typeof acquisitionDate !== "string" ||
        acquisitionDate.trim().length === 0
    ) {
        errors.push(
            "acquisitionDate is required."
        );
    }

    const acquisition =
        parseAcquisitionDate(
            acquisitionDate
        );

    if (
        typeof acquisitionDate === "string" &&
        acquisitionDate.trim().length > 0 &&
        !acquisition
    ) {
        errors.push(
            "acquisitionDate must be a valid ISO date-time with an explicit timezone."
        );
    }

    if (
        isValidCalendarDate(observationDate) &&
        acquisition
    ) {
        if (
            acquisition.calendarDate !==
            observationDate
        ) {
            errors.push(
                "observationDate must match the calendar date of acquisitionDate."
            );
        }
    }

    const normalized =
        errors.length === 0
            ? {
                observationDate,
                acquisitionDate:
                    acquisition.value.toISOString()
            }
            : null;

    return {
        valid: errors.length === 0,
        errors,
        normalized
    };
}

function createTemporalDateValidationResult(
    temporalDates
) {
    const validation =
        validateTemporalDates(
            temporalDates
        );

    if (!validation.valid) {
        const error =
            new TypeError(
                "Invalid temporal date validation: " +
                validation.errors.join("; ")
            );

        error.code =
            "INVALID_TEMPORAL_DATE_VALIDATION";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return {
        version:
            TEMPORAL_DATE_VALIDATION_VERSION,
        valid: true,
        normalized:
            validation.normalized
    };
}

module.exports = {
    TEMPORAL_DATE_VALIDATION_VERSION,
    validateTemporalDates,
    createTemporalDateValidationResult
};
