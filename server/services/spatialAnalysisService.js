// ============================================================
// server/services/spatialAnalysisService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.2.2 — Spatial Analytical Interpretation Service
//
// Purpose:
//   Provide a backend-authoritative analytical interpretation
//   for a requested map coordinate.
//
// Architecture:
//   Soil Samples
//        │
//        ▼
//   Spatial Analytical Query
//        │
//        ├── Sample context
//        │     ├── within sample extent
//        │     ├── nearest sample
//        │     └── soil texture
//        │
//        ├── Spatial interpolation
//        │     └── Existing IDW calculation
//        │
//        ├── Scientific classification
//        │     └── Existing soil-analysis classifiers
//        │
//        └── Overall fertility
//              └── Existing fertility assessment
//
// Important architectural rules:
//   - No new scientific thresholds.
//   - No duplicated classification logic.
//   - No duplicated IDW mathematics.
//   - No interpolation of soil texture.
//   - No interpolation of category labels.
//   - Continuous values are interpolated first.
//   - Existing classifiers are then applied.
//   - Overall fertility is calculated only from N/P/K/OC.
//   - Missing data remains unavailable, not Low.
//   - Soil samples remain the source of texture/context.
//   - HTTP/controller logic does not belong here.
//
// Built on:
//   Phase 5.3  — Soil Analysis Engine
//   Phase 8.3  — Interpolation REST API / IDW engine
//   Phase 9.2  — Fertility Zoning Engine
//   Phase 10.2.1 — Spatial Analytical Result Contract
//
// ============================================================

const soilRepository = require("../repositories/soilRepository");
const soilAnalysisService = require("./soilAnalysisService");
const interpolationService = require("./interpolationService");

// ------------------------------------------------------------
// API / phase metadata
// ------------------------------------------------------------

const API_PHASE = "10.2";

// ------------------------------------------------------------
// Spatial analytical parameters
//
// These names intentionally follow the existing soil analysis
// and interpolation service contracts.
// ------------------------------------------------------------

const SPATIAL_PARAMETERS = {
  pH: {
    key: "pH",
    interpolationKey: "ph",
    label: "pH",
    unit: "pH",
    classifier: soilAnalysisService.classifyPH,
  },

  nitrogen: {
    key: "nitrogen",
    interpolationKey: "nitrogen",
    label: "Nitrogen",
    unit: "kg/ha",
    classifier: soilAnalysisService.classifyNitrogen,
  },

  phosphorus: {
    key: "phosphorus",
    interpolationKey: "phosphorus",
    label: "Phosphorus",
    unit: "kg/ha",
    classifier: soilAnalysisService.classifyPhosphorus,
  },

  potassium: {
    key: "potassium",
    interpolationKey: "potassium",
    label: "Potassium",
    unit: "kg/ha",
    classifier: soilAnalysisService.classifyPotassium,
  },

  organicCarbon: {
    key: "organicCarbon",
    interpolationKey: "organic_carbon",
    label: "Organic Carbon",
    unit: "%",
    classifier: soilAnalysisService.classifyOrganicCarbon,
  },

  electricalConductivity: {
    key: "electricalConductivity",
    interpolationKey: "electrical_conductivity",
    label: "Electrical Conductivity",
    unit: "dS/m",
    classifier: soilAnalysisService.classifyEC,
  },
};

// ------------------------------------------------------------
// Interpolation configuration
//
// These values match the existing interpolation service
// defaults. The spatial analytical query is a point query,
// therefore no interpolation grid is generated here.
// ------------------------------------------------------------

const DEFAULT_POWER = Number.isFinite(interpolationService.DEFAULT_POWER)
  ? interpolationService.DEFAULT_POWER
  : 2;

// ------------------------------------------------------------
// Validation
// ------------------------------------------------------------

function validateCoordinate(latitude, longitude) {
  const errors = [];

  const numericLatitude = Number(latitude);
  const numericLongitude = Number(longitude);

  if (!Number.isFinite(numericLatitude)) {
    errors.push("Latitude must be a valid numeric value.");
  } else if (numericLatitude < -90 || numericLatitude > 90) {
    errors.push("Latitude must be between -90 and 90.");
  }

  if (!Number.isFinite(numericLongitude)) {
    errors.push("Longitude must be a valid numeric value.");
  } else if (numericLongitude < -180 || numericLongitude > 180) {
    errors.push("Longitude must be between -180 and 180.");
  }

  if (errors.length > 0) {
    const error = new Error("Invalid spatial analytical coordinates.");
    error.statusCode = 400;
    error.validationErrors = errors;
    throw error;
  }

  return {
    latitude: numericLatitude,
    longitude: numericLongitude,
  };
}

