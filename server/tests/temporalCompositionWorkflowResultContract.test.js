"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    TEMPORAL_COMPOSITION_WORKFLOW_RESULT_CONTRACT_VERSION,
    validateTemporalCompositionWorkflowResult,
    createTemporalCompositionWorkflowResultContract
} = require(
    "../scientific/remoteSensing/temporal/" +
    "temporalCompositionWorkflowResultContract"
);

function createObservation(date) {
    return {
        contractVersion: "1.0",
        observation: {
            observationDate: date,
            acquisitionDate: `${date}T10:30:00Z`,
            sensor: "Sentinel-2",
            sceneId: `SCENE-${date}`,
            indexCode: "NDVI"
        },
        raster: {
            rasterId: `RASTER-${date}`,
            width: 10,
            height: 10,
            pixelCount: 100
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
            validPixelCount: 100,
            noDataPixelCount: 0,
            minimum: 0.1,
            maximum: 0.8,
            mean: 0.45
        },
        spatialContext: {},
        processingContext: {}
    };
}

function createComposition() {
    const observations = [
        createObservation("2025-06-15"),
        createObservation("2025-07-15")
    ];

    return {
        contractVersion: "1.0",
        compositionId: "COMP-001",
        indexCode: "NDVI",
        observations,
        temporalContext: {
            startDate: "2025-06-15",
            endDate: "2025-07-15",
            observationCount: 2
        },
        spatialContext: {},
        processingContext: {}
    };
}

test("valid workflow result passes validation", () => {
    const result = {
        contractVersion:
            TEMPORAL_COMPOSITION_WORKFLOW_RESULT_CONTRACT_VERSION,
        composition: createComposition()
    };

    const validation =
        validateTemporalCompositionWorkflowResult(result);

    assert.equal(validation.valid, true);
    assert.deepEqual(validation.errors, []);
});

test("missing composition fails", () => {
    const validation =
        validateTemporalCompositionWorkflowResult({
            contractVersion:
                TEMPORAL_COMPOSITION_WORKFLOW_RESULT_CONTRACT_VERSION
        });

    assert.equal(validation.valid, false);
});

test("invalid result version fails", () => {
    const validation =
        validateTemporalCompositionWorkflowResult({
            contractVersion: "9.9",
            composition: createComposition()
        });

    assert.equal(validation.valid, false);
});

test("non-object composition fails", () => {
    const validation =
        validateTemporalCompositionWorkflowResult({
            contractVersion:
                TEMPORAL_COMPOSITION_WORKFLOW_RESULT_CONTRACT_VERSION,
            composition: []
        });

    assert.equal(validation.valid, false);
});

test("composition validation errors propagate", () => {
    const composition = createComposition();
    composition.indexCode = "EVI";

    const validation =
        validateTemporalCompositionWorkflowResult({
            contractVersion:
                TEMPORAL_COMPOSITION_WORKFLOW_RESULT_CONTRACT_VERSION,
            composition
        });

    assert.equal(validation.valid, false);
    assert.ok(
        validation.errors.some(error =>
            error.includes("composition:")
        )
    );
});

test("factory creates validated workflow result", () => {
    const result =
        createTemporalCompositionWorkflowResultContract({
            composition: createComposition()
        });

    assert.equal(
        result.contractVersion,
        TEMPORAL_COMPOSITION_WORKFLOW_RESULT_CONTRACT_VERSION
    );

    assert.equal(
        result.composition.compositionId,
        "COMP-001"
    );
});

test("factory rejects invalid composition", () => {
    assert.throws(
        () =>
            createTemporalCompositionWorkflowResultContract({
                composition: {
                    contractVersion: "1.0"
                }
            }),
        error => {
            assert.equal(
                error.code,
                "INVALID_TEMPORAL_COMPOSITION_WORKFLOW_RESULT"
            );
            assert.ok(
                Array.isArray(error.validationErrors)
            );
            return true;
        }
    );
});

test("factory rejects invalid result version", () => {
    assert.throws(
        () =>
            createTemporalCompositionWorkflowResultContract({
                contractVersion: "9.9",
                composition: createComposition()
            }),
        error =>
            error.code ===
            "INVALID_TEMPORAL_COMPOSITION_WORKFLOW_RESULT"
    );
});

test("composition observations remain unchanged", () => {
    const composition = createComposition();

    const result =
        createTemporalCompositionWorkflowResultContract({
            composition
        });

    assert.equal(
        result.composition.observations.length,
        2
    );

    assert.equal(
        result.composition.observations[0]
            .observation.observationDate,
        "2025-06-15"
    );
});

test("metadata remains supported by composition contract", () => {
    const composition = createComposition();

    composition.metadata = {
        source: "temporal-workflow"
    };

    const result =
        createTemporalCompositionWorkflowResultContract({
            composition
        });

    assert.deepEqual(
        result.composition.metadata,
        {
            source: "temporal-workflow"
        }
    );
});
