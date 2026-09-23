"use strict";

// ============================================================
// server/services/spatialQueryService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.3.2 — Backend Spatial Query Service
//
// Responsibilities:
//   1. Validate spatial/analytical query parameters
//   2. Retrieve soil samples
//   3. Obtain authoritative backend classifications
//   4. Apply attribute filtering
//   5. Apply radius filtering
//   6. Apply bounding-box filtering
//   7. Calculate Haversine distances
//   8. Return stable Phase 10.3 query results
//
// Scientific classification remains authoritative in:
//   server/services/soilAnalysisService.js
//
// This service does NOT:
//   - calculate scientific thresholds
//   - modify IDW interpolation
//   - modify fertility zoning
//   - replace Phase 10.2 spatial analysis
//
// ============================================================

const soilRepository = require("../repositories/soilRepository");
const soilAnalysisService = require("./soilAnalysisService");

// ============================================================
// CONSTANTS
// ============================================================

const API_PHASE = "10.3";
const EARTH_RADIUS_METERS = 6371000;
const MAX_RADIUS_METERS = 100000;

const SUPPORTED_PARAMETERS = [
  "ph",
  "nitrogen",
  "phosphorus",
  "potassium",
  "organic_carbon",
  "electrical_conductivity",
  "overall_fertility",
];

const CLASSIFICATIONS_BY_PARAMETER = {
  ph: ["acidic", "neutral", "alkaline"],
  nitrogen: ["low", "medium", "high"],
  phosphorus: ["low", "medium", "high", "very_high"],
  potassium: ["low", "medium", "high", "very_high"],
  organic_carbon: ["low", "medium", "high"],
  electrical_conductivity: [
    "non_saline",
    "very_slightly_saline",
    "moderately_saline",
    "strongly_saline",
  ],
  overall_fertility: ["low", "moderate_good", "high", "unavailable"],
};

const PARAMETER_UNITS = {
  ph: "pH",
  nitrogen: "kg/ha",
  phosphorus: "kg/ha",
  potassium: "kg/ha",
  organic_carbon: "%",
  electrical_conductivity: "dS/m",
};

const CLASSIFICATION_API_VALUES = {
  Acidic: "acidic",
  Neutral: "neutral",
  Alkaline: "alkaline",
  Low: "low",
  Medium: "medium",
  High: "high",
  "Very High": "very_high",
  "Non-saline": "non_saline",
  "Very slightly saline": "very_slightly_saline",
  "Moderately saline": "moderately_saline",
  "Strongly saline": "strongly_saline",
  "Moderate / Good": "moderate_good",
  Unavailable: "unavailable",
};

// ============================================================
// GENERIC HELPERS
// ============================================================

function roundValue(value, decimals = 3) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  const factor = 10 ** decimals;

  return Math.round((numericValue + Number.EPSILON) * factor) / factor;
}

function isValidCoordinate(latitude, longitude) {
  return (
    latitude !== null &&
    latitude !== undefined &&
    latitude !== "" &&
    longitude !== null &&
    longitude !== undefined &&
    longitude !== "" &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) &&
    Number(latitude) >= -90 &&
    Number(latitude) <= 90 &&
    Number(longitude) >= -180 &&
    Number(longitude) <= 180
  );
}

function isValidLatitude(latitude) {
  return (
    latitude !== null &&
    latitude !== undefined &&
    latitude !== "" &&
    Number.isFinite(Number(latitude)) &&
    Number(latitude) >= -90 &&
    Number(latitude) <= 90
  );
}

function isValidLongitude(longitude) {
  return (
    longitude !== null &&
    longitude !== undefined &&
    longitude !== "" &&
    Number.isFinite(Number(longitude)) &&
    Number(longitude) >= -180 &&
    Number(longitude) <= 180
  );
}

function isValidMeasurement(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value))
  );
}
// ============================================================
// PARAMETER HELPERS
// ============================================================

function normalizeParameter(parameter) {
  if (parameter === undefined || parameter === null) {
    return null;
  }

  return String(parameter).trim().toLowerCase();
}

function normalizeClassification(classification) {
  if (classification === undefined || classification === null) {
    return null;
  }

  return String(classification).trim().toLowerCase();
}

function isSupportedParameter(parameter) {
  return SUPPORTED_PARAMETERS.includes(parameter);
}

function isValidClassificationForParameter(parameter, classification) {
  if (!isSupportedParameter(parameter)) {
    return false;
  }

  return CLASSIFICATIONS_BY_PARAMETER[parameter].includes(classification);
}

