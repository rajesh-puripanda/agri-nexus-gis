
"use strict";

const { test, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const dependencyPaths = [
    "../services/remoteSensing/catalog/sentinel2IndexAvailabilityService",
    "../services/remoteSensing/temporal/publishedIndexObservationAdapterService",
    "../scientific/remoteSensing/temporal/temporalCompositionWorkflowRequestContract",
    "../services/remoteSensing/temporal/temporalCompositionWorkflowService",
    "../scientific/remoteSensing/temporal/temporalAnalysisWorkflowRequestContract",
    "../services/remoteSensing/temporal/temporalAnalysisWorkflowService",
    "../scientific/cropIntelligence/cropConditionEvidenceContract",
    "../services/cropIntelligence/cropConditionInterpretationService",
    "../services/cropIntelligence/cropConditionTemporalChangeStreamingWorkflowService",
    "../services/cropIntelligence/cropConditionEvidencePersistenceService"
];

const controllerPath = require.resolve(
    "../controllers/cropConditionTemporalInterpretationController"
);

const originalModules = new Map(
    [...dependencyPaths, "../controllers/cropConditionTemporalInterpretationController"]
        .map(path => {
            const resolved = require.resolve(path);
            return [resolved, require.cache[resolved]];
        })
);

const calls = {};
const state = {};

function makeObservation(date, sceneId, overrides = {}) {
    return {
        contractVersion: "1.0",
        observation: {
            observationDate: date,
            acquisitionDate: date,
            sensor: "Sentinel-2",
            sceneId,
            indexCode: "NDVI"
        },
        raster: {
            rasterId: `${sceneId}-NDVI`,
            width: 100,
            height: 100,
            pixelCount: 10000,
            noData: -9999
        },
        index: {
            code: "NDVI",
            name: "Normalized Difference Vegetation Index",
            validRange: [-1, 1]
        },
        statistics: {
            validPixelCount: 9500,
            noDataPixelCount: 500,
            minimum: -0.2,
            maximum: 0.8,
            mean: date === "2026-09-08" ? 0.25 : 0.45
        },
        spatialContext: {
            origin: [699960, 2000040, 0],
            resolution: [10, -10, 0],
            boundingBox: [699960, 1999040, 700960, 2000040],
            projectedCrsCode: 32644,
            rasterType: 1,
            ...overrides.spatialContext
        },
        processingContext: {
            source: "published_index_observation_adapter"
        }
    };
}

function makeRasterMetadata(date, sceneId, overrides = {}) {
    return {
        observation: {
            acquisitionDate: date,
            sceneId,
            indexCode: "NDVI"
        },
        raster: {
            fileName: "NDVI_index.tif",
            width: 100,
            height: 100,
            pixelCount: 10000,
            noData: -9999,
            ...overrides.raster
        },
        spatialContext: {
            origin: [699960, 2000040, 0],
            resolution: [10, -10, 0],
            boundingBox: [699960, 1999040, 700960, 2000040],
            projectedCrsCode: 32644,
            rasterType: 1,
            ...overrides.spatialContext
        }
    };
}

function resetState() {
    calls.findAvailableProduct = [];
    calls.inspectPublishedIndexRaster = [];
    calls.createPublishedIndexObservation = [];
    calls.createTemporalCompositionWorkflowRequest = [];
    calls.processTemporalCompositionWorkflow = [];
    calls.createTemporalAnalysisWorkflowRequest = [];
    calls.processTemporalAnalysisWorkflow = [];
    calls.createCropConditionEvidence = [];
    calls.processCropConditionInterpretation = [];
    calls.calculateCropConditionTemporalChangeStreaming = [];
    calls.buildCropConditionEvidenceIdentity = [];
    calls.checkReusableCropConditionEvidence = [];
    calls.saveCropConditionEvidence = [];

    state.reusable = false;
    state.products = [
        {
            indexCode: "NDVI",
            sceneId: "S2_TEST_001",
            acquisitionDate: "2026-09-08",
            productionDirectory: "test/scene-1",
            targetResolution: 10,
            outputs: {
                continuous: "NDVI_index.tif",
                classification: "NDVI_classification.tif"
            },
            availability: { continuous: true, classification: true }
        },
        {
            indexCode: "NDVI",
            sceneId: "S2_TEST_002",
            acquisitionDate: "2026-09-28",
            productionDirectory: "test/scene-2",
            targetResolution: 10,
            outputs: {
                continuous: "NDVI_index.tif",
                classification: "NDVI_classification.tif"
            },
            availability: { continuous: true, classification: true }
        }
    ];

    state.observations = [
        makeObservation("2026-09-08", "S2_TEST_001"),
        makeObservation("2026-09-28", "S2_TEST_002")
    ];

    state.rasterMetadata = [
        makeRasterMetadata("2026-09-08", "S2_TEST_001"),
        makeRasterMetadata("2026-09-28", "S2_TEST_002", {
            raster: {
                height: 62,
                pixelCount: 6200
            },
            spatialContext: {
                origin: [699960, 1999660, 0],
                boundingBox: [699960, 1999040, 700960, 1999660]
            }
        })
    ];

    state.temporalChange = {
        contractVersion: "1.0",
        analysisType: "CHANGE",
        compositionId: "test-composition",
        indexCode: "NDVI",
        comparison: {
            startDate: "2026-09-08",
            endDate: "2026-09-28",
            startMean: 0.25,
            endMean: 0.45
        },
        absoluteChange: 0.20,
        percentageChange: 80,
        percentageChangeStatus: "calculated",
        direction: "increase"
    };

    state.interpretation = {
        status: "calibration_required",
        temporalInterpretations: []
    };

    state.error = null;
}

const stubs = [
    {
        findAvailableProduct: async request => {
            calls.findAvailableProduct.push(request);
            if (state.error) throw state.error;

            return state.products[
                calls.findAvailableProduct.length - 1
            ];
        }
    },
    {
        inspectPublishedIndexRaster: async request => {
            calls.inspectPublishedIndexRaster.push(request);

            return state.rasterMetadata[
                calls.inspectPublishedIndexRaster.length - 1
            ];
        },

        createPublishedIndexObservation: async request => {
            calls.createPublishedIndexObservation.push(request);

            const index =
                calls.createPublishedIndexObservation.length - 1;

            const observation = structuredClone(
                state.observations[index]
            );

            // Start with the actual spatial context of this scene.
            observation.spatialContext = structuredClone(
                state.rasterMetadata[index].spatialContext
            );

            const [left, top, right, bottom] = request.window;

            const width = right - left;
            const height = bottom - top;

            const [originX, originY, originZ] =
                observation.spatialContext.origin;

            const [resolutionX, resolutionY, resolutionZ] =
                observation.spatialContext.resolution;

            const croppedOriginX = originX + left * resolutionX;
            const croppedOriginY = originY + top * resolutionY;

            const oppositeX = croppedOriginX + width * resolutionX;
            const oppositeY = croppedOriginY + height * resolutionY;

            observation.raster.width = width;
            observation.raster.height = height;
            observation.raster.pixelCount = width * height;

            observation.statistics.validPixelCount = width * height;
            observation.statistics.noDataPixelCount = 0;

            observation.spatialContext.origin = [
                croppedOriginX,
                croppedOriginY,
                originZ
            ];

            observation.spatialContext.boundingBox = [
                Math.min(croppedOriginX, oppositeX),
                Math.min(croppedOriginY, oppositeY),
                Math.max(croppedOriginX, oppositeX),
                Math.max(croppedOriginY, oppositeY)
            ];

            observation.spatialContext.resolution = [
                resolutionX,
                resolutionY,
                resolutionZ
            ];

            return observation;
        }
    },
    {
        createTemporalCompositionWorkflowRequest: request => {
            calls.createTemporalCompositionWorkflowRequest.push(request);
            return request;
        }
    },
    {
        processTemporalCompositionWorkflow: async request => {
            calls.processTemporalCompositionWorkflow.push(request);
            return { composition: request };
        }
    },
    {
        createTemporalAnalysisWorkflowRequest: request => {
            calls.createTemporalAnalysisWorkflowRequest.push(request);
            return request;
        }
    },
    {
        processTemporalAnalysisWorkflow: async request => {
            calls.processTemporalAnalysisWorkflow.push(request);
            if (state.error) throw state.error;
            return { result: state.temporalChange };
        }
    },
    {
        createCropConditionEvidence: evidence => {
            calls.createCropConditionEvidence.push(evidence);
            return evidence;
        }
    },
    {
        processCropConditionInterpretation: evidence => {
            calls.processCropConditionInterpretation.push(evidence);
            return state.interpretation;
        }
    },
    {
        calculateCropConditionTemporalChangeStreaming: async request => {
            calls.calculateCropConditionTemporalChangeStreaming.push(request);

            return {
                outputPath: request.outputPath,
                productCode: "NDVI_TEMPORAL_CHANGE",
                format: "GeoTIFF",
                dataType: "Float32",
                noData: -9999,
                width: request.commonFootprint.width,
                height: request.commonFootprint.height,
                pixelCount:
                    request.commonFootprint.width *
                    request.commonFootprint.height,
                byteLength: 1000,
                statistics: {
                    totalPixelCount:
                        request.commonFootprint.width *
                        request.commonFootprint.height,
                    validPixelCount:
                        request.commonFootprint.width *
                        request.commonFootprint.height,
                    noDataPixelCount: 0,
                    validCoveragePercent: 100,
                    noDataCoveragePercent: 0,
                    min: -0.2,
                    max: 0.3,
                    mean: 0.1
                },
                baseline: request.baseline,
                comparison: request.comparison,
                method: "comparison_minus_baseline",
                calibrationStatus: "not_calibrated"
            };
        }
    },
    {
        PROCESSING_VERSION: "1.0.0",

        buildCropConditionComparisonId: () =>
            "CROP-CONDITION-NDVI-TEST",

        buildCropConditionEvidenceIdentity: request => {
            calls.buildCropConditionEvidenceIdentity.push(request);
            return { testIdentity: true };
        },

        buildCropConditionEvidencePaths: () => ({
            outputDirectory: "test/crop-condition",
            rasterPath: "test/crop-condition/NDVI_CHANGE.tif",
            manifestPath:
                "test/crop-condition/crop-condition-evidence.json"
        }),

        checkReusableCropConditionEvidence: async request => {
            calls.checkReusableCropConditionEvidence.push(request);

            if (!state.reusable) {
                return { reusable: false };
            }

            return {
                reusable: true,
                rasterMetadata: {
                    format: "GeoTIFF",
                    dataType: "Float32",
                    noData: -9999,
                    width: 100,
                    height: 62,
                    pixelCount: 6200,
                    byteLength: 1000
                },
                evidence: {
                    statistics: {
                        totalPixelCount: 6200,
                        validPixelCount: 6200,
                        noDataPixelCount: 0,
                        validCoveragePercent: 100,
                        noDataCoveragePercent: 0,
                        min: -0.2,
                        max: 0.3,
                        mean: 0.1
                    }
                }
            };
        },

        saveCropConditionEvidence: async request => {
            calls.saveCropConditionEvidence.push(request);
            return { saved: true };
        }
    }
];

dependencyPaths.forEach((path, index) => {
    const resolved = require.resolve(path);

    require.cache[resolved] = {
        id: resolved,
        filename: resolved,
        loaded: true,
        exports: stubs[index]
    };
});

const {
    postCropConditionTemporalInterpretation
} = require("../controllers/cropConditionTemporalInterpretationController");

beforeEach(resetState);

after(() => {
    for (const [path, originalModule] of originalModules) {
        if (originalModule) {
            require.cache[path] = originalModule;
        } else {
            delete require.cache[path];
        }
    }
});

function createRequest(body = {}) {
    return { body };
}

function createResponse() {
    return {
        statusCode: null,
        body: null,

        status(code) {
            this.statusCode = code;
            return this;
        },

        json(body) {
            this.body = body;
            return this;
        }
    };
}

const validRequest = {
    indexCode: "ndvi",
    observations: [
        {
            observationDate: "2026-09-08",
            sceneId: "S2_TEST_001"
        },
        {
            observationDate: "2026-09-28",
            sceneId: "S2_TEST_002"
        }
    ]
};

test("rejects a temporal request with fewer than two observations", async () => {
    const res = createResponse();

    await postCropConditionTemporalInterpretation(
        createRequest({
            indexCode: "NDVI",
            observations: [validRequest.observations[0]]
        }),
        res
    );

    assert.equal(res.statusCode, 400);
    assert.equal(
        res.body.code,
        "INVALID_CROP_TEMPORAL_INTERPRETATION_REQUEST"
    );
    assert.equal(calls.findAvailableProduct.length, 0);
});

test("rejects invalid calendar dates", async () => {
    const res = createResponse();

    await postCropConditionTemporalInterpretation(
        createRequest({
            indexCode: "NDVI",
            observations: [
                { observationDate: "2026-02-30", sceneId: "S2_TEST_001" },
                { observationDate: "2026-09-28", sceneId: "S2_TEST_002" }
            ]
        }),
        res
    );

    assert.equal(res.statusCode, 400);
    assert.equal(calls.findAvailableProduct.length, 0);
});

test("rejects duplicate or out-of-order observation dates", async () => {
    const res = createResponse();

    await postCropConditionTemporalInterpretation(
        createRequest({
            indexCode: "NDVI",
            observations: [
                validRequest.observations[1],
                validRequest.observations[0]
            ]
        }),
        res
    );

    assert.equal(res.statusCode, 400);
    assert.equal(
        res.body.code,
        "INVALID_TEMPORAL_OBSERVATION_ORDER"
    );
    assert.equal(calls.findAvailableProduct.length, 0);
});

test("returns HTTP 404 when a published continuous raster is unavailable", async () => {
    state.products[1].availability.continuous = false;

    const res = createResponse();

    await postCropConditionTemporalInterpretation(
        createRequest(validRequest),
        res
    );

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.code, "PUBLISHED_INDEX_UNAVAILABLE");
    assert.equal(calls.createPublishedIndexObservation.length, 0);
    assert.equal(calls.inspectPublishedIndexRaster.length, 1);
});

