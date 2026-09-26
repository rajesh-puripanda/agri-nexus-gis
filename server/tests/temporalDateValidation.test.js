"use strict";

// ============================================================
// server/tests/temporalDateValidation.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.3  Date / Acquisition Validation
//
// Scope:
//   - Observation-date validation
//   - Acquisition-date validation
//   - Calendar-date integrity
//   - Acquisition/observation consistency
//   - Explicit timezone validation
//   - Structured validation errors
//
// This module does NOT perform:
//   - date-to-date comparison
//   - seasonal comparison
//   - trend analysis
//   - change detection
//   - crop-stage analysis
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    TEMPORAL_DATE_VALIDATION_VERSION,
    validateTemporalDates,
    createTemporalDateValidationResult
} = require("../scientific/remoteSensing/temporal/temporalDateValidation");

function createValidDates(overrides = {}) {
    return {
        observationDate: "2026-01-15",
        acquisitionDate: "2026-01-15T05:30:00Z",
        ...overrides
    };
}

test("date validation exposes version 1.0", () => {
    assert.equal(
        TEMPORAL_DATE_VALIDATION_VERSION,
        "1.0"
    );
});

test("valid observation and acquisition dates pass validation", () => {
    const result = validateTemporalDates(
        createValidDates()
    );

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
});

test("canonical observation date is accepted", () => {
    const result = validateTemporalDates(
        createValidDates({
            observationDate: "2026-09-26",
            acquisitionDate: "2026-09-26T05:30:00Z"
        })
    );

    assert.equal(result.valid, true);
});

test("invalid observation date format is rejected", () => {
    const result = validateTemporalDates(
        createValidDates({
            observationDate: "26-09-2026"
        })
    );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("observationDate")
        )
    );
});

test("impossible observation date is rejected", () => {
    const result = validateTemporalDates(
        createValidDates({
            observationDate: "2026-02-30",
            acquisitionDate: "2026-02-28T05:30:00Z"
        })
    );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("observationDate")
        )
    );
});

test("acquisition date-time without timezone is rejected", () => {
    const result = validateTemporalDates(
        createValidDates({
            acquisitionDate: "2026-01-15T05:30:00"
        })
    );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("timezone")
        )
    );
});

test("invalid acquisition date-time is rejected", () => {
    const result = validateTemporalDates(
        createValidDates({
            acquisitionDate: "not-a-date"
        })
    );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("acquisitionDate")
        )
    );
});

test("impossible acquisition date-time is rejected", () => {
    const result = validateTemporalDates(
        createValidDates({
            acquisitionDate: "2026-02-30T05:30:00Z",
            observationDate: "2026-02-28"
        })
    );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("acquisitionDate")
        )
    );
});

test("acquisition date must belong to observation date", () => {
    const result = validateTemporalDates(
        createValidDates({
            observationDate: "2026-01-16",
            acquisitionDate: "2026-01-15T05:30:00Z"
        })
    );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("observationDate")
        )
    );
});

test("offset-aware acquisition date is accepted", () => {
    const result = validateTemporalDates(
        createValidDates({
            acquisitionDate: "2026-01-15T11:00:00+05:30"
        })
    );

    assert.equal(result.valid, true);
});

test("missing observation date is rejected", () => {
    const dates = createValidDates();
    delete dates.observationDate;

    const result = validateTemporalDates(dates);

    assert.equal(result.valid, false);
});

test("missing acquisition date is rejected", () => {
    const dates = createValidDates();
    delete dates.acquisitionDate;

    const result = validateTemporalDates(dates);

    assert.equal(result.valid, false);
});

test("validator returns normalized temporal information", () => {
    const result = validateTemporalDates(
        createValidDates()
    );

    assert.equal(result.valid, true);
    assert.equal(
        result.normalized.observationDate,
        "2026-01-15"
    );
    assert.equal(
        result.normalized.acquisitionDate,
        "2026-01-15T05:30:00.000Z"
    );
});

test("factory returns validated temporal date result", () => {
    const result =
        createTemporalDateValidationResult(
            createValidDates()
        );

    assert.equal(result.version, "1.0");
    assert.equal(result.valid, true);
    assert.equal(
        result.normalized.observationDate,
        "2026-01-15"
    );
});

test("factory rejects invalid temporal dates", () => {
    assert.throws(
        () =>
            createTemporalDateValidationResult(
                createValidDates({
                    observationDate: "2026-02-30"
                })
            ),
        error =>
            error.code ===
            "INVALID_TEMPORAL_DATE_VALIDATION"
    );
});



test("positive-offset acquisition preserves its calendar date", () => {
    const result = validateTemporalDates({
        observationDate: "2026-01-15",
        acquisitionDate: "2026-01-15T00:30:00+05:30"
    });

    assert.equal(result.valid, true);
});

test("negative-offset acquisition preserves its calendar date", () => {
    const result = validateTemporalDates({
        observationDate: "2026-01-15",
        acquisitionDate: "2026-01-15T23:30:00-05:00"
    });

    assert.equal(result.valid, true);
});

test("date-only acquisition value is rejected", () => {
    const result = validateTemporalDates({
        observationDate: "2026-01-15",
        acquisitionDate: "2026-01-15Z"
    });

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("acquisitionDate")
        )
    );
});

test("impossible acquisition calendar date is rejected", () => {
    const result = validateTemporalDates({
        observationDate: "2026-02-28",
        acquisitionDate: "2026-02-30T05:30:00Z"
    });

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("acquisitionDate")
        )
    );
});