function toApiClassification(classification) {
  if (classification === null || classification === undefined) {
    return "unavailable";
  }

  const apiClassification = CLASSIFICATION_API_VALUES[classification];

  if (!apiClassification) {
    throw new Error(
      `Unknown authoritative soil classification '${classification}'.`,
    );
  }

  return apiClassification;
}

// ============================================================
// QUERY VALIDATION
// ============================================================

function validateQuery(options = {}) {
  const errors = [];

  const parameter = normalizeParameter(options.parameter);
  const classification = normalizeClassification(options.classification);

  const hasParameter = parameter !== null && parameter !== "";
  const hasClassification = classification !== null && classification !== "";

  const hasLatitude =
    options.latitude !== undefined &&
    options.latitude !== null &&
    options.latitude !== "";

  const hasLongitude =
    options.longitude !== undefined &&
    options.longitude !== null &&
    options.longitude !== "";

  const hasRadius =
    options.radius !== undefined &&
    options.radius !== null &&
    options.radius !== "";

  const hasMinLatitude =
    options.minLatitude !== undefined &&
    options.minLatitude !== null &&
    options.minLatitude !== "";

  const hasMaxLatitude =
    options.maxLatitude !== undefined &&
    options.maxLatitude !== null &&
    options.maxLatitude !== "";

  const hasMinLongitude =
    options.minLongitude !== undefined &&
    options.minLongitude !== null &&
    options.minLongitude !== "";

  const hasMaxLongitude =
    options.maxLongitude !== undefined &&
    options.maxLongitude !== null &&
    options.maxLongitude !== "";

  const hasBoundingBox =
    hasMinLatitude || hasMaxLatitude || hasMinLongitude || hasMaxLongitude;

  const hasRadiusQuery = hasLatitude || hasLongitude || hasRadius;

  // ----------------------------------------------------------
  // At least one condition
  // ----------------------------------------------------------

  if (
    !hasParameter &&
    !hasClassification &&
    !hasRadiusQuery &&
    !hasBoundingBox
  ) {
    errors.push(
      "At least one analytical or spatial query condition is required.",
    );
  }

  // ----------------------------------------------------------
  // Attribute validation
  // ----------------------------------------------------------

  if (hasParameter && !isSupportedParameter(parameter)) {
    errors.push(`Unsupported parameter '${parameter}'.`);
  }

  if (hasClassification && !hasParameter) {
    errors.push("Parameter is required when classification is provided.");
  }

  if (hasParameter && !hasClassification) {
    errors.push("Classification is required when parameter is provided.");
  }

  if (
    hasParameter &&
    hasClassification &&
    isSupportedParameter(parameter) &&
    !isValidClassificationForParameter(parameter, classification)
  ) {
    errors.push(
      `Invalid classification '${classification}' for parameter '${parameter}'.`,
    );
  }

  // ----------------------------------------------------------
  // Radius validation
  // ----------------------------------------------------------

  if (hasRadiusQuery) {
    if (!hasLatitude) {
      errors.push("Latitude is required for a radius query.");
    }

    if (!hasLongitude) {
      errors.push("Longitude is required for a radius query.");
    }

    if (!hasRadius) {
      errors.push("Radius is required for a radius query.");
    }

    if (hasLatitude && !isValidLatitude(options.latitude)) {
      errors.push("Latitude must be between -90 and 90.");
    }

    if (hasLongitude && !isValidLongitude(options.longitude)) {
      errors.push("Longitude must be between -180 and 180.");
    }

    if (hasRadius) {
      const radius = Number(options.radius);

      if (!Number.isFinite(radius) || radius <= 0) {
        errors.push("Radius must be greater than 0 meters.");
      } else if (radius > MAX_RADIUS_METERS) {
        errors.push(`Radius cannot exceed ${MAX_RADIUS_METERS} meters.`);
      }
    }
  }

  // ----------------------------------------------------------
  // Bounding-box validation
  // ----------------------------------------------------------

  if (hasBoundingBox) {
    if (!hasMinLatitude) {
      errors.push("minLatitude is required for a bounding-box query.");
    }

    if (!hasMaxLatitude) {
      errors.push("maxLatitude is required for a bounding-box query.");
    }

    if (!hasMinLongitude) {
      errors.push("minLongitude is required for a bounding-box query.");
    }

    if (!hasMaxLongitude) {
      errors.push("maxLongitude is required for a bounding-box query.");
    }

    if (hasMinLatitude && !isValidLatitude(options.minLatitude)) {
      errors.push("minLatitude must be between -90 and 90.");
    }

    if (hasMaxLatitude && !isValidLatitude(options.maxLatitude)) {
      errors.push("maxLatitude must be between -90 and 90.");
    }

    if (hasMinLongitude && !isValidLongitude(options.minLongitude)) {
      errors.push("minLongitude must be between -180 and 180.");
    }

    if (hasMaxLongitude && !isValidLongitude(options.maxLongitude)) {
      errors.push("maxLongitude must be between -180 and 180.");
    }

    if (
      hasMinLatitude &&
      hasMaxLatitude &&
      Number(options.minLatitude) > Number(options.maxLatitude)
    ) {
      errors.push("minLatitude cannot be greater than maxLatitude.");
    }

    if (
      hasMinLongitude &&
      hasMaxLongitude &&
      Number(options.minLongitude) > Number(options.maxLongitude)
    ) {
      errors.push("minLongitude cannot be greater than maxLongitude.");
    }
  }

  // ----------------------------------------------------------
  // Radius + bounding box
  // ----------------------------------------------------------

  if (hasRadiusQuery && hasBoundingBox) {
    errors.push(
      "Radius and bounding-box spatial filters cannot be used together.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: {
      parameter,
      classification,
      latitude: hasLatitude ? Number(options.latitude) : null,
      longitude: hasLongitude ? Number(options.longitude) : null,
      radius: hasRadius ? Number(options.radius) : null,
      minLatitude: hasMinLatitude ? Number(options.minLatitude) : null,
      maxLatitude: hasMaxLatitude ? Number(options.maxLatitude) : null,
      minLongitude: hasMinLongitude ? Number(options.minLongitude) : null,
      maxLongitude: hasMaxLongitude ? Number(options.maxLongitude) : null,
    },
  };
}

