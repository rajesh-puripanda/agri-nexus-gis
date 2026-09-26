"use strict";

// ============================================================
// server/tests/temporalObservationWorkflowRequestContract.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.5.3.1
// Temporal Observation Workflow Request Contract Tests
// Contract version: 1.0
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    TEMPORAL_OBSERVATION_WORKFLOW_REQUEST_CONTRACT_VERSION,
    validateTemporalObservationWorkflowRequest,
    createTemporalObservationWorkflowRequestContract
} = require("../scientific/remoteSensing/temporal/temporalObservationWorkflowRequestContract");

function createValidRequest(overrides = {}) {
    return {
        contractVersion:
            TEMPORAL_OBSERVATION_WORKFLOW_REQUEST_CONTRACT_VERSION,

        temporalIdentity: {
            observationDate: "2025-06-15",
            acquisitionDate: "2025-06-15T10:30:00Z",
            sensor: "Sentinel-2",
            sceneId: "S2A_20250615_SCENE_001",
            ...(overrides.temporalIdentity || {})
        },

        rasterIdentity: {
            rasterId: "RASTER-20250615-001",
            ...(overrides.rasterIdentity || {})
        },

        workflowRequest: {
            inputPath:
                "D:\\data\\sentinel2\\scene-001.tif",

            indexCode: "ndvi",

            bandMapping: {
                red: 4,
                nir: 8
            },

            outputDirectory:
                "D:\\data\\output",

            noData: -9999,

            parameters: {},

            processingContext: {
                source: "Sentinel-2"
            },

            spatialContext: {
                crs: "EPSG:4326"
            },

            ...(overrides.workflowRequest || {})
        }
    };
}

// ============================================================
// 1. VALID REQUEST
// ============================================================

test(
    "valid temporal observation workflow request passes",
    () => {
        const result =
            validateTemporalObservationWorkflowRequest(
                createValidRequest()
            );

        assert.equal(result.valid, true);
        assert.deepEqual(result.errors, []);
        assert.equal(result.indexCode, "NDVI");
        assert.ok(result.definition);
    }
);

// ============================================================
// 2. CONTRACT VERSION
// ============================================================

test(
    "missing contractVersion fails",
    () => {
        const request = createValidRequest();

        delete request.contractVersion;

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "request is missing required field: contractVersion"
                    )
            )
        );
    }
);

test(
    "invalid contractVersion fails",
    () => {
        const request = createValidRequest();

        request.contractVersion = "9.9";

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        'contractVersion must be "1.0"'
                    )
            )
        );
    }
);

// ============================================================
// 3. TEMPORAL IDENTITY
// ============================================================

test(
    "missing temporalIdentity fails",
    () => {
        const request = createValidRequest();

        delete request.temporalIdentity;

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "request is missing required field: temporalIdentity"
                    )
            )
        );
    }
);

test(
    "invalid observationDate fails strict temporal validation",
    () => {
        const request = createValidRequest();

        request.temporalIdentity.observationDate =
            "15-06-2025";

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "temporalIdentity"
                    )
            )
        );
    }
);

test(
    "acquisitionDate with mismatched calendar date fails",
    () => {
        const request = createValidRequest();

        request.temporalIdentity.acquisitionDate =
            "2025-06-16T10:30:00Z";

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "calendar date"
                    )
            )
        );
    }
);

test(
    "acquisitionDate without explicit timezone fails",
    () => {
        const request = createValidRequest();

        request.temporalIdentity.acquisitionDate =
            "2025-06-15T10:30:00";

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
    }
);

test(
    "invalid sensor fails",
    () => {
        const request = createValidRequest();

        request.temporalIdentity.sensor = "   ";

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "sensor must be a non-empty string"
                    )
            )
        );
    }
);

test(
    "invalid sceneId fails",
    () => {
        const request = createValidRequest();

        request.temporalIdentity.sceneId = "";

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "sceneId must be a non-empty string"
                    )
            )
        );
    }
);

// ============================================================
// 4. RASTER IDENTITY
// ============================================================

test(
    "missing rasterIdentity fails",
    () => {
        const request = createValidRequest();

        delete request.rasterIdentity;

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "request is missing required field: rasterIdentity"
                    )
            )
        );
    }
);

test(
    "missing rasterId fails",
    () => {
        const request = createValidRequest();

        delete request.rasterIdentity.rasterId;

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "rasterIdentity is missing required field: rasterId"
                    )
            )
        );
    }
);

test(
    "blank rasterId fails",
    () => {
        const request = createValidRequest();

        request.rasterIdentity.rasterId = "   ";

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
    }
);

// ============================================================
// 5. WORKFLOW REQUEST
// ============================================================

test(
    "missing workflowRequest fails",
    () => {
        const request = createValidRequest();

        delete request.workflowRequest;

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "request is missing required field: workflowRequest"
                    )
            )
        );
    }
);

test(
    "missing workflow inputPath fails",
    () => {
        const request = createValidRequest();

        delete request.workflowRequest.inputPath;

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
    }
);

test(
    "missing workflow indexCode fails",
    () => {
        const request = createValidRequest();

        delete request.workflowRequest.indexCode;

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
    }
);

test(
    "missing bandMapping fails",
    () => {
        const request = createValidRequest();

        delete request.workflowRequest.bandMapping;

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
    }
);

test(
    "missing outputDirectory fails",
    () => {
        const request = createValidRequest();

        delete request.workflowRequest.outputDirectory;

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
    }
);

