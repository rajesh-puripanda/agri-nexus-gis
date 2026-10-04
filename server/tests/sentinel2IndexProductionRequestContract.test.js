"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    SENTINEL2_INDEX_PRODUCTION_REQUEST_CONTRACT_VERSION,
    validateSentinel2IndexProductionRequest,
    createSentinel2IndexProductionRequestContract
} = require(
    "../scientific/remoteSensing/acquisition/" +
    "sentinel2IndexProductionRequestContract"
);

function createValidRequest(overrides = {}) {
    return {
        contractVersion:
            SENTINEL2_INDEX_PRODUCTION_REQUEST_CONTRACT_VERSION,

        sourceId:
            "sentinel2",

        temporalContext: {
            startDate:
                "2026-09-01",
            endDate:
                "2026-09-15"
        },

        spatialContext: {
            bbox: {
                west: 82.90,
                south: 17.60,
                east: 83.40,
                north: 17.90
            }
        },

        acquisitionParameters: {
            maxCloudCover: 20
        },

        outputDirectory:
            "./data/remote-sensing/acquisitions",

        indexCode:
            "BSI",

        targetResolution:
            10,

        outputNoData:
            -9999,

        parameters: {},

        ...overrides
    };
}

test(
    "valid Sentinel-2 BSI production request passes validation",
    () => {
        const request =
            createValidRequest();

        const result =
            validateSentinel2IndexProductionRequest(
                request
            );

        assert.equal(
            result.valid,
            true
        );

        assert.deepEqual(
            result.errors,
            []
        );
    }
);

test(
    "factory creates normalized Sentinel-2 index production contract",
    () => {
        const request =
            createValidRequest({
                indexCode: "bsi",
                targetResolution: 10.0
            });

        const contract =
            createSentinel2IndexProductionRequestContract(
                request
            );

        assert.equal(
            contract.contractVersion,
            "1.0"
        );

        assert.equal(
            contract.indexCode,
            "BSI"
        );

        assert.equal(
            contract.targetResolution,
            10
        );

        assert.equal(
            contract.outputNoData,
            -9999
        );

        assert.deepEqual(
            contract.parameters,
            {}
        );
    }
);

test(
    "unknown index code is rejected",
    () => {
        const request =
            createValidRequest({
                indexCode:
                    "UNKNOWN_INDEX"
            });

        const result =
            validateSentinel2IndexProductionRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(
                (error) =>
                    error.includes(
                        "Unknown remote sensing index"
                    )
            )
        );
    }
);

test(
    "missing target resolution is rejected",
    () => {
        const request =
            createValidRequest();

        delete request.targetResolution;

        const result =
            validateSentinel2IndexProductionRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(
                (error) =>
                    error.includes(
                        "targetResolution"
                    )
            )
        );
    }
);

test(
    "non-positive target resolution is rejected",
    () => {
        const request =
            createValidRequest({
                targetResolution: 0
            });

        const result =
            validateSentinel2IndexProductionRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(
                (error) =>
                    error.includes(
                        "positive finite number"
                    )
            )
        );
    }
);

test(
    "invalid outputNoData is rejected",
    () => {
        const request =
            createValidRequest({
                outputNoData:
                    "invalid"
            });

        const result =
            validateSentinel2IndexProductionRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(
                (error) =>
                    error.includes(
                        "outputNoData"
                    )
            )
        );
    }
);

test(
    "parameters must be a plain object",
    () => {
        const request =
            createValidRequest({
                parameters: []
            });

        const result =
            validateSentinel2IndexProductionRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(
                (error) =>
                    error.includes(
                        "parameters must be a plain object"
                    )
            )
        );
    }
);

test(
    "factory throws established validation error",
    () => {
        const request =
            createValidRequest({
                indexCode:
                    "UNKNOWN_INDEX"
            });

        assert.throws(
            () =>
                createSentinel2IndexProductionRequestContract(
                    request
                ),
            (error) => {
                assert.equal(
                    error.code,
                    "INVALID_SENTINEL2_INDEX_PRODUCTION_REQUEST"
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

test(
    "factory preserves satellite acquisition fields",
    () => {
        const request =
            createValidRequest();

        const contract =
            createSentinel2IndexProductionRequestContract(
                request
            );

        assert.equal(
            contract.sourceId,
            "sentinel2"
        );

        assert.deepEqual(
            contract.temporalContext,
            {
                startDate:
                    "2026-09-01",
                endDate:
                    "2026-09-15"
            }
        );

        assert.deepEqual(
            contract.spatialContext,
            {
                bbox: {
                    west: 82.90,
                    south: 17.60,
                    east: 83.40,
                    north: 17.90
                }
            }
        );

        assert.deepEqual(
            contract.acquisitionParameters,
            {
                maxCloudCover: 20
            }
        );

        assert.equal(
            contract.outputDirectory,
            "./data/remote-sensing/acquisitions"
        );
    }
);