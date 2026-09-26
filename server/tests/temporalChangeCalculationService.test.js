"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    calculateTemporalChange
} = require("../services/remoteSensing/temporalChangeCalculationService");

const {
    validateTemporalChangeCalculationResult
} = require("../scientific/remoteSensing/temporal/temporalChangeCalculationContract");

const EPSILON = 1e-12;

function assertApproximately(actual, expected) {
    assert.equal(
        Math.abs(actual - expected) < EPSILON,
        true,
        `Expected ${actual} to approximately equal ${expected}.`
    );
}

function createObservation(date, mean, suffix) {
    return {
        contractVersion: "1.0",
        observation: {
            observationDate: date,
            acquisitionDate: `${date}T05:30:00Z`,
            sensor: "Sentinel-2",
            sceneId: `S2A_${suffix}`,
            indexCode: "NDVI"
        },
        raster: {
            rasterId: `NDVI_${suffix}`,
            width: 100,
            height: 100,
            pixelCount: 10000,
            noData: -9999
        },
        index: {
            code: "NDVI",
            name: "Normalized Difference Vegetation Index",
            validRange: {
                min: -1,
                max: 1
            }
        },
        statistics: {
            validPixelCount: 9800,
            noDataPixelCount: 200,
            minimum: -0.45,
            maximum: 0.91,
            mean
        },
        spatialContext: {
            crs: "EPSG:4326"
        },
        processingContext: {
            processingVersion: "1.0"
        }
    };
}

function createComposition(means = [0.40, 0.60]) {
    const dates = [
        "2026-06-01",
        "2026-06-15",
        "2026-07-01"
    ];

    const observations = means.map(
        (mean, index) =>
            createObservation(
                dates[index],
                mean,
                index + 1
            )
    );

    return {
        contractVersion: "1.0",
        compositionId: "NDVI-SERIES-001",
        indexCode: "NDVI",
        observations,
        temporalContext: {
            startDate: dates[0],
            endDate: dates[means.length - 1],
            observationCount: means.length
        },
        spatialContext: {
            crs: "EPSG:4326"
        },
        processingContext: {
            processingVersion: "1.0"
        }
    };
}

test("calculates first-to-last positive change", () => {
    const result =
        calculateTemporalChange(
            createComposition([0.40, 0.60])
        );

    assertApproximately(result.absoluteChange, 0.20);
    assertApproximately(result.percentageChange, 50);

    assert.equal(
        result.direction,
        "increase"
    );
});

test("calculates first-to-last negative change", () => {
    const result =
        calculateTemporalChange(
            createComposition([0.60, 0.40])
        );

    assertApproximately(result.absoluteChange, -0.20);
    assertApproximately(result.percentageChange, -33.33333333333333);

    assert.equal(
        result.direction,
        "decrease"
    );
});

test("calculates zero change", () => {
    const result =
        calculateTemporalChange(
            createComposition([0.40, 0.40])
        );

    assertApproximately(result.absoluteChange, 0);
    assertApproximately(result.percentageChange, 0);

    assert.equal(
        result.direction,
        "no_change"
    );
});

test("uses first and last observations only", () => {
    const result =
        calculateTemporalChange(
            createComposition([0.40, 0.90, 0.20])
        );

    assertApproximately(result.absoluteChange, -0.20);
    assertApproximately(result.percentageChange, -50);

    assert.equal(
        result.direction,
        "decrease"
    );

    assert.equal(
        result.comparison.startDate,
        "2026-06-01"
    );

    assert.equal(
        result.comparison.endDate,
        "2026-07-01"
    );
});

test("handles negative baseline using absolute denominator", () => {
    const result =
        calculateTemporalChange(
            createComposition([-0.40, -0.20])
        );

    assertApproximately(result.absoluteChange, 0.20);
    assertApproximately(result.percentageChange, 50);

    assert.equal(
        result.direction,
        "increase"
    );
});

test("handles zero baseline without producing Infinity or NaN", () => {
    const result =
        calculateTemporalChange(
            createComposition([0, 0.40])
        );

    assert.equal(
        result.percentageChange,
        null
    );

    assert.equal(
        result.percentageChangeStatus,
        "undefined_zero_baseline"
    );

    assert.equal(
        Number.isNaN(result.percentageChange),
        false
    );
});

test("rejects fewer than two observations", () => {
    assert.throws(
        () =>
            calculateTemporalChange(
                createComposition([0.40])
            ),
        error =>
            error.code ===
            "INSUFFICIENT_TEMPORAL_OBSERVATIONS"
    );
});

test("rejects non-finite start mean", () => {
    const composition =
        createComposition([0.40, 0.60]);

    composition.observations[0]
        .statistics.mean = NaN;

    assert.throws(
        () =>
            calculateTemporalChange(composition),
        error =>
            error.code ===
            "INVALID_TEMPORAL_CHANGE_CALCULATION_INPUT"
    );
});

test("rejects non-finite end mean", () => {
    const composition =
        createComposition([0.40, 0.60]);

    composition.observations[1]
        .statistics.mean = Infinity;

    assert.throws(
        () =>
            calculateTemporalChange(composition),
        error =>
            error.code ===
            "INVALID_TEMPORAL_CHANGE_CALCULATION_INPUT"
    );
});

test("rejects invalid composition", () => {
    const composition =
        createComposition([0.40, 0.60]);

    composition.temporalContext.endDate =
        "2026-08-01";

    assert.throws(
        () =>
            calculateTemporalChange(composition),
        error =>
            error.code ===
            "INVALID_TEMPORAL_CHANGE_CALCULATION_INPUT"
    );
});

test("preserves chronological comparison", () => {
    const composition =
        createComposition([0.40, 0.60, 0.80]);

    const result =
        calculateTemporalChange(composition);

    assert.equal(
        result.comparison.startDate,
        "2026-06-01"
    );

    assert.equal(
        result.comparison.endDate,
        "2026-07-01"
    );

    assertApproximately(
        result.comparison.startMean,
        0.40
    );

    assertApproximately(
        result.comparison.endMean,
        0.80
    );
});

test("returns a contract-valid scientific result", () => {
    const result =
        calculateTemporalChange(
            createComposition([0.40, 0.60])
        );

    const validation =
        validateTemporalChangeCalculationResult(
            result
        );

    assert.equal(
        validation.valid,
        true
    );
});

test("does not mutate the temporal composition", () => {
    const composition =
        createComposition([0.40, 0.60, 0.80]);

    const before =
        JSON.stringify(composition);

    calculateTemporalChange(composition);

    assert.equal(
        JSON.stringify(composition),
        before
    );
});

test("supports a composition with exactly two observations", () => {
    const result =
        calculateTemporalChange(
            createComposition([0.25, 0.50])
        );

    assertApproximately(
        result.absoluteChange,
        0.25
    );

    assertApproximately(
        result.percentageChange,
        100
    );

    assert.equal(
        result.direction,
        "increase"
    );
});
