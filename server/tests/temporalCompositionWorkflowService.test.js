"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    TEMPORAL_COMPOSITION_WORKFLOW_SERVICE_VERSION,
    processTemporalCompositionWorkflow
} = require(
    "../services/remoteSensing/temporal/" +
    "temporalCompositionWorkflowService"
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

function createRequest() {
    return {
        contractVersion: "1.0",
        compositionId: "COMP-WF-001",
        indexCode: "ndvi",
        observations: [
            createObservation("2025-06-15"),
            createObservation("2025-07-15")
        ],
        temporalContext: {
            startDate: "2025-06-15",
            endDate: "2025-07-15",
            observationCount: 2
        },
        spatialContext: {
            crs: "EPSG:4326"
        },
        processingContext: {
            source: "Sentinel-2"
        }
    };
}

test("service exposes version 1.0", () => {
    assert.equal(
        TEMPORAL_COMPOSITION_WORKFLOW_SERVICE_VERSION,
        "1.0"
    );
});

test("processes a valid temporal composition workflow", async () => {
    const result =
        await processTemporalCompositionWorkflow(
            createRequest()
        );

    assert.equal(
        result.contractVersion,
        "1.0"
    );

    assert.equal(
        result.composition.compositionId,
        "COMP-WF-001"
    );

    assert.equal(
        result.composition.indexCode,
        "NDVI"
    );

    assert.equal(
        result.composition.observations.length,
        2
    );
});

test("normalizes indexCode through the composition boundary", async () => {
    const request = createRequest();
    request.indexCode = " ndvi ";

    const result =
        await processTemporalCompositionWorkflow(
            request
        );

    assert.equal(
        result.composition.indexCode,
        "NDVI"
    );
});

test("preserves chronological observations", async () => {
    const request = createRequest();

    const result =
        await processTemporalCompositionWorkflow(
            request
        );

    assert.deepEqual(
        result.composition.observations.map(
            observation =>
                observation.observation.observationDate
        ),
        [
            "2025-06-15",
            "2025-07-15"
        ]
    );
});

test("preserves temporal context supplied by request", async () => {
    const request = createRequest();

    const result =
        await processTemporalCompositionWorkflow(
            request
        );

    assert.deepEqual(
        result.composition.temporalContext,
        request.temporalContext
    );
});

test("preserves spatial and processing context", async () => {
    const request = createRequest();

    const result =
        await processTemporalCompositionWorkflow(
            request
        );

    assert.deepEqual(
        result.composition.spatialContext,
        request.spatialContext
    );

    assert.deepEqual(
        result.composition.processingContext,
        request.processingContext
    );
});

test("preserves optional metadata", async () => {
    const request = createRequest();

    request.metadata = {
        source: "temporal-workflow",
        operator: "test"
    };

    const result =
        await processTemporalCompositionWorkflow(
            request
        );

    assert.deepEqual(
        result.composition.metadata,
        request.metadata
    );
});

test("rejects invalid workflow request", async () => {
    const request = createRequest();

    delete request.observations;

    await assert.rejects(
        () =>
            processTemporalCompositionWorkflow(
                request
            ),
        error => {
            assert.equal(
                error.code,
                "INVALID_TEMPORAL_COMPOSITION_WORKFLOW_REQUEST"
            );

            assert.ok(
                Array.isArray(
                    error.validationErrors
                )
            );

            return true;
        }
    );
});

test("rejects invalid observation composition", async () => {
    const request = createRequest();

    request.observations[1]
        .observation.indexCode = "EVI";

    await assert.rejects(
        () =>
            processTemporalCompositionWorkflow(
                request
            ),
        error =>
            error.code ===
            "INVALID_TEMPORAL_COMPOSITION_WORKFLOW_REQUEST"
    );
});

test("rejects non-chronological observations", async () => {
    const request = createRequest();

    request.observations.reverse();

    await assert.rejects(
        () =>
            processTemporalCompositionWorkflow(
                request
            ),
        error =>
            error.code ===
            "INVALID_TEMPORAL_COMPOSITION_WORKFLOW_REQUEST"
    );
});

test("service does not alter request structure", async () => {
    const request = createRequest();

    const before =
        JSON.stringify(request);

    await processTemporalCompositionWorkflow(
        request
    );

    assert.equal(
        JSON.stringify(request),
        before
    );
});
