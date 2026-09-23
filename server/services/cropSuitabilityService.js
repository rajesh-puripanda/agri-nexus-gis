// ============================================================
// server/services/cropSuitabilityService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 6.2 — Crop Decision Support Enhancement
//
// Responsibility:
//   - Evaluate broad crop suitability from classified soil results
//   - Apply transparent weighted suitability scoring
//   - Identify positive and limiting soil factors
//   - Produce management considerations
//   - Rank crops by suitability
//   - Provide fertility context alongside crop suitability
//   - Report soil-data completeness and assessment confidence
//
// IMPORTANT:
//   - No HTTP logic
//   - No database logic
//   - No laboratory classification thresholds
//   - No fertilizer application rates
//   - No irrigation scheduling
//   - No yield prediction
//   - Crop suitability rules remain application-level rules
//   - Fertility classification is consumed from soil analysis
//     and is NOT recalculated here
//   - Missing suitability factors do NOT themselves reduce
//     the existing suitability score
//
// ============================================================

"use strict";

// ============================================================
// SUITABILITY WEIGHTS
// ============================================================

const SUITABILITY_WEIGHTS = {
  texture: 40,
  soilReaction: 30,
  salinity: 30,
};

// ============================================================
// CONDITION SCORE LEVELS
// ============================================================

const CONDITION_SCORES = {
  excellent: 1.0,
  good: 0.85,
  acceptable: 0.65,
  marginal: 0.4,
  unsuitable: 0.0,
};

// ============================================================
// CROP SUITABILITY DEFINITIONS
// ============================================================