// ============================================================
// 6. PATH VALIDATION
// ============================================================

test(
    "inputPath containing NUL fails",
    () => {
        const request = createValidRequest();

        request.workflowRequest.inputPath =
            "D:\\data\\bad\0file.tif";

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
    }
);

test(
    "outputDirectory containing NUL fails",
    () => {
        const request = createValidRequest();

        request.workflowRequest.outputDirectory =
            "D:\\output\0bad";

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
    }
);

// ============================================================
// 7. INDEX VALIDATION
// ============================================================

test(
    "unknown index fails",
    () => {
        const request = createValidRequest();

        request.workflowRequest.indexCode =
            "UNKNOWN_INDEX";

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "Unknown remote sensing index"
                    )
            )
        );
    }
);

test(
    "indexCode is resolved case-insensitively",
    () => {
        const request = createValidRequest();

        request.workflowRequest.indexCode =
            " ndvi ";

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, true);
        assert.equal(result.indexCode, "NDVI");
    }
);

// ============================================================
// 8. BAND MAPPING
// ============================================================

test(
    "empty bandMapping fails",
    () => {
        const request = createValidRequest();

        request.workflowRequest.bandMapping = {};

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
    }
);

test(
    "non-positive source band fails",
    () => {
        const request = createValidRequest();

        request.workflowRequest.bandMapping = {
            red: 0,
            nir: 8
        };

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
    }
);

test(
    "non-integer source band fails",
    () => {
        const request = createValidRequest();

        request.workflowRequest.bandMapping = {
            red: 4.5,
            nir: 8
        };

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
    }
);

test(
    "duplicate band names differing only by case fail",
    () => {
        const request = createValidRequest();

        request.workflowRequest.bandMapping = {
            red: 4,
            RED: 5
        };

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
    }
);

// ============================================================
// 9. NODATA
// ============================================================

test(
    "finite noData value passes",
    () => {
        const request = createValidRequest();

        request.workflowRequest.noData = -9999;

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, true);
    }
);

test(
    "null noData passes",
    () => {
        const request = createValidRequest();

        request.workflowRequest.noData = null;

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, true);
    }
);

test(
    "non-finite noData fails",
    () => {
        const request = createValidRequest();

        request.workflowRequest.noData =
            Infinity;

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
    }
);

// ============================================================
// 10. CONTEXT OBJECTS
// ============================================================

test(
    "invalid parameters context fails",
    () => {
        const request = createValidRequest();

        request.workflowRequest.parameters =
            "invalid";

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
    }
);

test(
    "invalid processingContext fails",
    () => {
        const request = createValidRequest();

        request.workflowRequest.processingContext =
            [];

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
    }
);

test(
    "invalid spatialContext fails",
    () => {
        const request = createValidRequest();

        request.workflowRequest.spatialContext =
            "invalid";

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
    }
);

// ============================================================
// 11. CREATOR NORMALIZATION
// ============================================================

test(
    "creator trims identities and normalizes indexCode",
    () => {
        const request = createValidRequest();

        request.temporalIdentity.observationDate =
            " 2025-06-15 ";

        request.temporalIdentity.acquisitionDate =
            " 2025-06-15T10:30:00Z ";

        request.temporalIdentity.sensor =
            " Sentinel-2 ";

        request.temporalIdentity.sceneId =
            " SCENE-001 ";

        request.rasterIdentity.rasterId =
            " RASTER-001 ";

        request.workflowRequest.indexCode =
            " ndvi ";

        const result =
            createTemporalObservationWorkflowRequestContract(
                request
            );

        assert.equal(
            result.temporalIdentity.observationDate,
            "2025-06-15"
        );

        assert.equal(
            result.temporalIdentity.acquisitionDate,
            "2025-06-15T10:30:00Z"
        );

        assert.equal(
            result.temporalIdentity.sensor,
            "Sentinel-2"
        );

        assert.equal(
            result.temporalIdentity.sceneId,
            "SCENE-001"
        );

        assert.equal(
            result.rasterIdentity.rasterId,
            "RASTER-001"
        );

        assert.equal(
            result.workflowRequest.indexCode,
            "NDVI"
        );
    }
);

// ============================================================
// 12. CREATOR ERROR CONTRACT
// ============================================================

test(
    "creator throws expected error code and validationErrors",
    () => {
        assert.throws(
            () =>
                createTemporalObservationWorkflowRequestContract(
                    {
                        contractVersion: "1.0",
                        temporalIdentity: {
                            observationDate: "bad",
                            acquisitionDate: "bad",
                            sensor: "",
                            sceneId: ""
                        },
                        rasterIdentity: {
                            rasterId: ""
                        },
                        workflowRequest: {
                            inputPath: "",
                            indexCode: "UNKNOWN",
                            bandMapping: {},
                            outputDirectory: ""
                        }
                    }
                ),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_TEMPORAL_OBSERVATION_WORKFLOW_REQUEST"
                );

                assert.ok(
                    Array.isArray(
                        error.validationErrors
                    )
                );

                assert.ok(
                    error.validationErrors.length > 0
                );

                return true;
            }
        );
    }
);

// ============================================================
// 13. STATISTICS ARE NOT REQUEST FIELDS
// ============================================================

test(
    "statistics are not required in the workflow request",
    () => {
        const request = createValidRequest();

        delete request.workflowRequest.statistics;

        const result =
            validateTemporalObservationWorkflowRequest(
                request
            );

        assert.equal(result.valid, true);
    }
);