// ============================================================
// DISTANCE
// ============================================================

function calculateDistanceMeters(latitude1, longitude1, latitude2, longitude2) {
  if (
    !isValidCoordinate(latitude1, longitude1) ||
    !isValidCoordinate(latitude2, longitude2)
  ) {
    return null;
  }

  const lat1 = Number(latitude1) * (Math.PI / 180);
  const lon1 = Number(longitude1) * (Math.PI / 180);
  const lat2 = Number(latitude2) * (Math.PI / 180);
  const lon2 = Number(longitude2) * (Math.PI / 180);

  const deltaLatitude = lat2 - lat1;
  const deltaLongitude = lon2 - lon1;

  const sinLatitude = Math.sin(deltaLatitude / 2);
  const sinLongitude = Math.sin(deltaLongitude / 2);

  const haversine =
    sinLatitude ** 2 + Math.cos(lat1) * Math.cos(lat2) * sinLongitude ** 2;

  const centralAngle =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return EARTH_RADIUS_METERS * centralAngle;
}

// ============================================================
// SPATIAL MATCHING
// ============================================================

function matchesRadius(sample, latitude, longitude, radius) {
  if (!isValidCoordinate(sample.latitude, sample.longitude)) {
    return false;
  }

  const distance = calculateDistanceMeters(
    latitude,
    longitude,
    sample.latitude,
    sample.longitude,
  );

  if (!Number.isFinite(distance)) {
    return false;
  }

  return distance <= radius;
}

function matchesBoundingBox(
  sample,
  minLatitude,
  maxLatitude,
  minLongitude,
  maxLongitude,
) {
  if (!isValidCoordinate(sample.latitude, sample.longitude)) {
    return false;
  }

  const latitude = Number(sample.latitude);
  const longitude = Number(sample.longitude);

  return (
    latitude >= minLatitude &&
    latitude <= maxLatitude &&
    longitude >= minLongitude &&
    longitude <= maxLongitude
  );
}

// ============================================================
// SAMPLE VALUE EXTRACTION
// ============================================================

function getSampleParameterValue(sample, parameter) {
  switch (parameter) {
    case "ph":
      return sample.ph;

    case "nitrogen":
      return sample.nitrogen;

    case "phosphorus":
      return sample.phosphorus;

    case "potassium":
      return sample.potassium;

    case "organic_carbon":
      return sample.organic_carbon;

    case "electrical_conductivity":
      return sample.electrical_conductivity;

    default:
      return null;
  }
}

