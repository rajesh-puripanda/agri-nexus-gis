"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_MAX_ITERATIONS,
  DEFAULT_TOLERANCE,
  PARAMETER_DEFINITIONS,
  validateParameter,
  validateParameters,
  validateClusterCount,
  validateOptions,
  extractObservationId,
  extractClusterObservations,
  calculateFeatureStatistics,
  standardizeFeatures,
  calculateSquaredDistance,
  initializeCentroids,
  assignClusters,
  recalculateCentroids,
  calculateCentroidShift,
  performKMeans,
  convertCentroidsToOriginalUnits,
  buildClusterObjects,
  buildClusterAssignments,
  buildClusterAnalysisResult,
} = require("../services/clusterAnalysisService");

function createSample(
  sampleCode,
  pH,
  nitrogen,
  phosphorus = 20,
  potassium = 240,
  organicCarbon = 0.72,
  electricalConductivity = 0.35,
) {
  return {
    id: sampleCode,
    sample_code: sampleCode,
    latitude: 17.71234,
    longitude: 83.30125,
    ph: pH,
    nitrogen,
    phosphorus,
    potassium,
    organic_carbon: organicCarbon,
    electrical_conductivity: electricalConductivity,
    soil_texture: "Loamy",
  };
}

function createClusterSamples() {
  return [
    createSample("S-001", 6.4, 100),
    createSample("S-002", 6.5, 110),
    createSample("S-003", 6.6, 105),
    createSample("S-004", 7.2, 300),
    createSample("S-005", 7.3, 310),
    createSample("S-006", 7.4, 305),
  ];
}

test("default clustering constants are defined", () => {
  assert.equal(DEFAULT_MAX_ITERATIONS, 100);
  assert.equal(DEFAULT_TOLERANCE, 1e-8);
});

test("parameter definitions preserve soil units", () => {
  assert.equal(PARAMETER_DEFINITIONS.pH.unit, "pH");
  assert.equal(PARAMETER_DEFINITIONS.nitrogen.unit, "kg/ha");
  assert.equal(PARAMETER_DEFINITIONS.phosphorus.unit, "kg/ha");
  assert.equal(PARAMETER_DEFINITIONS.potassium.unit, "kg/ha");
  assert.equal(PARAMETER_DEFINITIONS.organicCarbon.unit, "%");
  assert.equal(
    PARAMETER_DEFINITIONS.electricalConductivity.unit,
    "dS/m",
  );
});

test("valid cluster parameter is accepted", () => {
  assert.equal(validateParameter("pH"), true);
  assert.equal(validateParameter("nitrogen"), true);
});

test("unsupported cluster parameter is rejected", () => {
  assert.throws(
    () => validateParameter("rainfall"),
    /Unsupported cluster analysis parameter/,
  );
});

test("cluster parameters require at least two parameters", () => {
  assert.throws(
    () => validateParameters(["pH"]),
    /at least two parameters/,
  );
});

test("duplicate cluster parameters are rejected", () => {
  assert.throws(
    () => validateParameters(["pH", "pH"]),
    /Duplicate cluster analysis parameter/,
  );
});

test("valid parameter selection is accepted", () => {
  assert.equal(
    validateParameters([
      "pH",
      "nitrogen",
      "phosphorus",
    ]),
    true,
  );
});

test("cluster count must be at least two", () => {
  assert.throws(
    () => validateClusterCount(1),
    /greater than one/,
  );
});

test("valid cluster count is accepted", () => {
  assert.equal(validateClusterCount(2), true);
  assert.equal(validateClusterCount(5), true);
});

test("default options are supplied", () => {
  assert.deepEqual(validateOptions(), {
    maxIterations: DEFAULT_MAX_ITERATIONS,
    tolerance: DEFAULT_TOLERANCE,
  });
});

test("custom clustering options are accepted", () => {
  assert.deepEqual(
    validateOptions({
      maxIterations: 25,
      tolerance: 1e-6,
    }),
    {
      maxIterations: 25,
      tolerance: 1e-6,
    },
  );
});

test("invalid maxIterations is rejected", () => {
  assert.throws(
    () =>
      validateOptions({
        maxIterations: 0,
      }),
    /maxIterations must be a positive integer/,
  );
});

test("invalid tolerance is rejected", () => {
  assert.throws(
    () =>
      validateOptions({
        tolerance: -1,
      }),
    /tolerance must be a non-negative finite number/,
  );
});

