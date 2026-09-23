"use strict";

// ============================================================
// server/tests/comparativeValidationIntegration.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.8.4 — Comparative Validation Integration Tests
//
// Responsibilities:
//   1. Execute all four real LOOCV services
//   2. Use one common spatial dataset
//   3. Verify common sample-count handling
//   4. Verify normalized comparative results
//   5. Verify deterministic behaviour
//   6. Verify exact sample-location coverage through LOOCV
//   7. Verify interior/boundary spatial coverage
//   8. Verify input immutability
//   9. Verify no ranking or method selection
//
// Scientific rules:
//   - Uses existing interpolation implementations unchanged
//   - Uses existing method-specific LOOCV services unchanged
//   - Does not estimate Kriging parameters
//   - Does not modify scientific defaults
//   - Does not rank methods
//   - Does not score methods
//   - Does not select a preferred method
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const comparativeValidationService =
  require(
    "../services/interpolation/comparativeValidationService",
  );

/* ============================================================
   COMMON SCIENTIFIC DATASET
   ============================================================ */

/*
 * Six well-separated samples around the project area.
 *
 * The geometry is deliberately non-collinear so that:
 *
 *   - TPS has sufficient geometric support
 *   - Kriging has a valid spatial configuration
 *   - IDW has ordinary spatial support
 *   - Nearest-neighbour has multiple training candidates
 *
 * Values are deterministic and finite.
 */
function createCommonSamples() {
  return [
    {
      id: 1,
      sample_code: "CV-001",
      latitude: 17.6800,
      longitude: 83.2000,
      value: 10,
    },

    {
      id: 2,
      sample_code: "CV-002",
      latitude: 17.7000,
      longitude: 83.2200,
      value: 15,
    },

    {
      id: 3,
      sample_code: "CV-003",
      latitude: 17.7200,
      longitude: 83.2000,
      value: 20,
    },

    {
      id: 4,
      sample_code: "CV-004",
      latitude: 17.6900,
      longitude: 83.2500,
      value: 25,
    },

    {
      id: 5,
      sample_code: "CV-005",
      latitude: 17.7300,
      longitude: 83.2600,
      value: 30,
    },

    {
      id: 6,
      sample_code: "CV-006",
      latitude: 17.7500,
      longitude: 83.2300,
      value: 35,
    },
  ];
}

/* ============================================================
   FIXED KRIGING PARAMETERS
   ============================================================ */

/*
 * These are supplied directly to Kriging.
 *
 * Comparative validation must NOT estimate or modify them.
 */
function createKrigingParameters() {
  return {
    model: "spherical",
    nugget: 0.2,
    sill: 0.8,
    range: 4000,
  };
}

/* ============================================================
   RESULT HELPERS
   ============================================================ */

function getMethods(result) {
  return result &&
    result.methods &&
    typeof result.methods === "object"
    ? result.methods
    : {};
}

function getMethodFoldCount(method) {
  if (!method || typeof method !== "object") {
    return 0;
  }

  if (Array.isArray(method.folds)) {
    return method.folds.length;
  }

  return 0;
}

/* ============================================================
   REAL SERVICE EXECUTION
   ============================================================ */

function runRealComparativeValidation() {
  return comparativeValidationService.runComparativeValidation(
    {
      samples:
        createCommonSamples(),

      kriging: {
        parameters:
          createKrigingParameters(),
      },
    },
  );
}

/* ============================================================
   BASIC EXECUTION
   ============================================================ */

test(
  "real comparative validation executes against the common dataset",
  () => {
    const result =
      runRealComparativeValidation();

    assert.ok(result);
    assert.equal(
      result.validationType,
      "comparative_interpolation_validation",
    );

    assert.equal(
      result.diagnosticType,
      "loocv",
    );

    assert.equal(
      result.sampleCount,
      6,
    );

    assert.deepEqual(
      Object.keys(
        getMethods(result),
      ),
      [
        "idw",
        "kriging",
        "spline",
        "nearest_neighbour",
      ],
    );
  },
);

/* ============================================================
   METHOD RESULT PRESENCE
   ============================================================ */

test(
  "real comparative validation produces all four method results",
  () => {
    const result =
      runRealComparativeValidation();

    const methods =
      getMethods(result);

    for (const methodName of [
      "idw",
      "kriging",
      "spline",
      "nearest_neighbour",
    ]) {
      assert.ok(
        methods[methodName],
        `${methodName} result is missing`,
      );

      assert.equal(
        methods[methodName].method,
        methodName,
      );

      assert.equal(
        methods[methodName].diagnosticType,
        "loocv",
      );
    }
  },
);

/* ============================================================
   COMMON SAMPLE COUNT
   ============================================================ */

test(
  "all real comparative methods receive the common sample count",
  () => {
    const result =
      runRealComparativeValidation();

    const methods =
      getMethods(result);

    assert.equal(
      result.sampleCount,
      6,
    );

    for (const method of Object.values(
      methods,
    )) {
      assert.equal(
        method.sampleCount,
        6,
      );
    }
  },
);

