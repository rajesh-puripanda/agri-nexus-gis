"use strict";

// ============================================================
// server/tests/historicalCandidateController.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.4.5.2 — Historical Candidate REST API
//
// Test responsibilities:
//   1. Validate query parameters passed to the service
//   2. Validate successful service response
//   3. Validate structured service failure response
//   4. Validate unexpected service exception handling
//
// Business logic remains tested by:
//   historicalCandidateService.test.js
//
// ============================================================

const assert = require("node:assert/strict");
const test = require("node:test");

const historicalCandidateService = require(
  "../services/historicalCandidateService",
);

const historicalCandidateController = require(
  "../controllers/historicalCandidateController",
);

// ============================================================
// MOCK RESPONSE
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
// SUCCESS
// ============================================================

test("getHistoricalCandidates returns successful candidate result", async () => {
  const original =
    historicalCandidateService.getHistoricalCandidates;

  let receivedRequest = null;

  historicalCandidateService.getHistoricalCandidates =
    async (request) => {
      receivedRequest = request;

      return {
        success: true,
        phase: "10.4",
        currentSample: {
          id: 1,
          sampleCode: "S-001",
        },
        candidates: [],
        metadata: {
          candidateCount: 0,
        },
      };
    };

  try {
    const req = {
      query: {
        sampleId: "1",
        maxCandidates: "10",
      },
    };

    const res = createMockResponse();

    await historicalCandidateController.getHistoricalCandidates(
      req,
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.phase, "10.4");

    assert.deepEqual(receivedRequest, {
      sampleId: "1",
      maxCandidates: "10",
    });
  } finally {
    historicalCandidateService.getHistoricalCandidates =
      original;
  }
});

// ============================================================
// STRUCTURED SERVICE FAILURE
// ============================================================

test("getHistoricalCandidates returns structured service failure with HTTP 200", async () => {
  const original =
    historicalCandidateService.getHistoricalCandidates;

  historicalCandidateService.getHistoricalCandidates =
    async () => ({
      success: false,
      phase: "10.4",
      code: "SAMPLE_NOT_FOUND",
      message: 'Current soil sample "999999" was not found.',
    });

  try {
    const req = {
      query: {
        sampleId: "999999",
      },
    };

    const res = createMockResponse();

    await historicalCandidateController.getHistoricalCandidates(
      req,
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, false);
    assert.equal(res.body.phase, "10.4");
    assert.equal(
      res.body.code,
      "SAMPLE_NOT_FOUND",
    );
  } finally {
    historicalCandidateService.getHistoricalCandidates =
      original;
  }
});

// ============================================================
// INVALID REQUEST
// ============================================================

test("getHistoricalCandidates passes missing query parameters to the service", async () => {
  const original =
    historicalCandidateService.getHistoricalCandidates;

  let receivedRequest = null;

  historicalCandidateService.getHistoricalCandidates =
    async (request) => {
      receivedRequest = request;

      return {
        success: false,
        phase: "10.4",
        code: "INVALID_REQUEST",
        message: "Invalid historical candidate request.",
      };
    };

  try {
    const req = {
      query: {},
    };

    const res = createMockResponse();

    await historicalCandidateController.getHistoricalCandidates(
      req,
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, false);
    assert.equal(
      res.body.code,
      "INVALID_REQUEST",
    );

    assert.deepEqual(receivedRequest, {
      sampleId: undefined,
      maxCandidates: undefined,
    });
  } finally {
    historicalCandidateService.getHistoricalCandidates =
      original;
  }
});

// ============================================================
// UNEXPECTED ERROR
// ============================================================

test("getHistoricalCandidates returns HTTP 500 for unexpected service error", async () => {
  const original =
    historicalCandidateService.getHistoricalCandidates;

  historicalCandidateService.getHistoricalCandidates =
    async () => {
      throw new Error(
        "Simulated historical candidate service failure.",
      );
    };

  try {
    const req = {
      query: {
        sampleId: "1",
      },
    };

    const res = createMockResponse();

    await historicalCandidateController.getHistoricalCandidates(
      req,
      res,
    );

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
    assert.equal(res.body.phase, "10.4");
    assert.equal(res.body.code, "INTERNAL_ERROR");
    assert.equal(
      res.body.message,
      "Simulated historical candidate service failure.",
    );
  } finally {
    historicalCandidateService.getHistoricalCandidates =
      original;
  }
});

// ============================================================
// MAX CANDIDATES
// ============================================================

test("getHistoricalCandidates passes maxCandidates to the service unchanged", async () => {
  const original =
    historicalCandidateService.getHistoricalCandidates;

  let receivedRequest = null;

  historicalCandidateService.getHistoricalCandidates =
    async (request) => {
      receivedRequest = request;

      return {
        success: true,
        phase: "10.4",
        candidates: [],
      };
    };

  try {
    const req = {
      query: {
        sampleId: "1",
        maxCandidates: "50",
      },
    };

    const res = createMockResponse();

    await historicalCandidateController.getHistoricalCandidates(
      req,
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(receivedRequest, {
      sampleId: "1",
      maxCandidates: "50",
    });
  } finally {
    historicalCandidateService.getHistoricalCandidates =
      original;
  }
});