test("sample_code is used as observation identifier", () => {
  assert.equal(
    extractObservationId(
      createSample("S-001", 6.5, 210),
    ),
    "S-001",
  );
});

test("observation without sample_code is excluded", () => {
  const observation = createSample(
    "S-001",
    6.5,
    210,
  );

  delete observation.sample_code;

  assert.equal(
    extractObservationId(observation),
    null,
  );
});

test("cluster observations use authoritative normalized values", () => {
  const observations = [
    createSample("S-001", 6.5, 210),
  ];

  const result = extractClusterObservations(
    observations,
    ["pH", "nitrogen"],
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].observationId, "S-001");
  assert.deepEqual(result[0].values, [6.5, 210]);
});

test("missing selected value excludes the observation", () => {
  const observation = createSample(
    "S-001",
    6.5,
    210,
  );

  observation.nitrogen = null;

  const result = extractClusterObservations(
    [observation],
    ["pH", "nitrogen"],
  );

  assert.equal(result.length, 0);
});

test("non-finite selected value excludes the observation", () => {
  const observation = createSample(
    "S-001",
    6.5,
    210,
  );

  observation.nitrogen = NaN;

  const result = extractClusterObservations(
    [observation],
    ["pH", "nitrogen"],
  );

  assert.equal(result.length, 0);
});

test("invalid soil measurement is excluded rather than classified by clustering service", () => {
  const observation = createSample(
    "S-001",
    6.5,
    210,
  );

  observation.ph = "invalid";

  const result = extractClusterObservations(
    [observation],
    ["pH", "nitrogen"],
  );

  assert.equal(result.length, 0);
});

test("multiple selected parameters require complete finite observations", () => {
  const observations = [
    createSample("S-001", 6.5, 210),
    createSample("S-002", 6.8, null),
    createSample("S-003", null, 240),
  ];

  const result = extractClusterObservations(
    observations,
    ["pH", "nitrogen"],
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].observationId, "S-001");
});

test("feature statistics calculate means and population standard deviations", () => {
  const observations = [
    {
      observationId: "S-001",
      values: [1, 10],
    },
    {
      observationId: "S-002",
      values: [3, 20],
    },
  ];

  const statistics =
    calculateFeatureStatistics(observations);

  assert.deepEqual(statistics.means, [2, 15]);

  assert.ok(
    Math.abs(
      statistics.standardDeviations[0] -
        Math.sqrt(1),
    ) < 1e-12,
  );

  assert.ok(
    Math.abs(
      statistics.standardDeviations[1] -
        Math.sqrt(25),
    ) < 1e-12,
  );
});

test("standardization produces zero mean and unit population standard deviation", () => {
  const observations = [
    {
      observationId: "S-001",
      values: [1, 10],
    },
    {
      observationId: "S-002",
      values: [2, 20],
    },
    {
      observationId: "S-003",
      values: [3, 30],
    },
  ];

  const result = standardizeFeatures(observations);

  assert.deepEqual(result.means, [2, 20]);

  assert.ok(
    Math.abs(
      result.standardDeviations[0] -
        Math.sqrt(2 / 3),
    ) < 1e-12,
  );

  const meanStandardized =
    result.observations.reduce(
      (sum, observation) =>
        sum + observation.values[0],
      0,
    ) / result.observations.length;

  assert.ok(Math.abs(meanStandardized) < 1e-12);
});

test("constant feature is standardized to zero", () => {
  const observations = [
    {
      observationId: "S-001",
      values: [10, 100],
    },
    {
      observationId: "S-002",
      values: [10, 200],
    },
    {
      observationId: "S-003",
      values: [10, 300],
    },
  ];

  const result = standardizeFeatures(observations);

  assert.deepEqual(
    result.observations.map(
      (observation) => observation.values[0],
    ),
    [0, 0, 0],
  );

  assert.equal(result.means[0], 10);
  assert.equal(result.standardDeviations[0], 0);
});

test("squared Euclidean distance is calculated correctly", () => {
  assert.equal(
    calculateSquaredDistance(
      [1, 2],
      [4, 6],
    ),
    25,
  );
});

test("distance rejects vectors with different dimensions", () => {
  assert.throws(
    () =>
      calculateSquaredDistance(
        [1, 2],
        [1],
      ),
    /equal dimensions/,
  );
});