// ------------------------------------------------------------
// Numeric helpers
// ------------------------------------------------------------

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

function isValidMeasurement(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value))
  );
}

function roundValue(value, decimals = 6) {
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  const factor = 10 ** decimals;

  return Math.round(Number(value) * factor) / factor;
}

// ------------------------------------------------------------
// Raw sample extent
//
// Important:
//   This deliberately uses the RAW sample extent.
//
// It does NOT use the padded presentation extent from
// interpolationService.
//
// "withinSampleExtent" therefore means that the requested
// coordinate falls within the actual geographic bounding box
// of the available soil samples.
// ------------------------------------------------------------

function calculateSampleExtent(samples) {
  const validCoordinates = samples.filter((sample) =>
    isValidCoordinate(sample.latitude, sample.longitude),
  );

  if (validCoordinates.length === 0) {
    return null;
  }

  const latitudes = validCoordinates.map((sample) => Number(sample.latitude));
  const longitudes = validCoordinates.map((sample) => Number(sample.longitude));

  return {
    minLatitude: Math.min(...latitudes),
    maxLatitude: Math.max(...latitudes),
    minLongitude: Math.min(...longitudes),
    maxLongitude: Math.max(...longitudes),
  };
}

function isWithinSampleExtent(latitude, longitude, extent) {
  if (!extent) {
    return false;
  }

  return (
    latitude >= extent.minLatitude &&
    latitude <= extent.maxLatitude &&
    longitude >= extent.minLongitude &&
    longitude <= extent.maxLongitude
  );
}

// ------------------------------------------------------------
// Distance calculation
//
// This distance is used ONLY for nearest-sample context.
//
// IMPORTANT:
//   - This is NOT used for IDW interpolation.
//   - IDW mathematics remains fully delegated to
//     interpolationService.calculateIDWValue().
//
// The previous implementation returned an approximate
// degree-based distance.
//
// This implementation uses the Haversine formula and returns
// true ground distance in metres.
//
// Earth radius:
//   6,371,000 metres
//
// ------------------------------------------------------------

const EARTH_RADIUS_METERS = 6371000;

function calculateContextDistance(
  latitude1,
  longitude1,
  latitude2,
  longitude2,
) {
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

// ------------------------------------------------------------
// Distance presentation
//
// Human-readable nearest-sample distance:
//
//   < 1 km
//       -> metres
//
//   >= 1 km
//       -> kilometres
//
// This is presentation metadata for the spatial context
// contract. It has no effect on IDW interpolation.
// ------------------------------------------------------------
function formatContextDistance(distanceMeters) {
  if (
    distanceMeters === null ||
    distanceMeters === undefined ||
    !Number.isFinite(Number(distanceMeters))
  ) {
    return {
      distance: null,
      distanceUnit: null,
    };
  }

  const numericDistance = Number(distanceMeters);

  if (numericDistance < 1000) {
    return {
      distance: roundValue(numericDistance, 2),
      distanceUnit: "m",
    };
  }

  return {
    distance: roundValue(numericDistance / 1000, 3),
    distanceUnit: "km",
  };
}

// ------------------------------------------------------------
// Nearest sample
// ------------------------------------------------------------

function findNearestSample(latitude, longitude, samples) {
  let nearestSample = null;
  let nearestDistance = Infinity;

  for (const sample of samples) {
    if (!isValidCoordinate(sample.latitude, sample.longitude)) {
      continue;
    }

    const distance = calculateContextDistance(
      latitude,
      longitude,
      sample.latitude,
      sample.longitude,
    );

    if (!Number.isFinite(distance)) {
      continue;
    }

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestSample = sample;
    }
  }

  if (!nearestSample) {
    return null;
  }

  const formattedDistance = formatContextDistance(nearestDistance);

  return {
    id: nearestSample.id,
    sample_code: nearestSample.sample_code,
    latitude: Number(nearestSample.latitude),
    longitude: Number(nearestSample.longitude),
    distance: formattedDistance.distance,
    distanceUnit: formattedDistance.distanceUnit,
  };
}

// ------------------------------------------------------------
// Parameter point extraction
//
// This follows the same source-point concept used by the
// existing interpolation service.
//
// Only samples having:
//   - valid coordinates
//   - a valid numeric measurement
//
// are included for the requested parameter.
// ------------------------------------------------------------

function buildParameterPoints(samples, parameterDefinition) {
  return samples
    .filter((sample) => {
      if (!isValidCoordinate(sample.latitude, sample.longitude)) {
        return false;
      }

      return isValidMeasurement(sample[parameterDefinition.interpolationKey]);
    })
    .map((sample) => ({
      id: sample.id,
      sample_code: sample.sample_code,
      latitude: Number(sample.latitude),
      longitude: Number(sample.longitude),
      value: Number(sample[parameterDefinition.interpolationKey]),
    }));
}