const CROP_PROFILES = [
  {
    name: "Rice",
    category: "Cereal",

    texture: {
      excellent: ["Clay Loam", "Clay"],
      good: ["Loamy"],
      acceptable: ["Silty Loam"],
      marginal: ["Sandy Loam", "Sandy"],
    },

    soilReaction: {
      excellent: ["Acidic", "Neutral"],
      good: [],
      acceptable: ["Alkaline"],
      marginal: [],
    },

    salinity: {
      excellent: ["Non-saline"],
      good: ["Very slightly saline", "Moderately saline"],
      acceptable: [],
      marginal: ["Strongly saline"],
    },
  },

  {
    name: "Maize",
    category: "Cereal",

    texture: {
      excellent: ["Loamy", "Sandy Loam"],
      good: ["Clay Loam"],
      acceptable: ["Clay"],
      marginal: ["Sandy"],
    },

    soilReaction: {
      excellent: ["Neutral"],
      good: ["Acidic", "Alkaline"],
      acceptable: [],
      marginal: [],
    },

    salinity: {
      excellent: ["Non-saline"],
      good: ["Very slightly saline"],
      acceptable: ["Moderately saline"],
      marginal: ["Strongly saline"],
    },
  },

  {
    name: "Groundnut",
    category: "Oilseed",

    texture: {
      excellent: ["Sandy Loam", "Loamy"],
      good: ["Sandy"],
      acceptable: ["Clay Loam"],
      marginal: ["Clay"],
    },

    soilReaction: {
      excellent: ["Acidic", "Neutral"],
      good: [],
      acceptable: ["Alkaline"],
      marginal: [],
    },

    salinity: {
      excellent: ["Non-saline"],
      good: ["Very slightly saline"],
      acceptable: ["Moderately saline"],
      marginal: ["Strongly saline"],
    },
  },

  {
    name: "Cotton",
    category: "Fibre",

    texture: {
      excellent: ["Loamy", "Clay Loam"],
      good: ["Clay"],
      acceptable: ["Sandy Loam"],
      marginal: ["Sandy"],
    },

    soilReaction: {
      excellent: ["Neutral"],
      good: ["Alkaline"],
      acceptable: ["Acidic"],
      marginal: [],
    },

    salinity: {
      excellent: ["Non-saline"],
      good: ["Very slightly saline", "Moderately saline"],
      acceptable: [],
      marginal: ["Strongly saline"],
    },
  },

  {
    name: "Red Gram (Pigeon Pea)",
    category: "Pulse",

    texture: {
      excellent: ["Sandy Loam", "Loamy"],
      good: ["Clay Loam"],
      acceptable: ["Sandy"],
      marginal: ["Clay"],
    },

    soilReaction: {
      excellent: ["Neutral"],
      good: ["Alkaline"],
      acceptable: ["Acidic"],
      marginal: [],
    },

    salinity: {
      excellent: ["Non-saline"],
      good: ["Very slightly saline"],
      acceptable: ["Moderately saline"],
      marginal: ["Strongly saline"],
    },
  },

  {
    name: "Black Gram",
    category: "Pulse",

    texture: {
      excellent: ["Loamy", "Sandy Loam"],
      good: ["Clay Loam"],
      acceptable: ["Sandy"],
      marginal: ["Clay"],
    },

    soilReaction: {
      excellent: ["Neutral"],
      good: ["Acidic", "Alkaline"],
      acceptable: [],
      marginal: [],
    },

    salinity: {
      excellent: ["Non-saline"],
      good: ["Very slightly saline"],
      acceptable: ["Moderately saline"],
      marginal: ["Strongly saline"],
    },
  },

  {
    name: "Green Gram",
    category: "Pulse",

    texture: {
      excellent: ["Sandy Loam"],
      good: ["Loamy", "Sandy"],
      acceptable: ["Clay Loam"],
      marginal: ["Clay"],
    },

    soilReaction: {
      excellent: ["Neutral"],
      good: ["Acidic", "Alkaline"],
      acceptable: [],
      marginal: [],
    },

    salinity: {
      excellent: ["Non-saline"],
      good: ["Very slightly saline"],
      acceptable: ["Moderately saline"],
      marginal: ["Strongly saline"],
    },
  },

  {
    name: "Soybean",
    category: "Oilseed",

    texture: {
      excellent: ["Loamy", "Clay Loam"],
      good: ["Sandy Loam"],
      acceptable: ["Clay"],
      marginal: ["Sandy"],
    },

    soilReaction: {
      excellent: ["Neutral"],
      good: ["Acidic"],
      acceptable: ["Alkaline"],
      marginal: [],
    },

    salinity: {
      excellent: ["Non-saline"],
      good: ["Very slightly saline"],
      acceptable: ["Moderately saline"],
      marginal: ["Strongly saline"],
    },
  },

  {
    name: "Wheat",
    category: "Cereal",

    texture: {
      excellent: ["Loamy", "Clay Loam"],
      good: ["Sandy Loam"],
      acceptable: ["Clay"],
      marginal: ["Sandy"],
    },

    soilReaction: {
      excellent: ["Neutral"],
      good: ["Alkaline"],
      acceptable: ["Acidic"],
      marginal: [],
    },

    salinity: {
      excellent: ["Non-saline"],
      good: ["Very slightly saline"],
      acceptable: ["Moderately saline"],
      marginal: ["Strongly saline"],
    },
  },

  {
    name: "Sugarcane",
    category: "Commercial Crop",

    texture: {
      excellent: ["Loamy", "Clay Loam"],
      good: ["Clay"],
      acceptable: ["Sandy Loam"],
      marginal: ["Sandy"],
    },

    soilReaction: {
      excellent: ["Neutral"],
      good: ["Alkaline"],
      acceptable: ["Acidic"],
      marginal: [],
    },

    salinity: {
      excellent: ["Non-saline"],
      good: ["Very slightly saline"],
      acceptable: ["Moderately saline"],
      marginal: ["Strongly saline"],
    },
  },
];

// ============================================================
// SUITABILITY CLASSIFICATION
// ============================================================

function classifySuitability(score) {
  if (score >= 80) {
    return "Highly Suitable";
  }

  if (score >= 65) {
    return "Suitable";
  }

  if (score >= 50) {
    return "Moderately Suitable";
  }

  if (score >= 35) {
    return "Marginal";
  }

  return "Unsuitable";
}

// ============================================================
// FERTILITY CONTEXT
// ============================================================

