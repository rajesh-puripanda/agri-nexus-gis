// ============================================================
// server/services/soilAnalysisService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 5.3 — Soil Analysis Engine
//
// Responsibility:
//   - Validate soil laboratory measurements
//   - Classify individual soil laboratory measurements
//   - Apply approved soil-test interpretation ranges
//   - Produce an overall soil fertility assessment
//   - Preserve soil texture for downstream crop analysis
//   - Support legitimately incomplete laboratory data
//   - Return a stable analysis contract
//
// IMPORTANT:
//   - No HTTP logic
//   - No database logic
//   - No crop-specific rules
//   - No fertilizer recommendations
//
// Missing laboratory measurements:
//   - NULL / undefined / empty values are treated as
//     unavailable measurements during complete sample analysis.
//   - Invalid NON-NULL values are still rejected.
//   - Direct classifier functions still require a value.
//
// Units:
//   pH                 : pH units
//   Nitrogen           : kg/ha
//   Phosphorus         : kg/ha
//   Potassium          : kg/ha
//   Organic Carbon     : %
//   EC                 : dS/m
//
// ============================================================

"use strict";

// ============================================================
// SOIL ANALYSIS STANDARD
// ============================================================

const SOIL_STANDARDS = {
  name: "Government of India Soil Health Card / Soil Testing Manual",

  version: "Baseline",

  pH: {
    unit: "pH",

    validRange: {
      min: 0,
      max: 14,
    },

    categories: [
      {
        classification: "Acidic",
        min: -Infinity,
        max: 6.5,
        maxInclusive: false,
      },

      {
        classification: "Neutral",
        min: 6.5,
        max: 7.5,
        maxInclusive: true,
      },

      {
        classification: "Alkaline",
        min: 7.5,
        max: Infinity,
        maxInclusive: false,
      },
    ],
  },

  nitrogen: {
    unit: "kg/ha",

    validRange: {
      min: 0,
      max: Infinity,
    },

    categories: [
      {
        classification: "Low",
        min: -Infinity,
        max: 280,
        maxInclusive: false,
      },

      {
        classification: "Medium",
        min: 280,
        max: 560,
        maxInclusive: true,
      },

      {
        classification: "High",
        min: 560,
        max: Infinity,
        maxInclusive: false,
      },
    ],
  },

  phosphorus: {
    unit: "kg/ha",

    validRange: {
      min: 0,
      max: Infinity,
    },

    categories: [
      {
        classification: "Low",
        min: -Infinity,
        max: 10,
        maxInclusive: false,
      },

      {
        classification: "Medium",
        min: 10,
        max: 25,
        maxInclusive: true,
      },

      {
        classification: "High",
        min: 25,
        max: 50,
        maxInclusive: true,
      },

      {
        classification: "Very High",
        min: 50,
        max: Infinity,
        maxInclusive: false,
      },
    ],
  },

  potassium: {
    unit: "kg/ha",

    validRange: {
      min: 0,
      max: Infinity,
    },

    categories: [
      {
        classification: "Low",
        min: -Infinity,
        max: 120,
        maxInclusive: false,
      },

      {
        classification: "Medium",
        min: 120,
        max: 280,
        maxInclusive: true,
      },

      {
        classification: "High",
        min: 280,
        max: 600,
        maxInclusive: true,
      },

      {
        classification: "Very High",
        min: 600,
        max: Infinity,
        maxInclusive: false,
      },
    ],
  },

  organicCarbon: {
    unit: "%",

    validRange: {
      min: 0,
      max: Infinity,
    },

    categories: [
      {
        classification: "Low",
        min: -Infinity,
        max: 0.5,
        maxInclusive: false,
      },

      {
        classification: "Medium",
        min: 0.5,
        max: 0.75,
        maxInclusive: true,
      },

      {
        classification: "High",
        min: 0.75,
        max: Infinity,
        maxInclusive: false,
      },
    ],
  },

  electricalConductivity: {
    unit: "dS/m",

    validRange: {
      min: 0,
      max: Infinity,
    },

    // IMPORTANT:
    //
    // These ranges are deliberately NON-OVERLAPPING.
    //
    // 0.39 -> Non-saline
    // 0.40 -> Very slightly saline
    // 0.80 -> Moderately saline
    // 1.60 -> Strongly saline
    //
    // This prevents the generic first-match classifier from
    // producing inconsistent boundary classifications.
    //
    categories: [
      {
        classification: "Non-saline",
        min: -Infinity,
        max: 0.4,
        maxInclusive: false,
      },

      {
        classification: "Very slightly saline",
        min: 0.4,
        max: 0.8,
        maxInclusive: false,
      },

      {
        classification: "Moderately saline",
        min: 0.8,
        max: 1.6,
        maxInclusive: false,
      },

      {
        classification: "Strongly saline",
        min: 1.6,
        max: Infinity,
        maxInclusive: false,
      },
    ],
  },
};

