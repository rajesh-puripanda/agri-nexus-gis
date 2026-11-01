"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    evaluateCropConditionCalibrationApplicability,
} = require("../services/cropIntelligence/cropConditionCalibrationApplicabilityService");

const {
    createAgriculturalContext,
} = require("../scientific/cropIntelligence/agriculturalContextContract");

const {
    createCropConditionCalibration,
} = require("../scientific/cropIntelligence/cropConditionCalibrationContract");

function createContext(overrides = {}) {
    return createAgriculturalContext({
        crop: { cropCode: "RICE", cropName: "Rice" },
        growthStage: "during",
        season: "Kharif",
        observationPeriod: {
            startDate: "2026-07-01",
            endDate: "2026-08-01",
        },
        studyArea: {
            name: "Visakhapatnam",
            studyAreaId: "AREA-001",
        },
        sensorContext: { sensor: "Sentinel-2" },
        calibrationContext: { status: "validated" },
        ...overrides,
    });
}

function createCalibration(overrides = {}) {
    return createCropConditionCalibration({
        calibrationId: "CAL-RICE-NDVI-001",
        crop: { cropCode: "RICE", cropName: "Rice" },
        growthStage: "during",
        season: "Kharif",
        indexContext: {
            indexCode: "NDVI",
            indexName: "Normalized Difference Vegetation Index",
            sensor: "Sentinel-2",
        },
        studyArea: {
            name: "Visakhapatnam",
            studyAreaId: "AREA-001",
        },
        calibrationDataset: {
            datasetId: "DATASET-001",
            datasetName: "Rice Calibration Dataset",
            observationCount: 100,
        },
        referenceContext: {
            referenceType: "field_observation",
            referenceVariable: "crop_condition",
        },
        calibrationMethod: { method: "threshold" },
        validationContext: {
            validationDatasetId: "VALIDATION-001",
            validationObservationCount: 25,
        },
        applicability: {
            crop: "RICE",
            growthStage: "during",
            season: "Kharif",
            sensor: "Sentinel-2",
            indexCode: "NDVI",
        },
        status: "validated",
        ...overrides,
    });
}


function createObservation(overrides = {}) {
    const base = {
        contractVersion: "1.0",
        observation: {
            observationDate: "2026-07-15",
            acquisitionDate: "2026-07-15T05:30:00Z",
            sensor: "Sentinel-2",
            sceneId: "SCENE-001",
            indexCode: "NDVI",
        },
        raster: {
            rasterId: "NDVI_20260715",
            width: 100,
            height: 100,
            pixelCount: 10000,
            noData: -9999,
        },
        index: {
            code: "NDVI",
            name: "Normalized Difference Vegetation Index",
            validRange: { min: -1, max: 1 },
        },
        statistics: {
            validPixelCount: 9800,
            noDataPixelCount: 200,
            minimum: -0.45,
            maximum: 0.91,
            mean: 0.57,
        },
        spatialContext: {
            projectedCrsCode: 32644,
        },
        processingContext: {
            processingVersion: "1.0",
        },
    };

    return {
        ...base,
        ...overrides,
        observation: {
            ...base.observation,
            ...overrides.observation,
        },
        index: {
            ...base.index,
            ...overrides.index,
        },
    };
}


function evaluate({
    calibration = createCalibration(),
    agriculturalContext = createContext(),
    observation = createObservation(),
} = {}) {
    return evaluateCropConditionCalibrationApplicability({
        calibration,
        agriculturalContext,
        observation,
    });
}

test("matching validated calibration is applicable", () => {
    const result = evaluate();

    assert.equal(result.status, "applicable");
    assert.equal(result.calibrationId, "CAL-RICE-NDVI-001");
    assert.ok(
        result.dimensionResults.some(
            item => item.dimension === "index" &&
                item.status === "matched",
        ),
    );
});

test("index mismatch makes calibration not applicable", () => {
    const result = evaluate({
        observation: createObservation({
            observation: {
                indexCode: "BSI",
            },
            index: {
                code: "BSI",
                name: "Bare Soil Index",
            },
        }),
    });

    assert.equal(result.status, "not_applicable");
});

test("missing required sensor makes observation invalid", () => {
    const result = evaluate({
        observation: createObservation({
            observation: {
                sensor: undefined,
            },
        }),
    });

    assert.equal(result.status, "invalid_observation");
});


test("growth-stage mismatch makes calibration not applicable", () => {
    const result = evaluate({
        agriculturalContext: createContext({
            growthStage: "vegetative",
        }),
    });

    assert.equal(result.status, "not_applicable");
});

test("conflicting calibration declarations remain unresolved", () => {
    const result = evaluate({
        calibration: createCalibration({
            applicability: {
                crop: "WHEAT",
                growthStage: "during",
                season: "Kharif",
                sensor: "Sentinel-2",
                indexCode: "NDVI",
            },
        }),
    });

    assert.equal(result.status, "insufficient_information");
    assert.ok(
        result.dimensionResults.some(
            item => item.dimension === "crop" &&
                item.status === "conflict",
        ),
    );
});

test("place name alone cannot establish study-area applicability", () => {
    const result = evaluate({
        calibration: createCalibration({
            studyArea: { name: "Visakhapatnam" },
        }),
        agriculturalContext: createContext({
            studyArea: { name: "Visakhapatnam" },
        }),
    });

    assert.equal(result.status, "insufficient_information");
});

test("proposed calibration is not evaluated as applicable", () => {
    const result = evaluate({
        calibration: createCalibration({
            status: "proposed",
        }),
    });

    assert.equal(result.status, "calibration_not_validated");
});

test("invalid calibration is rejected", () => {
    const result = evaluate({
        calibration: null,
    });

    assert.equal(result.status, "invalid_calibration");
});

test("missing observation is rejected", () => {
    const result = evaluate({
        observation: null,
    });

    assert.equal(result.status, "invalid_observation");
});


test("proposed calibration is rejected before observation validation", () => {
    const result = evaluate({
        calibration: createCalibration({
            status: "proposed",
        }),
        observation: null,
    });

    assert.equal(result.status, "calibration_not_validated");
});

test("matching study-area IDs establish applicability despite descriptive names", () => {
    const result = evaluate({
        calibration: createCalibration({
            applicability: {
                crop: "RICE",
                growthStage: "during",
                season: "Kharif",
                sensor: "Sentinel-2",
                indexCode: "NDVI",
                studyArea: "Visakhapatnam",
                studyAreaId: "AREA-001",
            },
        }),
    });

    assert.equal(result.status, "applicable");

    assert.ok(
        result.dimensionResults.some(
            item =>
                item.dimension === "studyAreaId" &&
                item.status === "matched",
        ),
    );
});

test("invalid calendar date in applicability bounds is unresolved", () => {
    const result = evaluate({
        calibration: createCalibration({
            applicability: {
                crop: "RICE",
                growthStage: "during",
                season: "Kharif",
                sensor: "Sentinel-2",
                indexCode: "NDVI",
                startDate: "2026-02-30",
            },
        }),
    });

    assert.equal(result.status, "insufficient_information");
});

test("reversed calibration date bounds are unresolved", () => {
    const result = evaluate({
        calibration: createCalibration({
            applicability: {
                crop: "RICE",
                growthStage: "during",
                season: "Kharif",
                sensor: "Sentinel-2",
                indexCode: "NDVI",
                startDate: "2026-08-01",
                endDate: "2026-07-01",
            },
        }),
    });

    assert.equal(result.status, "insufficient_information");

    assert.ok(
        result.dimensionResults.some(
            item =>
                item.dimension === "observationPeriod" &&
                item.status === "conflict",
        ),
    );
});