test("centroid initialization is deterministic", () => {
  const observations = [
    {
      observationId: "S-001",
      values: [1, 2],
    },
    {
      observationId: "S-002",
      values: [3, 4],
    },
    {
      observationId: "S-003",
      values: [5, 6],
    },
  ];

  assert.deepEqual(
    initializeCentroids(observations, 2),
    [
      [1, 2],
      [3, 4],
    ],
  );
});

test("centroid initialization rejects insufficient observations", () => {
  const observations = [
    {
      observationId: "S-001",
      values: [1, 2],
    },
  ];

  assert.throws(
    () => initializeCentroids(observations, 2),
    /at least as many valid observations as clusters/,
  );
});

test("cluster assignment selects nearest centroid", () => {
  const observations = [
    {
      observationId: "S-001",
      values: [0, 0],
    },
    {
      observationId: "S-002",
      values: [10, 10],
    },
  ];

  const assignments = assignClusters(
    observations,
    [
      [0, 0],
      [10, 10],
    ],
  );

  assert.deepEqual(assignments, [0, 1]);
});

test("equal distance resolves deterministically to lower cluster ID", () => {
  const observations = [
    {
      observationId: "S-001",
      values: [5, 0],
    },
  ];

  const assignments = assignClusters(
    observations,
    [
      [0, 0],
      [10, 0],
    ],
  );

  assert.deepEqual(assignments, [0]);
});

test("centroids are recalculated from cluster members", () => {
  const observations = [
    {
      observationId: "S-001",
      values: [0, 0],
    },
    {
      observationId: "S-002",
      values: [2, 2],
    },
    {
      observationId: "S-003",
      values: [10, 10],
    },
  ];

  const centroids = recalculateCentroids(
    observations,
    [0, 0, 1],
    [
      [0, 0],
      [10, 10],
    ],
  );

  assert.deepEqual(
    centroids,
    [
      [1, 1],
      [10, 10],
    ],
  );
});

test("empty cluster retains its previous centroid", () => {
  const observations = [
    {
      observationId: "S-001",
      values: [0, 0],
    },
    {
      observationId: "S-002",
      values: [1, 1],
    },
  ];

  const centroids = recalculateCentroids(
    observations,
    [0, 0],
    [
      [0, 0],
      [10, 10],
    ],
  );

  assert.deepEqual(
    centroids,
    [
      [0.5, 0.5],
      [10, 10],
    ],
  );
});

test("centroid shift is calculated correctly", () => {
  const shift = calculateCentroidShift(
    [
      [0, 0],
      [3, 4],
    ],
    [
      [3, 4],
      [3, 4],
    ],
  );

  assert.equal(shift, 5);
});

test("K-means converges deterministically", () => {
  const observations = [
    {
      observationId: "S-001",
      values: [-5, -5],
    },
    {
      observationId: "S-002",
      values: [-4, -4],
    },
    {
      observationId: "S-003",
      values: [4, 4],
    },
    {
      observationId: "S-004",
      values: [5, 5],
    },
  ];

  const first = performKMeans(
    observations,
    2,
    {
      maxIterations: 100,
      tolerance: 1e-8,
    },
  );

  const second = performKMeans(
    observations,
    2,
    {
      maxIterations: 100,
      tolerance: 1e-8,
    },
  );

  assert.deepEqual(first, second);
  assert.equal(first.converged, true);
  assert.ok(first.iterations > 0);
  assert.deepEqual(first.assignments, [0, 0, 1, 1]);
});

test("K-means respects maximum iteration limit", () => {
  const observations = [
    {
      observationId: "S-001",
      values: [0, 0],
    },
    {
      observationId: "S-002",
      values: [10, 10],
    },
  ];

  const result = performKMeans(
    observations,
    2,
    {
      maxIterations: 1,
      tolerance: 0,
    },
  );

  assert.equal(result.iterations, 1);
});

test("centroids are converted back to original units", () => {
  const result = convertCentroidsToOriginalUnits(
    [
      [0, 1],
      [-1, 2],
    ],
    [10, 100],
    [2, 5],
  );

  assert.deepEqual(
    result,
    [
      [10, 105],
      [8, 110],
    ],
  );
});

test("cluster objects preserve original parameter names and units", () => {
  const clusters = buildClusterObjects(
    [
      [0, 1],
      [2, 3],
    ],
    [0, 0, 1, 1],
    [10, 100],
    [2, 5],
    ["pH", "nitrogen"],
  );

  assert.deepEqual(clusters, [
    {
      clusterId: 0,
      memberCount: 2,
      centroid: {
        pH: 10,
        nitrogen: 105,
      },
    },
    {
      clusterId: 1,
      memberCount: 2,
      centroid: {
        pH: 14,
        nitrogen: 115,
      },
    },
  ]);
});

