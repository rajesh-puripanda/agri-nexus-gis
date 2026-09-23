"use strict";

// ============================================================
// server/tests/historicalComparisonController.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.4.3 — Historical Comparison REST API
// Controller Regression Tests
//
// Responsibilities tested:
//   1. HTTP request extraction
//   2. Service delegation
//   3. Successful response contract
//   4. Structured service failures
//   5. Unexpected service errors
//
// Scientific calculation and classification are NOT tested here.
// Those responsibilities belong to:
//   historicalComparisonService.test.js
//
// ============================================================

const assert = require("assert");

const historicalComparisonService = require("../services/historicalComparisonService");
const historicalComparisonController = require("../controllers/historicalComparisonController");

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

function createMockRequest(query = {}) {
  return {
    query,
  };
}

async function withServiceMock(mockImplementation, testFunction) {
  const original = historicalComparisonService.getHistoricalComparison;

  historicalComparisonService.getHistoricalComparison = mockImplementation;

  try {
    await testFunction();
  } finally {
    historicalComparisonService.getHistoricalComparison = original;
  }
}

async function runTest(name, testFunction) {
  try {
    await testFunction();

    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);

    console.error(error.message);

    process.exitCode = 1;
  }
}

// ============================================================
// SUCCESS RESULT FIXTURE
// ============================================================

const SUCCESS_RESULT = {
  success: true,

  phase: "10.4",

  comparison: {
    eligible: true,

    eligibilityReason: null,

    dataset: {
      id: 2,
      code: "H2",
      name: "Visakhapatnam Kharif Rice Soil Fertility Dataset",
      publicationYear: 2020,
      status: "active",
    },

    site: {
      mandal: "Paderu",
      siteNo: 1,
      latitude: 18.0833,
      longitude: 82.6667,
    },

    depth: {
      fromCm: 0,
      toCm: 15,
      compatible: true,
    },

    parameter: {
      key: "ph",
      label: "pH",
      unit: "pH",
    },

    observations: [
      {
        sampleId: 1,
        sampleCode: "H2-PADERU-01-BEFORE",
        stage: "Before sowing",
        collectionPeriod: {
          start: "2019-06-01",
          end: "2019-06-15",
        },
        value: 6,
        classification: "Acidic",
        depthFromCm: 0,
        depthToCm: 15,
        sourceStatus: "verified",
      },

      {
        sampleId: 2,
        sampleCode: "H2-PADERU-01-DURING",
        stage: "During growth",
        collectionPeriod: {
          start: "2019-08-01",
          end: "2019-08-15",
        },
        value: 6.5,
        classification: "Neutral",
        depthFromCm: 0,
        depthToCm: 15,
        sourceStatus: "verified",
      },
    ],

    changes: [
      {
        fromStage: "Before sowing",
        toStage: "During growth",
        fromValue: 6,
        toValue: 6.5,
        absoluteChange: 0.5,
        percentageChange: 8.333333,
        comparisonEligible: true,
        reason: null,
        classificationTransition: {
          from: "Acidic",
          to: "Neutral",
          changed: true,
        },
      },
    ],
  },

  metadata: {
    classificationLocation: "backend",
    calculationLocation: "backend",
    source: "historical_database",
    generatedAt: "2026-09-10T00:00:00.000Z",
  },
};

// ============================================================
// TESTS
// ============================================================

// ------------------------------------------------------------
// 1. SUCCESSFUL REQUEST
// ------------------------------------------------------------

runTest("successful historical comparison returns HTTP 200", async () => {
  await withServiceMock(
    async () => SUCCESS_RESULT,
    async () => {
      const req = createMockRequest({
        datasetCode: "H2",
        mandal: "Paderu",
        siteNo: "1",
        parameter: "ph",
      });

      const res = createMockResponse();

      await historicalComparisonController.getHistoricalComparison(req, res);

      assert.strictEqual(res.statusCode, 200);

      assert.deepStrictEqual(res.body, SUCCESS_RESULT);
    },
  );
});

// ------------------------------------------------------------
// 2. REQUEST PARAMETERS ARE DELEGATED CORRECTLY
// ------------------------------------------------------------

runTest("request parameters are delegated to the service", async () => {
  let receivedRequest = null;

  await withServiceMock(
    async (request) => {
      receivedRequest = request;

      return SUCCESS_RESULT;
    },
    async () => {
      const req = createMockRequest({
        datasetCode: "H2",
        mandal: "Paderu",
        siteNo: "1",
        parameter: "nitrogen",
      });

      const res = createMockResponse();

      await historicalComparisonController.getHistoricalComparison(req, res);

      assert.deepStrictEqual(receivedRequest, {
        datasetCode: "H2",
        mandal: "Paderu",
        siteNo: "1",
        parameter: "nitrogen",
        stages: undefined,
      });
    },
  );
});

