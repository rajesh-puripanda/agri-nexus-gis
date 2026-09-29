"use strict";

const {
  analyzeSample,
} = require("./soilAnalysisService");

const {
  validateClusterAnalysisResult,
} = require("../scientific/statistics/clusterAnalysisResultContract");

const PARAMETER_DEFINITIONS = {
  pH: {
    sourceKey: "pH",
    unit: "pH",
  },

  nitrogen: {
    sourceKey: "nitrogen",
    unit: "kg/ha",
  },

  phosphorus: {
    sourceKey: "phosphorus",
    unit: "kg/ha",
  },

  potassium: {
    sourceKey: "potassium",
    unit: "kg/ha",
  },

  organicCarbon: {
    sourceKey: "organicCarbon",
    unit: "%",
  },

  electricalConductivity: {
    sourceKey: "electricalConductivity",
    unit: "dS/m",
  },
};

const DEFAULT_MAX_ITERATIONS = 100;
const DEFAULT_TOLERANCE = 1e-8;

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateParameter(parameter) {
  if (typeof parameter !== "string" || !parameter.trim()) {
    throw new Error("Cluster analysis parameter is required");
  }

  if (!PARAMETER_DEFINITIONS[parameter]) {
    throw new Error(
      `Unsupported cluster analysis parameter: ${parameter}`,
    );
  }

  return true;
}

function validateParameters(parameters) {
  if (!Array.isArray(parameters) || parameters.length < 2) {
    throw new Error(
      "Cluster analysis requires at least two parameters",
    );
  }

  const seen = new Set();

  for (const parameter of parameters) {
    validateParameter(parameter);

    if (seen.has(parameter)) {
      throw new Error(
        `Duplicate cluster analysis parameter: ${parameter}`,
      );
    }

    seen.add(parameter);
  }

  return true;
}

function validateClusterCount(clusterCount) {
  if (
    !Number.isInteger(clusterCount) ||
    clusterCount < 2
  ) {
    throw new Error(
      "Cluster analysis clusterCount must be an integer greater than one",
    );
  }

  return true;
}

function validateOptions(options) {
  if (options === undefined) {
    return {
      maxIterations: DEFAULT_MAX_ITERATIONS,
      tolerance: DEFAULT_TOLERANCE,
    };
  }

  if (!options || typeof options !== "object") {
    throw new Error("Cluster analysis options must be an object");
  }

  const maxIterations =
    options.maxIterations === undefined
      ? DEFAULT_MAX_ITERATIONS
      : options.maxIterations;

  const tolerance =
    options.tolerance === undefined
      ? DEFAULT_TOLERANCE
      : options.tolerance;

  if (
    !Number.isInteger(maxIterations) ||
    maxIterations < 1
  ) {
    throw new Error(
      "Cluster analysis maxIterations must be a positive integer",
    );
  }

  if (!isFiniteNumber(tolerance) || tolerance < 0) {
    throw new Error(
      "Cluster analysis tolerance must be a non-negative finite number",
    );
  }

  return {
    maxIterations,
    tolerance,
  };
}

function extractObservationId(observation) {
  if (
    !observation ||
    typeof observation !== "object"
  ) {
    return null;
  }

  const value = observation.sample_code;

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return value.trim();
}

function extractClusterObservations(
  observations,
  parameters,
) {
  if (!Array.isArray(observations)) {
    throw new Error("Cluster analysis observations must be an array");
  }

  validateParameters(parameters);

  const clusteredObservations = [];

  for (const observation of observations) {
    const observationId = extractObservationId(observation);

    if (!observationId) {
      continue;
    }

    let analysis;

    try {
      analysis = analyzeSample(observation);
    } catch (error) {
      continue;
    }

    if (
      !analysis ||
      !analysis.values ||
      typeof analysis.values !== "object"
    ) {
      continue;
    }

    const values = [];

    let valid = true;

    for (const parameter of parameters) {
      const definition = PARAMETER_DEFINITIONS[parameter];
      const parameterResult = analysis.values[definition.sourceKey];

      if (
        !parameterResult ||
        !isFiniteNumber(parameterResult.value)
      ) {
        valid = false;
        break;
      }

      values.push(parameterResult.value);
    }

    if (!valid) {
      continue;
    }

    clusteredObservations.push({
      observationId,
      values,
    });
  }

  return clusteredObservations;
}