// ------------------------------------------------------------
// Exact source-point detection
//
// This is used only to identify provenance.
//
// The actual value calculation remains delegated to the
// existing interpolationService.calculateIDWValue(), which
// already contains the authoritative zero-distance behavior.
//
// We deliberately use exact coordinate equality here rather
// than introducing another independent interpolation tolerance.
// ------------------------------------------------------------

function findExactSourcePoint(latitude, longitude, points) {
  return (
    points.find(
      (point) =>
        Number(point.latitude) === Number(latitude) &&
        Number(point.longitude) === Number(longitude),
    ) || null
  );
}

// ------------------------------------------------------------
// Spatial parameter interpretation
//
// Processing sequence:
//
//   valid source points
//          ↓
//   existing IDW mathematics
//          ↓
//   continuous interpolated value
//          ↓
//   existing scientific classifier
//
// No classification thresholds are defined here.
// ------------------------------------------------------------

function calculateSpatialParameter(
  latitude,
  longitude,
  samples,
  parameterDefinition,
) {
  const points = buildParameterPoints(samples, parameterDefinition);

  if (points.length === 0) {
    return {
      value: null,
      unit: parameterDefinition.unit,
      classification: null,
      sourceType: null,
      available: false,
    };
  }

  const exactSourcePoint = findExactSourcePoint(latitude, longitude, points);

  let value;

  try {
    value = interpolationService.calculateIDWValue(
      latitude,
      longitude,
      points,
      DEFAULT_POWER,
    );
  } catch (error) {
    console.error(
      `Spatial interpolation error for ${parameterDefinition.key}:`,
      error,
    );

    return {
      value: null,
      unit: parameterDefinition.unit,
      classification: null,
      sourceType: null,
      available: false,
    };
  }

  if (!Number.isFinite(Number(value))) {
    return {
      value: null,
      unit: parameterDefinition.unit,
      classification: null,
      sourceType: null,
      available: false,
    };
  }

  const roundedValue = roundValue(value);

  let classification = null;

  try {
    classification = parameterDefinition.classifier(roundedValue);
  } catch (error) {
    console.error(
      `Spatial classification error for ${parameterDefinition.key}:`,
      error,
    );

    classification = null;
  }

  return {
    value: roundedValue,
    unit: parameterDefinition.unit,
    classification,
    sourceType: exactSourcePoint ? "sample" : "interpolated",
    available: true,
  };
}

// ------------------------------------------------------------
// Build the analysis object used by the existing fertility
// assessment engine.
//
// Important:
//
// pH and EC are intentionally excluded.
//
// Overall fertility is defined by the existing
// soilAnalysisService.assessOverallFertility() using:
//   - Nitrogen
//   - Phosphorus
//   - Potassium
//   - Organic Carbon
// ------------------------------------------------------------

// ------------------------------------------------------------
// Overall fertility
//
// Delegates completely to the existing authoritative
// soil-analysis service.
//
// No local fertility rule is implemented here.
// ------------------------------------------------------------

function calculateOverallFertility(interpolatedAnalysis) {
  return soilAnalysisService.assessOverallFertility({
    nitrogen: interpolatedAnalysis.nitrogen
      ? interpolatedAnalysis.nitrogen.classification
      : null,

    phosphorus: interpolatedAnalysis.phosphorus
      ? interpolatedAnalysis.phosphorus.classification
      : null,

    potassium: interpolatedAnalysis.potassium
      ? interpolatedAnalysis.potassium.classification
      : null,

    organicCarbon: interpolatedAnalysis.organicCarbon
      ? interpolatedAnalysis.organicCarbon.classification
      : null,
  });
}

// ------------------------------------------------------------
// Sample context
//
// Texture is NOT interpolated.
//
// The nearest sample provides sample-derived context.
//
// This keeps texture scientifically distinct from the
// interpolated numerical analytical surface.
// ------------------------------------------------------------

function buildSampleContext(latitude, longitude, samples) {
  const nearestSample = findNearestSample(latitude, longitude, samples);

  return {
    soilTexture:
      nearestSample && samples.find((sample) => sample.id === nearestSample.id)
        ? (samples.find((sample) => sample.id === nearestSample.id)
            .soil_texture ?? null)
        : null,
  };
}

// ------------------------------------------------------------
// Build complete spatial analytical result
// ------------------------------------------------------------

