"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const service = require("../services/cropIntelligence/cropConditionCalibrationRegistryService");
const repository = require("../repositories/cropConditionCalibrationRepository");
const {
  createCropConditionCalibration,
} = require("../scientific/cropIntelligence/cropConditionCalibrationContract");

function createValidCalibration(overrides = {}) {
  return {
    calibrationId: "CAL-RICE-NDVI-TEST-001",
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
      studyAreaId: "AREA-TEST-001",
    },
    calibrationDataset: {
      datasetId: "DATASET-TEST-001",
      datasetName: "Test Dataset",
      observationCount: 100,
    },
    referenceContext: {
      referenceType: "field_observation",
      referenceVariable: "crop_condition",
    },
    calibrationMethod: {
      method: "threshold",
    },
    validationContext: {},
    applicability: {
      crop: "RICE",
      season: "Kharif",
    },
    status: "proposed",
    ...overrides,
  };
}

test("registration explicitly sets proposed status", async (t) => {
  const original = repository.registerCalibration;

  t.after(() => {
    repository.registerCalibration = original;
  });

  repository.registerCalibration = async (calibration) => ({
    calibrationId: calibration.calibrationId,
    status: calibration.status,
  });

  const result = await service.registerCalibration(
    createValidCalibration({ status: "validated" }),
  );

  assert.equal(result.status, "proposed");
  assert.equal(
    result.calibrationId,
    "CAL-RICE-NDVI-TEST-001",
  );
});

test("registration rejects invalid calibration input", async () => {
  await assert.rejects(
    service.registerCalibration({
      calibrationId: "",
    }),
    {
      code: "INVALID_CROP_CONDITION_CALIBRATION",
    },
  );
});

test("retrieval returns null when calibration does not exist", async (t) => {
  const original = repository.getCalibration;

  t.after(() => {
    repository.getCalibration = original;
  });

  repository.getCalibration = async () => null;

  assert.equal(
    await service.getCalibration("CAL-MISSING"),
    null,
  );
});

test("retrieval rejects corrupted stored calibration", async (t) => {
  const original = repository.getCalibration;

  t.after(() => {
    repository.getCalibration = original;
  });

  repository.getCalibration = async () => ({
    calibrationId: "CAL-CORRUPT",
    status: "proposed",
    calibration: {
      calibrationId: "CAL-CORRUPT",
      status: "proposed",
    },
  });

  await assert.rejects(
    service.getCalibration("CAL-CORRUPT"),
    { code: "CORRUPT_CALIBRATION_RECORD" },
  );
});

test("retrieval rejects registry and JSON status mismatch", async (t) => {
  const original = repository.getCalibration;

  t.after(() => {
    repository.getCalibration = original;
  });

  repository.getCalibration = async () => ({
    calibrationId: "CAL-STATUS-MISMATCH",
    status: "validated",
    calibration: createCropConditionCalibration(
        createValidCalibration(),
),
  });

  await assert.rejects(
    service.getCalibration("CAL-STATUS-MISMATCH"),
    { code: "CALIBRATION_STATUS_MISMATCH" },
  );
});

test("listing forwards supported filters to repository", async (t) => {
  const original = repository.listCalibrations;

  t.after(() => {
    repository.listCalibrations = original;
  });

  let receivedFilters;

  repository.listCalibrations = async (filters) => {
    receivedFilters = filters;
    return [];
  };

  const filters = {
    cropCode: "RICE",
    indexCode: "NDVI",
    sensor: "Sentinel-2",
    season: "Kharif",
    status: "proposed",
  };

  const result = await service.listCalibrations(filters);

  assert.deepEqual(result, []);
  assert.deepEqual(receivedFilters, filters);
});

test("listing rejects invalid status filter", async () => {
  await assert.rejects(
    service.listCalibrations({ status: "approved" }),
    TypeError,
  );
});

test("validation decision forwards approval and evidence", async (t) => {
  const original = repository.recordValidationDecision;

  t.after(() => {
    repository.recordValidationDecision = original;
  });

  let receivedInput;

  repository.recordValidationDecision = async (input) => {
    receivedInput = input;
    return { calibrationId: input.calibrationId, status: "validated" };
  };

  const result = await service.recordValidationDecision({
    calibrationId: " CAL-RICE-NDVI-001 ",
    decision: "validated",
    actorId: "reviewer-001",
    reason: "Validation evidence reviewed.",
    evidence: { validationDatasetId: "VALIDATION-001" },
  });

  assert.equal(result.status, "validated");
  assert.equal(receivedInput.calibrationId, "CAL-RICE-NDVI-001");
  assert.equal(receivedInput.decision, "validated");
  assert.equal(receivedInput.actorId, "reviewer-001");
  assert.deepEqual(receivedInput.evidence, {
    validationDatasetId: "VALIDATION-001",
  });
});

test("validation decision rejects empty evidence", async () => {
  await assert.rejects(
    service.recordValidationDecision({
      calibrationId: "CAL-RICE-NDVI-001",
      decision: "validated",
      reason: "Reviewed.",
      evidence: {},
    }),
    TypeError,
  );
});

test("validation decision rejects unsupported decision", async () => {
  await assert.rejects(
    service.recordValidationDecision({
      calibrationId: "CAL-RICE-NDVI-001",
      decision: "approved",
      reason: "Reviewed.",
      evidence: { datasetId: "DATASET-001" },
    }),
    TypeError,
  );
});

test("validation rejection is delegated without changing decision", async (t) => {
  const original = repository.recordValidationDecision;

  t.after(() => {
    repository.recordValidationDecision = original;
  });

  let receivedInput;

  repository.recordValidationDecision = async (input) => {
    receivedInput = input;
    return {
      calibrationId: input.calibrationId,
      status: "proposed",
      decision: input.decision,
    };
  };

  const result = await service.recordValidationDecision({
    calibrationId: "CAL-RICE-NDVI-001",
    decision: "validation_rejected",
    reason: "Insufficient validation evidence.",
    evidence: { issue: "Insufficient observations" },
  });

  assert.equal(result.status, "proposed");
  assert.equal(result.decision, "validation_rejected");
  assert.equal(receivedInput.decision, "validation_rejected");
});

test("retirement delegates normalized input to repository", async (t) => {
  const original = repository.retireCalibration;

  t.after(() => {
    repository.retireCalibration = original;
  });

  let receivedInput;

  repository.retireCalibration = async (input) => {
    receivedInput = input;
    return { calibrationId: input.calibrationId, status: "retired" };
  };

  const result = await service.retireCalibration({
    calibrationId: " CAL-RICE-NDVI-001 ",
    actorId: "reviewer-001",
    reason: "Calibration superseded.",
  });

  assert.equal(result.status, "retired");
  assert.equal(receivedInput.calibrationId, "CAL-RICE-NDVI-001");
  assert.equal(receivedInput.actorId, "reviewer-001");
  assert.equal(receivedInput.reason, "Calibration superseded.");
});

test("retirement rejects a missing reason", async () => {
  await assert.rejects(
    service.retireCalibration({
      calibrationId: "CAL-RICE-NDVI-001",
      reason: " ",
    }),
    TypeError,
  );
});