
"use strict";

const { test, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const dependencyPath =
    "../services/cropIntelligence/cropConditionEvidencePersistenceService";

const controllerPath = require.resolve(
    "../controllers/cropConditionRasterController"
);

const resolvedDependency = require.resolve(dependencyPath);

const originalModules = new Map(
    [resolvedDependency, controllerPath].map(path => [
        path,
        require.cache[path]
    ])
);

const calls = {};
const state = {};

function resetState() {
    calls.findPublishedCropConditionEvidence = [];

    state.result = {
        published: true,
        comparisonId: "CROP-CONDITION-NDVI-TEST",
        rasterPath: "test/crop-condition/NDVI_CHANGE.tif",
        raster: {
            fileName: "NDVI_CHANGE.tif"
        }
    };

    state.error = null;
}

require.cache[resolvedDependency] = {
    id: resolvedDependency,
    filename: resolvedDependency,
    loaded: true,
    exports: {
        findPublishedCropConditionEvidence: async request => {
            calls.findPublishedCropConditionEvidence.push(request);

            if (state.error) {
                throw state.error;
            }

            return state.result;
        }
    }
};

const {
    getCropConditionTemporalChangeRaster
} = require("../controllers/cropConditionRasterController");

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

function createResponse() {
    return {
        statusCode: 200,
        body: null,
        contentType: null,
        sentFile: null,

        status(code) {
            this.statusCode = code;
            return this;
        },

        json(body) {
            this.body = body;
            return this;
        },

        type(value) {
            this.contentType = value;
            return this;
        },

        sendFile(filePath) {
            this.sentFile = filePath;
            return this;
        }
    };
}

function createRequest(comparisonId = "CROP-CONDITION-NDVI-TEST") {
    return {
        params: {
            comparisonId
        }
    };
}

test("serves a verified Crop Condition temporal-change GeoTIFF", async () => {
    const res = createResponse();

    await getCropConditionTemporalChangeRaster(
        createRequest(),
        res
    );

    assert.deepEqual(
        calls.findPublishedCropConditionEvidence,
        [{ comparisonId: "CROP-CONDITION-NDVI-TEST" }]
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.contentType, "image/tiff");
    assert.equal(
        res.sentFile,
        "test/crop-condition/NDVI_CHANGE.tif"
    );
});

test("returns 404 when the comparison is not published", async () => {
    state.result = {
        published: false,
        reason: "manifest_missing"
    };

    const res = createResponse();

    await getCropConditionTemporalChangeRaster(
        createRequest("UNKNOWN-COMPARISON"),
        res
    );

    assert.equal(res.statusCode, 404);
    assert.equal(
        res.body.code,
        "CROP_CONDITION_RASTER_NOT_FOUND"
    );
    assert.equal(res.sentFile, null);
});

test("returns 500 when publication verification fails", async () => {
    state.error = new Error("Test persistence failure");

    const originalError = console.error;
    console.error = () => {};

    try {
        const res = createResponse();

        await getCropConditionTemporalChangeRaster(
            createRequest(),
            res
        );

        assert.equal(res.statusCode, 500);
        assert.equal(
            res.body.code,
            "CROP_CONDITION_RASTER_DELIVERY_ERROR"
        );
        assert.equal(res.sentFile, null);
    } finally {
        console.error = originalError;
    }
});
