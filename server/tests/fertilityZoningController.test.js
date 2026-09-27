"use strict";

// ============================================================
// server/tests/fertilityZoningController.test.js
// ============================================================
//
// Phase 7.7 — Fertility Zoning Controller/API Contract
//
// Responsibilities tested:
//
//   1. Configuration response
//   2. Successful zoning delegation
//   3. Request parameter parsing
//   4. Validation error response
//   5. Service error propagation
//
// Scientific zoning logic is tested separately in
// fertilityZoningService.test.js.
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const fertilityZoningController =
  require("../controllers/fertilityZoningController");

const fertilityZoningService =
  require("../services/fertilityZoningService");

// ============================================================
// TEST HELPERS
// ============================================================

function createMockResponse() {
  return {
    statusCode: null,
    body: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

// ============================================================
// CONFIGURATION
// ============================================================

test("getFertilityZoningConfiguration returns HTTP 200", async () => {
  const req = {};
  const res = createMockResponse();

  await fertilityZoningController.getFertilityZoningConfiguration(
    req,
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(
    res.body.phase,
    fertilityZoningService.API_PHASE,
  );

  assert.equal(
    res.body.configuration.zoningType,
    fertilityZoningService.ZONING_TYPE,
  );

  assert.deepEqual(
    res.body.configuration.interpolationMethod,
    fertilityZoningService.INTERPOLATION_METHOD,
  );

  assert.ok(res.body.configuration.fertilityParameters);
  assert.ok(res.body.configuration.zoneDefinitions);
});

// ============================================================
// SUCCESSFUL GENERATION
// ============================================================

test("generateFertilityZoning delegates valid request and returns HTTP 200", async () => {
  const originalPrepare =
    fertilityZoningService.prepareFertilityZoning;

  const expectedResult = {
    success: true,
    phase: fertilityZoningService.API_PHASE,
    status: "completed",
    message:
      "Overall soil fertility zoning surface generated successfully.",
  };

  fertilityZoningService.prepareFertilityZoning =
    async (options) => {
      assert.deepEqual(options, {
        power: 2,
        resolution: 50,
      });

      return expectedResult;
    };

  try {
    const req = {
      body: {
        power: 2,
        resolution: 50,
      },
    };

    const res = createMockResponse();

    await fertilityZoningController.generateFertilityZoning(
      req,
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, expectedResult);
  } finally {
    fertilityZoningService.prepareFertilityZoning =
      originalPrepare;
  }
});

// ============================================================
// OPTIONAL REQUEST PARAMETERS
// ============================================================

test("generateFertilityZoning handles a missing request body", async () => {
  const originalPrepare =
    fertilityZoningService.prepareFertilityZoning;

  fertilityZoningService.prepareFertilityZoning =
    async (options) => {
      assert.deepEqual(options, {
        power: undefined,
        resolution: undefined,
      });
      return {
        success: true,
        status: "completed",
      };
    };

  try {
    const req = {};
    const res = createMockResponse();

    await fertilityZoningController.generateFertilityZoning(
      req,
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      success: true,
      status: "completed",
    });
  } finally {
    fertilityZoningService.prepareFertilityZoning =
      originalPrepare;
  }
});

// ============================================================
// INVALID POWER
// ============================================================

test("generateFertilityZoning rejects an invalid power", async () => {
  const req = {
    body: {
      power: "invalid",
    },
  };

  const res = createMockResponse();

  await fertilityZoningController.generateFertilityZoning(
    req,
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.ok(
    res.body.message.includes("power"),
  );
});

// ============================================================
// INVALID RESOLUTION
// ============================================================

test("generateFertilityZoning rejects an invalid resolution", async () => {
  const req = {
    body: {
      resolution: "invalid",
    },
  };

  const res = createMockResponse();

  await fertilityZoningController.generateFertilityZoning(
    req,
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.ok(
    res.body.message.includes("resolution"),
  );
});

// ============================================================
// SERVICE VALIDATION ERROR
// ============================================================

test("generateFertilityZoning propagates service validation status", async () => {
  const originalPrepare =
    fertilityZoningService.prepareFertilityZoning;

  const error = new Error(
    "resolution must be between 10 and 200.",
  );

  error.statusCode = 400;
  error.validationErrors = [
    "resolution must be between 10 and 200.",
  ];

  fertilityZoningService.prepareFertilityZoning =
    async () => {
      throw error;
    };

  try {
    const req = {
      body: {
        resolution: 50,
      },
    };

    const res = createMockResponse();

    await fertilityZoningController.generateFertilityZoning(
      req,
      res,
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(
      res.body.message,
      "resolution must be between 10 and 200.",
    );
    assert.deepEqual(
      res.body.errors,
      [
        "resolution must be between 10 and 200.",
      ],
    );
  } finally {
    fertilityZoningService.prepareFertilityZoning =
      originalPrepare;
  }
});

// ============================================================
// INTERNAL ERROR
// ============================================================

test("generateFertilityZoning returns HTTP 500 for unexpected errors", async () => {
  const originalPrepare =
    fertilityZoningService.prepareFertilityZoning;

  fertilityZoningService.prepareFertilityZoning =
    async () => {
      throw new Error("Unexpected test failure");
    };

  try {
    const req = {
      body: {
        resolution: 50,
      },
    };

    const res = createMockResponse();

    await fertilityZoningController.generateFertilityZoning(
      req,
      res,
    );

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
    assert.equal(
      res.body.message,
      "Unexpected test failure",
    );
  } finally {
    fertilityZoningService.prepareFertilityZoning =
      originalPrepare;
  }
});