// ============================================================
// SOIL TEXTURE VALUES
// ============================================================
//
// Texture is not laboratory-classified by this service.
// It is preserved as an application input for the crop
// suitability service.
//
// ============================================================

const SOIL_TEXTURES = [
  "Sandy",
  "Sandy Loam",
  "Loamy",
  "Silty Loam",
  "Clay Loam",
  "Clay",
];

// ============================================================
// MISSING VALUE HELPER
// ============================================================
//
// A missing laboratory measurement is different from an
// invalid laboratory measurement.
//
// Missing:
//   null
//   undefined
//   ""
//
// Invalid:
//   "abc"
//   Infinity
//   -Infinity
//
// Missing values are permitted during complete sample analysis.
// Invalid supplied values remain errors.
//
// ============================================================

function isMissingValue(value) {
  return value === null || value === undefined || value === "";
}

// ============================================================
// VALIDATION HELPERS
// ============================================================
//
// This function is intentionally strict.
//
// Direct calls such as classifyPH(null) should continue to
// report that pH is required.
//
// analyzeSample() handles missing measurements separately and
// only calls validation/classification when a value is present.
//
// ============================================================

function normalizeNumber(value, fieldName) {
  if (isMissingValue(value)) {
    throw new Error(`${fieldName} is required`);
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`${fieldName} must be a finite number`);
  }

  return number;
}

// ============================================================
// RANGE VALIDATION
// ============================================================

function validateRange(value, standard, fieldName) {
  const { min, max } = standard.validRange;

  if (value < min || value > max) {
    if (Number.isFinite(max)) {
      throw new Error(`${fieldName} must be between ${min} and ${max}`);
    }

    throw new Error(`${fieldName} must be greater than or equal to ${min}`);
  }

  return value;
}

// ============================================================
// LABORATORY VALUE VALIDATION
// ============================================================
//
// Strict validator.
//
// Missing values must be handled by the caller when missing
// measurements are intentionally permitted.
//
// ============================================================

function validateLaboratoryValue(value, standard, fieldName) {
  const number = normalizeNumber(value, fieldName);

  return validateRange(number, standard, fieldName);
}

// ============================================================
// OPTIONAL LABORATORY VALUE NORMALIZATION
// ============================================================
//
// Used only by analyzeSample().
//
// Returns null when the laboratory measurement is unavailable.
// Otherwise validates and returns the numeric value.
//
// ============================================================

function normalizeOptionalLaboratoryValue(value, standard, fieldName) {
  if (isMissingValue(value)) {
    return null;
  }

  return validateLaboratoryValue(value, standard, fieldName);
}

// ============================================================
// SOIL TEXTURE NORMALIZATION
// ============================================================

function normalizeSoilTexture(value) {
  if (isMissingValue(value)) {
    return null;
  }

  const texture = String(value).trim();

  if (!texture) {
    return null;
  }

  if (!SOIL_TEXTURES.includes(texture)) {
    throw new Error(`soil_texture must be one of: ${SOIL_TEXTURES.join(", ")}`);
  }

  return texture;
}

// ============================================================
// GENERIC CLASSIFICATION HELPER
// ============================================================
//
// Direct classification remains strict.
//
// Missing values are NOT silently converted to a classification.
// analyzeSample() only calls this helper when a measurement
// is actually available.
//
// ============================================================