function buildFertilityContext(analysis) {
  const overallFertility = analysis?.overallFertility ?? null;
  const values = analysis?.values || {};

  const limitingNutrients = [];

  const nutrientDefinitions = [
    {
      key: "nitrogen",
      name: "Nitrogen",
    },
    {
      key: "phosphorus",
      name: "Phosphorus",
    },
    {
      key: "potassium",
      name: "Potassium",
    },
    {
      key: "organicCarbon",
      name: "Organic Carbon",
    },
  ];

  nutrientDefinitions.forEach((nutrient) => {
    if (values[nutrient.key]?.classification === "Low") {
      limitingNutrients.push(nutrient.name);
    }
  });

  let status = "Fertility information is not available.";

  if (overallFertility === "Low") {
    status = "Fertility limitations identified.";
  } else if (overallFertility === "Moderate / Good") {
    status = "No major fertility limitation identified.";
  } else if (overallFertility === "High") {
    status = "High soil fertility classification.";
  }

  return {
    overallFertility,
    limitingNutrients,
    status,
  };
}

// ============================================================
// EVALUATE CONDITION
// ============================================================

function evaluateCondition(value, profile) {
  if (value === null || value === undefined || value === "" || !profile) {
    return {
      score: 0,
      level: null,
      available: false,
    };
  }

  if (profile.excellent?.includes(value)) {
    return {
      score: CONDITION_SCORES.excellent,
      level: "Excellent",
      available: true,
    };
  }

  if (profile.good?.includes(value)) {
    return {
      score: CONDITION_SCORES.good,
      level: "Good",
      available: true,
    };
  }

  if (profile.acceptable?.includes(value)) {
    return {
      score: CONDITION_SCORES.acceptable,
      level: "Acceptable",
      available: true,
    };
  }

  if (profile.marginal?.includes(value)) {
    return {
      score: CONDITION_SCORES.marginal,
      level: "Marginal",
      available: true,
    };
  }

  return {
    score: CONDITION_SCORES.unsuitable,
    level: "Unsuitable",
    available: true,
  };
}

// ============================================================
// FACTOR DESCRIPTION
// ============================================================

function describeFactor(level) {
  switch (level) {
    case "Excellent":
      return "excellent";

    case "Good":
      return "good";

    case "Acceptable":
      return "acceptable";

    case "Marginal":
      return "marginal";

    case "Unsuitable":
      return "not suitable";

    default:
      return "not available";
  }
}

// ============================================================
// ADD FACTOR EXPLANATION
// ============================================================

function addFactorExplanation({
  positiveFactors,
  limitingFactors,
  managementConsiderations,
  result,
  factorLabel,
  value,
  cropName,
  acceptableManagementMessage,
  limitingManagementMessage,
}) {
  if (!result.available) {
    managementConsiderations.push(
      `${factorLabel} information is not available for this suitability assessment.`,
    );

    return;
  }

  if (result.level === "Excellent" || result.level === "Good") {
    positiveFactors.push(
      `${factorLabel} (${value}) is a ${describeFactor(
        result.level,
      )} match for ${cropName}.`,
    );

    return;
  }

  if (result.level === "Acceptable") {
    positiveFactors.push(
      `${factorLabel} (${value}) is acceptable for ${cropName}.`,
    );

    managementConsiderations.push(acceptableManagementMessage);

    return;
  }

  limitingFactors.push(
    `${factorLabel} (${value}) is ${describeFactor(
      result.level,
    )} for ${cropName}.`,
  );

  managementConsiderations.push(limitingManagementMessage);
}

// ============================================================
// CALCULATE SUITABILITY SCORE
// ============================================================
//
// Missing information must not itself penalize the crop.
//
// Rules:
//
// 1. No available factors:
//      score = 0
//
// 2. Available factors are evaluated using their nominal
//    weights.
//
// 3. Missing factors contribute zero to scoreBreakdown.
//
// 4. For the overall suitability score, missing factors are
//    treated as unknown rather than unsuitable.
//
// 5. An unknown factor must therefore NOT reduce the score
//    that would otherwise be obtained from the available
//    evidence.
//
// 6. For overall score calculation only, the missing portion
//    of the nominal weight is treated as full suitability.
//    This preserves the established no-penalty behavior.
//
// 7. Data completeness is reported separately so that a high
//    score based on incomplete data is not presented as having
//    the same confidence as a complete assessment.
//
// ============================================================