function calculateFeatureStatistics(observations) {
  if (
    !Array.isArray(observations) ||
    observations.length === 0
  ) {
    throw new Error(
      "Cluster analysis requires at least one valid observation",
    );
  }

  const dimensionCount = observations[0].values.length;

  const means = Array(dimensionCount).fill(0);

  for (const observation of observations) {
    for (let index = 0; index < dimensionCount; index += 1) {
      means[index] += observation.values[index];
    }
  }

  for (let index = 0; index < dimensionCount; index += 1) {
    means[index] /= observations.length;
  }

  const standardDeviations = Array(dimensionCount).fill(0);

  for (const observation of observations) {
    for (let index = 0; index < dimensionCount; index += 1) {
      const difference =
        observation.values[index] - means[index];

      standardDeviations[index] += difference ** 2;
    }
  }

  for (let index = 0; index < dimensionCount; index += 1) {
    standardDeviations[index] = Math.sqrt(
      standardDeviations[index] / observations.length,
    );
  }

  return {
    means,
    standardDeviations,
  };
}

function standardizeFeatures(observations) {
  const statistics = calculateFeatureStatistics(observations);

  const standardized = observations.map((observation) => ({
    observationId: observation.observationId,
    values: observation.values.map((value, index) => {
      const standardDeviation =
        statistics.standardDeviations[index];

      if (standardDeviation === 0) {
        return 0;
      }

      return (
        (value - statistics.means[index]) /
        standardDeviation
      );
    }),
  }));

  return {
    observations: standardized,
    means: statistics.means,
    standardDeviations: statistics.standardDeviations,
  };
}

function calculateSquaredDistance(valuesA, valuesB) {
  if (
    !Array.isArray(valuesA) ||
    !Array.isArray(valuesB) ||
    valuesA.length !== valuesB.length
  ) {
    throw new Error(
      "Cluster distance vectors must have equal dimensions",
    );
  }

  let distance = 0;

  for (let index = 0; index < valuesA.length; index += 1) {
    const difference = valuesA[index] - valuesB[index];
    distance += difference ** 2;
  }

  return distance;
}

function initializeCentroids(observations, clusterCount) {
  if (observations.length < clusterCount) {
    throw new Error(
      "Cluster analysis requires at least as many valid observations as clusters",
    );
  }

  return observations
    .slice(0, clusterCount)
    .map((observation) => [...observation.values]);
}

function assignClusters(observations, centroids) {
  return observations.map((observation) => {
    let bestClusterId = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (
      let clusterId = 0;
      clusterId < centroids.length;
      clusterId += 1
    ) {
      const distance = calculateSquaredDistance(
        observation.values,
        centroids[clusterId],
      );

      if (
        distance < bestDistance ||
        (distance === bestDistance &&
          clusterId < bestClusterId)
      ) {
        bestDistance = distance;
        bestClusterId = clusterId;
      }
    }

    return bestClusterId;
  });
}

function recalculateCentroids(
  observations,
  assignments,
  previousCentroids,
) {
  const dimensionCount =
    previousCentroids[0].length;

  const sums = previousCentroids.map(() =>
    Array(dimensionCount).fill(0),
  );

  const counts = previousCentroids.map(() => 0);

  for (let index = 0; index < observations.length; index += 1) {
    const clusterId = assignments[index];

    counts[clusterId] += 1;

    for (
      let dimension = 0;
      dimension < dimensionCount;
      dimension += 1
    ) {
      sums[clusterId][dimension] +=
        observations[index].values[dimension];
    }
  }

  return previousCentroids.map((previousCentroid, clusterId) => {
    if (counts[clusterId] === 0) {
      return [...previousCentroid];
    }

    return sums[clusterId].map(
      (sum) => sum / counts[clusterId],
    );
  });
}

function calculateCentroidShift(
  previousCentroids,
  nextCentroids,
) {
  let maximumShift = 0;

  for (
    let clusterId = 0;
    clusterId < previousCentroids.length;
    clusterId += 1
  ) {
    const shift = Math.sqrt(
      calculateSquaredDistance(
        previousCentroids[clusterId],
        nextCentroids[clusterId],
      ),
    );

    maximumShift = Math.max(maximumShift, shift);
  }

  return maximumShift;
}