test("cluster assignments preserve observation identifiers", () => {
  const observations = [
    {
      observationId: "S-001",
      values: [1, 2],
    },
    {
      observationId: "S-002",
      values: [3, 4],
    },
  ];

  assert.deepEqual(
    buildClusterAssignments(
      observations,
      [0, 1],
    ),
    [
      {
        observationId: "S-001",
        clusterId: 0,
      },
      {
        observationId: "S-002",
        clusterId: 1,
      },
    ],
  );
});

test("complete cluster analysis result is deterministic and contract-valid", () => {
  const observations = createClusterSamples();

  const first = buildClusterAnalysisResult(
    observations,
    ["pH", "nitrogen"],
    2,
  );

  const second = buildClusterAnalysisResult(
    observations,
    ["pH", "nitrogen"],
    2,
  );

  assert.deepEqual(first, second);

  assert.equal(first.type, "cluster_analysis");
  assert.equal(first.version, "1.0");
  assert.equal(first.method, "kmeans");
  assert.equal(first.clusterCount, 2);
  assert.equal(first.observationCount, 6);
  assert.equal(first.clusteredObservationCount, 6);
  assert.equal(first.converged, true);

  assert.deepEqual(first.parameters, [
    {
      parameter: "pH",
      unit: "pH",
    },
    {
      parameter: "nitrogen",
      unit: "kg/ha",
    },
  ]);

  assert.equal(first.clusters.length, 2);
  assert.equal(first.assignments.length, 6);
});

test("complete result preserves centroids in original soil units", () => {
  const result = buildClusterAnalysisResult(
    createClusterSamples(),
    ["pH", "nitrogen"],
    2,
  );

  for (const cluster of result.clusters) {
    assert.ok(
      Number.isFinite(cluster.centroid.pH),
    );

    assert.ok(
      Number.isFinite(cluster.centroid.nitrogen),
    );

    assert.ok(
      cluster.centroid.pH >= 6.4 &&
        cluster.centroid.pH <= 7.4,
    );

    assert.ok(
      cluster.centroid.nitrogen >= 100 &&
        cluster.centroid.nitrogen <= 310,
    );
  }
});

test("complete result excludes incomplete observations", () => {
  const observations = [
    createSample("S-001", 6.4, 100),
    createSample("S-002", 6.5, null),
    createSample("S-003", 7.3, 310),
    createSample("S-004", 7.4, 305),
  ];

  const result = buildClusterAnalysisResult(
    observations,
    ["pH", "nitrogen"],
    2,
  );

  assert.equal(result.observationCount, 4);
  assert.equal(result.clusteredObservationCount, 3);

  assert.deepEqual(
    result.assignments.map(
      (assignment) => assignment.observationId,
    ),
    ["S-001", "S-003", "S-004"],
  );
});

test("complete result rejects more clusters than valid observations", () => {
  const observations = [
    createSample("S-001", 6.5, 100),
    createSample("S-002", 7.2, 300),
  ];

  assert.throws(
    () =>
      buildClusterAnalysisResult(
        observations,
        ["pH", "nitrogen"],
        3,
      ),
    /at least as many valid observations as clusters/,
  );
});

test("complete result rejects duplicate selected parameters", () => {
  assert.throws(
    () =>
      buildClusterAnalysisResult(
        createClusterSamples(),
        ["pH", "pH"],
        2,
      ),
    /Duplicate cluster analysis parameter/,
  );
});

test("complete result rejects unsupported selected parameters", () => {
  assert.throws(
    () =>
      buildClusterAnalysisResult(
        createClusterSamples(),
        ["pH", "rainfall"],
        2,
      ),
    /Unsupported cluster analysis parameter/,
  );
});

test("complete result supports all six soil parameters", () => {
  const result = buildClusterAnalysisResult(
    createClusterSamples(),
    [
      "pH",
      "nitrogen",
      "phosphorus",
      "potassium",
      "organicCarbon",
      "electricalConductivity",
    ],
    2,
  );

  assert.equal(result.parameters.length, 6);
  assert.equal(result.clusteredObservationCount, 6);
  assert.equal(result.clusters.length, 2);
  assert.equal(result.assignments.length, 6);
});
