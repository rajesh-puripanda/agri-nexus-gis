"use strict";

// ============================================================
// server/tests/reports/analyticalReportController.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.6.5 - Integrated Analytical GIS Reporting API
//
// Controller-level HTTP contract tests only.
// Scientific/report aggregation logic is tested separately.
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const controllerPath =
  "../../controllers/analyticalReportController";

const servicePath =
  "../../services/reports/analyticalReportAggregationService";

function createResponseMock() {
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

function loadControllerWithServiceMock(buildReport) {
  delete require.cache[require.resolve(servicePath)];
  delete require.cache[require.resolve(controllerPath)];

  require.cache[require.resolve(servicePath)] = {
    id: require.resolve(servicePath),
    filename: require.resolve(servicePath),
    loaded: true,
    exports: {
      buildIntegratedAnalyticalGISReport: buildReport,
    },
  };

  return require(controllerPath);
}

test(
  "controller passes request body to aggregation service and returns 200 report",
  async () => {
    let receivedRequest = null;

    const report = {
      contractVersion: "1.0",
      reportType: "integrated_analytical_gis",
      status: "complete",
    };

    const controller =
      loadControllerWithServiceMock(async (request) => {
        receivedRequest = request;
        return report;
      });

    const requestBody = {
      sampleIds: ["S-001"],
      parameter: "pH",
      includeInterpolation: true,
    };

    const req = {
      body: requestBody,
    };

    const res = createResponseMock();

    await controller.generateIntegratedAnalyticalGISReport(req, res);

    assert.strictEqual(receivedRequest, requestBody);
    assert.strictEqual(res.statusCode, 200);

    assert.deepStrictEqual(res.body, {
      success: true,
      data: report,
    });
  },
);

test(
  "controller passes empty object when request body is missing",
  async () => {
    let receivedRequest = null;

    const controller =
      loadControllerWithServiceMock(async (request) => {
        receivedRequest = request;

        return {
          contractVersion: "1.0",
          reportType: "integrated_analytical_gis",
          status: "complete",
        };
      });

    const req = {};
    const res = createResponseMock();

    await controller.generateIntegratedAnalyticalGISReport(req, res);

    assert.deepStrictEqual(receivedRequest, {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
  },
);

test(
  "controller preserves service statusCode",
  async () => {
    const error = new Error("Invalid report request.");
    error.statusCode = 400;

    const controller =
      loadControllerWithServiceMock(async () => {
        throw error;
      });

    const req = {
      body: {
        parameter: "invalid",
      },
    };

    const res = createResponseMock();

    await controller.generateIntegratedAnalyticalGISReport(req, res);

    assert.strictEqual(res.statusCode, 400);

    assert.deepStrictEqual(res.body, {
      success: false,
      message: "Invalid report request.",
    });
  },
);

test(
  "controller includes validation errors when supplied by service",
  async () => {
    const error = new Error("Validation failed.");
    error.statusCode = 400;
    error.validationErrors = [
      {
        field: "sampleIds",
        message: "sampleIds must be an array.",
      },
    ];

    const controller =
      loadControllerWithServiceMock(async () => {
        throw error;
      });

    const req = {
      body: {
        sampleIds: "S-001",
      },
    };

    const res = createResponseMock();

    await controller.generateIntegratedAnalyticalGISReport(req, res);

    assert.strictEqual(res.statusCode, 400);

    assert.deepStrictEqual(res.body, {
      success: false,
      message: "Validation failed.",
      errors: error.validationErrors,
    });
  },
);

test(
  "controller omits invalid non-array validationErrors",
  async () => {
    const error = new Error("Validation failed.");
    error.statusCode = 400;
    error.validationErrors = "invalid";

    const controller =
      loadControllerWithServiceMock(async () => {
        throw error;
      });

    const req = {
      body: {},
    };

    const res = createResponseMock();

    await controller.generateIntegratedAnalyticalGISReport(req, res);

    assert.strictEqual(res.statusCode, 400);

    assert.deepStrictEqual(res.body, {
      success: false,
      message: "Validation failed.",
    });
  },
);

test(
  "controller defaults unexpected service errors to HTTP 500",
  async () => {
    const controller =
      loadControllerWithServiceMock(async () => {
        throw new Error("Unexpected database failure.");
      });

    const req = {
      body: {},
    };

    const res = createResponseMock();

    await controller.generateIntegratedAnalyticalGISReport(req, res);

    assert.strictEqual(res.statusCode, 500);

    assert.deepStrictEqual(res.body, {
      success: false,
      message: "Unexpected database failure.",
    });
  },
);

test(
  "controller defaults missing error message",
  async () => {
    const controller =
      loadControllerWithServiceMock(async () => {
        throw {};
      });

    const req = {
      body: {},
    };

    const res = createResponseMock();

    await controller.generateIntegratedAnalyticalGISReport(req, res);

    assert.strictEqual(res.statusCode, 500);

    assert.deepStrictEqual(res.body, {
      success: false,
      message:
        "Failed to generate integrated analytical GIS report.",
    });
  },
);