// ------------------------------------------------------------
// 3. OPTIONAL STAGES ARE PASSED AS AN ARRAY
// ------------------------------------------------------------

runTest("optional stages are passed to the service", async () => {
  let receivedRequest = null;

  await withServiceMock(
    async (request) => {
      receivedRequest = request;

      return SUCCESS_RESULT;
    },
    async () => {
      const req = createMockRequest({
        datasetCode: "H2",
        mandal: "Paderu",
        siteNo: "1",
        parameter: "ph",
        stages: ["Before sowing", "After harvesting"],
      });

      const res = createMockResponse();

      await historicalComparisonController.getHistoricalComparison(req, res);

      assert.deepStrictEqual(receivedRequest.stages, [
        "Before sowing",
        "After harvesting",
      ]);
    },
  );
});

// ------------------------------------------------------------
// 4. INVALID REQUEST RESULT IS PRESERVED
// ------------------------------------------------------------

runTest("invalid request result is preserved", async () => {
  const failureResult = {
    success: false,
    phase: "10.4",
    code: "INVALID_REQUEST",
    message: "datasetCode is required.",
  };

  await withServiceMock(
    async () => failureResult,
    async () => {
      const req = createMockRequest({
        datasetCode: "",
        mandal: "Paderu",
        siteNo: "1",
        parameter: "ph",
      });

      const res = createMockResponse();

      await historicalComparisonController.getHistoricalComparison(req, res);

      assert.strictEqual(res.statusCode, 200);

      assert.deepStrictEqual(res.body, failureResult);
    },
  );
});

// ------------------------------------------------------------
// 5. DATASET NOT FOUND RESULT IS PRESERVED
// ------------------------------------------------------------

runTest("dataset not found result is preserved", async () => {
  const failureResult = {
    success: false,
    phase: "10.4",
    code: "DATASET_NOT_FOUND",
    message: 'Historical dataset "H99" was not found.',
  };

  await withServiceMock(
    async () => failureResult,
    async () => {
      const req = createMockRequest({
        datasetCode: "H99",
        mandal: "Paderu",
        siteNo: "1",
        parameter: "ph",
      });

      const res = createMockResponse();

      await historicalComparisonController.getHistoricalComparison(req, res);

      assert.strictEqual(res.statusCode, 200);

      assert.deepStrictEqual(res.body, failureResult);
    },
  );
});

// ------------------------------------------------------------
// 6. SITE NOT FOUND RESULT IS PRESERVED
// ------------------------------------------------------------

runTest("site not found result is preserved", async () => {
  const failureResult = {
    success: false,
    phase: "10.4",
    code: "SITE_NOT_FOUND",
    message: "No historical observations were found for the requested site.",
  };

  await withServiceMock(
    async () => failureResult,
    async () => {
      const req = createMockRequest({
        datasetCode: "H2",
        mandal: "Paderu",
        siteNo: "999",
        parameter: "ph",
      });

      const res = createMockResponse();

      await historicalComparisonController.getHistoricalComparison(req, res);

      assert.strictEqual(res.statusCode, 200);

      assert.deepStrictEqual(res.body, failureResult);
    },
  );
});

// ------------------------------------------------------------
// 7. EXCLUDED SITE RESULT IS PRESERVED
// ------------------------------------------------------------

runTest("excluded site result is preserved", async () => {
  const failureResult = {
    success: false,
    phase: "10.4",
    code: "SITE_EXCLUDED",
    message: "Historical site is excluded from analytical comparison.",
    exclusion: {
      datasetCode: "H2",
      mandal: "Paderu",
      siteNo: 1,
      records: [
        {
          reason: "Quality control exclusion",
        },
      ],
    },
  };

  await withServiceMock(
    async () => failureResult,
    async () => {
      const req = createMockRequest({
        datasetCode: "H2",
        mandal: "Paderu",
        siteNo: "1",
        parameter: "ph",
      });

      const res = createMockResponse();

      await historicalComparisonController.getHistoricalComparison(req, res);

      assert.strictEqual(res.statusCode, 200);

      assert.deepStrictEqual(res.body, failureResult);
    },
  );
});

// ------------------------------------------------------------
// 8. STAGE NOT FOUND RESULT IS PRESERVED
// ------------------------------------------------------------

