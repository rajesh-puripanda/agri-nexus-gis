"use strict";

// ============================================================
// server/services/interpolation/spatialDistance.js
// ============================================================
//
// Soil Analysis GIS
//
// Spatial Distance Foundation
//
// Scientific purpose:
//
//   Provide consistent metric spatial distances for interpolation
//   algorithms.
//
//   Kriging requires spatial distances in a meaningful metric
//   unit before calculating the experimental semivariogram.
//
// Coordinate system:
//
//   Input:
//     Geographic latitude / longitude in decimal degrees.
//
//   Internal:
//     Local equirectangular metric coordinates.
//
//   Output:
//     Distance in metres.
//
// Scope:
//
//   1. Validate geographic coordinates
//   2. Convert geographic coordinates to local metric coordinates
//   3. Calculate metric distance
//   4. Build pairwise distance matrices
//   5. Build target-to-sample distance vectors
//   6. Identify nearest sample locations
//
// ============================================================

// ============================================================
// CONSTANTS
// ============================================================

const EARTH_RADIUS_METRES = 6371008.8;

// ============================================================
// NUMERIC VALIDATION
// ============================================================

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

// ============================================================
// COORDINATE VALIDATION
// ============================================================

function validateCoordinates(latitude, longitude) {
  return (
    isFiniteNumber(latitude) &&
    isFiniteNumber(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

// ============================================================
// DEGREES → RADIANS
// ============================================================

function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// ============================================================
// GEOGRAPHIC → LOCAL METRIC COORDINATES
// ============================================================
//
// Equirectangular approximation:
//
//   x = R × Δλ × cos(φ₀)
//
//   y = R × Δφ
//
// where:
//
//   R  = Earth radius in metres
//   Δλ = longitude difference in radians
//   Δφ = latitude difference in radians
//   φ₀ = reference latitude in radians
//
// The approximation is appropriate for the project's relatively
// small local soil-sampling study area.
//
// ============================================================

function toLocalCoordinates(
  latitude,
  longitude,
  originLatitude,
  originLongitude,
) {
  if (
    !validateCoordinates(latitude, longitude) ||
    !validateCoordinates(originLatitude, originLongitude)
  ) {
    return null;
  }

  const originLatitudeRadians =
    degreesToRadians(originLatitude);

  const deltaLatitudeRadians = degreesToRadians(
    latitude - originLatitude,
  );

  const deltaLongitudeRadians = degreesToRadians(
    longitude - originLongitude,
  );

  return {
    x:
      EARTH_RADIUS_METRES *
      deltaLongitudeRadians *
      Math.cos(originLatitudeRadians),

    y:
      EARTH_RADIUS_METRES *
      deltaLatitudeRadians,
  };
}

// ============================================================
// EUCLIDEAN DISTANCE IN METRIC SPACE
// ============================================================

function calculateEuclideanDistance(point1, point2) {
  if (!point1 || !point2) {
    return null;
  }

  if (
    !isFiniteNumber(point1.x) ||
    !isFiniteNumber(point1.y) ||
    !isFiniteNumber(point2.x) ||
    !isFiniteNumber(point2.y)
  ) {
    return null;
  }

  const deltaX = point1.x - point2.x;
  const deltaY = point1.y - point2.y;

  return Math.hypot(deltaX, deltaY);
}

// ============================================================
// GEOGRAPHIC DISTANCE
// ============================================================
//
// Returns:
//
//   metres
//
// The midpoint latitude is used as the local reference latitude.
// This keeps the east-west scale consistent for the pair.
//
// ============================================================

function calculateDistance(
  latitude1,
  longitude1,
  latitude2,
  longitude2,
) {
  if (
    !validateCoordinates(latitude1, longitude1) ||
    !validateCoordinates(latitude2, longitude2)
  ) {
    return null;
  }

  const originLatitude =
    (latitude1 + latitude2) / 2;

  const originLongitude =
    (longitude1 + longitude2) / 2;

  const point1 = toLocalCoordinates(
    latitude1,
    longitude1,
    originLatitude,
    originLongitude,
  );

  const point2 = toLocalCoordinates(
    latitude2,
    longitude2,
    originLatitude,
    originLongitude,
  );

  return calculateEuclideanDistance(point1, point2);
}

// ============================================================
// SAMPLE-POINT DISTANCE
// ============================================================
//
// Expected point structure:
//
//   {
//     latitude,
//     longitude
//   }
//
// Numeric strings are accepted because database results may
// contain numeric values represented as strings.
//
// ============================================================

function calculatePointDistance(point1, point2) {
  if (!point1 || !point2) {
    return null;
  }

  const latitude1 = Number(point1.latitude);
  const longitude1 = Number(point1.longitude);

  const latitude2 = Number(point2.latitude);
  const longitude2 = Number(point2.longitude);

  return calculateDistance(
    latitude1,
    longitude1,
    latitude2,
    longitude2,
  );
}

// ============================================================
// PAIRWISE DISTANCE MATRIX
// ============================================================
//
// For n points:
//
//   D[i][j] = distance(point[i], point[j])
//
// Properties:
//
//   D[i][i] = 0
//
//   D[i][j] = D[j][i]
//
// This matrix is the geometric foundation for the experimental
// semivariogram and later Kriging relationship matrix.
//
// ============================================================

function buildDistanceMatrix(points) {
  if (!Array.isArray(points)) {
    return [];
  }

  const count = points.length;

  const matrix = Array.from(
    { length: count },
    () => Array(count).fill(null),
  );

  for (let i = 0; i < count; i += 1) {
    matrix[i][i] = 0;

    for (let j = i + 1; j < count; j += 1) {
      const distance = calculatePointDistance(
        points[i],
        points[j],
      );

      matrix[i][j] = distance;
      matrix[j][i] = distance;
    }
  }

  return matrix;
}

// ============================================================
// TARGET → SAMPLE DISTANCE VECTOR
// ============================================================
//
// For prediction location s₀:
//
//   d₀[i] = distance(sᵢ, s₀)
//
// This vector will later contribute to the Kriging system.
//
// ============================================================

function buildTargetDistanceVector(target, points) {
  if (!target || !Array.isArray(points)) {
    return [];
  }

  return points.map((point) =>
    calculatePointDistance(target, point),
  );
}

// ============================================================
// MINIMUM DISTANCE
// ============================================================

function findMinimumDistance(distances) {
  if (!Array.isArray(distances)) {
    return null;
  }

  let minimum = Infinity;

  for (const distance of distances) {
    if (
      isFiniteNumber(distance) &&
      distance < minimum
    ) {
      minimum = distance;
    }
  }

  return minimum === Infinity ? null : minimum;
}

// ============================================================
// NEAREST SAMPLE INDEX
// ============================================================
//
// Returns:
//
//   index of nearest valid point
//
// Returns null when no valid distance can be calculated.
//
// ============================================================

function findNearestPointIndex(target, points) {
  if (
    !target ||
    !Array.isArray(points) ||
    points.length === 0
  ) {
    return null;
  }

  let nearestIndex = null;
  let minimumDistance = Infinity;

  for (let index = 0; index < points.length; index += 1) {
    const distance = calculatePointDistance(
      target,
      points[index],
    );

    if (!isFiniteNumber(distance)) {
      continue;
    }

    if (distance < minimumDistance) {
      minimumDistance = distance;
      nearestIndex = index;
    }
  }

  return nearestIndex;
}

// ============================================================
// PUBLIC API
// ============================================================

module.exports = {
  EARTH_RADIUS_METRES,
  isFiniteNumber,
  validateCoordinates,
  degreesToRadians,
  toLocalCoordinates,
  calculateEuclideanDistance,
  calculateDistance,
  calculatePointDistance,
  buildDistanceMatrix,
  buildTargetDistanceVector,
  findMinimumDistance,
  findNearestPointIndex,
};