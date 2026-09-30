"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    ACQUISITION_REQUEST_CONTRACT_VERSION,
    validateSatelliteAcquisitionRequest,
    createSatelliteAcquisitionRequestContract
} = require(
    "../scientific/remoteSensing/acquisition/satelliteAcquisitionRequestContract"
);

function createValidRequest() {
    return {
        contractVersion:
            ACQUISITION_REQUEST_CONTRACT_VERSION,

        sourceId: "sentinel2",

        temporalContext: {
            startDate: "2026-09-01",
            endDate: "2026-09-15"
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
            maxCloudCover: 20,
            bands: [
                "B04",
                "B08"
            ]
        },

        outputDirectory:
            "./data/remote-sensing/acquisitions"
    };
}

test(
    "valid satellite acquisition request passes validation",
    () => {
        const result =
            validateSatelliteAcquisitionRequest(
                createValidRequest()
            );

        assert.deepEqual(result, {
            valid: true,
            errors: []
        });
    }
);

test(
    "factory creates a valid satellite acquisition request",
    () => {
        const result =
            createSatelliteAcquisitionRequestContract(
                createValidRequest()
            );

        assert.equal(
            result.contractVersion,
            "1.0"
        );

        assert.equal(
            result.sourceId,
            "sentinel2"
        );

        assert.equal(
            result.temporalContext.startDate,
            "2026-09-01"
        );

        assert.equal(
            result.temporalContext.endDate,
            "2026-09-15"
        );

        assert.deepEqual(
            result.spatialContext.bbox,
            {
                west: 82.90,
                south: 17.60,
                east: 83.40,
                north: 17.90
            }
        );
    }
);

test(
    "invalid bounding box is rejected",
    () => {
        const request =
            createValidRequest();

        request.spatialContext.bbox = {
            west: 83,
            south: 18,
            east: 82,
            north: 17
        };

        const result =
            validateSatelliteAcquisitionRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.includes(
                "spatialContext.bbox.west must be less than east."
            )
        );

        assert.ok(
            result.errors.includes(
                "spatialContext.bbox.south must be less than north."
            )
        );
    }
);

test(
    "invalid date range is rejected",
    () => {
        const request =
            createValidRequest();

        request.temporalContext = {
            startDate: "2026-09-20",
            endDate: "2026-09-10"
        };

        const result =
            validateSatelliteAcquisitionRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.includes(
                "temporalContext.startDate must not be later than endDate."
            )
        );
    }
);

test(
    "cloud cover outside 0 to 100 is rejected",
    () => {
        const request =
            createValidRequest();

        request.acquisitionParameters.maxCloudCover =
            101;

        const result =
            validateSatelliteAcquisitionRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.includes(
                "acquisitionParameters.maxCloudCover must be a number between 0 and 100."
            )
        );
    }
);

test(
    "factory throws the established validation error",
    () => {
        const request =
            createValidRequest();

        request.spatialContext.bbox = {
            west: 83,
            south: 18,
            east: 82,
            north: 17
        };

        assert.throws(
            () =>
                createSatelliteAcquisitionRequestContract(
                    request
                ),
            (error) => {
                assert.equal(
                    error.code,
                    "INVALID_SATELLITE_ACQUISITION_REQUEST"
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
