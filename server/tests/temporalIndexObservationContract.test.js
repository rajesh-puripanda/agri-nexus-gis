"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    TEMPORAL_INDEX_OBSERVATION_CONTRACT_VERSION,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    validateTemporalIndexObservation,
    createTemporalIndexObservation
} = require("../scientific/remoteSensing/temporal/temporalIndexObservationContract");

function createValidObservation(
    overrides = {}
) {
    return {
        contractVersion:
            TEMPORAL_INDEX_OBSERVATION_CONTRACT_VERSION,

        observation: {
            observationDate:
                "2026-09-26",
            acquisitionDate:
                "2026-09-26T05:30:00Z",
            sensor:
                "Sentinel-2",
            sceneId:
                "S2A_20260926_001",
            indexCode:
                "NDVI"
        },

        raster: {
            rasterId:
                "NDVI_20260926",
            width: 100,
            height: 100,
            pixelCount: 10000,
            noData: -9999
        },

        index: {
            code:
                "NDVI",
            name:
                "Normalized Difference Vegetation Index",
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
            mean: 0.57
        },

        spatialContext: {
            crs: "EPSG:4326"
        },

        processingContext: {
            processingVersion: "1.0"
        },

        ...overrides
    };
}

test(
    "contract exposes version 1.0",
    () => {
        assert.equal(
            TEMPORAL_INDEX_OBSERVATION_CONTRACT_VERSION,
            "1.0"
        );
    }
);

test(
    "contract declares required and optional fields",
    () => {
        assert.deepEqual(
            REQUIRED_FIELDS,
            [
                "contractVersion",
                "observation",
                "raster",
                "index",
                "statistics",
                "spatialContext",
                "processingContext"
            ]
        );

        assert.deepEqual(
            OPTIONAL_FIELDS,
            ["metadata"]
        );
    }
);

test(
    "valid temporal index observation passes validation",
    () => {
        const errors =
            validateTemporalIndexObservation(
                createValidObservation()
            );

        assert.deepEqual(errors, []);
    }
);

test(
    "unknown index code is rejected",
    () => {
        const errors =
            validateTemporalIndexObservation(
                createValidObservation({
                    observation: {
                        ...createValidObservation()
                            .observation,
                        indexCode:
                            "UNKNOWN"
                    }
                })
            );

        assert.ok(
            errors.some(error =>
                error.includes(
                    "not registered"
                )
            )
        );
    }
);

test(
    "invalid raster dimensions are rejected",
    () => {
        const errors =
            validateTemporalIndexObservation(
                createValidObservation({
                    raster: {
                        ...createValidObservation()
                            .raster,
                        width: 0
                    }
                })
            );

        assert.ok(
            errors.some(error =>
                error.includes(
                    "raster.width"
                )
            )
        );
    }
);

test(
    "pixel count mismatch is rejected",
    () => {
        const errors =
            validateTemporalIndexObservation(
                createValidObservation({
                    raster: {
                        ...createValidObservation()
                            .raster,
                        pixelCount: 9999
                    }
                })
            );

        assert.ok(
            errors.some(error =>
                error.includes(
                    "pixelCount"
                )
            )
        );
    }
);

test(
    "invalid index range is rejected",
    () => {
        const errors =
            validateTemporalIndexObservation(
                createValidObservation({
                    index: {
                        ...createValidObservation()
                            .index,
                        validRange: {
                            min: 1,
                            max: 1
                        }
                    }
                })
            );

        assert.ok(
            errors.some(error =>
                error.includes(
                    "validRange.min"
                )
            )
        );
    }
);

test(
    "invalid statistics are rejected",
    () => {
        const errors =
            validateTemporalIndexObservation(
                createValidObservation({
                    statistics: {
                        ...createValidObservation()
                            .statistics,
                        minimum: 0.8,
                        maximum: 0.4
                    }
                })
            );

        assert.ok(
            errors.some(error =>
                error.includes(
                    "minimum"
                )
            )
        );
    }
);

test(
    "statistics pixel counts must reconcile with raster",
    () => {
        const errors =
            validateTemporalIndexObservation(
                createValidObservation({
                    statistics: {
                        ...createValidObservation()
                            .statistics,
                        validPixelCount: 9000
                    }
                })
            );

        assert.ok(
            errors.some(error =>
                error.includes(
                    "validPixelCount + noDataPixelCount"
                )
            )
        );
    }
);

test(
    "mean must fall within minimum and maximum",
    () => {
        const errors =
            validateTemporalIndexObservation(
                createValidObservation({
                    statistics: {
                        ...createValidObservation()
                            .statistics,
                        mean: 1.5
                    }
                })
            );

        assert.ok(
            errors.some(error =>
                error.includes(
                    "mean"
                )
            )
        );
    }
);

test(
    "missing spatial context is rejected",
    () => {
        const value =
            createValidObservation();

        delete value.spatialContext;

        const errors =
            validateTemporalIndexObservation(
                value
            );

        assert.ok(
            errors.some(error =>
                error.includes(
                    "spatialContext"
                )
            )
        );
    }
);

test(
    "missing processing context is rejected",
    () => {
        const value =
            createValidObservation();

        delete value.processingContext;

        const errors =
            validateTemporalIndexObservation(
                value
            );

        assert.ok(
            errors.some(error =>
                error.includes(
                    "processingContext"
                )
            )
        );
    }
);

test(
    "optional metadata is accepted",
    () => {
        const errors =
            validateTemporalIndexObservation(
                createValidObservation({
                    metadata: {
                        source: "Sentinel-2"
                    }
                })
            );

        assert.deepEqual(errors, []);
    }
);

test(
    "factory returns a validated observation",
    () => {
        const result =
            createTemporalIndexObservation(
                createValidObservation()
            );

        assert.equal(
            result.contractVersion,
            "1.0"
        );

        assert.equal(
            result.observation.indexCode,
            "NDVI"
        );

        assert.equal(
            result.index.code,
            "NDVI"
        );
    }
);

test(
    "factory normalizes lowercase index codes",
    () => {
        const value =
            createValidObservation();

        value.observation.indexCode =
            "ndvi";

        const result =
            createTemporalIndexObservation(
                value
            );

        assert.equal(
            result.observation.indexCode,
            "NDVI"
        );
    }
);

test(
    "mismatched index code is rejected",
    () => {
        const value =
            createValidObservation();

        value.index.code = "EVI";

        const errors =
            validateTemporalIndexObservation(
                value
            );

        assert.ok(
            errors.some(error =>
                error.includes(
                    "index.code must correspond to observation.indexCode"
                )
            )
        );
    }
);
test(
    "factory rejects invalid observations",
    () => {
        assert.throws(
            () =>
                createTemporalIndexObservation(
                    createValidObservation({
                        observation: {
                            ...createValidObservation()
                                .observation,
                            indexCode:
                                "UNKNOWN"
                        }
                    })
                ),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_TEMPORAL_INDEX_OBSERVATION"
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
