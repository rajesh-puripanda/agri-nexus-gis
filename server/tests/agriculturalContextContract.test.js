"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  AGRICULTURAL_CONTEXT_CONTRACT_VERSION,
  CONTEXT_TYPE,
  REQUIRED_FIELDS,
  OPTIONAL_FIELDS,
  VALID_CALIBRATION_STATUSES,
  validateAgriculturalContext,
  createAgriculturalContext,
} = require("../scientific/cropIntelligence/agriculturalContextContract");

function createValidContext(overrides = {}) {
  return {
    contractVersion: AGRICULTURAL_CONTEXT_CONTRACT_VERSION,
    contextType: CONTEXT_TYPE,

    crop: {
      cropCode: "RICE",
      cropName: "Rice",
    },

    growthStage: "vegetative",

    season: "Kharif",

    observationPeriod: {
      startDate: "2026-07-01",
      endDate: "2026-08-01",
    },

    studyArea: {
      name: "Test Agricultural Study Area",
    },

    sensorContext: {
      sensor: "Sentinel-2",
    },

    calibrationContext: {
      status: "not_available",
    },

    ...overrides,
  };
}

test("exports the frozen agricultural context contract version", () => {
  assert.equal(AGRICULTURAL_CONTEXT_CONTRACT_VERSION, "1.0");
  assert.equal(CONTEXT_TYPE, "AGRICULTURAL_CONTEXT");
});

test("defines required and optional fields", () => {
  assert.deepEqual(REQUIRED_FIELDS, [
    "contractVersion",
    "contextType",
    "crop",
    "growthStage",
    "season",
    "observationPeriod",
    "studyArea",
    "sensorContext",
    "calibrationContext",
  ]);

  assert.deepEqual(OPTIONAL_FIELDS, ["metadata"]);
});

test("defines valid calibration statuses", () => {
  assert.deepEqual(VALID_CALIBRATION_STATUSES, [
    "not_available",
    "available",
    "validated",
  ]);
});

test("valid agricultural context passes validation", () => {
  const result = validateAgriculturalContext(
    createValidContext(),
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("invalid input type is rejected", () => {
  const result = validateAgriculturalContext(null);

  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test("invalid contract version is rejected", () => {
  const result = validateAgriculturalContext(
    createValidContext({
      contractVersion: "9.9",
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("contractVersion"),
    ),
  );
});

test("invalid context type is rejected", () => {
  const result = validateAgriculturalContext(
    createValidContext({
      contextType: "OTHER_CONTEXT",
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("contextType"),
    ),
  );
});

test("crop requires cropCode and cropName", () => {
  const result = validateAgriculturalContext(
    createValidContext({
      crop: {
        cropCode: "",
        cropName: "",
      },
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("crop.cropCode"),
    ),
  );
  assert.ok(
    result.errors.some((error) =>
      error.includes("crop.cropName"),
    ),
  );
});

test("growth stage is required", () => {
  const result = validateAgriculturalContext(
    createValidContext({
      growthStage: "",
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("growthStage"),
    ),
  );
});

test("season is required", () => {
  const result = validateAgriculturalContext(
    createValidContext({
      season: "",
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("season"),
    ),
  );
});

test("observation period requires start and end dates", () => {
  const result = validateAgriculturalContext(
    createValidContext({
      observationPeriod: {
        startDate: "",
        endDate: "",
      },
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("observationPeriod.startDate"),
    ),
  );
  assert.ok(
    result.errors.some((error) =>
      error.includes("observationPeriod.endDate"),
    ),
  );
});

test("study area must be a plain object", () => {
  const result = validateAgriculturalContext(
    createValidContext({
      studyArea: null,
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("studyArea"),
    ),
  );
});

test("sensor context must be a plain object", () => {
  const result = validateAgriculturalContext(
    createValidContext({
      sensorContext: "Sentinel-2",
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("sensorContext"),
    ),
  );
});

test("calibration context requires a valid status", () => {
  const result = validateAgriculturalContext(
    createValidContext({
      calibrationContext: {
        status: "unknown",
      },
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("calibrationContext.status"),
    ),
  );
});

test("all supported calibration statuses are accepted", () => {
  for (const status of VALID_CALIBRATION_STATUSES) {
    const result = validateAgriculturalContext(
      createValidContext({
        calibrationContext: {
          status,
        },
      }),
    );

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  }
});

test("metadata is optional", () => {
  const context = createValidContext();

  delete context.metadata;

  const result = validateAgriculturalContext(context);

  assert.equal(result.valid, true);
});

test("metadata must be a plain object when provided", () => {
  const result = validateAgriculturalContext(
    createValidContext({
      metadata: "invalid",
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("metadata"),
    ),
  );
});

test("factory normalizes contract version and context type", () => {
  const context = createAgriculturalContext(
    createValidContext({
      contractVersion: undefined,
      contextType: undefined,
    }),
  );

  assert.equal(
    context.contractVersion,
    AGRICULTURAL_CONTEXT_CONTRACT_VERSION,
  );

  assert.equal(context.contextType, CONTEXT_TYPE);
});

test("factory rejects invalid agricultural context", () => {
  assert.throws(
    () =>
      createAgriculturalContext({
        crop: {
          cropCode: "RICE",
          cropName: "Rice",
        },
      }),
    (error) => {
      assert.equal(
        error.code,
        "INVALID_AGRICULTURAL_CONTEXT",
      );

      assert.ok(
        Array.isArray(error.validationErrors),
      );

      return true;
    },
  );
});
