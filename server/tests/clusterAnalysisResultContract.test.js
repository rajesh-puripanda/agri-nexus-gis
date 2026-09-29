"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  REQUIRED_METHOD,
  validateParameterDescriptor,
  validateCentroid,
  validateCluster,
  validateAssignment,
  validateClusterAnalysisResult,
} = require("../scientific/statistics/clusterAnalysisResultContract");

function createValidResult() {
  return {
    type: "cluster_analysis",
    version: "1.0",
    method: "kmeans",

    parameters: [
      {
        parameter: "pH",
        unit: "pH",
      },
      {
        parameter: "nitrogen",
        unit: "kg/ha",
      },
    ],

    clusterCount: 2,
    observationCount: 4,
    clusteredObservationCount: 4,
    iterations: 5,
    converged: true,

    clusters: [
      {
        clusterId: 0,
        memberCount: 2,
        centroid: {
          pH: 6.5,
          nitrogen: 210,
        },
      },
      {
        clusterId: 1,
        memberCount: 2,
        centroid: {
          pH: 7.1,
          nitrogen: 340,
        },
      },
    ],

    assignments: [
      {
        observationId: "S-001",
        clusterId: 0,
      },
      {
        observationId: "S-002",
        clusterId: 0,
      },
      {
        observationId: "S-003",
        clusterId: 1,
      },
      {
        observationId: "S-004",
        clusterId: 1,
      },
    ],
  };
}

test("REQUIRED_METHOD is kmeans", () => {
  assert.equal(REQUIRED_METHOD, "kmeans");
});

test("valid parameter descriptor is accepted", () => {
  assert.equal(
    validateParameterDescriptor(
      {
        parameter: "pH",
        unit: "pH",
      },
      "Parameter",
    ),
    true,
  );
});

test("parameter descriptor requires parameter name", () => {
  assert.throws(
    () =>
      validateParameterDescriptor(
        {
          parameter: "",
          unit: "pH",
        },
        "Parameter",
      ),
    /parameter name is required/,
  );
});

test("parameter descriptor requires unit", () => {
  assert.throws(
    () =>
      validateParameterDescriptor(
        {
          parameter: "pH",
          unit: "",
        },
        "Parameter",
      ),
    /parameter unit is required/,
  );
});

test("valid centroid is accepted", () => {
  assert.equal(
    validateCentroid(
      {
        pH: 6.8,
        nitrogen: 220,
      },
      [
        {
          parameter: "pH",
          unit: "pH",
        },
        {
          parameter: "nitrogen",
          unit: "kg/ha",
        },
      ],
      "Cluster 0",
    ),
    true,
  );
});

test("centroid rejects non-finite values", () => {
  assert.throws(
    () =>
      validateCentroid(
        {
          pH: 6.8,
          nitrogen: NaN,
        },
        [
          {
            parameter: "pH",
            unit: "pH",
          },
          {
            parameter: "nitrogen",
            unit: "kg/ha",
          },
        ],
        "Cluster 0",
      ),
    /must be finite/,
  );
});

test("valid cluster is accepted", () => {
  assert.equal(
    validateCluster(
      {
        clusterId: 0,
        memberCount: 2,
        centroid: {
          pH: 6.5,
          nitrogen: 210,
        },
      },
      [
        {
          parameter: "pH",
          unit: "pH",
        },
        {
          parameter: "nitrogen",
          unit: "kg/ha",
        },
      ],
      0,
    ),
    true,
  );
});

test("cluster rejects negative member count", () => {
  assert.throws(
    () =>
      validateCluster(
        {
          clusterId: 0,
          memberCount: -1,
          centroid: {
            pH: 6.5,
            nitrogen: 210,
          },
        },
        [
          {
            parameter: "pH",
            unit: "pH",
          },
          {
            parameter: "nitrogen",
            unit: "kg/ha",
          },
        ],
        0,
      ),
    /memberCount must be a non-negative integer/,
  );
});

test("valid assignment is accepted", () => {
  assert.equal(
    validateAssignment(
      {
        observationId: "S-001",
        clusterId: 1,
      },
      2,
      0,
    ),
    true,
  );
});

