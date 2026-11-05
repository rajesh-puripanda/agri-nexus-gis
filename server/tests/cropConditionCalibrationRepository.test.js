
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const { pool } = require("../config/db");

const {
  createCropConditionCalibration,
} = require("../scientific/cropIntelligence/cropConditionCalibrationContract");

const repository = require("../repositories/cropConditionCalibrationRepository");

const registryService = require("../services/cropIntelligence/cropConditionCalibrationRegistryService");

const TEST_PREFIX = `CAL-C3-REPO-${randomUUID()}`;

const lifecycleId = `${TEST_PREFIX}-LIFECYCLE`;
const corruptionId = `${TEST_PREFIX}-CORRUPTION`;

function createTestCalibration(calibrationId) {
  return createCropConditionCalibration({
    calibrationId,

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
      datasetId: `${calibrationId}-DATASET`,
      datasetName: "Repository Integration Test Dataset",
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
      validationDatasetId: `${calibrationId}-VALIDATION`,
      validationObservationCount: 25,
    },

    applicability: {
      crop: "RICE",
      season: "Kharif",
      sensor: "Sentinel-2",
      studyArea: "Visakhapatnam",
    },

    status: "proposed",
  });
}

test("C.3 repository MySQL persistence and lifecycle", async (t) => {
  // Remove only records created by this test.
    t.after(async () => {
    await pool.execute(
      `
        DELETE FROM crop_condition_calibration_history
        WHERE calibration_id IN (?, ?)
      `,
      [lifecycleId, corruptionId],
    );

    await pool.execute(
      `
        DELETE FROM crop_condition_calibrations
        WHERE calibration_id IN (?, ?)
      `,
      [lifecycleId, corruptionId],
    );

    await pool.end();
  });

  // 1. Registration persists the calibration.
  const calibration = createTestCalibration(lifecycleId);

  const registered = await repository.registerCalibration(
    calibration,
    "repository-test",
  );

  assert.equal(registered.calibrationId, lifecycleId);
  assert.equal(registered.status, "proposed");

  // 2. Retrieval reloads the persisted database record.
  const retrieved = await repository.getCalibration(lifecycleId);

  assert.ok(retrieved);
  assert.equal(retrieved.status, "proposed");
  assert.equal(retrieved.calibration.status, "proposed");
  assert.equal(
    retrieved.calibration.calibrationId,
    lifecycleId,
  );

  // 3. Duplicate registration must fail without damaging
  //    the original record or adding another history entry.
  await assert.rejects(
    repository.registerCalibration(
      calibration,
      "repository-test",
    ),
    (error) => error.code === "ER_DUP_ENTRY",
  );

  let history = await repository.getCalibrationHistory(lifecycleId);

  assert.equal(history.length, 1);
  assert.equal(history[0].action, "registered");

  // 4. Filtered listing.
  const listed = await repository.listCalibrations({
    cropCode: "RICE",
    indexCode: "NDVI",
    sensor: "Sentinel-2",
    season: "Kharif",
    status: "proposed",
  });

  assert.ok(
    listed.some((item) => item.calibrationId === lifecycleId),
  );

  // 5. Record a rejected validation decision.
  const rejected = await repository.recordValidationDecision({
    calibrationId: lifecycleId,
    decision: "validation_rejected",
    actorId: "repository-test",
    reason: "Insufficient independent validation evidence.",
    evidence: {
      datasetId: "TEST-REJECTION-EVIDENCE",
    },
  });

  assert.equal(rejected.status, "proposed");

  let reloaded = await repository.getCalibration(lifecycleId);

  assert.equal(reloaded.status, "proposed");
  assert.equal(reloaded.calibration.status, "proposed");

  // 6. Explicit approval transitions proposed -> validated.
  const approved = await repository.recordValidationDecision({
    calibrationId: lifecycleId,
    decision: "validated",
    actorId: "repository-test",
    reason: "Independent validation evidence reviewed.",
    evidence: {
      datasetId: "TEST-APPROVAL-EVIDENCE",
      observationCount: 25,
    },
  });

  assert.equal(approved.previousStatus, "proposed");
  assert.equal(approved.status, "validated");

  reloaded = await repository.getCalibration(lifecycleId);

  assert.equal(reloaded.status, "validated");
  assert.equal(reloaded.calibration.status, "validated");

  // 7. A validated calibration cannot be reviewed again.
  await assert.rejects(
    repository.recordValidationDecision({
      calibrationId: lifecycleId,
      decision: "validated",
      reason: "Repeated decision.",
      evidence: { datasetId: "TEST" },
    }),
    /Cannot review calibration/,
  );

  // 8. Retirement transitions validated -> retired.
  const retired = await repository.retireCalibration({
    calibrationId: lifecycleId,
    actorId: "repository-test",
    reason: "Repository lifecycle test completed.",
  });

  assert.equal(retired.previousStatus, "validated");
  assert.equal(retired.status, "retired");

  reloaded = await repository.getCalibration(lifecycleId);

  assert.equal(reloaded.status, "retired");
  assert.equal(reloaded.calibration.status, "retired");

  // 9. Retired calibration cannot be retired again.
  await assert.rejects(
    repository.retireCalibration({
      calibrationId: lifecycleId,
      reason: "Repeated retirement.",
    }),
    /Cannot retire calibration/,
  );

  // 10. Verify complete audit history.
  history = await repository.getCalibrationHistory(lifecycleId);

  assert.deepEqual(
    history.map((entry) => entry.action),
    [
      "registered",
      "validation_rejected",
      "validated",
      "retired",
    ],
  );

  assert.equal(history[1].newStatus, "proposed");
  assert.equal(history[2].newStatus, "validated");
  assert.equal(history[3].newStatus, "retired");

  // 11. Corrupt a separate stored record and verify that
  //     the registry service detects the invalid contract.
  await repository.registerCalibration(
    createTestCalibration(corruptionId),
    "repository-test",
  );

  await pool.execute(
    `
      UPDATE crop_condition_calibrations
      SET calibration_json = JSON_OBJECT('status', 'proposed')
      WHERE calibration_id = ?
    `,
    [corruptionId],
  );

  await assert.rejects(
    registryService.getCalibration(corruptionId),
    (error) => error.code === "CORRUPT_CALIBRATION_RECORD",
  );
});
