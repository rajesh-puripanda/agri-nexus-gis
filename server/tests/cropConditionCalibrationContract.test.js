"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CROP_CONDITION_CALIBRATION_CONTRACT_VERSION,
  CALIBRATION_TYPE,
  REQUIRED_FIELDS,
  OPTIONAL_FIELDS,
  VALID_CALIBRATION_STATUSES,
  VALID_REFERENCE_TYPES,
  VALID_CALIBRATION_METHODS,
  validateCropConditionCalibration,
  createCropConditionCalibration,
} = require("../scientific/cropIntelligence/cropConditionCalibrationContract");

function createValidCalibration(overrides = {}) {
  return {
    contractVersion:
      CROP_CONDITION_CALIBRATION_CONTRACT_VERSION,

    calibrationType: CALIBRATION_TYPE,

    calibrationId: "CAL-RICE-NDVI-001",

    crop: {
      cropCode: "RICE",
      cropName: "Rice",
    },

    growthStage: "during",

    season: "Kharif",

    indexContext: {
      indexCode: "NDVI",
      indexName: "Normalized Difference Vegetation Index",
      sensor: "Sentinel-2",
    },

    studyArea: {
      name: "Visakhapatnam",
      region: "Paderu",
    },

    calibrationDataset: {
      datasetId: "FUTURE-CALIBRATION-DATASET-001",
      datasetName: "Example Validated Calibration Dataset",
      observationCount: 100,
    },

    referenceContext: {
      referenceType: "field_observation",
      referenceVariable: "crop_condition",
    },

    calibrationMethod: {
      method: "threshold",
    },

    validationContext: {
      validationDatasetId: "VALIDATION-001",
      validationObservationCount: 25,
    },

    applicability: {
      crop: "RICE",
      season: "Kharif",
      sensor: "Sentinel-2",
      studyArea: "Visakhapatnam",
    },

    status: "proposed",

    ...overrides,
  };
}

test("contract exposes version 1.0", () => {
  assert.equal(
    CROP_CONDITION_CALIBRATION_CONTRACT_VERSION,
    "1.0",
  );
});

test("contract exposes the correct calibration type", () => {
  assert.equal(
    CALIBRATION_TYPE,
    "CROP_CONDITION_CALIBRATION",
  );
});

test("required fields are explicitly defined", () => {
  assert.deepEqual(REQUIRED_FIELDS, [
    "contractVersion",
    "calibrationType",
    "calibrationId",
    "crop",
    "growthStage",
    "season",
    "indexContext",
    "studyArea",
    "calibrationDataset",
    "referenceContext",
    "calibrationMethod",
    "validationContext",
    "applicability",
    "status",
  ]);
});

test("optional fields contain metadata", () => {
  assert.deepEqual(OPTIONAL_FIELDS, ["metadata"]);
});

test("calibration statuses are explicit", () => {
  assert.deepEqual(VALID_CALIBRATION_STATUSES, [
    "proposed",
    "validated",
    "retired",
  ]);
});

test("reference types are explicit", () => {
  assert.deepEqual(VALID_REFERENCE_TYPES, [
    "field_observation",
    "ground_truth",
    "laboratory_measurement",
    "agronomic_measurement",
    "validated_reference_dataset",
  ]);
});

test("calibration methods are explicit", () => {
  assert.deepEqual(VALID_CALIBRATION_METHODS, [
    "threshold",
    "statistical",
    "empirical",
    "model_based",
  ]);
});

test("valid calibration passes validation", () => {
  const validation =
    validateCropConditionCalibration(
      createValidCalibration(),
    );

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.errors, []);
});

test("calibration factory normalizes contract version and type", () => {
  const calibration = createCropConditionCalibration({
    ...createValidCalibration(),
    contractVersion: "incorrect",
    calibrationType: "incorrect",
  });

  assert.equal(
    calibration.contractVersion,
    CROP_CONDITION_CALIBRATION_CONTRACT_VERSION,
  );

  assert.equal(
    calibration.calibrationType,
    CALIBRATION_TYPE,
  );
});

test("missing calibration id is rejected", () => {
  const calibration = createValidCalibration({
    calibrationId: "",
  });

  const validation =
    validateCropConditionCalibration(calibration);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some((error) =>
      error.includes("calibrationId"),
    ),
  );
});

test("missing crop code is rejected", () => {
  const calibration = createValidCalibration({
    crop: {
      cropName: "Rice",
    },
  });

  const validation =
    validateCropConditionCalibration(calibration);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some((error) =>
      error.includes("crop.cropCode"),
    ),
  );
});