function calculateSuitabilityScore(factors) {
  const availableFactors = factors.filter((factor) => factor.available);

  // ----------------------------------------------------------
  // No information available
  // ----------------------------------------------------------

  if (availableFactors.length === 0) {
    return {
      score: 0,
      effectiveWeight: 0,
    };
  }

  // ----------------------------------------------------------
  // Calculate observed weighted contribution.
  // ----------------------------------------------------------

  const weightedScore = availableFactors.reduce(
    (total, factor) => total + factor.score * factor.weight,
    0,
  );

  const effectiveWeight = availableFactors.reduce(
    (total, factor) => total + factor.weight,
    0,
  );

  if (effectiveWeight <= 0) {
    return {
      score: 0,
      effectiveWeight: 0,
    };
  }

  // ----------------------------------------------------------
  // Missing factors are UNKNOWN.
  //
  // They do not penalize the existing score.
  // ----------------------------------------------------------

  const totalWeight = factors.reduce(
    (total, factor) => total + factor.weight,
    0,
  );

  const missingWeight = totalWeight - effectiveWeight;

  const noPenaltyScore = weightedScore + missingWeight;

  // ----------------------------------------------------------
  // Keep score within 0..100.
  // ----------------------------------------------------------

  return {
    score: Math.max(0, Math.min(100, noPenaltyScore)),
    effectiveWeight,
  };
}

// ============================================================
// CALCULATE DATA COMPLETENESS
// ============================================================
//
// Completeness is based on the weighted suitability model.
//
// Existing suitability weights:
//
//   Soil texture      = 40%
//   Soil reaction     = 30%
//   Salinity          = 30%
//
// Examples:
//
//   All available:
//       40 + 30 + 30 = 100%
//
//   Texture missing:
//       30 + 30 = 60%
//
//   Soil reaction missing:
//       40 + 30 = 70%
//
//   Salinity missing:
//       40 + 30 = 70%
//
//   Only texture available:
//       40%
//
//   Only reaction available:
//       30%
//
//   Only salinity available:
//       30%
//
//   Nothing available:
//       0%
//
// IMPORTANT:
//   Completeness does NOT alter the suitability score.
//   It communicates how much evidence supports that score.
//
// ============================================================

function calculateDataCompleteness(factors) {
  const totalWeight = factors.reduce(
    (total, factor) => total + factor.weight,
    0,
  );

  const availableFactors = factors.filter((factor) => factor.available);

  const availableWeight = availableFactors.reduce(
    (total, factor) => total + factor.weight,
    0,
  );

  const percentage =
    totalWeight > 0 ? Math.round((availableWeight / totalWeight) * 100) : 0;

  let confidence;

  if (percentage === 100) {
    confidence = "High";
  } else if (percentage >= 60) {
    confidence = "Moderate";
  } else if (percentage > 0) {
    confidence = "Low";
  } else {
    confidence = "Unavailable";
  }

  return {
    availableFactors: availableFactors.length,
    totalFactors: factors.length,
    availableWeight,
    totalWeight,
    percentage,
    confidence,
  };
}

// ============================================================
// CALCULATE SCORE BREAKDOWN
// ============================================================
//
// Missing factor:
//
//     contribution = 0
//
// Available factor:
//
//     contribution is calculated using the nominal weight.
//
// ============================================================

function calculateScoreBreakdown(
  textureResult,
  reactionResult,
  salinityResult,
) {
  let soilTexture = 0;
  let soilReaction = 0;
  let salinity = 0;

  if (textureResult.available) {
    soilTexture = textureResult.score * SUITABILITY_WEIGHTS.texture;
  }

  if (reactionResult.available) {
    soilReaction = reactionResult.score * SUITABILITY_WEIGHTS.soilReaction;
  }

  if (salinityResult.available) {
    salinity = salinityResult.score * SUITABILITY_WEIGHTS.salinity;
  }

  return {
    soilTexture: Math.round(soilTexture),
    soilReaction: Math.round(soilReaction),
    salinity: Math.round(salinity),
  };
}

// ============================================================
// EVALUATE CROP SUITABILITY
// ============================================================

