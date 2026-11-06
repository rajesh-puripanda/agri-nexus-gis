"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const registry = require("../services/cropIntelligence/cropConditionCalibrationRegistryService");

const {
  resolveCropConditionCalibration,
} = require("../services/cropIntelligence/cropConditionCalibrationResolutionService");

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

function storedRecord(calibration) {
  return {
    calibrationId: calibration.calibrationId,
    status: "validated",
    calibration,
  };
}

function mockRegistry(t, records) {
  const originalList = registry.listCalibrations;
  const originalGet = registry.getCalibration;

  const retrievals = [];

  registry.listCalibrations = async () => records;

  registry.getCalibration = async (calibrationId) => {
    retrievals.push(calibrationId);

    const record = records.find(
      item => item.calibrationId === calibrationId,
    );

    return record ? storedRecord(record) : null;
  };

  t.after(() => {
    registry.listCalibrations = originalList;
    registry.getCalibration = originalGet;
  });

  return retrievals;
}

function resolve(overrides = {}) {
  return resolveCropConditionCalibration({
    agriculturalContext: createContext(),
    observation: createObservation(),
    ...overrides,
  });
}

test("invalid agricultural context is rejected", async () => {
  const result = await resolve({
    agriculturalContext: null,
  });

  assert.equal(result.status, "invalid_agricultural_context");
  assert.equal(result.selectedCalibration, null);
});

test("invalid temporal observation is rejected", async () => {
  const result = await resolve({
    observation: null,
  });

  assert.equal(result.status, "invalid_observation");
  assert.equal(result.selectedCalibration, null);
});

test("no validated candidates returns no_validated_calibration", async (t) => {
  mockRegistry(t, []);

  const result = await resolve();

  assert.equal(result.status, "no_validated_calibration");
  assert.deepEqual(result.candidates, []);
});

test("exactly one applicable calibration is selected", async (t) => {
  const calibration = createCalibration();
  const retrievals = mockRegistry(t, [calibration]);

  const result = await resolve();

  assert.equal(result.status, "applicable");
  assert.equal(
    result.selectedCalibration.calibrationId,
    calibration.calibrationId,
  );
  assert.equal(result.candidates.length, 1);
  assert.deepEqual(retrievals, [calibration.calibrationId]);
});

test("all definitively mismatching candidates return not_applicable", async (t) => {
  const calibration = createCalibration({
    growthStage: "vegetative",
    applicability: {
      crop: "RICE",
      growthStage: "vegetative",
      season: "Kharif",
      sensor: "Sentinel-2",
      indexCode: "NDVI",
    },
  });

  mockRegistry(t, [calibration]);

  const result = await resolve();

  assert.equal(result.status, "not_applicable");
  assert.equal(result.selectedCalibration, null);
});

test("multiple applicable calibrations return ambiguous", async (t) => {
  const first = createCalibration();
  const second = createCalibration({
    calibrationId: "CAL-RICE-NDVI-002",
  });

  mockRegistry(t, [first, second]);

  const result = await resolve();

  assert.equal(result.status, "ambiguous");
  assert.equal(result.selectedCalibration, null);
});

test("applicable plus unresolved candidate returns insufficient_information", async (t) => {
  const applicable = createCalibration();

  const unresolved = createCalibration({
    calibrationId: "CAL-RICE-NDVI-UNRESOLVED",
    studyArea: { name: "Visakhapatnam" },
  });

  mockRegistry(t, [applicable, unresolved]);

  const result = await resolve();

  assert.equal(result.status, "insufficient_information");
  assert.equal(result.selectedCalibration, null);
});

test("missing calibration after listing remains unresolved", async (t) => {
  const originalList = registry.listCalibrations;
  const originalGet = registry.getCalibration;

  t.after(() => {
    registry.listCalibrations = originalList;
    registry.getCalibration = originalGet;
  });

  registry.listCalibrations = async () => [
    { calibrationId: "CAL-MISSING", status: "validated" },
  ];

  registry.getCalibration = async () => null;

  const result = await resolve();

  assert.equal(result.status, "insufficient_information");
  assert.equal(result.selectedCalibration, null);
});

test("corrupt registry record remains unresolved", async (t) => {
  const originalList = registry.listCalibrations;
  const originalGet = registry.getCalibration;

  t.after(() => {
    registry.listCalibrations = originalList;
    registry.getCalibration = originalGet;
  });

  registry.listCalibrations = async () => [
    { calibrationId: "CAL-CORRUPT", status: "validated" },
  ];

  registry.getCalibration = async () => {
    const error = new Error("Corrupt calibration record.");
    error.code = "CORRUPT_CALIBRATION_RECORD";
    throw error;
  };

  const result = await resolve();

  assert.equal(result.status, "insufficient_information");
  assert.equal(result.selectedCalibration, null);
});

test("unexpected registry errors propagate", async (t) => {
  const originalList = registry.listCalibrations;

  t.after(() => {
    registry.listCalibrations = originalList;
  });

  registry.listCalibrations = async () => {
    throw new Error("Database unavailable.");
  };

  await assert.rejects(
    resolve(),
    /Database unavailable/,
  );
});

test("registry discovery uses crop, index, season and validated status without sensor filtering", async (t) => {
  const originalList = registry.listCalibrations;
  const originalGet = registry.getCalibration;
  const calibration = createCalibration();

  let receivedFilters;

  t.after(() => {
    registry.listCalibrations = originalList;
    registry.getCalibration = originalGet;
  });

  registry.listCalibrations = async (filters) => {
    receivedFilters = filters;
    return [calibration];
  };

  registry.getCalibration = async () => storedRecord(calibration);

  const result = await resolve();

  assert.equal(result.status, "applicable");
  assert.deepEqual(receivedFilters, {
    cropCode: "RICE",
    indexCode: "NDVI",
    season: "Kharif",
    status: "validated",
  });
  assert.equal(
    Object.hasOwn(receivedFilters, "sensor"),
    false,
  );
});