// ============================================================
// AUTHORITATIVE CLASSIFICATION
// ============================================================

function classifyParameter(sample, parameter) {
  const value = getSampleParameterValue(sample, parameter);

  if (!isValidMeasurement(value)) {
    return {
      value: null,
      unit: PARAMETER_UNITS[parameter] ?? null,
      classification: "unavailable",
      available: false,
    };
  }

  const numericValue = Number(value);
  let classification;

  switch (parameter) {
    case "ph":
      classification = soilAnalysisService.classifyPH(numericValue);
      break;

    case "nitrogen":
      classification = soilAnalysisService.classifyNitrogen(numericValue);
      break;

    case "phosphorus":
      classification = soilAnalysisService.classifyPhosphorus(numericValue);
      break;

    case "potassium":
      classification = soilAnalysisService.classifyPotassium(numericValue);
      break;

    case "organic_carbon":
      classification = soilAnalysisService.classifyOrganicCarbon(numericValue);
      break;

    case "electrical_conductivity":
      classification = soilAnalysisService.classifyEC(numericValue);
      break;

    default:
      return {
        value: null,
        unit: null,
        classification: "unavailable",
        available: false,
      };
  }

  return {
    value: roundValue(numericValue, parameter === "organic_carbon" ? 3 : 2),
    unit: PARAMETER_UNITS[parameter] ?? null,
    classification: toApiClassification(classification),
    available: true,
  };
}

// ============================================================
// OVERALL FERTILITY
// ============================================================

function classifyOverallFertility(sample) {
  const nitrogen = classifyParameter(sample, "nitrogen");

  const phosphorus = classifyParameter(sample, "phosphorus");

  const potassium = classifyParameter(sample, "potassium");

  const organicCarbon = classifyParameter(sample, "organic_carbon");

  // classifyParameter() contains API identifiers.
  // assessOverallFertility() requires authoritative labels,
  // therefore convert API identifiers back before calling it.

  const authoritative = {
    nitrogen: apiToAuthoritativeClassification(nitrogen.classification),
    phosphorus: apiToAuthoritativeClassification(phosphorus.classification),
    potassium: apiToAuthoritativeClassification(potassium.classification),
    organicCarbon: apiToAuthoritativeClassification(
      organicCarbon.classification,
    ),
  };

  const fertility = soilAnalysisService.assessOverallFertility(authoritative);

  return toApiClassification(fertility);
}

function apiToAuthoritativeClassification(value) {
  const mapping = {
    acidic: "Acidic",
    neutral: "Neutral",
    alkaline: "Alkaline",
    low: "Low",
    medium: "Medium",
    high: "High",
    very_high: "Very High",
    non_saline: "Non-saline",
    very_slightly_saline: "Very slightly saline",
    moderately_saline: "Moderately saline",
    strongly_saline: "Strongly saline",
    moderate_good: "Moderate / Good",
    unavailable: "Unavailable",
  };

  return mapping[value] ?? "Unavailable";
}

// ============================================================
// ATTRIBUTE MATCHING
// ============================================================

function matchesAttribute(sample, parameter, classification) {
  if (parameter === "overall_fertility") {
    return classifyOverallFertility(sample) === classification;
  }

  const analysis = classifyParameter(sample, parameter);

  return analysis.classification === classification;
}

// ============================================================
// SAMPLE RESPONSE
// ============================================================

function buildSampleResult(sample, parameter, spatialQuery) {
  const result = {
    id: sample.id,
    sample_code: sample.sample_code ?? sample.sampleCode ?? null,
    latitude: Number(sample.latitude),
    longitude: Number(sample.longitude),
  };

  if (spatialQuery.type === "radius") {
    const distance = calculateDistanceMeters(
      spatialQuery.latitude,
      spatialQuery.longitude,
      sample.latitude,
      sample.longitude,
    );

    result.distance = roundValue(distance, 2);
    result.distanceUnit = "m";
  }

  if (parameter === "overall_fertility") {
    result.analysis = {
      overall_fertility: {
        classification: classifyOverallFertility(sample),
      },
    };
  } else if (parameter !== null) {
    const analysis = classifyParameter(sample, parameter);

    result.analysis = {
      [parameter]: {
        value: analysis.value,
        unit: analysis.unit,
        classification: analysis.classification,
      },
    };
  }

  return result;
}

// ============================================================
// SPATIAL QUERY DESCRIPTION
// ============================================================

