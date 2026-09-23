"use strict";

// ============================================================
// server/scientific/classification/soilClassification.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 1.2.5 — Scientific Core Introduction
//
// Responsibilities:
//   1. Soil scientific standards
//   2. Laboratory-value validation
//   3. Soil parameter classification
//   4. Overall fertility assessment
//
// Rules:
//   - No HTTP
//   - No database
//   - No repository access
//   - No UI logic
//   - No soil-analysis service dependency
// ============================================================


// ============================================================
// Scientific standards
// ============================================================

const SOIL_STANDARDS = {
  name: "Indian Soil Classification Standards",
  version: "1.0",

  pH: {
    unit: "pH",
    validRange: { min: 0, max: 14 },
    categories: [
      { label: "Acidic", maxExclusive: 6.5 },
      { label: "Neutral", minInclusive: 6.5, maxInclusive: 7.5 },
      { label: "Alkaline", minExclusive: 7.5 },
    ],
  },

  nitrogen: {
    unit: "kg/ha",
    validRange: { min: 0, max: Infinity },
    categories: [
      { label: "Low", maxExclusive: 280 },
      { label: "Medium", minInclusive: 280, maxInclusive: 560 },
      { label: "High", minExclusive: 560 },
    ],
  },

  phosphorus: {
    unit: "kg/ha",
    validRange: { min: 0, max: Infinity },
    categories: [
        { label: "Low", maxExclusive: 10 },
        { label: "Medium", minInclusive: 10, maxInclusive: 25 },
        { label: "High", minExclusive: 25, maxInclusive: 50 },
        { label: "Very High", minExclusive: 50 },
    ],
    },

  potassium: {
    unit: "kg/ha",
    validRange: { min: 0, max: Infinity },
    categories: [
        { label: "Low", maxExclusive: 120 },
        { label: "Medium", minInclusive: 120, maxInclusive: 280 },
        { label: "High", minExclusive: 280, maxInclusive: 600 },
        { label: "Very High", minExclusive: 600 },
    ],
    },

  organicCarbon: {
    unit: "%",
    validRange: { min: 0, max: Infinity },
    categories: [
      { label: "Low", maxExclusive: 0.5 },
      { label: "Medium", minInclusive: 0.5, maxInclusive: 0.75 },
      { label: "High", minExclusive: 0.75 },
    ],
  },

  electricalConductivity: {
    unit: "dS/m",
    validRange: { min: 0, max: Infinity },
    categories: [
      { label: "Non-saline", maxExclusive: 0.4 },
      {
        label: "Very slightly saline",
        minInclusive: 0.4,
        maxExclusive: 0.8,
      },
      {
        label: "Moderately saline",
        minInclusive: 0.8,
        maxExclusive: 1.6,
      },
      { label: "Strongly saline", minInclusive: 1.6 },
    ],
  },
};


// ============================================================
// Validation helpers
// ============================================================

function isMissingValue(value) {
  return value === null || value === undefined || value === "";
}

function normalizeNumber(value, fieldName) {
  if (isMissingValue(value)) {
    throw new TypeError(`${fieldName} is required`);
  }

  const normalized = Number(value);

  if (!Number.isFinite(normalized)) {
    throw new TypeError(`${fieldName} must be a valid number`);
  }

  return normalized;
}

function validateRange(value, standard, fieldName) {
  if (value < standard.validRange.min || value > standard.validRange.max) {
    throw new RangeError(
      `${fieldName} must be between ${standard.validRange.min} and ${standard.validRange.max}`
    );
  }

  return value;
}

function validateLaboratoryValue(value, standard, fieldName) {
  const normalized = normalizeNumber(value, fieldName);
  return validateRange(normalized, standard, fieldName);
}

function normalizeOptionalLaboratoryValue(value, standard, fieldName) {
  if (isMissingValue(value)) {
    return null;
  }

  return validateLaboratoryValue(value, standard, fieldName);
}


// ============================================================
// Classification helpers
// ============================================================

