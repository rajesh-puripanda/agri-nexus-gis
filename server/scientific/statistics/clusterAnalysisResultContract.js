"use strict";

const REQUIRED_METHOD = "kmeans";

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateParameterDescriptor(parameter, name) {
  if (!parameter || typeof parameter !== "object") {
    throw new Error(`${name} is required`);
  }

  if (typeof parameter.parameter !== "string" || !parameter.parameter.trim()) {
    throw new Error(`${name} parameter name is required`);
  }

  if (typeof parameter.unit !== "string" || !parameter.unit.trim()) {
    throw new Error(`${name} parameter unit is required`);
  }

  return true;
}

function validateCentroid(centroid, parameters, clusterName) {
  if (!centroid || typeof centroid !== "object") {
    throw new Error(`${clusterName} centroid is required`);
  }

  for (const parameter of parameters) {
    const value = centroid[parameter.parameter];

    if (!isFiniteNumber(value)) {
      throw new Error(
        `${clusterName} centroid value for ${parameter.parameter} must be finite`,
      );
    }
  }

  return true;
}

function validateCluster(cluster, parameters, index) {
  const clusterName = `Cluster ${index}`;

  if (!cluster || typeof cluster !== "object") {
    throw new Error(`${clusterName} is required`);
  }

  if (!Number.isInteger(cluster.clusterId) || cluster.clusterId < 0) {
    throw new Error(`${clusterName} clusterId must be a non-negative integer`);
  }

  if (
    !Number.isInteger(cluster.memberCount) ||
    cluster.memberCount < 0
  ) {
    throw new Error(
      `${clusterName} memberCount must be a non-negative integer`,
    );
  }

  validateCentroid(cluster.centroid, parameters, clusterName);

  return true;
}

function validateAssignment(assignment, clusterCount, index) {
  const assignmentName = `Cluster assignment ${index}`;

  if (!assignment || typeof assignment !== "object") {
    throw new Error(`${assignmentName} is required`);
  }

  if (
    typeof assignment.observationId !== "string" ||
    !assignment.observationId.trim()
  ) {
    throw new Error(`${assignmentName} observationId is required`);
  }

  if (
    !Number.isInteger(assignment.clusterId) ||
    assignment.clusterId < 0 ||
    assignment.clusterId >= clusterCount
  ) {
    throw new Error(
      `${assignmentName} clusterId must reference a valid cluster`,
    );
  }

  return true;
}

function validateClusterAnalysisResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("Cluster analysis result is required");
  }

  if (result.type !== "cluster_analysis") {
    throw new Error("Invalid cluster analysis result type");
  }

  if (typeof result.version !== "string" || !result.version.trim()) {
    throw new Error("Cluster analysis result version is required");
  }

  if (result.method !== REQUIRED_METHOD) {
    throw new Error("Cluster analysis method must be kmeans");
  }

  if (!Array.isArray(result.parameters) || result.parameters.length < 2) {
    throw new Error(
      "Cluster analysis requires at least two parameters",
    );
  }

  const parameterNames = new Set();

  for (let index = 0; index < result.parameters.length; index += 1) {
    const parameter = result.parameters[index];

    validateParameterDescriptor(
      parameter,
      `Cluster parameter ${index}`,
    );

    if (parameterNames.has(parameter.parameter)) {
      throw new Error(
        `Duplicate cluster analysis parameter: ${parameter.parameter}`,
      );
    }

    parameterNames.add(parameter.parameter);
  }

  if (
    !Number.isInteger(result.clusterCount) ||
    result.clusterCount < 2
  ) {
    throw new Error(
      "Cluster analysis clusterCount must be an integer greater than one",
    );
  }

  if (
    !Number.isInteger(result.observationCount) ||
    result.observationCount < 0
  ) {
    throw new Error(
      "Cluster analysis observationCount must be a non-negative integer",
    );
  }

  if (
    !Number.isInteger(result.clusteredObservationCount) ||
    result.clusteredObservationCount < 0
  ) {
    throw new Error(
      "Cluster analysis clusteredObservationCount must be a non-negative integer",
    );
  }

  if (
    result.clusteredObservationCount > result.observationCount
  ) {
    throw new Error(
      "Clustered observation count cannot exceed observation count",
    );
  }

  if (
    !Number.isInteger(result.iterations) ||
    result.iterations < 0
  ) {
    throw new Error(
      "Cluster analysis iterations must be a non-negative integer",
    );
  }

  if (typeof result.converged !== "boolean") {
    throw new Error("Cluster analysis converged must be boolean");
  }

  if (
    !Array.isArray(result.clusters) ||
    result.clusters.length !== result.clusterCount
  ) {
    throw new Error(
      "Cluster analysis clusters must match clusterCount",
    );
  }

  const clusterIds = new Set();

  for (let index = 0; index < result.clusters.length; index += 1) {
    const cluster = result.clusters[index];

    validateCluster(
      cluster,
      result.parameters,
      index,
    );

    if (clusterIds.has(cluster.clusterId)) {
      throw new Error(
        `Duplicate clusterId: ${cluster.clusterId}`,
      );
    }

    clusterIds.add(cluster.clusterId);
  }

  for (let clusterId = 0; clusterId < result.clusterCount; clusterId += 1) {
    if (!clusterIds.has(clusterId)) {
      throw new Error(
        `Missing clusterId: ${clusterId}`,
      );
    }
  }

  if (!Array.isArray(result.assignments)) {
    throw new Error("Cluster analysis assignments must be an array");
  }

  if (
    result.assignments.length !==
    result.clusteredObservationCount
  ) {
    throw new Error(
      "Cluster assignment count must match clusteredObservationCount",
    );
  }

  const observationIds = new Set();

  for (
    let index = 0;
    index < result.assignments.length;
    index += 1
  ) {
    const assignment = result.assignments[index];

    validateAssignment(
      assignment,
      result.clusterCount,
      index,
    );

    if (observationIds.has(assignment.observationId)) {
      throw new Error(
        `Duplicate observation assignment: ${assignment.observationId}`,
      );
    }

    observationIds.add(assignment.observationId);
  }

  const memberCountTotal = result.clusters.reduce(
    (sum, cluster) => sum + cluster.memberCount,
    0,
  );

  if (memberCountTotal !== result.clusteredObservationCount) {
    throw new Error(
      "Cluster member counts must equal clusteredObservationCount",
    );
  }

  return true;
}

module.exports = {
  REQUIRED_METHOD,
  isFiniteNumber,
  validateParameterDescriptor,
  validateCentroid,
  validateCluster,
  validateAssignment,
  validateClusterAnalysisResult,
};