test("assignment rejects invalid cluster reference", () => {
  assert.throws(
    () =>
      validateAssignment(
        {
          observationId: "S-001",
          clusterId: 2,
        },
        2,
        0,
      ),
    /must reference a valid cluster/,
  );
});

test("valid complete cluster analysis result is accepted", () => {
  assert.equal(
    validateClusterAnalysisResult(createValidResult()),
    true,
  );
});

test("result rejects incorrect type", () => {
  const result = createValidResult();
  result.type = "correlation_analysis";

  assert.throws(
    () => validateClusterAnalysisResult(result),
    /Invalid cluster analysis result type/,
  );
});

test("result rejects non-kmeans method", () => {
  const result = createValidResult();
  result.method = "pearson";

  assert.throws(
    () => validateClusterAnalysisResult(result),
    /method must be kmeans/,
  );
});

test("result requires at least two parameters", () => {
  const result = createValidResult();
  result.parameters = [result.parameters[0]];

  assert.throws(
    () => validateClusterAnalysisResult(result),
    /at least two parameters/,
  );
});

test("result rejects duplicate parameters", () => {
  const result = createValidResult();
  result.parameters[1] = {
    parameter: "pH",
    unit: "pH",
  };

  assert.throws(
    () => validateClusterAnalysisResult(result),
    /Duplicate cluster analysis parameter/,
  );
});

test("result rejects clusterCount below two", () => {
  const result = createValidResult();
  result.clusterCount = 1;
  result.clusters = [result.clusters[0]];

  assert.throws(
    () => validateClusterAnalysisResult(result),
    /clusterCount must be an integer greater than one/,
  );
});

test("result requires cluster array to match clusterCount", () => {
  const result = createValidResult();
  result.clusters = [result.clusters[0]];

  assert.throws(
    () => validateClusterAnalysisResult(result),
    /clusters must match clusterCount/,
  );
});

test("result rejects duplicate cluster IDs", () => {
  const result = createValidResult();
  result.clusters[1].clusterId = 0;

  assert.throws(
    () => validateClusterAnalysisResult(result),
    /Duplicate clusterId/,
  );
});

test("result rejects missing cluster IDs", () => {
  const result = createValidResult();
  result.clusters[1].clusterId = 2;

  assert.throws(
    () => validateClusterAnalysisResult(result),
    /Missing clusterId: 1/,
  );
});

test("result rejects clustered observations above observation count", () => {
  const result = createValidResult();
  result.clusteredObservationCount = 5;

  assert.throws(
    () => validateClusterAnalysisResult(result),
    /cannot exceed observation count/,
  );
});

test("result requires assignment count to match clustered observation count", () => {
  const result = createValidResult();
  result.assignments.pop();

  assert.throws(
    () => validateClusterAnalysisResult(result),
    /assignment count must match clusteredObservationCount/,
  );
});

test("result rejects duplicate observation assignments", () => {
  const result = createValidResult();
  result.assignments[1].observationId = "S-001";

  assert.throws(
    () => validateClusterAnalysisResult(result),
    /Duplicate observation assignment/,
  );
});

test("result requires member counts to match assignments", () => {
  const result = createValidResult();
  result.clusters[0].memberCount = 1;

  assert.throws(
    () => validateClusterAnalysisResult(result),
    /member counts must equal clusteredObservationCount/,
  );
});

test("result requires converged to be boolean", () => {
  const result = createValidResult();
  result.converged = "true";

  assert.throws(
    () => validateClusterAnalysisResult(result),
    /converged must be boolean/,
  );
});

test("result rejects non-finite centroid values", () => {
  const result = createValidResult();
  result.clusters[0].centroid.nitrogen = Infinity;

  assert.throws(
    () => validateClusterAnalysisResult(result),
    /must be finite/,
  );
});

test("result rejects negative iterations", () => {
  const result = createValidResult();
  result.iterations = -1;

  assert.throws(
    () => validateClusterAnalysisResult(result),
    /iterations must be a non-negative integer/,
  );
});