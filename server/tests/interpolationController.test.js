"use strict";

// ============================================================
// server/tests/interpolationController.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 8.4 — Interpolation REST API Method Selection
//              and Response Contract
//
// Responsibilities tested:
//
//   1. Interpolation request delegation
//   2. Standard success response
//   3. Validation error response
//   4. Internal error response
//   5. Service status-code propagation
//   6. Interpolation configuration response
//   7. Supported interpolation methods
//   8. Method-specific minimum sample requirements
//   9. IDW-specific settings
//
// Scientific interpolation mathematics is tested separately
// in the interpolation engine and service test suites.
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const interpolationController =
  require("../controllers/interpolationController");

const interpolationService =
  require("../services/interpolationService");

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
// prepareInterpolation()
// ============================================================

test("prepareInterpolation returns the generated surface result with HTTP 200", async () => {
  const originalGenerate =
    interpolationService.generateInterpolationSurface;

  const expectedResult = {
    success: true,
    message: "IDW interpolation surface generated successfully.",
    data: {
      method: {
        key: "idw",
        label: "Inverse Distance Weighting",
      },
    },
  };

  interpolationService.generateInterpolationSurface =
    async (requestData) => {
      assert.deepEqual(requestData, {
        parameter: "ph",
        method: "idw",
        power: 2,
        resolution: 50,
      });

      return expectedResult;
    };

  try {
    const req = {
      body: {
        parameter: "ph",
        method: "idw",
        power: 2,
        resolution: 50,
      },
    };

    const res = createMockResponse();

    await interpolationController.prepareInterpolation(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, expectedResult);
  } finally {
    interpolationService.generateInterpolationSurface =
      originalGenerate;
  }
});

test("prepareInterpolation handles a missing request body safely", async () => {
  const originalGenerate =
    interpolationService.generateInterpolationSurface;

  interpolationService.generateInterpolationSurface =
    async (requestData) => {
      assert.deepEqual(requestData, {});
      return {
        success: false,
        errors: ["parameter is required."],
      };
    };

  try {
    const req = {};
    const res = createMockResponse();

    await interpolationController.prepareInterpolation(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      success: false,
      errors: ["parameter is required."],
    });
  } finally {
    interpolationService.generateInterpolationSurface =
      originalGenerate;
  }
});

test("prepareInterpolation delegates Kriging requests unchanged", async () => {
  const originalGenerate =
    interpolationService.generateInterpolationSurface;

  const requestData = {
    parameter: "ph",
    method: "kriging",
    resolution: 50,
  };

  const expectedResult = {
    success: true,
    message:
      "Kriging interpolation surface generated successfully.",
  };

  interpolationService.generateInterpolationSurface =
    async (receivedRequest) => {
      assert.deepEqual(receivedRequest, requestData);
      return expectedResult;
    };

  try {
    const req = {
      body: requestData,
    };

    const res = createMockResponse();

    await interpolationController.prepareInterpolation(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, expectedResult);
  } finally {
    interpolationService.generateInterpolationSurface =
      originalGenerate;
  }
});

test("prepareInterpolation delegates Thin-Plate Spline requests unchanged", async () => {
  const originalGenerate =
    interpolationService.generateInterpolationSurface;

  const requestData = {
    parameter: "ph",
    method: "spline",
    resolution: 50,
  };

  const expectedResult = {
    success: true,
    message:
      "Thin-Plate Spline interpolation surface generated successfully.",
  };

  interpolationService.generateInterpolationSurface =
    async (receivedRequest) => {
      assert.deepEqual(receivedRequest, requestData);
      return expectedResult;
    };

  try {
    const req = {
      body: requestData,
    };

    const res = createMockResponse();

    await interpolationController.prepareInterpolation(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, expectedResult);
  } finally {
    interpolationService.generateInterpolationSurface =
      originalGenerate;
  }
});