test("missing growth stage is rejected", () => {
  const calibration = createValidCalibration({
    growthStage: "",
  });

  const validation =
    validateCropConditionCalibration(calibration);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some((error) =>
      error.includes("growthStage"),
    ),
  );
});

test("missing index code is rejected", () => {
  const calibration = createValidCalibration({
    indexContext: {
      indexName: "Normalized Difference Vegetation Index",
    },
  });

  const validation =
    validateCropConditionCalibration(calibration);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some((error) =>
      error.includes("indexContext.indexCode"),
    ),
  );
});

test("missing calibration dataset identity is rejected", () => {
  const calibration = createValidCalibration({
    calibrationDataset: {
      observationCount: 100,
    },
  });

  const validation =
    validateCropConditionCalibration(calibration);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some((error) =>
      error.includes("calibrationDataset.datasetId"),
    ),
  );

  assert.ok(
    validation.errors.some((error) =>
      error.includes("calibrationDataset.datasetName"),
    ),
  );
});

test("invalid reference type is rejected", () => {
  const calibration = createValidCalibration({
    referenceContext: {
      referenceType: "remote_sensing_only",
      referenceVariable: "crop_condition",
    },
  });

  const validation =
    validateCropConditionCalibration(calibration);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some((error) =>
      error.includes("referenceContext.referenceType"),
    ),
  );
});

test("invalid calibration method is rejected", () => {
  const calibration = createValidCalibration({
    calibrationMethod: {
      method: "guesswork",
    },
  });

  const validation =
    validateCropConditionCalibration(calibration);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some((error) =>
      error.includes("calibrationMethod.method"),
    ),
  );
});

test("invalid validation observation count is rejected", () => {
  const calibration = createValidCalibration({
    validationContext: {
      validationDatasetId: "VALIDATION-001",
      validationObservationCount: -1,
    },
  });

  const validation =
    validateCropConditionCalibration(calibration);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some((error) =>
      error.includes(
        "validationContext.validationObservationCount",
      ),
    ),
  );
});

test("invalid calibration status is rejected", () => {
  const calibration = createValidCalibration({
    status: "experimental",
  });

  const validation =
    validateCropConditionCalibration(calibration);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some((error) =>
      error.includes("status"),
    ),
  );
});

test("metadata is optional", () => {
  const calibration = createValidCalibration();

  delete calibration.metadata;

  const validation =
    validateCropConditionCalibration(calibration);

  assert.equal(validation.valid, true);
});

test("metadata must be a plain object when provided", () => {
  const calibration = createValidCalibration({
    metadata: "invalid",
  });

  const validation =
    validateCropConditionCalibration(calibration);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some((error) =>
      error.includes("metadata"),
    ),
  );
});

test("factory rejects invalid calibration with structured error", () => {
  assert.throws(
    () =>
      createCropConditionCalibration({
        ...createValidCalibration(),
        status: "invalid-status",
      }),
    (error) => {
      assert.equal(
        error.code,
        "INVALID_CROP_CONDITION_CALIBRATION",
      );

      assert.ok(
        Array.isArray(error.validationErrors),
      );

      return true;
    },
  );
});

test("proposed calibration does not imply validation", () => {
  const calibration = createValidCalibration({
    status: "proposed",
  });

  const validation =
    validateCropConditionCalibration(calibration);

  assert.equal(validation.valid, true);
  assert.equal(calibration.status, "proposed");
});

test("validated status is explicitly supported", () => {
  const calibration = createValidCalibration({
    status: "validated",
  });

  const validation =
    validateCropConditionCalibration(calibration);

  assert.equal(validation.valid, true);
  assert.equal(calibration.status, "validated");
});

test("historical H2-style agricultural context can be represented", () => {
  const calibration = createValidCalibration({
    crop: {
      cropCode: "RICE",
      cropName: "Rice",
    },
    growthStage: "during",
    season: "Kharif",
    studyArea: {
      name: "Visakhapatnam",
      mandal: "Paderu",
    },
    calibrationDataset: {
      datasetId: "H2",
      datasetName: "VISAKHAPATNAM_KHARIF_RICE_2018",
      observationCount: 60,
    },
    referenceContext: {
      referenceType: "validated_reference_dataset",
      referenceVariable: "soil_context",
    },
    status: "proposed",
  });

  const validation =
    validateCropConditionCalibration(calibration);

  assert.equal(validation.valid, true);
});

test("calibration contract does not require a threshold value", () => {
  const calibration = createValidCalibration();

  assert.equal(
    Object.prototype.hasOwnProperty.call(
      calibration,
      "threshold",
    ),
    false,
  );

  const validation =
    validateCropConditionCalibration(calibration);

  assert.equal(validation.valid, true);
});