runTest("stage not found result is preserved", async () => {
  const failureResult = {
    success: false,
    phase: "10.4",
    code: "STAGE_NOT_FOUND",
    message: "One or more requested historical stages are unavailable.",
    missingStages: ["After harvesting"],
    availableStages: ["Before sowing", "During growth"],
  };

  await withServiceMock(
    async () => failureResult,
    async () => {
      const req = createMockRequest({
        datasetCode: "H2",
        mandal: "Paderu",
        siteNo: "1",
        parameter: "ph",
        stages: ["Before sowing", "After harvesting"],
      });

      const res = createMockResponse();

      await historicalComparisonController.getHistoricalComparison(req, res);

      assert.strictEqual(res.statusCode, 200);

      assert.deepStrictEqual(res.body, failureResult);
    },
  );
});

// ------------------------------------------------------------
// 9. INSUFFICIENT STAGES RESULT IS PRESERVED
// ------------------------------------------------------------

runTest("insufficient stages result is preserved", async () => {
  const failureResult = {
    success: false,
    phase: "10.4",
    code: "INSUFFICIENT_STAGES",
    message: "At least two historical stages are required for comparison.",
  };

  await withServiceMock(
    async () => failureResult,
    async () => {
      const req = createMockRequest({
        datasetCode: "H2",
        mandal: "Paderu",
        siteNo: "1",
        parameter: "ph",
      });

      const res = createMockResponse();

      await historicalComparisonController.getHistoricalComparison(req, res);

      assert.strictEqual(res.statusCode, 200);

      assert.deepStrictEqual(res.body, failureResult);
    },
  );
});

// ------------------------------------------------------------
// 10. UNEXPECTED SERVICE ERROR RETURNS HTTP 500
// ------------------------------------------------------------

runTest("unexpected service error returns HTTP 500", async () => {
  await withServiceMock(
    async () => {
      throw new Error("Database connection unexpectedly failed.");
    },
    async () => {
      const req = createMockRequest({
        datasetCode: "H2",
        mandal: "Paderu",
        siteNo: "1",
        parameter: "ph",
      });

      const res = createMockResponse();

      await historicalComparisonController.getHistoricalComparison(req, res);

      assert.strictEqual(res.statusCode, 500);

      assert.strictEqual(res.body.success, false);

      assert.strictEqual(res.body.phase, "10.4");

      assert.strictEqual(res.body.code, "INTERNAL_ERROR");

      assert.strictEqual(
        res.body.message,
        "Database connection unexpectedly failed.",
      );
    },
  );
});

// ------------------------------------------------------------
// 11. HTTP RESPONSE PRESERVES PHASE
// ------------------------------------------------------------

runTest("successful response preserves phase 10.4", async () => {
  await withServiceMock(
    async () => SUCCESS_RESULT,
    async () => {
      const req = createMockRequest({
        datasetCode: "H2",
        mandal: "Paderu",
        siteNo: "1",
        parameter: "ph",
      });

      const res = createMockResponse();

      await historicalComparisonController.getHistoricalComparison(req, res);

      assert.strictEqual(res.body.phase, "10.4");
    },
  );
});

// ------------------------------------------------------------
// 12. COMPARISON CONTRACT IS PRESERVED
// ------------------------------------------------------------

runTest("successful response preserves comparison contract", async () => {
  await withServiceMock(
    async () => SUCCESS_RESULT,
    async () => {
      const req = createMockRequest({
        datasetCode: "H2",
        mandal: "Paderu",
        siteNo: "1",
        parameter: "ph",
      });

      const res = createMockResponse();

      await historicalComparisonController.getHistoricalComparison(req, res);

      assert.ok(res.body.comparison);

      assert.strictEqual(res.body.comparison.eligible, true);

      assert.ok(Array.isArray(res.body.comparison.observations));

      assert.ok(Array.isArray(res.body.comparison.changes));
    },
  );
});

// ------------------------------------------------------------
// 13. METADATA CONTRACT IS PRESERVED
// ------------------------------------------------------------

runTest("successful response preserves metadata contract", async () => {
  await withServiceMock(
    async () => SUCCESS_RESULT,
    async () => {
      const req = createMockRequest({
        datasetCode: "H2",
        mandal: "Paderu",
        siteNo: "1",
        parameter: "ph",
      });

      const res = createMockResponse();

      await historicalComparisonController.getHistoricalComparison(req, res);

      assert.strictEqual(res.body.metadata.classificationLocation, "backend");

      assert.strictEqual(res.body.metadata.calculationLocation, "backend");

      assert.strictEqual(res.body.metadata.source, "historical_database");

      assert.ok(res.body.metadata.generatedAt);
    },
  );
});

// ============================================================
// REGRESSION SUMMARY
// ============================================================

process.on("exit", () => {
  console.log("");

  console.log("============================================================");

  console.log("Historical Comparison Controller Regression Summary");

  console.log("============================================================");

  console.log("Tests completed through controller-level execution.");

  console.log("============================================================");
});