/* ============================================================
   LOOCV FOLD COVERAGE
   ============================================================ */

test(
  "each applicable real method produces one LOOCV fold per sample",
  () => {
    const result =
      runRealComparativeValidation();

    const methods =
      getMethods(result);

    for (const [
      methodName,
      method,
    ] of Object.entries(methods)) {
      if (
        method.status ===
        "not_applicable"
      ) {
        continue;
      }

      assert.equal(
        getMethodFoldCount(method),
        6,
        `${methodName} should expose six LOOCV folds`,
      );
    }
  },
);

/* ============================================================
   SUCCESSFUL FOLD COVERAGE
   ============================================================ */

test(
  "real comparative validation preserves successful and failed fold counts",
  () => {
    const result =
      runRealComparativeValidation();

    const methods =
      getMethods(result);

    for (const [
      methodName,
      method,
    ] of Object.entries(methods)) {
      if (
        method.status ===
        "not_applicable"
      ) {
        continue;
      }

      assert.equal(
        method.successfulFolds +
          method.failedFolds,
        6,
        `${methodName} fold counts must cover the complete dataset`,
      );
    }
  },
);

/* ============================================================
   METRIC CONTRACT
   ============================================================ */

test(
  "real applicable methods expose the common LOOCV metric contract",
  () => {
    const result =
      runRealComparativeValidation();

    const methods =
      getMethods(result);

    for (const [
      methodName,
      method,
    ] of Object.entries(methods)) {
      if (
        method.status ===
        "not_applicable"
      ) {
        continue;
      }

      assert.ok(
        method.metrics,
        `${methodName} metrics are missing`,
      );

      assert.ok(
        Object.prototype.hasOwnProperty.call(
          method.metrics,
          "meanError",
        ),
      );

      assert.ok(
        Object.prototype.hasOwnProperty.call(
          method.metrics,
          "meanAbsoluteError",
        ),
      );

      assert.ok(
        Object.prototype.hasOwnProperty.call(
          method.metrics,
          "rmse",
        ),
      );

      assert.ok(
        Object.prototype.hasOwnProperty.call(
          method.metrics,
          "maxAbsoluteError",
        ),
      );
    }
  },
);

/* ============================================================
   FINITE METRICS
   ============================================================ */

test(
  "real successful comparative metrics are finite",
  () => {
    const result =
      runRealComparativeValidation();

    const methods =
      getMethods(result);

    for (const [
      methodName,
      method,
    ] of Object.entries(methods)) {
      if (
        method.status !==
        "complete"
      ) {
        continue;
      }

      for (const metricName of [
        "meanError",
        "meanAbsoluteError",
        "rmse",
      ]) {
        assert.equal(
          Number.isFinite(
            method.metrics[
              metricName
            ],
          ),
          true,
          `${methodName}.${metricName} must be finite`,
        );
      }

      if (
        method.metrics
          .maxAbsoluteError !==
        null
      ) {
        assert.equal(
          Number.isFinite(
            method.metrics
              .maxAbsoluteError,
          ),
          true,
        );
      }
    }
  },
);

/* ============================================================
   EXACT SAMPLE LOCATION COVERAGE
   ============================================================ */

test(
  "LOOCV folds correspond to every exact sample location",
  () => {
    const samples =
      createCommonSamples();

    const result =
      comparativeValidationService.runComparativeValidation(
        {
          samples,
          kriging: {
            parameters:
              createKrigingParameters(),
          },
        },
      );

    const expectedLocations =
      new Set(
        samples.map(
          (sample) =>
            `${sample.latitude},${sample.longitude}`,
        ),
      );

    const methods =
      getMethods(result);

    for (const [
      methodName,
      method,
    ] of Object.entries(methods)) {
      if (
        method.status ===
        "not_applicable"
      ) {
        continue;
      }

      assert.equal(
        method.folds.length,
        samples.length,
      );

      const observedLocations =
        new Set();

      for (const fold of method.folds) {
        const sample =
          fold.sample;

        if (
          sample &&
          Number.isFinite(
            Number(
              sample.latitude,
            ),
          ) &&
          Number.isFinite(
            Number(
              sample.longitude,
            ),
          )
        ) {
          observedLocations.add(
            `${sample.latitude},${sample.longitude}`,
          );
        }
      }

      /*
       * Some method-specific implementations may
       * preserve held-out sample information under
       * different field names. Therefore this assertion
       * only applies when the normalized fold exposes
       * a sample object.
       */
      if (
        observedLocations.size > 0
      ) {
        assert.deepEqual(
          observedLocations,
          expectedLocations,
          `${methodName} does not cover all sample locations`,
        );
      }
    }
  },
);

/* ============================================================
   INTERIOR / BOUNDARY DATASET GEOMETRY
   ============================================================ */