function buildQueryDefinition(normalized) {
  const {
    parameter,
    classification,
    latitude,
    longitude,
    radius,
    minLatitude,
    maxLatitude,
    minLongitude,
    maxLongitude,
  } = normalized;

  const query = {
    attribute: null,
    spatial: null,
  };

  if (parameter !== null && classification !== null) {
    query.attribute = {
      parameter,
      classification,
    };
  }

  if (radius !== null) {
    query.spatial = {
      type: "radius",
      latitude,
      longitude,
      radius,
      radiusUnit: "m",
    };
  } else if (
    minLatitude !== null &&
    maxLatitude !== null &&
    minLongitude !== null &&
    maxLongitude !== null
  ) {
    query.spatial = {
      type: "bounding_box",
      minLatitude,
      maxLatitude,
      minLongitude,
      maxLongitude,
    };
  }

  return query;
}

// ============================================================
// SAMPLE EXTENT
// ============================================================

function calculateSampleExtent(samples) {
  const validSamples = samples.filter((sample) =>
    isValidCoordinate(sample.latitude, sample.longitude),
  );

  if (validSamples.length === 0) {
    return {
      minLatitude: null,
      maxLatitude: null,
      minLongitude: null,
      maxLongitude: null,
    };
  }

  const latitudes = validSamples.map((sample) => Number(sample.latitude));

  const longitudes = validSamples.map((sample) => Number(sample.longitude));

  return {
    minLatitude: Math.min(...latitudes),
    maxLatitude: Math.max(...latitudes),
    minLongitude: Math.min(...longitudes),
    maxLongitude: Math.max(...longitudes),
  };
}

// ============================================================
// FILTER SAMPLES
// ============================================================

function filterSamples(samples, normalized) {
  const {
    parameter,
    classification,
    latitude,
    longitude,
    radius,
    minLatitude,
    maxLatitude,
    minLongitude,
    maxLongitude,
  } = normalized;

  const hasAttributeFilter =
  parameter !== null &&
  parameter !== "" &&
  classification !== null &&
  classification !== "";

  const hasRadiusFilter = radius !== null;

  const hasBoundingBoxFilter =
    minLatitude !== null &&
    maxLatitude !== null &&
    minLongitude !== null &&
    maxLongitude !== null;

  return samples.filter((sample) => {
    if (
      hasAttributeFilter &&
      !matchesAttribute(sample, parameter, classification)
    ) {
      return false;
    }

    if (
      hasRadiusFilter &&
      !matchesRadius(sample, latitude, longitude, radius)
    ) {
      return false;
    }

    if (
      hasBoundingBoxFilter &&
      !matchesBoundingBox(
        sample,
        minLatitude,
        maxLatitude,
        minLongitude,
        maxLongitude,
      )
    ) {
      return false;
    }

    return true;
  });
}

// ============================================================
// MAIN QUERY
// ============================================================

async function querySamples(options = {}) {
  const validation = validateQuery(options);

  if (!validation.valid) {
    return {
      success: false,
      phase: API_PHASE,
      message: "Invalid spatial analysis query.",
      errors: validation.errors,
    };
  }

  const normalized = validation.normalized;

  const samples = await soilRepository.getAllSoilSamples();

  const sampleExtent = calculateSampleExtent(samples);

  const matchedSamples = filterSamples(samples, normalized);

  const query = buildQueryDefinition(normalized);

  const resultSamples = matchedSamples.map((sample) =>
    buildSampleResult(
      sample,
      normalized.parameter,
      query.spatial ?? { type: null },
    ),
  );

  return {
    success: true,
    phase: API_PHASE,
    query,
    result: {
      count: resultSamples.length,
      samples: resultSamples,
    },
    spatialMetadata: {
      sampleExtent,
    },
    metadata: {
      classificationLocation: "backend",
      filteringLocation: "backend",
      distanceCalculation: "haversine",
      generatedAt: new Date().toISOString(),
    },
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  API_PHASE,
  EARTH_RADIUS_METERS,
  MAX_RADIUS_METERS,
  SUPPORTED_PARAMETERS,
  CLASSIFICATIONS_BY_PARAMETER,
  validateQuery,
  calculateDistanceMeters,
  calculateSampleExtent,
  matchesRadius,
  matchesBoundingBox,
  classifyParameter,
  classifyOverallFertility,
  matchesAttribute,
  filterSamples,
  buildQueryDefinition,
  querySamples,
};
