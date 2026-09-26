"use strict";

// ============================================================
// server/tests/temporalChangeCalculationContract.test.js
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    TEMPORAL_CHANGE_CALCULATION_CONTRACT_VERSION,
    validateTemporalChangeCalculationResult,
    createTemporalChangeCalculationResult
} = require("../scientific/remoteSensing/temporal/temporalChangeCalculationContract");

function createValidResult(overrides = {}) {
    return {
        contractVersion:
            TEMPORAL_CHANGE_CALCULATION_CONTRACT_VERSION,

        analysisType: "CHANGE",

        compositionId:
            "NDVI-SERIES-001",

        indexCode:
            "NDVI",

        comparison: {
            startDate: "2026-06-01",
            endDate: "2026-07-01",
            startMean: 0.40,
            endMean: 0.60
        },

        absoluteChange: 0.20,

        percentageChange: 50,

        percentageChangeStatus: "normal",

        direction: "increase",

        ...overrides
    };
}

test("contract version is 1.0", () => {
    const result = createValidResult();

    assert.equal(
        result.contractVersion,
        "1.0"
    );

    assert.equal(
        validateTemporalChangeCalculationResult(result).valid,
        true
    );
});

test("required fields are enforced", () => {
    const result = createValidResult();
    delete result.absoluteChange;

    assert.equal(
        validateTemporalChangeCalculationResult(result).valid,
        false
    );
});

test("valid CHANGE result is accepted", () => {
    assert.equal(
        validateTemporalChangeCalculationResult(
            createValidResult()
        ).valid,
        true
    );
});

test("analysisType is normalized to CHANGE by factory", () => {
    const result = createTemporalChangeCalculationResult(
        createValidResult({
            analysisType: "change"
        })
    );

    assert.equal(result.analysisType, "CHANGE");
});

test("positive absolute change is accepted", () => {
    const result = createValidResult({
        absoluteChange: 0.25,
        direction: "increase"
    });

    assert.equal(
        validateTemporalChangeCalculationResult(result).valid,
        true
    );
});

test("negative absolute change is accepted", () => {
    const result = createValidResult({
        absoluteChange: -0.25,
        percentageChange: -50,
        direction: "decrease"
    });

    assert.equal(
        validateTemporalChangeCalculationResult(result).valid,
        true
    );
});

test("zero change is accepted", () => {
    const result = createValidResult({
        absoluteChange: 0,
        percentageChange: 0,
        direction: "no_change"
    });

    assert.equal(
        validateTemporalChangeCalculationResult(result).valid,
        true
    );
});

test("percentage change is accepted when defined", () => {
    const result = createValidResult({
        percentageChange: 50,
        percentageChangeStatus: "normal"
    });

    assert.equal(
        validateTemporalChangeCalculationResult(result).valid,
        true
    );
});

test("zero baseline accepts null percentage change", () => {
    const result = createValidResult({
        comparison: {
            startDate: "2026-06-01",
            endDate: "2026-07-01",
            startMean: 0,
            endMean: 0.40
        },
        absoluteChange: 0.40,
        percentageChange: null,
        percentageChangeStatus:
            "undefined_zero_baseline",
        direction: "increase"
    });

    assert.equal(
        validateTemporalChangeCalculationResult(result).valid,
        true
    );
});

test("invalid direction is rejected", () => {
    const result = createValidResult({
        direction: "stable"
    });

    assert.equal(
        validateTemporalChangeCalculationResult(result).valid,
        false
    );
});

test("invalid percentage status is rejected", () => {
    const result = createValidResult({
        percentageChangeStatus: "undefined"
    });

    assert.equal(
        validateTemporalChangeCalculationResult(result).valid,
        false
    );
});

test("invalid comparison dates are rejected", () => {
    const result = createValidResult({
        comparison: {
            startDate: "2026-07-01",
            endDate: "2026-06-01",
            startMean: 0.40,
            endMean: 0.60
        }
    });

    assert.equal(
        validateTemporalChangeCalculationResult(result).valid,
        false
    );
});

test("non-finite numeric values are rejected", () => {
    const result = createValidResult({
        absoluteChange: NaN
    });

    assert.equal(
        validateTemporalChangeCalculationResult(result).valid,
        false
    );
});

test("factory creates a valid result", () => {
    const result =
        createTemporalChangeCalculationResult(
            createValidResult()
        );

    assert.equal(result.contractVersion, "1.0");
    assert.equal(result.analysisType, "CHANGE");
});

test("factory rejects invalid input with typed error", () => {
    assert.throws(
        () =>
            createTemporalChangeCalculationResult({
                analysisType: "CHANGE"
            }),
        error =>
            error.code ===
            "INVALID_TEMPORAL_CHANGE_CALCULATION_RESULT"
    );
});

test("factory does not mutate input", () => {
    const input = createValidResult({
        analysisType: "change"
    });

    const before = JSON.stringify(input);

    createTemporalChangeCalculationResult(input);

    assert.equal(
        JSON.stringify(input),
        before
    );
});