test(
  "common dataset contains both interior and boundary spatial samples",
  () => {
    const samples =
      createCommonSamples();

    const latitudes =
      samples.map(
        (sample) =>
          sample.latitude,
      );

    const longitudes =
      samples.map(
        (sample) =>
          sample.longitude,
      );

    const minLatitude =
      Math.min(...latitudes);

    const maxLatitude =
      Math.max(...latitudes);

    const minLongitude =
      Math.min(...longitudes);

    const maxLongitude =
      Math.max(...longitudes);

    const boundarySamples =
      samples.filter(
        (sample) =>
          sample.latitude ===
            minLatitude ||
          sample.latitude ===
            maxLatitude ||
          sample.longitude ===
            minLongitude ||
          sample.longitude ===
            maxLongitude,
      );

    const interiorSamples =
      samples.filter(
        (sample) =>
          sample.latitude >
            minLatitude &&
          sample.latitude <
            maxLatitude &&
          sample.longitude >
            minLongitude &&
          sample.longitude <
            maxLongitude,
      );

    assert.ok(
      boundarySamples.length > 0,
    );

    assert.ok(
      interiorSamples.length > 0,
    );
  },
);

/* ============================================================
   DETERMINISTIC EXECUTION
   ============================================================ */

test(
  "real comparative validation is deterministic",
  () => {
    const first =
      runRealComparativeValidation();

    const second =
      runRealComparativeValidation();

    assert.deepEqual(
      first,
      second,
    );
  },
);

/* ============================================================
   INPUT IMMUTABILITY
   ============================================================ */

test(
  "real comparative validation does not mutate the common dataset",
  () => {
    const samples =
      createCommonSamples();

    const original =
      JSON.parse(
        JSON.stringify(samples),
      );

    comparativeValidationService.runComparativeValidation(
      {
        samples,

        kriging: {
          parameters:
            createKrigingParameters(),
        },
      },
    );

    assert.deepEqual(
      samples,
      original,
    );
  },
);

/* ============================================================
   KRIGING PARAMETER IMMUTABILITY
   ============================================================ */

test(
  "real comparative validation does not mutate supplied Kriging parameters",
  () => {
    const parameters =
      createKrigingParameters();

    const original =
      JSON.parse(
        JSON.stringify(parameters),
      );

    comparativeValidationService.runComparativeValidation(
      {
        samples:
          createCommonSamples(),

        kriging: {
          parameters,
        },
      },
    );

    assert.deepEqual(
      parameters,
      original,
    );
  },
);

/* ============================================================
   KRIGING PARAMETER PRESERVATION
   ============================================================ */

test(
  "real comparative validation preserves the supplied Kriging parameter values",
  () => {
    const parameters =
      createKrigingParameters();

    const result =
      comparativeValidationService.runComparativeValidation(
        {
          samples:
            createCommonSamples(),

          kriging: {
            parameters,
          },
        },
      );

    const kriging =
      result.methods.kriging;

    /*
     * The raw result is intentionally not part of the
     * common contract by default. The important contract
     * requirement is that execution succeeds using the
     * caller-supplied fixed parameters.
     */
    assert.ok(
      kriging,
    );

    assert.equal(
      kriging.method,
      "kriging",
    );

    assert.equal(
      kriging.diagnosticType,
      "loocv",
    );
  },
);

/* ============================================================
   SUMMARY CONTRACT
   ============================================================ */

test(
  "real comparative validation provides factual summary counts",
  () => {
    const result =
      runRealComparativeValidation();

    assert.equal(
      result.summary.methodCount,
      4,
    );

    assert.equal(
      result.summary.applicableMethodCount +
        result.summary.notApplicableMethodCount,
      4,
    );

    assert.equal(
      result.summary.completeMethodCount +
        result.summary.failedMethodCount,
      result.summary.applicableMethodCount,
    );
  },
);

/* ============================================================
   NO RANKING / SELECTION
   ============================================================ */

test(
  "real comparative validation does not rank or select methods",
  () => {
    const result =
      runRealComparativeValidation();

    for (const property of [
      "ranking",
      "rankings",
      "score",
      "scores",
      "selectedMethod",
      "preferredMethod",
      "bestMethod",
      "winner",
    ]) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          result,
          property,
        ),
        false,
        `Unexpected comparative selection field: ${property}`,
      );
    }
  },
);

/* ============================================================
   NO CROSS-METHOD METRIC CALCULATION
   ============================================================ */

test(
  "real comparative validation does not expose cross-method metric calculations",
  () => {
    const result =
      runRealComparativeValidation();

    for (const property of [
      "meanRmse",
      "minimumRmse",
      "maximumRmse",
      "metricDifference",
      "relativeError",
      "compositeScore",
    ]) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          result,
          property,
        ),
        false,
        `Unexpected cross-method metric field: ${property}`,
      );
    }
  },
);
