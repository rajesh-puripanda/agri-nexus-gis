"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    TEMPORAL_COMPOSITION_CONTRACT_VERSION,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    validateTemporalComposition,
    createTemporalComposition
} = require("../scientific/remoteSensing/temporal/temporalCompositionContract");

function createObservation(
    date,
    suffix
) {
    return {
        contractVersion: "1.0",

        observation: {
            observationDate: date,
            acquisitionDate:
                `${date}T05:30:00Z`,
            sensor: "Sentinel-2",
            sceneId:
                `S2A_${suffix}`,
            indexCode: "NDVI"
        },

        raster: {
            rasterId:
                `NDVI_${suffix}`,
            width: 100,
            height: 100,
            pixelCount: 10000,
            noData: -9999
        },

        index: {
            code: "NDVI",
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
        }
    };
}

function createValidComposition(
    overrides = {}
) {
    const observations = [
        createObservation(
            "2026-06-01",
            "20260601_001"
        ),
        createObservation(
            "2026-06-15",
            "20260615_001"
        ),
        createObservation(
            "2026-07-01",
            "20260701_001"
        )
    ];

    return {
        contractVersion:
            TEMPORAL_COMPOSITION_CONTRACT_VERSION,

        compositionId:
            "NDVI-SERIES-001",

        indexCode:
            "NDVI",

        observations,

        temporalContext: {
            startDate:
                "2026-06-01",
            endDate:
                "2026-07-01",
            observationCount:
                3
        },

        spatialContext: {
            crs:
                "EPSG:4326"
        },

        processingContext: {
            processingVersion:
                "1.0"
        },

        ...overrides
    };
}

test(
    "contract exposes version 1.0",
    () => {
        assert.equal(
            TEMPORAL_COMPOSITION_CONTRACT_VERSION,
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
                "compositionId",
                "indexCode",
                "observations",
                "temporalContext",
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
    "valid temporal composition passes validation",
    () => {
        const result =
            validateTemporalComposition(
                createValidComposition()
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

test(
    "empty observations are rejected",
    () => {
        const result =
            validateTemporalComposition(
                createValidComposition({
                    observations: []
                })
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(error =>
                error.includes(
                    "at least one temporal index observation"
                )
            )
        );
    }
);

test(
    "invalid observation is rejected through authoritative observation contract",
    () => {
        const observations =
            createValidComposition()
                .observations;

        observations[1] = {
            ...observations[1],
            raster: {
                ...observations[1].raster,
                pixelCount: 9999
            }
        };

        const result =
            validateTemporalComposition(
                createValidComposition({
                    observations
                })
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(error =>
                error.includes(
                    "observations[1]"
                ) &&
                error.includes(
                    "pixelCount"
                )
            )
        );
    }
);

test(
    "mixed index codes are rejected",
    () => {
        const observations =
            createValidComposition()
                .observations;

        observations[1] = {
            ...observations[1],
            observation: {
                ...observations[1].observation,
                indexCode: "EVI"
            },
            index: {
                ...observations[1].index,
                code: "EVI",
                name:
                    "Enhanced Vegetation Index"
            }
        };

        const result =
            validateTemporalComposition(
                createValidComposition({
                    observations
                })
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(error =>
                error.includes(
                    "must match composition.indexCode"
                )
            )
        );
    }
);

test(
    "duplicate observation dates are rejected",
    () => {
        const observations =
            createValidComposition()
                .observations;

        observations[1] = {
            ...observations[1],
            observation: {
                ...observations[1].observation,
                observationDate:
                    "2026-06-01",
                acquisitionDate:
                    "2026-06-01T06:00:00Z"
            }
        };

        const result =
            validateTemporalComposition(
                createValidComposition({
                    observations,
                    temporalContext: {
                        startDate:
                            "2026-06-01",
                        endDate:
                            "2026-07-01",
                        observationCount:
                            3
                    }
                })
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(error =>
                error.includes(
                    "duplicates observation date"
                )
            )
        );
    }
);

test(
    "out-of-order observations are rejected",
    () => {
        const observations =
            createValidComposition()
                .observations;

        const result =
            validateTemporalComposition({
                ...createValidComposition(),
                observations: [
                    observations[1],
                    observations[0],
                    observations[2]
                ]
            });

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(error =>
                error.includes(
                    "chronologically after"
                )
            )
        );
    }
);

test(
    "temporal context must match observation boundaries",
    () => {
        const result =
            validateTemporalComposition(
                createValidComposition({
                    temporalContext: {
                        startDate:
                            "2026-06-05",
                        endDate:
                            "2026-07-01",
                        observationCount:
                            3
                    }
                })
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(error =>
                error.includes(
                    "startDate must match"
                )
            )
        );
    }
);

test(
    "observation count must match observations length",
    () => {
        const result =
            validateTemporalComposition(
                createValidComposition({
                    temporalContext: {
                        startDate:
                            "2026-06-01",
                        endDate:
                            "2026-07-01",
                        observationCount:
                            2
                    }
                })
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(error =>
                error.includes(
                    "observationCount must equal"
                )
            )
        );
    }
);

test(
    "unknown composition index code is rejected",
    () => {
        const result =
            validateTemporalComposition(
                createValidComposition({
                    indexCode:
                        "UNKNOWN"
                })
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(error =>
                error.includes(
                    "is not registered"
                )
            )
        );
    }
);

test(
    "createTemporalComposition returns normalized valid composition",
    () => {
        const result =
            createTemporalComposition(
                createValidComposition()
            );

        assert.equal(
            result.contractVersion,
            "1.0"
        );

        assert.equal(
            result.indexCode,
            "NDVI"
        );

        assert.equal(
            result.observations.length,
            3
        );
    }
);

test(
    "createTemporalComposition throws structured validation error",
    () => {
        assert.throws(
            () =>
                createTemporalComposition({
                    ...createValidComposition(),
                    temporalContext: {
                        startDate:
                            "2026-07-01",
                        endDate:
                            "2026-06-01",
                        observationCount:
                            3
                    }
                }),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_TEMPORAL_COMPOSITION"
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