function classifyValue(value, standard) {
  const normalized = validateLaboratoryValue(
    value,
    standard,
    standard.unit
  );

  for (const category of standard.categories) {
    const meetsMinimum =
      category.minInclusive !== undefined &&
      category.minInclusive !== null
        ? normalized >= category.minInclusive
        : category.minExclusive !== undefined &&
            category.minExclusive !== null
          ? normalized > category.minExclusive
          : true;

    const meetsMaximum =
      category.maxInclusive !== undefined &&
      category.maxInclusive !== null
        ? normalized <= category.maxInclusive
        : category.maxExclusive !== undefined &&
            category.maxExclusive !== null
          ? normalized < category.maxExclusive
          : true;

    if (meetsMinimum && meetsMaximum) {
      return category.label;
    }
  }

  throw new RangeError("Value does not match any classification category");
}

function classifyOptionalValue(value, standard, fieldName) {
  if (isMissingValue(value)) {
    return null;
  }

  const normalized = validateLaboratoryValue(
    value,
    standard,
    fieldName
  );

  for (const category of standard.categories) {
    const meetsMinimum =
      category.minInclusive !== undefined &&
      category.minInclusive !== null
        ? normalized >= category.minInclusive
        : category.minExclusive !== undefined &&
            category.minExclusive !== null
          ? normalized > category.minExclusive
          : true;

    const meetsMaximum =
      category.maxInclusive !== undefined &&
      category.maxInclusive !== null
        ? normalized <= category.maxInclusive
        : category.maxExclusive !== undefined &&
            category.maxExclusive !== null
          ? normalized < category.maxExclusive
          : true;

    if (meetsMinimum && meetsMaximum) {
      return category.label;
    }
  }

  throw new RangeError("Value does not match any classification category");
}


// ============================================================
// Parameter classifiers
// ============================================================

function classifyPH(value) {
  return classifyValue(value, SOIL_STANDARDS.pH);
}

function classifyNitrogen(value) {
  return classifyValue(value, SOIL_STANDARDS.nitrogen);
}

function classifyPhosphorus(value) {
  return classifyValue(value, SOIL_STANDARDS.phosphorus);
}

function classifyPotassium(value) {
  return classifyValue(value, SOIL_STANDARDS.potassium);
}

function classifyOrganicCarbon(value) {
  return classifyValue(value, SOIL_STANDARDS.organicCarbon);
}

function classifyEC(value) {
  return classifyValue(
    value,
    SOIL_STANDARDS.electricalConductivity
  );
}


// ============================================================
// Classify all parameters
// ============================================================

function classifyAllParameters(values) {
  if (!values || typeof values !== "object") {
    throw new TypeError("Soil laboratory values are required");
  }

  return {
    pH: classifyOptionalValue(
      values.pH,
      SOIL_STANDARDS.pH,
      "pH"
    ),

    nitrogen: classifyOptionalValue(
      values.nitrogen,
      SOIL_STANDARDS.nitrogen,
      "nitrogen"
    ),

    phosphorus: classifyOptionalValue(
      values.phosphorus,
      SOIL_STANDARDS.phosphorus,
      "phosphorus"
    ),

    potassium: classifyOptionalValue(
      values.potassium,
      SOIL_STANDARDS.potassium,
      "potassium"
    ),

    organicCarbon: classifyOptionalValue(
      values.organicCarbon,
      SOIL_STANDARDS.organicCarbon,
      "organic carbon"
    ),

    electricalConductivity: classifyOptionalValue(
      values.electricalConductivity,
      SOIL_STANDARDS.electricalConductivity,
      "electrical conductivity"
    ),
  };
}


// ============================================================
// Overall fertility
// ============================================================

function assessOverallFertility(classifications) {
  if (!classifications || typeof classifications !== "object") {
    throw new TypeError("Fertility classifications are required");
  }

  const values = [
    classifications.nitrogen,
    classifications.phosphorus,
    classifications.potassium,
    classifications.organicCarbon,
  ].filter((value) => value !== null && value !== undefined);

  if (values.length === 0) {
    return "Unavailable";
  }

  if (values.includes("Low")) {
    return "Low";
  }

  const highCount = values.filter(
    (value) => value === "High" || value === "Very High"
  ).length;

  if (highCount >= 3) {
    return "High";
  }

  return "Moderate / Good";
}


// ============================================================
// Public API
// ============================================================

module.exports = {
  SOIL_STANDARDS,
  classifyPH,
  classifyNitrogen,
  classifyPhosphorus,
  classifyPotassium,
  classifyOrganicCarbon,
  classifyEC,
  classifyAllParameters,
  assessOverallFertility,
};