function classifyValue(value, standard, fieldName) {
  const number = validateLaboratoryValue(value, standard, fieldName);

  const category = standard.categories.find((item) => {
    const meetsMin = number >= item.min;

    const meetsMax = item.maxInclusive ? number <= item.max : number < item.max;

    return meetsMin && meetsMax;
  });

  if (!category) {
    throw new Error(
      `${fieldName} value ${number} does not fall within the configured classification ranges`,
    );
  }

  return category.classification;
}

// ============================================================
// pH CLASSIFICATION
// ============================================================

function classifyPH(value) {
  return classifyValue(value, SOIL_STANDARDS.pH, "pH");
}

// ============================================================
// NITROGEN CLASSIFICATION
// ============================================================

function classifyNitrogen(value) {
  return classifyValue(value, SOIL_STANDARDS.nitrogen, "nitrogen");
}

// ============================================================
// PHOSPHORUS CLASSIFICATION
// ============================================================

function classifyPhosphorus(value) {
  return classifyValue(value, SOIL_STANDARDS.phosphorus, "phosphorus");
}

// ============================================================
// POTASSIUM CLASSIFICATION
// ============================================================

function classifyPotassium(value) {
  return classifyValue(value, SOIL_STANDARDS.potassium, "potassium");
}

// ============================================================
// ORGANIC CARBON CLASSIFICATION
// ============================================================

function classifyOrganicCarbon(value) {
  return classifyValue(value, SOIL_STANDARDS.organicCarbon, "organic_carbon");
}

// ============================================================
// ELECTRICAL CONDUCTIVITY CLASSIFICATION
// ============================================================

function classifyEC(value) {
  return classifyValue(
    value,
    SOIL_STANDARDS.electricalConductivity,
    "electrical_conductivity",
  );
}

// ============================================================
// OPTIONAL CLASSIFICATION HELPER
// ============================================================
//
// Returns null for an unavailable laboratory measurement.
//
// Otherwise delegates to the existing strict classifier.
//
// ============================================================

function classifyOptionalValue(value, classifier) {
  if (isMissingValue(value)) {
    return null;
  }

  return classifier(value);
}

// ============================================================
// CLASSIFY ALL PARAMETERS
// ============================================================
//
// Missing laboratory measurements are represented by null.
//
// Available measurements continue through the existing strict
// classification functions.
//
// ============================================================

function classifyAllParameters(values) {
  if (!values || typeof values !== "object") {
    throw new Error("Soil laboratory values are required");
  }

  return {
    pH: classifyOptionalValue(values.ph, classifyPH),

    nitrogen: classifyOptionalValue(values.nitrogen, classifyNitrogen),

    phosphorus: classifyOptionalValue(values.phosphorus, classifyPhosphorus),

    potassium: classifyOptionalValue(values.potassium, classifyPotassium),

    organicCarbon: classifyOptionalValue(
      values.organic_carbon,
      classifyOrganicCarbon,
    ),

    electricalConductivity: classifyOptionalValue(
      values.electrical_conductivity,
      classifyEC,
    ),
  };
}

// ============================================================
// OVERALL FERTILITY ASSESSMENT
// ============================================================
//
// Fertility considers:
//
//   Nitrogen
//   Phosphorus
//   Potassium
//   Organic Carbon
//
// Missing fertility parameters are excluded from the assessment.
//
// Rules:
//
//   Any available Low major fertility parameter
//       -> Low
//
//   Three or more available High / Very High parameters
//       -> High
//
//   Otherwise
//       -> Moderate / Good
//
//   No fertility parameters available
//       -> Unavailable
//
// pH and EC are reported separately.
//
// ============================================================

function assessOverallFertility(classifications) {
  if (!classifications || typeof classifications !== "object") {
    throw new Error(
      "Soil classifications are required for fertility assessment",
    );
  }

  const { nitrogen, phosphorus, potassium, organicCarbon } = classifications;

  const fertilityValues = [
    nitrogen,
    phosphorus,
    potassium,
    organicCarbon,
  ].filter(
    (value) => value !== null && value !== undefined && value !== "Unavailable",
  );

  if (fertilityValues.length === 0) {
    return "Unavailable";
  }

  if (fertilityValues.some((value) => value === "Low")) {
    return "Low";
  }

  const highCount = fertilityValues.filter(
    (value) => value === "High" || value === "Very High",
  ).length;

  if (highCount >= 3) {
    return "High";
  }

  return "Moderate / Good";
}