test("returns HTTP 409 when inspected raster identity does not match", async () => {
    state.rasterMetadata[1].observation.sceneId = "OTHER_SCENE";

    const res = createResponse();

    await postCropConditionTemporalInterpretation(
        createRequest(validRequest),
        res
    );

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, "OBSERVATION_IDENTITY_MISMATCH");
    assert.equal(calls.createPublishedIndexObservation.length, 0);
    assert.equal(calls.createTemporalCompositionWorkflowRequest.length, 0);
});

test("returns HTTP 409 when an adapted observation identity does not match", async () => {
    state.observations[1].observation.sceneId = "OTHER_SCENE";

    const res = createResponse();

    await postCropConditionTemporalInterpretation(
        createRequest(validRequest),
        res
    );

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, "OBSERVATION_IDENTITY_MISMATCH");
    assert.equal(calls.createTemporalCompositionWorkflowRequest.length, 0);
});

test("rejects observations with incompatible CRS", async () => {
    state.rasterMetadata[1].spatialContext.projectedCrsCode = 32643;

    const res = createResponse();

    await postCropConditionTemporalInterpretation(
        createRequest(validRequest),
        res
    );

    assert.equal(res.statusCode, 409);
    assert.equal(
        res.body.code,
        "INCOMPATIBLE_OBSERVATION_SPATIAL_CONTEXT"
    );
    assert.equal(calls.createPublishedIndexObservation.length, 0);
    assert.equal(calls.createTemporalCompositionWorkflowRequest.length, 0);
});