test("prepareInterpolation delegates Nearest-Neighbour requests unchanged", async () => {
  const originalGenerate =
    interpolationService.generateInterpolationSurface;

  const requestData = {
    parameter: "ph",
    method: "nearest_neighbour",
    resolution: 50,
  };

  const expectedResult = {
    success: true,
    message:
      "Nearest-Neighbour interpolation surface generated successfully.",
  };

  interpolationService.generateInterpolationSurface =
    async (receivedRequest) => {
      assert.deepEqual(receivedRequest, requestData);
      return expectedResult;
    };

  try {
    const req = {
      body: requestData,
    };

    const res = createMockResponse();

    await interpolationController.prepareInterpolation(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, expectedResult);
  } finally {
    interpolationService.generateInterpolationSurface =
      originalGenerate;
  }
});

test("prepareInterpolation returns validation errors from the service", async () => {
  const originalGenerate =
    interpolationService.generateInterpolationSurface;

  const error = new Error(
    "Interpolation request validation failed.",
  );

  error.statusCode = 400;

  error.validationErrors = [
    "parameter is required.",
    "method must be one of: idw, kriging, spline, nearest_neighbour.",
  ];

  interpolationService.generateInterpolationSurface =
    async () => {
      throw error;
    };

  try {
    const req = {
      body: {
        parameter: "",
        method: "invalid",
      },
    };

    const res = createMockResponse();

    await interpolationController.prepareInterpolation(req, res);

    assert.equal(res.statusCode, 400);

    assert.deepEqual(res.body, {
      success: false,
      message: "Interpolation request validation failed.",
      errors: [
        "parameter is required.",
        "method must be one of: idw, kriging, spline, nearest_neighbour.",
      ],
    });
  } finally {
    interpolationService.generateInterpolationSurface =
      originalGenerate;
  }
});

test("prepareInterpolation uses service-provided statusCode", async () => {
  const originalGenerate =
    interpolationService.generateInterpolationSurface;

  const error = new Error("Not enough samples.");
  error.statusCode = 422;

  interpolationService.generateInterpolationSurface =
    async () => {
      throw error;
    };

  try {
    const req = {
      body: {
        parameter: "ph",
        method: "spline",
      },
    };

    const res = createMockResponse();

    await interpolationController.prepareInterpolation(req, res);

    assert.equal(res.statusCode, 422);

    assert.deepEqual(res.body, {
      success: false,
      message: "Not enough samples.",
    });
  } finally {
    interpolationService.generateInterpolationSurface =
      originalGenerate;
  }
});

test("prepareInterpolation defaults unexpected service errors to HTTP 500", async () => {
  const originalGenerate =
    interpolationService.generateInterpolationSurface;

  interpolationService.generateInterpolationSurface =
    async () => {
      throw new Error("Unexpected interpolation failure.");
    };

  try {
    const req = {
      body: {
        parameter: "ph",
        method: "kriging",
      },
    };

    const res = createMockResponse();

    await interpolationController.prepareInterpolation(req, res);

    assert.equal(res.statusCode, 500);

    assert.deepEqual(res.body, {
      success: false,
      message: "Unexpected interpolation failure.",
    });
  } finally {
    interpolationService.generateInterpolationSurface =
      originalGenerate;
  }
});

test("prepareInterpolation omits non-array validationErrors", async () => {
  const originalGenerate =
    interpolationService.generateInterpolationSurface;

  const error = new Error("Invalid interpolation request.");
  error.statusCode = 400;
  error.validationErrors = "not-an-array";

  interpolationService.generateInterpolationSurface =
    async () => {
      throw error;
    };

  try {
    const req = {
      body: {
        parameter: "ph",
      },
    };

    const res = createMockResponse();

    await interpolationController.prepareInterpolation(req, res);

    assert.equal(res.statusCode, 400);

    assert.deepEqual(res.body, {
      success: false,
      message: "Invalid interpolation request.",
    });
  } finally {
    interpolationService.generateInterpolationSurface =
      originalGenerate;
  }
});

