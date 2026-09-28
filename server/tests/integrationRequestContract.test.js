"use strict";

// ============================================================
// server/tests/integrationRequestContract.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 8.14.13
// Integration Request Contract Tests
//
// Contract version: 1.0
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    INTEGRATION_REQUEST_CONTRACT_VERSION,
    INTEGRATION_REQUEST_TYPE,
    INTEGRATION_DOMAINS,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    validateIntegrationRequest,
    createIntegrationRequest
} = require(
    "../scientific/integration/integrationRequestContract"
);

function createValidRequest(overrides = {}) {
    return {
        contractVersion: INTEGRATION_REQUEST_CONTRACT_VERSION,
        requestType: INTEGRATION_REQUEST_TYPE,
        requestedDomains: [...INTEGRATION_DOMAINS],
        inputs: {
            sampleId: "S-001"
        },
        context: {
            studyArea: "test-area"
        },
        metadata: {
            source: "phase-8.14.13-test"
        },
        ...overrides
    };
}

test(
    "integration request contract version and type are defined correctly",
    () => {
        assert.equal(
            INTEGRATION_REQUEST_CONTRACT_VERSION,
            "1.0"
        );

        assert.equal(
            INTEGRATION_REQUEST_TYPE,
            "INTEGRATED_AGRICULTURAL_INTELLIGENCE_REQUEST"
        );
    }
);

test(
    "required and optional fields are defined correctly",
    () => {
        assert.deepEqual(
            REQUIRED_FIELDS,
            [
                "contractVersion",
                "requestType",
                "requestedDomains"
            ]
        );

        assert.deepEqual(
            OPTIONAL_FIELDS,
            [
                "inputs",
                "context",
                "metadata"
            ]
        );
    }
);

test(
    "all eight authoritative integration domains are defined",
    () => {
        assert.deepEqual(
            INTEGRATION_DOMAINS,
            [
                "SOIL_INTELLIGENCE",
                "SPATIAL_INTELLIGENCE",
                "CROP_SUITABILITY",
                "FERTILITY_ZONING",
                "HISTORICAL_CONTEXT",
                "TEMPORAL_OBSERVATION",
                "TEMPORAL_COMPOSITION",
                "TEMPORAL_ANALYSIS"
            ]
        );
    }
);

test(
    "valid integration request is accepted",
    () => {
        const validation =
            validateIntegrationRequest(createValidRequest());

        assert.equal(validation.valid, true);
        assert.deepEqual(validation.errors, []);
    }
);

test(
    "null and non-object requests are rejected",
    () => {
        for (const value of [null, undefined, [], "invalid", 42]) {
            const validation =
                validateIntegrationRequest(value);

            assert.equal(validation.valid, false);
            assert.ok(validation.errors.length > 0);
        }
    }
);

test(
    "invalid contract version is rejected",
    () => {
        const validation =
            validateIntegrationRequest(
                createValidRequest({
                    contractVersion: "9.9"
                })
            );

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                error => error.includes("contractVersion")
            )
        );
    }
);

test(
    "invalid request type is rejected",
    () => {
        const validation =
            validateIntegrationRequest(
                createValidRequest({
                    requestType: "OTHER_REQUEST"
                })
            );

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                error => error.includes("requestType")
            )
        );
    }
);

test(
    "requested domains must be a non-empty array",
    () => {
        for (const requestedDomains of [undefined, null, [], "SOIL_INTELLIGENCE"]) {
            const validation =
                validateIntegrationRequest(
                    createValidRequest({ requestedDomains })
                );

            assert.equal(validation.valid, false);
            assert.ok(
                validation.errors.some(
                    error => error.includes("requestedDomains")
                )
            );
        }
    }
);

test(
    "duplicate requested domains are rejected",
    () => {
        const validation =
            validateIntegrationRequest(
                createValidRequest({
                    requestedDomains: [
                        "SOIL_INTELLIGENCE",
                        "SOIL_INTELLIGENCE"
                    ]
                })
            );

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                error => error.includes("duplicates")
            )
        );
    }
);

test(
    "unsupported integration domain is rejected",
    () => {
        const validation =
            validateIntegrationRequest(
                createValidRequest({
                    requestedDomains: [
                        "SOIL_INTELLIGENCE",
                        "UNSUPPORTED_DOMAIN"
                    ]
                })
            );

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                error => error.includes("requestedDomains[1]")
            )
        );
    }
);

test(
    "inputs must be a plain object when supplied",
    () => {
        const validation =
            validateIntegrationRequest(
                createValidRequest({
                    inputs: []
                })
            );

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.includes(
                "inputs must be a plain object when provided."
            )
        );
    }
);

test(
    "context must be a plain object when supplied",
    () => {
        const validation =
            validateIntegrationRequest(
                createValidRequest({
                    context: "invalid"
                })
            );

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.includes(
                "context must be a plain object when provided."
            )
        );
    }
);

test(
    "metadata is optional",
    () => {
        const request = createValidRequest();
        delete request.metadata;

        const validation =
            validateIntegrationRequest(request);

        assert.equal(validation.valid, true);
        assert.deepEqual(validation.errors, []);
    }
);

test(
    "metadata must be a plain object when supplied",
    () => {
        const validation =
            validateIntegrationRequest(
                createValidRequest({
                    metadata: "invalid"
                })
            );

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.includes(
                "metadata must be a plain object when provided."
            )
        );
    }
);

test(
    "factory creates a normalized integration request",
    () => {
        const request = createIntegrationRequest({
            requestedDomains: [
                "SOIL_INTELLIGENCE",
                "SPATIAL_INTELLIGENCE"
            ]
        });

        assert.equal(
            request.contractVersion,
            INTEGRATION_REQUEST_CONTRACT_VERSION
        );

        assert.equal(
            request.requestType,
            INTEGRATION_REQUEST_TYPE
        );

        assert.deepEqual(
            request.requestedDomains,
            [
                "SOIL_INTELLIGENCE",
                "SPATIAL_INTELLIGENCE"
            ]
        );
    }
);

test(
    "factory rejects invalid integration request with typed error",
    () => {
        assert.throws(
            () =>
                createIntegrationRequest({
                    requestedDomains: [
                        "INVALID_DOMAIN"
                    ]
                }),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_INTEGRATION_REQUEST"
                );

                assert.ok(
                    Array.isArray(error.validationErrors)
                );

                assert.ok(
                    error.validationErrors.length > 0
                );

                return true;
            }
        );
    }
);

test(
    "factory preserves supplied inputs context and metadata",
    () => {
        const inputs = {
            sampleId: "S-001"
        };

        const context = {
            studyArea: "test-area"
        };

        const metadata = {
            source: "phase-8.14.13-test"
        };

        const request = createIntegrationRequest({
            requestedDomains: [
                "SOIL_INTELLIGENCE"
            ],
            inputs,
            context,
            metadata
        });

        assert.deepEqual(request.inputs, inputs);
        assert.deepEqual(request.context, context);
        assert.deepEqual(request.metadata, metadata);
    }
);