test("rejects rasters with different pixel resolutions", async () => {
    state.rasterMetadata[1].spatialContext.resolution = [20, -20, 0];

    const res = createResponse();

    await postCropConditionTemporalInterpretation(
        createRequest(validRequest),
        res
    );

    assert.equal(res.statusCode, 409);
    assert.equal(
        res.body.code,
        "INCOMPATIBLE_OBSERVATION_SPATIAL_CONTEXT"
    );
    assert.equal(calls.createPublishedIndexObservation.length, 0);
});

test("rejects rasters that are not aligned to the same pixel grid", async () => {
    state.rasterMetadata[1].spatialContext.origin[0] += 5;

    const res = createResponse();

    await postCropConditionTemporalInterpretation(
        createRequest(validRequest),
        res
    );

    assert.equal(res.statusCode, 409);
    assert.equal(
        res.body.code,
        "INCOMPATIBLE_OBSERVATION_SPATIAL_CONTEXT"
    );
    assert.equal(calls.createPublishedIndexObservation.length, 0);
});

test("rejects rasters with no common spatial footprint", async () => {
    state.rasterMetadata[1].spatialContext.origin[0] = 800000;
    state.rasterMetadata[1].spatialContext.boundingBox = [
        800000,
        1999040,
        801000,
        1999660
    ];

    const res = createResponse();

    await postCropConditionTemporalInterpretation(
        createRequest(validRequest),
        res
    );

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, "NO_COMMON_TEMPORAL_FOOTPRINT");
    assert.equal(calls.createPublishedIndexObservation.length, 0);
});

