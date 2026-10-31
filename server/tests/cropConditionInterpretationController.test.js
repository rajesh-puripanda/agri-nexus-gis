
"use strict";

const { test, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const dependencyPaths = [
    "../services/remoteSensing/catalog/sentinel2IndexAvailabilityService",
    "../services/remoteSensing/temporal/publishedIndexObservationAdapterService",
    "../scientific/cropIntelligence/cropConditionEvidenceContract",
    "../services/cropIntelligence/cropConditionInterpretationService"
];

const controllerPath = require.resolve(
    "../controllers/cropConditionInterpretationController"
);

const originalModules = new Map(
    [...dependencyPaths, "../controllers/cropConditionInterpretationController"]
        .map(path => {
            const resolved = require.resolve(path);
            return [resolved, require.cache[resolved]];
        })
);

const calls = {};
const state = {};

function resetState() {
    calls.findAvailableProduct = [];
    calls.createPublishedIndexObservation = [];
    calls.createCropConditionEvidence = [];
    calls.processCropConditionInterpretation = [];

    state.product = {
        indexCode: "NDVI",
        sceneId: "S2_TEST_001",
        acquisitionDate: "2026-09-08",
        productionDirectory: "test/production/scene",
        targetResolution: 10,
        outputs: {
            classification: "NDVI_classification.tif"
        },
        availability: {
            continuous: true,
            classification: true
        }
    };

    state.observation = {
        observation: {
            observationDate: "2026-09-08",
            sceneId: "S2_TEST_001"
        },
        spatialContext: {
            coordinateReferenceSystem: "EPSG:32644"
        }
    };

    state.interpretation = {
        status: "evidence_only",
        evidence: {}
    };

    state.error = null;
}

const stubs = [
    {
        findAvailableProduct: async request => {
            calls.findAvailableProduct.push(request);

            if (state.error) {
                throw state.error;
            }

            return state.product;
        }
    },
    {
        createPublishedIndexObservation: async request => {
            calls.createPublishedIndexObservation.push(request);
            return state.observation;
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
    postCropConditionInterpretation
} = require("../controllers/cropConditionInterpretationController");

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
    observationDate: "2026-09-08",
    sceneId: "S2_TEST_001",
    indexCode: "ndvi"
};

test("rejects an invalid request with HTTP 400", async () => {
    const res = createResponse();

    await postCropConditionInterpretation(
        createRequest({}),
        res
    );

    assert.equal(res.statusCode, 400);
    assert.equal(
        res.body.code,
        "INVALID_CROP_INTERPRETATION_REQUEST"
    );
    assert.equal(calls.findAvailableProduct.length, 0);
});

test("returns HTTP 404 when no continuous published raster is available", async () => {
    state.product = {
        availability: {
            continuous: false
        }
    };

    const res = createResponse();

    await postCropConditionInterpretation(
        createRequest(validRequest),
        res
    );

    assert.equal(res.statusCode, 404);
    assert.equal(
        res.body.code,
        "PUBLISHED_INDEX_UNAVAILABLE"
    );
    assert.equal(calls.createPublishedIndexObservation.length, 0);
});

test("returns HTTP 409 when published observation identity does not match", async () => {
    state.observation.observation.sceneId = "OTHER_SCENE";

    const res = createResponse();

    await postCropConditionInterpretation(
        createRequest(validRequest),
        res
    );

    assert.equal(res.statusCode, 409);
    assert.equal(
        res.body.code,
        "OBSERVATION_IDENTITY_MISMATCH"
    );
    assert.equal(calls.createCropConditionEvidence.length, 0);
});

test("interprets published NDVI evidence and preserves classification raster reference", async () => {
    const res = createResponse();

    await postCropConditionInterpretation(
        createRequest(validRequest),
        res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.interpretation, state.interpretation);

    assert.equal(
        calls.findAvailableProduct[0].indexCode,
        "NDVI"
    );

    assert.equal(
        calls.findAvailableProduct[0].sceneId,
        "S2_TEST_001"
    );

    assert.deepEqual(
        calls.createPublishedIndexObservation[0],
        {
            sceneDirectory: "test/production/scene",
            indexCode: "NDVI"
        }
    );

    const evidence = calls.createCropConditionEvidence[0];

    assert.deepEqual(evidence.classifications, []);
    assert.equal(evidence.rasterReferences.length, 1);
    assert.equal(
        evidence.rasterReferences[0].fileName,
        "NDVI_classification.tif"
    );
    assert.equal(
        evidence.metadata.calibrationStatus,
        "not_calibrated"
    );

    assert.equal(
        calls.processCropConditionInterpretation.length,
        1
    );
});

test("omits classification raster reference when classification is unavailable", async () => {
    state.product.availability.classification = false;

    const res = createResponse();

    await postCropConditionInterpretation(
        createRequest(validRequest),
        res
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(
        calls.createCropConditionEvidence[0].rasterReferences,
        []
    );
});

test("returns HTTP 500 when the availability dependency throws", async () => {
    state.error = Object.assign(
        new Error("Test availability failure"),
        { code: "TEST_DEPENDENCY_ERROR" }
    );

    const originalError = console.error;
    console.error = () => {};

    try {
        const res = createResponse();

        await postCropConditionInterpretation(
            createRequest(validRequest),
            res
        );

        assert.equal(res.statusCode, 500);
        assert.equal(
            res.body.code,
            "TEST_DEPENDENCY_ERROR"
        );
        assert.equal(
            res.body.message,
            "Test availability failure"
        );

        assert.equal(calls.findAvailableProduct.length, 1);
        assert.equal(calls.createPublishedIndexObservation.length, 0);
        assert.equal(calls.createCropConditionEvidence.length, 0);
    } finally {
        console.error = originalError;
    }
});