// ============================================================
// getInterpolationConfiguration()
// ============================================================

test("getInterpolationConfiguration returns HTTP 200", () => {
  const req = {};
  const res = createMockResponse();

  interpolationController.getInterpolationConfiguration(
    req,
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
});

test("getInterpolationConfiguration exposes all four interpolation methods", () => {
  const req = {};
  const res = createMockResponse();

  interpolationController.getInterpolationConfiguration(
    req,
    res,
  );

  const methodKeys = res.body.methods.map(
    (method) => method.key,
  );

  assert.deepEqual(methodKeys, [
    "idw",
    "kriging",
    "spline",
    "nearest_neighbour",
  ]);
});

test("getInterpolationConfiguration exposes all supported parameters", () => {
  const req = {};
  const res = createMockResponse();

  interpolationController.getInterpolationConfiguration(
    req,
    res,
  );

  const parameterKeys = res.body.parameters.map(
    (parameter) => parameter.key,
  );

  assert.deepEqual(parameterKeys, [
    "ph",
    "nitrogen",
    "phosphorus",
    "potassium",
    "organic_carbon",
    "electrical_conductivity",
  ]);
});

test("getInterpolationConfiguration exposes the IDW default method", () => {
  const req = {};
  const res = createMockResponse();

  interpolationController.getInterpolationConfiguration(
    req,
    res,
  );

  assert.equal(res.body.defaults.method, "idw");
});

test("getInterpolationConfiguration exposes IDW power limits", () => {
  const req = {};
  const res = createMockResponse();

  interpolationController.getInterpolationConfiguration(
    req,
    res,
  );

  assert.deepEqual(res.body.limits.power, {
    min: interpolationService.MIN_POWER,
    max: interpolationService.MAX_POWER,
  });
});

test("getInterpolationConfiguration exposes resolution limits", () => {
  const req = {};
  const res = createMockResponse();

  interpolationController.getInterpolationConfiguration(
    req,
    res,
  );

  assert.deepEqual(res.body.limits.resolution, {
    min: interpolationService.MIN_RESOLUTION,
    max: interpolationService.MAX_RESOLUTION,
  });
});

test("getInterpolationConfiguration exposes method-specific minimum sample requirements", () => {
  const req = {};
  const res = createMockResponse();

  interpolationController.getInterpolationConfiguration(
    req,
    res,
  );

  assert.deepEqual(res.body.methodRequirements, {
    idw: {
      minimumSamples: 1,
    },
    kriging: {
      minimumSamples: 2,
    },
    spline: {
      minimumSamples: 3,
    },
    nearest_neighbour: {
      minimumSamples: 1,
    },
  });
});

test("getInterpolationConfiguration exposes IDW-specific settings", () => {
  const req = {};
  const res = createMockResponse();

  interpolationController.getInterpolationConfiguration(
    req,
    res,
  );

  assert.deepEqual(res.body.methodSettings.idw, {
    power: {
      default: interpolationService.DEFAULT_POWER,
      min: interpolationService.MIN_POWER,
      max: interpolationService.MAX_POWER,
    },
  });
});

test("getInterpolationConfiguration does not expose IDW power settings for non-IDW methods", () => {
  const req = {};
  const res = createMockResponse();

  interpolationController.getInterpolationConfiguration(
    req,
    res,
  );

  assert.deepEqual(res.body.methodSettings.kriging, {});
  assert.deepEqual(res.body.methodSettings.spline, {});
  assert.deepEqual(
    res.body.methodSettings.nearest_neighbour,
    {},
  );
});

test("getInterpolationConfiguration exposes the active API phase", () => {
  const req = {};
  const res = createMockResponse();

  interpolationController.getInterpolationConfiguration(
    req,
    res,
  );

  assert.equal(
    res.body.phase,
    interpolationService.API_PHASE,
  );
});