function performKMeans(
  observations,
  clusterCount,
  options,
) {
  if (observations.length < clusterCount) {
    throw new Error(
      "Cluster analysis requires at least as many valid observations as clusters",
    );
  }

  let centroids = initializeCentroids(
    observations,
    clusterCount,
  );

  let assignments = [];
  let iterations = 0;
  let converged = false;

  for (
    let iteration = 1;
    iteration <= options.maxIterations;
    iteration += 1
  ) {
    const nextAssignments = assignClusters(
      observations,
      centroids,
    );

    const nextCentroids = recalculateCentroids(
      observations,
      nextAssignments,
      centroids,
    );

    const centroidShift = calculateCentroidShift(
      centroids,
      nextCentroids,
    );

    const assignmentsUnchanged =
      assignments.length === nextAssignments.length &&
      assignments.every(
        (clusterId, index) =>
          clusterId === nextAssignments[index],
      );

    assignments = nextAssignments;
    centroids = nextCentroids;
    iterations = iteration;

    if (
      centroidShift <= options.tolerance ||
      assignmentsUnchanged
    ) {
      converged = true;
      break;
    }
  }

  return {
    assignments,
    centroids,
    iterations,
    converged,
  };
}

function convertCentroidsToOriginalUnits(
  standardizedCentroids,
  means,
  standardDeviations,
) {
  return standardizedCentroids.map((centroid) =>
    centroid.map((value, index) => {
      const standardDeviation =
        standardDeviations[index];

      if (standardDeviation === 0) {
        return means[index];
      }

      return (
        means[index] +
        value * standardDeviation
      );
    }),
  );
}

function buildClusterObjects(
  centroids,
  assignments,
  originalMeans,
  originalStandardDeviations,
  parameters,
) {
  const originalCentroids =
    convertCentroidsToOriginalUnits(
      centroids,
      originalMeans,
      originalStandardDeviations,
    );

  const memberCounts = Array(
    centroids.length,
  ).fill(0);

  for (const clusterId of assignments) {
    memberCounts[clusterId] += 1;
  }

  return originalCentroids.map(
    (centroid, clusterId) => {
      const centroidObject = {};

      for (
        let index = 0;
        index < parameters.length;
        index += 1
      ) {
        centroidObject[parameters[index]] =
          centroid[index];
      }

      return {
        clusterId,
        memberCount: memberCounts[clusterId],
        centroid: centroidObject,
      };
    },
  );
}

function buildClusterAssignments(
  observations,
  assignments,
) {
  return observations.map((observation, index) => ({
    observationId: observation.observationId,
    clusterId: assignments[index],
  }));
}

function buildClusterAnalysisResult(
  observations,
  parameters,
  clusterCount,
  options,
) {
  validateParameters(parameters);
  validateClusterCount(clusterCount);

  const validatedOptions = validateOptions(options);

  const clusteredObservations =
    extractClusterObservations(
      observations,
      parameters,
    );

  if (clusteredObservations.length < clusterCount) {
    throw new Error(
      "Cluster analysis requires at least as many valid observations as clusters",
    );
  }

  const standardized =
    standardizeFeatures(clusteredObservations);

  const kmeans = performKMeans(
    standardized.observations,
    clusterCount,
    validatedOptions,
  );

  const clusters = buildClusterObjects(
    kmeans.centroids,
    kmeans.assignments,
    standardized.means,
    standardized.standardDeviations,
    parameters,
  );

  const assignments = buildClusterAssignments(
    clusteredObservations,
    kmeans.assignments,
  );

  const parameterDescriptors = parameters.map(
    (parameter) => ({
      parameter,
      unit: PARAMETER_DEFINITIONS[parameter].unit,
    }),
  );

  const result = {
    type: "cluster_analysis",
    version: "1.0",
    method: "kmeans",
    parameters: parameterDescriptors,
    clusterCount,
    observationCount: Array.isArray(observations)
      ? observations.length
      : 0,
    clusteredObservationCount:
      clusteredObservations.length,
    iterations: kmeans.iterations,
    converged: kmeans.converged,
    clusters,
    assignments,
  };

  validateClusterAnalysisResult(result);

  return result;
}

module.exports = {
  DEFAULT_MAX_ITERATIONS,
  DEFAULT_TOLERANCE,
  PARAMETER_DEFINITIONS,
  isFiniteNumber,
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
};