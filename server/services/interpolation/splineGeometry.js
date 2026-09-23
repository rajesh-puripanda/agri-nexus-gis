"use strict";

// ============================================================
// server/services/interpolation/splineGeometry.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.6.3  Thin-Plate Spline Geometric Validation
//
// Scientific purpose:
//
//   Validate whether sample locations provide sufficient
//   two-dimensional spatial geometry for the thin-plate spline
//   affine polynomial component:
//
//       P = [1, x, y]
//
// Validation:
//
//   1. Minimum observation count
//   2. Geographic coordinate validity
//   3. Duplicate-location detection
//   4. Two-dimensional spatial rank
//   5. Collinearity detection
//
// Coordinate handling:
//
//   Geographic coordinates are converted to the same local
//   equirectangular metric coordinate system used by the TPS
//   interpolation engine.
//
// This module does not:
//
//   - build the TPS matrix
//   - solve the TPS system
//   - calculate interpolation values
//   - modify sample data
//
// ============================================================

const {
  isFiniteNumber,
  validateCoordinates,
  toLocalCoordinates,
} = require("./spatialDistance");

// ============================================================
// CONSTANTS
// ============================================================

const MIN_SAMPLE_COUNT = 3;
const GEOMETRY_TOLERANCE = 1e-10;

// ============================================================
// RESULT HELPERS
// ============================================================

function createFailure(reason, details = {}) {
  return {
    valid: false,
    reason,
    ...details,
  };
}

function createSuccess(details = {}) {
  return {
    valid: true,
    reason: null,
    ...details,
  };
}

// ============================================================
// POINT VALIDATION
// ============================================================

function validateGeometryPoint(point) {
  if (!point || typeof point !== "object") {
    return false;
  }

  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);

  return validateCoordinates(
    latitude,
    longitude,
  );
}

// ============================================================
// LOCAL COORDINATE CONVERSION
// ============================================================

function buildLocalGeometryPoints(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return null;
  }

  const originLatitude =
    Number(points[0].latitude);

  const originLongitude =
    Number(points[0].longitude);

  const localPoints = points.map((point) => {
    const latitude = Number(point.latitude);
    const longitude = Number(point.longitude);

    return toLocalCoordinates(
      latitude,
      longitude,
      originLatitude,
      originLongitude,
    );
  });

  if (
    localPoints.some(
      (point) =>
        !point ||
        !isFiniteNumber(point.x) ||
        !isFiniteNumber(point.y),
    )
  ) {
    return null;
  }

  return localPoints;
}

// ============================================================
// DUPLICATE LOCATION DETECTION
// ============================================================
//
// Duplicate locations are identified in local metric space.
//
// A pair is considered duplicate when its metric separation
// is within GEOMETRY_TOLERANCE.
//
// ============================================================

function findDuplicateLocationPairs(localPoints) {
  const duplicatePairs = [];

  for (
    let i = 0;
    i < localPoints.length;
    i += 1
  ) {
    for (
      let j = i + 1;
      j < localPoints.length;
      j += 1
    ) {
      const deltaX =
        localPoints[i].x -
        localPoints[j].x;

      const deltaY =
        localPoints[i].y -
        localPoints[j].y;

      const distanceSquared =
        deltaX * deltaX +
        deltaY * deltaY;

      if (
        distanceSquared <=
        GEOMETRY_TOLERANCE *
          GEOMETRY_TOLERANCE
      ) {
        duplicatePairs.push([i, j]);
      }
    }
  }

  return duplicatePairs;
}

// ============================================================
// SPATIAL RANK
// ============================================================
//
// For the affine TPS polynomial:
//
//     1 + x + y
//
// the observations must span two spatial dimensions.
//
// Rank 0:
//   All locations coincide.
//
// Rank 1:
//   Locations are collinear.
//
// Rank 2:
//   Locations contain non-collinear geometry.
//
// The rank is determined using the largest 2-D cross product
// relative to the first local point.
//
// ============================================================

function calculateSpatialRank(localPoints) {
  if (
    !Array.isArray(localPoints) ||
    localPoints.length === 0
  ) {
    return 0;
  }

  let hasNonZeroDistance = false;

  for (let i = 1; i < localPoints.length; i += 1) {
    const dx =
      localPoints[i].x -
      localPoints[0].x;

    const dy =
      localPoints[i].y -
      localPoints[0].y;

    if (
      Math.hypot(dx, dy) >
      GEOMETRY_TOLERANCE
    ) {
      hasNonZeroDistance = true;
      break;
    }
  }

  if (!hasNonZeroDistance) {
    return 0;
  }

  let maximumCrossProduct = 0;

  for (
    let i = 1;
    i < localPoints.length;
    i += 1
  ) {
    const ax =
      localPoints[i].x -
      localPoints[0].x;

    const ay =
      localPoints[i].y -
      localPoints[0].y;

    for (
      let j = i + 1;
      j < localPoints.length;
      j += 1
    ) {
      const bx =
        localPoints[j].x -
        localPoints[0].x;

      const by =
        localPoints[j].y -
        localPoints[0].y;

      const crossProduct =
        Math.abs(
          ax * by -
          ay * bx,
        );

      if (
        crossProduct >
        maximumCrossProduct
      ) {
        maximumCrossProduct =
          crossProduct;
      }
    }
  }

  return maximumCrossProduct >
    GEOMETRY_TOLERANCE
    ? 2
    : 1;
}

// ============================================================
// MAIN VALIDATION
// ============================================================

function validateSplineGeometry(points) {
  if (!Array.isArray(points)) {
    return createFailure(
      "invalid_observations",
      {
        sampleCount: null,
        spatialRank: null,
        duplicatePairs: [],
      },
    );
  }

  const sampleCount = points.length;

  if (sampleCount < MIN_SAMPLE_COUNT) {
    return createFailure(
      "insufficient_observations",
      {
        sampleCount,
        requiredMinimum:
          MIN_SAMPLE_COUNT,
        spatialRank: null,
        duplicatePairs: [],
      },
    );
  }

  const invalidPointIndex =
    points.findIndex(
      (point) =>
        !validateGeometryPoint(point),
    );

  if (invalidPointIndex !== -1) {
    return createFailure(
      "invalid_coordinates",
      {
        sampleCount,
        invalidPointIndex,
        spatialRank: null,
        duplicatePairs: [],
      },
    );
  }

  const localPoints =
    buildLocalGeometryPoints(points);

  if (!localPoints) {
    return createFailure(
      "invalid_local_coordinates",
      {
        sampleCount,
        spatialRank: null,
        duplicatePairs: [],
      },
    );
  }

  const duplicatePairs =
    findDuplicateLocationPairs(
      localPoints,
    );

  const spatialRank =
    calculateSpatialRank(
      localPoints,
    );

  if (duplicatePairs.length > 0) {
    return createFailure(
      "duplicate_locations",
      {
        sampleCount,
        spatialRank,
        duplicatePairs,
      },
    );
  }

  if (spatialRank < 2) {
    return createFailure(
      "collinear_points",
      {
        sampleCount,
        spatialRank,
        duplicatePairs: [],
      },
    );
  }

  return createSuccess({
    sampleCount,
    spatialRank,
    duplicatePairs: [],
  });
}

// ============================================================
// PUBLIC API
// ============================================================

module.exports = {
  MIN_SAMPLE_COUNT,
  GEOMETRY_TOLERANCE,
  validateGeometryPoint,
  buildLocalGeometryPoints,
  findDuplicateLocationPairs,
  calculateSpatialRank,
  validateSplineGeometry,
};