test("builds temporal crop-condition evidence over the common footprint", async () => {
    const res = createResponse();

    await postCropConditionTemporalInterpretation(
        createRequest(validRequest),
        res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.interpretation, state.interpretation);

    assert.equal(calls.findAvailableProduct.length, 2);
    assert.equal(calls.inspectPublishedIndexRaster.length, 2);
    assert.equal(calls.createPublishedIndexObservation.length, 2);
    assert.equal(calls.processTemporalCompositionWorkflow.length, 1);
    assert.equal(calls.processTemporalAnalysisWorkflow.length, 1);

    assert.deepEqual(
        calls.createPublishedIndexObservation.map(call => call.window),
        [
            [0, 38, 100, 100],
            [0, 0, 100, 62]
        ]
    );

    const composition =
        calls.createTemporalCompositionWorkflowRequest[0];

    assert.equal(composition.indexCode, "NDVI");
    assert.equal(composition.temporalContext.observationCount, 2);
    assert.equal(composition.temporalContext.startDate, "2026-09-08");
    assert.equal(composition.temporalContext.endDate, "2026-09-28");

    assert.deepEqual(
        composition.spatialContext.boundingBox,
        [699960, 1999040, 700960, 1999660]
    );

    const analysis =
        calls.createTemporalAnalysisWorkflowRequest[0];

    assert.equal(analysis.analysisType, "CHANGE");
    assert.equal(
        analysis.parameters.statistic,
        "common_footprint_scene_wide_mean"
    );

    const evidence = calls.createCropConditionEvidence[0];

    assert.equal(evidence.indexObservations.length, 2);
    assert.deepEqual(evidence.classifications, []);
    assert.equal(evidence.rasterReferences.length, 2);
    assert.equal(evidence.temporalChanges.length, 1);
    assert.equal(evidence.temporalChanges[0], state.temporalChange);

    assert.equal(
        evidence.processingContext.comparisonMethod,
        "first_to_last_common_footprint_scene_mean"
    );

    assert.equal(
        evidence.processingContext.comparisonScope,
        "common_footprint_scene_wide_mean"
    );

    assert.equal(
        evidence.processingContext.spatialChangeDetected,
        false
    );

    assert.equal(
        evidence.processingContext.commonFootprint.width,
        100
    );

    assert.equal(
        evidence.processingContext.commonFootprint.height,
        62
    );

    assert.equal(
        evidence.processingContext.commonFootprint.pixelCount,
        6200
    );

    assert.equal(evidence.indexObservations[0].raster.width, 100);
    assert.equal(evidence.indexObservations[0].raster.height, 62);
    assert.equal(evidence.indexObservations[1].raster.width, 100);
    assert.equal(evidence.indexObservations[1].raster.height, 62);

    assert.deepEqual(
        evidence.indexObservations[0].spatialContext.boundingBox,
        evidence.indexObservations[1].spatialContext.boundingBox
    );

    assert.deepEqual(
        evidence.indexObservations[0].spatialContext.origin,
        evidence.indexObservations[1].spatialContext.origin
    );

    assert.deepEqual(
        evidence.processingContext.observations.map(
            item => item.pixelWindow
        ),
        [
            [0, 38, 100, 100],
            [0, 0, 100, 62]
        ]
    );

    assert.equal(
        evidence.metadata.temporalComparisonScope,
        "common_footprint_scene_wide_mean"
    );

    assert.equal(
        evidence.metadata.pixelWiseChangeCalculated,
        true
    );

    assert.equal(
        res.body.cropConditionProducts.temporalChange.productCode,
        "NDVI_TEMPORAL_CHANGE"
    );

    assert.equal(
        res.body.cropConditionProducts.temporalChange.cacheStatus,
        "generated"
    );

    assert.equal(
        calls.calculateCropConditionTemporalChangeStreaming.length,
        1
    );

    assert.equal(
        calls.saveCropConditionEvidence.length,
        1
    );

    assert.equal(
        evidence.metadata.calibrationStatus,
        "not_calibrated"
    );

    assert.equal(calls.processCropConditionInterpretation.length, 1);
});
test("reuses cached crop-condition evidence without regenerating the raster", async () => {
    state.reusable = true;

    const res = createResponse();

    await postCropConditionTemporalInterpretation(
        createRequest(validRequest),
        res
    );

    assert.equal(res.statusCode, 200);

    assert.equal(
        res.body.cropConditionProducts.temporalChange.cacheStatus,
        "reused"
    );

    assert.equal(
        calls.checkReusableCropConditionEvidence.length,
        1
    );

    assert.equal(
        calls.calculateCropConditionTemporalChangeStreaming.length,
        0
    );

    assert.equal(
        calls.saveCropConditionEvidence.length,
        0
    );
});
test("does not generate NDVI pixel-wise change for BSI", async () => {
    state.products.forEach(product => {
        product.indexCode = "BSI";
        product.outputs.continuous = "BSI_index.tif";
        product.outputs.classification = "BSI_classification.tif";
    });

    state.observations.forEach(observation => {
        observation.observation.indexCode = "BSI";
        observation.index.code = "BSI";
    });

    state.rasterMetadata.forEach(metadata => {
        metadata.observation.indexCode = "BSI";
        metadata.raster.fileName = "BSI_index.tif";
    });

    const request = {
        ...validRequest,
        indexCode: "BSI"
    };

    const res = createResponse();

    await postCropConditionTemporalInterpretation(
        createRequest(request),
        res
    );

    assert.equal(res.statusCode, 200);

    assert.equal(
        res.body.cropConditionProducts.temporalChange,
        null
    );

    assert.equal(
        res.body.interpretation.status,
        "calibration_required"
    );

    assert.equal(
        calls.calculateCropConditionTemporalChangeStreaming.length,
        0
    );

    assert.equal(
        calls.checkReusableCropConditionEvidence.length,
        0
    );

    assert.equal(
        calls.saveCropConditionEvidence.length,
        0
    );

    assert.equal(
        calls.processCropConditionInterpretation.length,
        1
    );
});
test("omits classification raster references when unavailable", async () => {
    state.products.forEach(product => {
        product.availability.classification = false;
    });

    const res = createResponse();

    await postCropConditionTemporalInterpretation(
        createRequest(validRequest),
        res
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(
        calls.createCropConditionEvidence[0].rasterReferences,
        []
    );
});

test("returns HTTP 500 when a temporal workflow dependency throws", async () => {
    state.error = Object.assign(
        new Error("Test temporal workflow failure"),
        { code: "TEST_TEMPORAL_WORKFLOW_ERROR" }
    );

    const originalError = console.error;
    console.error = () => {};

    try {
        const res = createResponse();

        await postCropConditionTemporalInterpretation(
            createRequest(validRequest),
            res
        );

        assert.equal(res.statusCode, 500);
        assert.equal(res.body.code, "TEST_TEMPORAL_WORKFLOW_ERROR");
        assert.equal(res.body.message, "Test temporal workflow failure");
    } finally {
        console.error = originalError;
    }
});