async function getSpatialAnalysis(latitude, longitude) {
  const location = validateCoordinate(latitude, longitude);

  const samples = await soilRepository.getAllSoilSamples();

  if (!Array.isArray(samples) || samples.length === 0) {
    const error = new Error(
      "No soil samples are available for spatial analysis.",
    );

    error.statusCode = 404;

    throw error;
  }

  const sampleExtent = calculateSampleExtent(samples);

  if (!sampleExtent) {
    const error = new Error(
      "No soil samples with valid spatial coordinates are available.",
    );

    error.statusCode = 422;

    throw error;
  }

  const withinSampleExtent = isWithinSampleExtent(
    location.latitude,
    location.longitude,
    sampleExtent,
  );

  const nearestSample = findNearestSample(
    location.latitude,
    location.longitude,
    samples,
  );

  // ----------------------------------------------------------
  // Interpolate and classify each analytical parameter.
  //
  // Spatial analytical interpretation is only available within
  // the actual sample extent.
  //
  // Outside the sample extent:
  //   - no IDW query is performed
  //   - analytical values remain unavailable
  //   - no parameter is classified as Low merely because data
  //     is unavailable
  //
  // This preserves the distinction between:
  //   unavailable ≠ Low
  // ----------------------------------------------------------

  const interpolatedAnalysis = {};

  for (const parameterDefinition of Object.values(SPATIAL_PARAMETERS)) {
    if (!withinSampleExtent) {
      interpolatedAnalysis[parameterDefinition.key] = {
        value: null,
        unit: parameterDefinition.unit,
        classification: null,
        sourceType: null,
        available: false,
      };

      continue;
    }

    interpolatedAnalysis[parameterDefinition.key] = calculateSpatialParameter(
      location.latitude,
      location.longitude,
      samples,
      parameterDefinition,
    );
  }

  // ----------------------------------------------------------
  // Existing backend-authoritative fertility assessment.
  //
  // When all analytical values are unavailable, the existing
  // soil-analysis service returns "Unavailable".
  // ----------------------------------------------------------

  interpolatedAnalysis.overallFertility =
    calculateOverallFertility(interpolatedAnalysis);

  // ----------------------------------------------------------
  // Sample-derived context.
  // ----------------------------------------------------------

  const nearestSampleRecord = nearestSample
    ? samples.find((sample) => sample.id === nearestSample.id)
    : null;

  const sampleContext = {
    soilTexture: nearestSampleRecord
      ? (nearestSampleRecord.soil_texture ?? null)
      : null,
  };

  // ----------------------------------------------------------
  // Stable Phase 10.2 analytical result contract.
  // ----------------------------------------------------------

  return {
    success: true,

    phase: API_PHASE,

    location: {
      latitude: location.latitude,
      longitude: location.longitude,
    },

    spatialContext: {
      withinSampleExtent,

      nearestSample,

      sampleExtent: {
        minLatitude: roundValue(sampleExtent.minLatitude),
        maxLatitude: roundValue(sampleExtent.maxLatitude),
        minLongitude: roundValue(sampleExtent.minLongitude),
        maxLongitude: roundValue(sampleExtent.maxLongitude),
      },
    },

    interpolatedAnalysis,

    sampleContext,

    metadata: {
      interpolationMethod: "idw",
      power: DEFAULT_POWER,
      sampleCount: samples.length,

      parameterBasis: [
        "pH",
        "nitrogen",
        "phosphorus",
        "potassium",
        "organicCarbon",
        "electricalConductivity",
      ],

      overallFertilityBasis: [
        "nitrogen",
        "phosphorus",
        "potassium",
        "organicCarbon",
      ],

      classificationLocation: "backend",
      interpolationLocation: "backend",
      presentationLocation: "frontend",

      textureSource: "nearest_sample",

      generatedAt: new Date().toISOString(),
    },
  };
}

// ------------------------------------------------------------
// Public wrapper
//
// Keeps the public service API simple for the future
// controller/REST layer.
// ------------------------------------------------------------

async function prepareSpatialAnalysis(options = {}) {
  const latitude =
    options.latitude !== undefined ? options.latitude : options.lat;

  const longitude =
    options.longitude !== undefined ? options.longitude : options.lng;

  return getSpatialAnalysis(latitude, longitude);
}

// ------------------------------------------------------------
// Exports
// ------------------------------------------------------------

module.exports = {
  API_PHASE,
  SPATIAL_PARAMETERS,
  DEFAULT_POWER,
  EARTH_RADIUS_METERS,
  validateCoordinate,
  calculateSampleExtent,
  isWithinSampleExtent,
  calculateContextDistance,
  formatContextDistance,
  findNearestSample,
  buildParameterPoints,
  calculateSpatialParameter,
  calculateOverallFertility,
  prepareSpatialAnalysis,
  getSpatialAnalysis,
};
