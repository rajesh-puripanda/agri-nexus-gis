"use strict";

// ============================================================
// server/tests/temporalObservationContract.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.1  Temporal Remote-Sensing Observation Contract
//
// Scope:
//   - Contract structure
//   - Required fields
//   - Date validation
//   - Index registry validation
//   - Raster context validation
//   - Context validation
//   - Index-code normalization
//   - Optional metadata
//   - Contract factory
//
// Scientific calculations are intentionally NOT tested here.
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    TEMPORAL_OBSERVATION_CONTRACT_VERSION,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    validateTemporalObservation,
    createTemporalObservationContract
} = require("../scientific/remoteSensing/temporal/temporalObservationContract");

function createValidObservation(overrides = {}) {
    return {
        contractVersion: "1.0",
        observationDate: "2026-01-15",
        acquisitionDate: "2026-01-15T05:30:00Z",
        sensor: "Sentinel-2",
        sceneId: "S2A_TEST_SCENE_001",
        indexCode: "NDVI",

        spatialContext: {
            crs: "EPSG:4326",
            bounds: [
                83.20,
                17.65,
                83.30,
                17.75
            ]
        },

        rasterContext: {
            width: 100,
            height: 80,
            pixelCount: 8000,
            noData: -9999
        },

        processingContext: {
            processingVersion: "1.0",
            source: "test"
        },

        ...overrides
    };
}

test("contract exposes version 1.0", () => {
    assert.equal(
        TEMPORAL_OBSERVATION_CONTRACT_VERSION,
        "1.0"
    );
});

test("contract declares nine required fields and one optional field", () => {
    assert.equal(REQUIRED_FIELDS.length, 9);
    assert.equal(OPTIONAL_FIELDS.length, 1);

    assert.deepEqual(
        REQUIRED_FIELDS,
        [
            "contractVersion",
            "observationDate",
            "acquisitionDate",
            "sensor",
            "sceneId",
            "indexCode",
            "spatialContext",
            "rasterContext",
            "processingContext"
        ]
    );

    assert.deepEqual(
        OPTIONAL_FIELDS,
        ["metadata"]
    );
});

test("valid temporal observation passes validation", () => {
    const result = validateTemporalObservation(
        createValidObservation()
    );

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
});

test("missing required fields are rejected", () => {
    const observation = createValidObservation();

    delete observation.sensor;
    delete observation.sceneId;
    delete observation.processingContext;

    const result = validateTemporalObservation(observation);

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("sensor")
        )
    );

    assert.ok(
        result.errors.some(error =>
            error.includes("sceneId")
        )
    );

    assert.ok(
        result.errors.some(error =>
            error.includes("processingContext")
        )
    );
});

test("invalid observation date is rejected", () => {
    const result = validateTemporalObservation(
        createValidObservation({
            observationDate: "not-a-date"
        })
    );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("observationDate")
        )
    );
});

test("invalid acquisition date is rejected", () => {
    const result = validateTemporalObservation(
        createValidObservation({
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

test("unknown index code is rejected", () => {
    const result = validateTemporalObservation(
        createValidObservation({
            indexCode: "UNKNOWN_INDEX"
        })
    );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("indexCode")
        )
    );
});

test("lowercase registered index code is accepted and normalized by factory", () => {
    const observation = createValidObservation({
        indexCode: "ndvi"
    });

    const result = createTemporalObservationContract(
        observation
    );

    assert.equal(result.indexCode, "NDVI");
    assert.equal(result.contractVersion, "1.0");
});

test("invalid raster dimensions are rejected", () => {
    const result = validateTemporalObservation(
        createValidObservation({
            rasterContext: {
                width: 0,
                height: 80,
                pixelCount: 0
            }
        })
    );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("rasterContext.width")
        )
    );
});

test("pixel count mismatch is rejected", () => {
    const result = validateTemporalObservation(
        createValidObservation({
            rasterContext: {
                width: 100,
                height: 80,
                pixelCount: 7999
            }
        })
    );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("pixelCount must equal width * height")
        )
    );
});

test("missing spatial context is rejected", () => {
    const result = validateTemporalObservation(
        createValidObservation({
            spatialContext: null
        })
    );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("spatialContext")
        )
    );
});

test("missing processing context is rejected", () => {
    const result = validateTemporalObservation(
        createValidObservation({
            processingContext: null
        })
    );

    assert.equal(result.valid, false);

    assert.ok(
        result.errors.some(error =>
            error.includes("processingContext")
        )
    );
});

test("optional metadata is accepted", () => {
    const result = validateTemporalObservation(
        createValidObservation({
            metadata: {
                platform: "Sentinel-2A",
                orbit: "TEST"
            }
        })
    );

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
});

test("factory returns a validated temporal observation contract", () => {
    const result = createTemporalObservationContract(
        createValidObservation()
    );

    assert.equal(result.contractVersion, "1.0");
    assert.equal(result.indexCode, "NDVI");
    assert.equal(result.observationDate, "2026-01-15");
    assert.equal(result.acquisitionDate, "2026-01-15T05:30:00Z");
    assert.equal(result.sensor, "Sentinel-2");
    assert.equal(result.sceneId, "S2A_TEST_SCENE_001");
});

test("factory rejects invalid observations", () => {
    assert.throws(
        () =>
            createTemporalObservationContract(
                createValidObservation({
                    indexCode: "UNKNOWN_INDEX"
                })
            ),
        /Invalid temporal remote-sensing observation/
    );
});

