"use strict";

// ============================================================
// server/tests/temporalCompositionWorkflowRequestContract.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.5.4
// Temporal Composition Workflow Request Contract Tests
//
// Contract version: 1.0
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    TEMPORAL_COMPOSITION_WORKFLOW_REQUEST_CONTRACT_VERSION,
    validateTemporalCompositionWorkflowRequest,
    createTemporalCompositionWorkflowRequest
} = require(
    "../scientific/remoteSensing/temporal/" +
    "temporalCompositionWorkflowRequestContract"
);

function createObservation(
    observationDate,
    indexCode = "NDVI"
) {
    return {
        contractVersion: "1.0",

        observation: {
            observationDate,

            acquisitionDate:
                `${observationDate}T10:30:00Z`,

            sensor:
                "Sentinel-2",

            sceneId:
                `S2A_${observationDate.replace(/-/g, "")}_001`,

            indexCode
        },

        raster: {
            rasterId:
                `RASTER-${observationDate}`,

            width: 2,

            height: 2,

            pixelCount: 4
        },

        index: {
            code: indexCode,

            name:
                "Normalized Difference Vegetation Index",

            validRange: {
                min: -1,
                max: 1
            }
        },

        statistics: {
            validPixelCount: 3,

            noDataPixelCount: 1,

            minimum: 0.1,

            maximum: 0.8,

            mean: 0.45
        },

        spatialContext: {
            crs: "EPSG:4326"
        },

        processingContext: {
            source:
                "Sentinel-2"
        }
    };
}

function createValidRequest(
    overrides = {}
) {
    const observations = [
        createObservation("2025-06-01"),
        createObservation("2025-07-01"),
        createObservation("2025-08-01")
    ];

    return {
        contractVersion:
            TEMPORAL_COMPOSITION_WORKFLOW_REQUEST_CONTRACT_VERSION,

        compositionId:
            "TEMPORAL-NDVI-2025",

        indexCode:
            "NDVI",

        observations,

        temporalContext: {
            startDate:
                "2025-06-01",

            endDate:
                "2025-08-01",

            observationCount:
                3
        },

        spatialContext: {
            crs:
                "EPSG:4326"
        },

        processingContext: {
            source:
                "Sentinel-2"
        },

        metadata: {
            description:
                "Test temporal composition"
        },

        ...overrides
    };
}

// ============================================================
// 1. VALID REQUEST
// ============================================================

test(
    "valid temporal composition workflow request passes",
    () => {
        const result =
            validateTemporalCompositionWorkflowRequest(
                createValidRequest()
            );

        assert.equal(
            result.valid,
            true
        );

        assert.deepEqual(
            result.errors,
            []
        );

        assert.equal(
            result.indexCode,
            "NDVI"
        );
    }
);

// ============================================================
// 2. REQUEST STRUCTURE
// ============================================================

test(
    "plain object request is required",
    () => {
        const result =
            validateTemporalCompositionWorkflowRequest(
                null
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "missing required field fails",
    () => {
        const request =
            createValidRequest();

        delete request.compositionId;

        const result =
            validateTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "invalid contract version fails",
    () => {
        const request =
            createValidRequest();

        request.contractVersion =
            "9.9";

        const result =
            validateTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

// ============================================================
// 3. INDEX
// ============================================================

test(
    "indexCode is normalized",
    () => {
        const request =
            createValidRequest();

        request.indexCode =
            " ndvi ";

        const result =
            validateTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            true
        );

        assert.equal(
            result.indexCode,
            "NDVI"
        );
    }
);

test(
    "unknown indexCode fails",
    () => {
        const request =
            createValidRequest();

        request.indexCode =
            "UNKNOWN_INDEX";

        const result =
            validateTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

// ============================================================
// 4. OBSERVATIONS
// ============================================================

test(
    "empty observations array fails",
    () => {
        const request =
            createValidRequest();

        request.observations = [];

        const result =
            validateTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "invalid observation fails through authoritative observation contract",
    () => {
        const request =
            createValidRequest();

        delete request.observations[0]
            .raster
            .rasterId;

        const result =
            validateTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "raster.rasterId"
                    )
            )
        );
    }
);

test(
    "observation index mismatch fails",
    () => {
        const request =
            createValidRequest();

        request.observations[1] =
            createObservation(
                "2025-07-01",
                "NDWI"
            );

        const result =
            validateTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "non-chronological observations fail",
    () => {
        const request =
            createValidRequest();

        request.observations = [
            createObservation("2025-08-01"),
            createObservation("2025-07-01"),
            createObservation("2025-09-01")
        ];

        request.temporalContext = {
            startDate:
                "2025-08-01",

            endDate:
                "2025-09-01",

            observationCount:
                3
        };

        const result =
            validateTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "duplicate observation dates fail",
    () => {
        const request =
            createValidRequest();

        request.observations[1] =
            createObservation(
                "2025-06-01"
            );

        const result =
            validateTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

// ============================================================
// 5. TEMPORAL CONTEXT
// ============================================================

test(
    "observation count mismatch fails",
    () => {
        const request =
            createValidRequest();

        request.temporalContext
            .observationCount = 2;

        const result =
            validateTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "start date mismatch fails",
    () => {
        const request =
            createValidRequest();

        request.temporalContext.startDate =
            "2025-05-01";

        const result =
            validateTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "end date mismatch fails",
    () => {
        const request =
            createValidRequest();

        request.temporalContext.endDate =
            "2025-09-01";

        const result =
            validateTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

// ============================================================
// 6. CONTEXT
// ============================================================

test(
    "missing spatialContext fails",
    () => {
        const request =
            createValidRequest();

        delete request.spatialContext;

        const result =
            validateTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "missing processingContext fails",
    () => {
        const request =
            createValidRequest();

        delete request.processingContext;

        const result =
            validateTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

// ============================================================
// 7. OPTIONAL METADATA
// ============================================================

test(
    "optional metadata is accepted",
    () => {
        const request =
            createValidRequest();

        request.metadata = {
            source:
                "Sentinel-2"
        };

        const result =
            validateTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            true
        );
    }
);

test(
    "invalid metadata fails",
    () => {
        const request =
            createValidRequest();

        request.metadata =
            "invalid";

        const result =
            validateTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

// ============================================================
// 8. FACTORY
// ============================================================

test(
    "factory normalizes indexCode and returns valid request",
    () => {
        const request =
            createValidRequest();

        request.indexCode =
            " ndvi ";

        const result =
            createTemporalCompositionWorkflowRequest(
                request
            );

        assert.equal(
            result.contractVersion,
            TEMPORAL_COMPOSITION_WORKFLOW_REQUEST_CONTRACT_VERSION
        );

        assert.equal(
            result.indexCode,
            "NDVI"
        );
    }
);

test(
    "factory throws typed validation error",
    () => {
        assert.throws(
            () =>
                createTemporalCompositionWorkflowRequest(
                    {
                        ...createValidRequest(),
                        indexCode:
                            "INVALID"
                    }
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
    }
);