function evaluateCropSuitability(sampleOrAnalysis, optionalAnalysis) {
  let sample;
  let analysis;

  // ----------------------------------------------------------
  // TWO-ARGUMENT FORM
  // ----------------------------------------------------------

  if (arguments.length >= 2) {
    sample = sampleOrAnalysis;
    analysis = optionalAnalysis;

    if (!sample || typeof sample !== "object") {
      throw new Error("Soil sample is required");
    }
  }

  // ----------------------------------------------------------
  // ONE-ARGUMENT FORM
  // ----------------------------------------------------------
  else {
    analysis = sampleOrAnalysis;

    if (!analysis || typeof analysis !== "object") {
      throw new Error("Soil analysis is required");
    }

    sample = {
      soil_texture: analysis.soilTexture ?? null,
    };
  }

  // ----------------------------------------------------------
  // VALIDATE ANALYSIS
  // ----------------------------------------------------------

  if (!analysis || typeof analysis !== "object") {
    throw new Error("Soil analysis is required");
  }

  if (!analysis.values || typeof analysis.values !== "object") {
    throw new Error("Soil analysis values are required");
  }

  // ----------------------------------------------------------
  // CLASSIFIED VALUES
  // ----------------------------------------------------------

  const values = analysis.values;

  const phClassification = values.pH?.classification ?? null;

  const salinityClassification =
    values.electricalConductivity?.classification ?? null;

  // ----------------------------------------------------------
  // SOIL TEXTURE
  // ----------------------------------------------------------

  const soilTexture = analysis.soilTexture ?? sample.soil_texture ?? null;

  // ----------------------------------------------------------
  // FERTILITY CONTEXT
  // ----------------------------------------------------------

  const fertilityContext = buildFertilityContext(analysis);

  // ----------------------------------------------------------
  // ASSESSMENT-LEVEL FACTORS
  //
  // These represent the actual soil information available for
  // the sample and are common to every crop.
  // ----------------------------------------------------------

  const assessmentFactors = [
    {
      key: "soilTexture",
      weight: SUITABILITY_WEIGHTS.texture,
      available:
        soilTexture !== null && soilTexture !== undefined && soilTexture !== "",
    },

    {
      key: "soilReaction",
      weight: SUITABILITY_WEIGHTS.soilReaction,
      available:
        phClassification !== null &&
        phClassification !== undefined &&
        phClassification !== "",
    },

    {
      key: "salinity",
      weight: SUITABILITY_WEIGHTS.salinity,
      available:
        salinityClassification !== null &&
        salinityClassification !== undefined &&
        salinityClassification !== "",
    },
  ];

  const assessmentCompleteness = calculateDataCompleteness(assessmentFactors);

  // ----------------------------------------------------------
  // EVALUATE EACH CROP
  // ----------------------------------------------------------

  const evaluatedCrops = CROP_PROFILES.map((crop) => {
    const positiveFactors = [];
    const limitingFactors = [];
    const managementConsiderations = [];

    // ========================================================
    // TEXTURE
    // ========================================================

    const textureResult = evaluateCondition(soilTexture, crop.texture);

    // ========================================================
    // SOIL REACTION
    // ========================================================

    const reactionResult = evaluateCondition(
      phClassification,
      crop.soilReaction,
    );

    // ========================================================
    // SALINITY
    // ========================================================

    const salinityResult = evaluateCondition(
      salinityClassification,
      crop.salinity,
    );

    // ========================================================
    // EXPLANATIONS
    // ========================================================

    addFactorExplanation({
      positiveFactors,
      limitingFactors,
      managementConsiderations,
      result: textureResult,
      factorLabel: "Soil texture",
      value: soilTexture,
      cropName: crop.name,
      acceptableManagementMessage: `Soil texture is acceptable but may require attention to structure, drainage, and field management for ${crop.name}.`,
      limitingManagementMessage: `Soil structure, drainage, and field management should be considered carefully for ${crop.name}.`,
    });

    addFactorExplanation({
      positiveFactors,
      limitingFactors,
      managementConsiderations,
      result: reactionResult,
      factorLabel: "Soil reaction",
      value: phClassification,
      cropName: crop.name,
      acceptableManagementMessage: `Soil pH should be monitored when cultivating ${crop.name}.`,
      limitingManagementMessage: `Soil pH should be considered carefully when planning cultivation of ${crop.name}.`,
    });

    addFactorExplanation({
      positiveFactors,
      limitingFactors,
      managementConsiderations,
      result: salinityResult,
      factorLabel: "Salinity condition",
      value: salinityClassification,
      cropName: crop.name,
      acceptableManagementMessage: `Salinity and irrigation management should be monitored when cultivating ${crop.name}.`,
      limitingManagementMessage: `Salinity and irrigation management require careful consideration for ${crop.name}.`,
    });

    // ========================================================
    // CROP-SPECIFIC FACTORS
    // ========================================================

    const factors = [
      {
        key: "soilTexture",
        score: textureResult.score,
        weight: SUITABILITY_WEIGHTS.texture,
        available: textureResult.available,
      },

      {
        key: "soilReaction",
        score: reactionResult.score,
        weight: SUITABILITY_WEIGHTS.soilReaction,
        available: reactionResult.available,
      },

      {
        key: "salinity",
        score: salinityResult.score,
        weight: SUITABILITY_WEIGHTS.salinity,
        available: salinityResult.available,
      },
    ];

    // ========================================================
    // SCORE
    // ========================================================

    const calculated = calculateSuitabilityScore(factors);

    const roundedScore = Math.max(
      0,
      Math.min(100, Math.round(calculated.score)),
    );

    const suitability = classifySuitability(roundedScore);

    // ========================================================
    // SCORE BREAKDOWN
    // ========================================================

    const scoreBreakdown = calculateScoreBreakdown(
      textureResult,
      reactionResult,
      salinityResult,
    );

    // ========================================================
    // GENERAL MANAGEMENT CONSIDERATION
    // ========================================================

    if (managementConsiderations.length === 0) {
      managementConsiderations.push(
        `Review crop-specific agronomic requirements before selecting ${crop.name}.`,
      );
    }

    // ========================================================
    // RESULT
    // ========================================================

    return {
      crop: crop.name,

      category: crop.category,

      suitability,

      score: roundedScore,

      fertilityContext: {
        overallFertility: fertilityContext.overallFertility,

        limitingNutrients: [...fertilityContext.limitingNutrients],

        status: fertilityContext.status,
      },

      scoreBreakdown,

      positiveFactors,

      limitingFactors,

      managementConsiderations,

      // ------------------------------------------------------
      // Data transparency
      //
      // This is the same sample-level completeness information
      // for every crop because all crops use the same three
      // laboratory-derived suitability factors.
      // ------------------------------------------------------

      dataCompleteness: {
        ...assessmentCompleteness,
      },

      assessmentConfidence: assessmentCompleteness.confidence,
    };
  });

  // ----------------------------------------------------------
  // COMPLETE RESULT
  // ----------------------------------------------------------

  return {
    scoring: {
      method: "Weighted soil suitability assessment",

      interpretation:
        "Suitability score reflects graded crop preferences for soil texture, soil reaction, and salinity. Missing factors are treated as unavailable information rather than unsuitable conditions and therefore do not themselves reduce suitability. Assessment confidence is reported separately based on the weighted availability of suitability factors. Soil fertility is reported separately as contextual information.",

      weights: {
        soilTexture: `${SUITABILITY_WEIGHTS.texture}%`,

        soilReaction: `${SUITABILITY_WEIGHTS.soilReaction}%`,

        salinity: `${SUITABILITY_WEIGHTS.salinity}%`,
      },

      dataCompleteness: {
        ...assessmentCompleteness,
      },

      assessmentConfidence: assessmentCompleteness.confidence,
    },

    classification: {
      highlySuitable: "80-100",
      suitable: "65-79",
      moderatelySuitable: "50-64",
      marginal: "35-49",
      unsuitable: "0-34",
    },

    basis: [
      "Soil texture",
      "Soil reaction",
      "Electrical conductivity / salinity",
    ],

    fertilityContextBasis: [
      "Overall soil fertility classification",
      "Low Nitrogen",
      "Low Phosphorus",
      "Low Potassium",
      "Low Organic Carbon",
    ],

    crops: rankCropSuitability(evaluatedCrops),
  };
}

// ============================================================
// RANK CROP SUITABILITY
// ============================================================

function rankCropSuitability(crops) {
  if (!Array.isArray(crops)) {
    throw new Error("Crop suitability results are required");
  }

  return [...crops]
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.crop.localeCompare(b.crop);
    })
    .map((crop, index) => ({
      rank: index + 1,
      ...crop,
    }));
}

// ============================================================
// COMPLETE CROP RECOMMENDATION
// ============================================================

function generateCropRecommendations(sample, analysis) {
  return evaluateCropSuitability(sample, analysis);
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  evaluateCropSuitability,
  rankCropSuitability,
  generateCropRecommendations,
};