// ============================================================
// COMPLETE SAMPLE ANALYSIS
// ============================================================

function analyzeSample(sample) {
  if (!sample || typeof sample !== "object") {
    throw new Error("Soil sample is required");
  }

  // ----------------------------------------------------------
  // Normalize soil texture
  // ----------------------------------------------------------

  const soilTexture = normalizeSoilTexture(
    sample.soil_texture ?? sample.soilTexture ?? null,
  );

  // ----------------------------------------------------------
  // Normalize laboratory values
  // ----------------------------------------------------------
  //
  // Missing measurements are represented by null.
  //
  // Supplied measurements are still fully validated.
  //
  // ----------------------------------------------------------

  const pHValue = normalizeOptionalLaboratoryValue(
    sample.ph,
    SOIL_STANDARDS.pH,
    "pH",
  );

  const nitrogenValue = normalizeOptionalLaboratoryValue(
    sample.nitrogen,
    SOIL_STANDARDS.nitrogen,
    "nitrogen",
  );

  const phosphorusValue = normalizeOptionalLaboratoryValue(
    sample.phosphorus,
    SOIL_STANDARDS.phosphorus,
    "phosphorus",
  );

  const potassiumValue = normalizeOptionalLaboratoryValue(
    sample.potassium,
    SOIL_STANDARDS.potassium,
    "potassium",
  );

  const organicCarbonValue = normalizeOptionalLaboratoryValue(
    sample.organic_carbon,
    SOIL_STANDARDS.organicCarbon,
    "organic_carbon",
  );

  const ecValue = normalizeOptionalLaboratoryValue(
    sample.electrical_conductivity,
    SOIL_STANDARDS.electricalConductivity,
    "electrical_conductivity",
  );

  // ----------------------------------------------------------
  // Classify laboratory values
  // ----------------------------------------------------------
  //
  // Available values are classified.
  //
  // Missing values receive null classification.
  //
  // ----------------------------------------------------------

  const classifications = classifyAllParameters({
    ph: pHValue,
    nitrogen: nitrogenValue,
    phosphorus: phosphorusValue,
    potassium: potassiumValue,
    organic_carbon: organicCarbonValue,
    electrical_conductivity: ecValue,
  });

  // ----------------------------------------------------------
  // Overall fertility
  // ----------------------------------------------------------

  const overallFertility = assessOverallFertility({
    nitrogen: classifications.nitrogen,
    phosphorus: classifications.phosphorus,
    potassium: classifications.potassium,
    organicCarbon: classifications.organicCarbon,
  });

  // ----------------------------------------------------------
  // Stable analysis contract
  // ----------------------------------------------------------

  return {
    standard: SOIL_STANDARDS.name,

    version: SOIL_STANDARDS.version,

    soilTexture,

    values: {
      pH: {
        value: pHValue,
        unit: SOIL_STANDARDS.pH.unit,
        classification: classifications.pH,
      },

      nitrogen: {
        value: nitrogenValue,
        unit: SOIL_STANDARDS.nitrogen.unit,
        classification: classifications.nitrogen,
      },

      phosphorus: {
        value: phosphorusValue,
        unit: SOIL_STANDARDS.phosphorus.unit,
        classification: classifications.phosphorus,
      },

      potassium: {
        value: potassiumValue,
        unit: SOIL_STANDARDS.potassium.unit,
        classification: classifications.potassium,
      },

      organicCarbon: {
        value: organicCarbonValue,
        unit: SOIL_STANDARDS.organicCarbon.unit,
        classification: classifications.organicCarbon,
      },

      electricalConductivity: {
        value: ecValue,
        unit: SOIL_STANDARDS.electricalConductivity.unit,
        classification: classifications.electricalConductivity,
      },
    },

    overallFertility,
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  SOIL_STANDARDS,

  SOIL_TEXTURES,

  classifyPH,

  classifyNitrogen,

  classifyPhosphorus,

  classifyPotassium,

  classifyOrganicCarbon,

  classifyEC,

  classifyAllParameters,

  assessOverallFertility,

  analyzeSample,
};
