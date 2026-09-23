// ============================================================
// server/tests/cropSuitabilityService.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 6.2
//
// Unit tests for Crop Suitability Service
//
// ============================================================

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  evaluateCropSuitability,
  rankCropSuitability,
  generateCropRecommendations,
} = require("../services/cropSuitabilityService");

// ============================================================
// TEST SOIL ANALYSIS
// ============================================================
//
// Representative agricultural soil.
//
// ============================================================

const goodSoilAnalysis = {
  values: {
    pH: {
      value: 6.8,
      unit: "",
      classification: "Neutral",
    },

    nitrogen: {
      value: 300,
      unit: "kg/ha",
      classification: "Medium",
    },

    phosphorus: {
      value: 20,
      unit: "kg/ha",
      classification: "Medium",
    },

    potassium: {
      value: 250,
      unit: "kg/ha",
      classification: "Medium",
    },

    organicCarbon: {
      value: 0.75,
      unit: "%",
      classification: "Medium",
    },

    electricalConductivity: {
      value: 0.35,
      unit: "dS/m",
      classification: "Non-saline",
    },
  },

  overallFertility: "Moderate / Good",

  soilTexture: "Loamy",
};

// ============================================================
// HELPER
// ============================================================

function runService(overrides = {}) {
  const soilAnalysis = {
    ...goodSoilAnalysis,
    ...overrides,
  };

  return evaluateCropSuitability(soilAnalysis);
}

// ============================================================
// HELPER — FIND CROP
// ============================================================

function findCrop(result, cropName) {
  const crop = result.crops.find((item) => item.crop === cropName);

  assert.ok(
    crop,
    `Expected crop "${cropName}" to exist in suitability results.`,
  );

  return crop;
}

// ============================================================
// TEST 1
// ============================================================

test("Crop suitability service can be loaded", () => {
  assert.equal(typeof evaluateCropSuitability, "function");
});

// ============================================================
// TEST 2
// ============================================================

test("Crop suitability returns results for valid soil analysis", () => {
  const result = runService();

  assert.ok(result);

  assert.ok(
    Array.isArray(result.crops),
    "Result should contain a crops array.",
  );

  assert.ok(result.crops.length > 0, "At least one crop should be evaluated.");
});

// ============================================================
// TEST 3
// ============================================================

test("Crop suitability returns scoring information", () => {
  const result = runService();

  assert.ok(result.scoring, "Scoring information should be present.");

  assert.ok(result.scoring.method, "Scoring method should be present.");

  assert.ok(result.scoring.weights, "Scoring weights should be present.");
});

// ============================================================
// TEST 4
// ============================================================

test("Crop suitability scoring weights contain all three factors", () => {
  const result = runService();

  const weights = result.scoring.weights;

  assert.ok(
    Object.prototype.hasOwnProperty.call(weights, "soilTexture"),
    "soilTexture weight should exist.",
  );

  assert.ok(
    Object.prototype.hasOwnProperty.call(weights, "soilReaction"),
    "soilReaction weight should exist.",
  );

  assert.ok(
    Object.prototype.hasOwnProperty.call(weights, "salinity"),
    "salinity weight should exist.",
  );
});

// ============================================================
// TEST 5
// ============================================================

test("Crop suitability results contain required crop fields", () => {
  const result = runService();

  result.crops.forEach((crop, index) => {
    assert.ok(crop.crop, `Crop ${index + 1} should have a crop name.`);

    assert.ok(crop.category, `${crop.crop} should have a category.`);

    assert.ok(
      crop.suitability,
      `${crop.crop} should have a suitability classification.`,
    );

    assert.notEqual(crop.rank, undefined, `${crop.crop} should have a rank.`);

    assert.notEqual(crop.score, undefined, `${crop.crop} should have a score.`);
  });
});

// ============================================================
// TEST 6
// ============================================================

test("Crop suitability scores are between 0 and 100", () => {
  const result = runService();

  result.crops.forEach((crop) => {
    const score = Number(crop.score);

    assert.ok(Number.isFinite(score), `${crop.crop} score should be numeric.`);

    assert.ok(
      score >= 0 && score <= 100,
      `${crop.crop} score should be between 0 and 100.`,
    );
  });
});

// ============================================================
// TEST 7
// ============================================================

test("Crop suitability results are ranked correctly", () => {
  const result = runService();

  for (let i = 1; i < result.crops.length; i += 1) {
    assert.ok(
      result.crops[i].rank >= result.crops[i - 1].rank,
      "Crop ranks should be in ascending order.",
    );

    assert.ok(
      result.crops[i].score <= result.crops[i - 1].score,
      "Crop scores should be in descending order.",
    );
  }
});

// ============================================================
// TEST 8
// ============================================================

test("Crop suitability results contain score breakdown", () => {
  const result = runService();

  result.crops.forEach((crop) => {
    assert.ok(
      crop.scoreBreakdown,
      `${crop.crop} should contain scoreBreakdown.`,
    );

    assert.ok(
      Object.prototype.hasOwnProperty.call(crop.scoreBreakdown, "soilTexture"),
      `${crop.crop} should contain soilTexture score.`,
    );

    assert.ok(
      Object.prototype.hasOwnProperty.call(crop.scoreBreakdown, "soilReaction"),
      `${crop.crop} should contain soilReaction score.`,
    );

    assert.ok(
      Object.prototype.hasOwnProperty.call(crop.scoreBreakdown, "salinity"),
      `${crop.crop} should contain salinity score.`,
    );
  });
});

// ============================================================
// TEST 9
// ============================================================

test("Crop suitability results contain positive factors", () => {
  const result = runService();

  result.crops.forEach((crop) => {
    assert.ok(
      Array.isArray(crop.positiveFactors),
      `${crop.crop} positiveFactors should be an array.`,
    );
  });
});

// ============================================================
// TEST 10
// ============================================================

test("Crop suitability results contain limiting factors", () => {
  const result = runService();

  result.crops.forEach((crop) => {
    assert.ok(
      Array.isArray(crop.limitingFactors),
      `${crop.crop} limitingFactors should be an array.`,
    );
  });
});

// ============================================================
// TEST 11
// ============================================================

test("Crop suitability results contain management considerations", () => {
  const result = runService();

  result.crops.forEach((crop) => {
    assert.ok(
      Array.isArray(crop.managementConsiderations),
      `${crop.crop} managementConsiderations should be an array.`,
    );
  });
});

// ============================================================
// TEST 12
// ============================================================

test("Acidic soil produces crop suitability results", () => {
  const result = runService({
    values: {
      ...goodSoilAnalysis.values,

      pH: {
        ...goodSoilAnalysis.values.pH,
        value: 5.5,
        classification: "Acidic",
      },
    },

    soilTexture: "Loamy",
  });

  assert.ok(result);
  assert.ok(Array.isArray(result.crops));
  assert.ok(result.crops.length > 0);
});

// ============================================================
// TEST 13
// ============================================================

test("Alkaline soil produces crop suitability results", () => {
  const result = runService({
    values: {
      ...goodSoilAnalysis.values,

      pH: {
        ...goodSoilAnalysis.values.pH,
        value: 8.2,
        classification: "Alkaline",
      },
    },

    soilTexture: "Loamy",
  });

  assert.ok(result);
  assert.ok(Array.isArray(result.crops));
  assert.ok(result.crops.length > 0);
});

// ============================================================
// TEST 14
// ============================================================

test("Higher salinity does not improve average crop suitability", () => {
  const normalResult = runService();

  const salineResult = runService({
    values: {
      ...goodSoilAnalysis.values,

      electricalConductivity: {
        ...goodSoilAnalysis.values.electricalConductivity,
        value: 2.0,
        classification: "Strongly saline",
      },
    },
  });

  const normalAverage =
    normalResult.crops.reduce((sum, crop) => sum + Number(crop.score), 0) /
    normalResult.crops.length;

  const salineAverage =
    salineResult.crops.reduce((sum, crop) => sum + Number(crop.score), 0) /
    salineResult.crops.length;

  assert.ok(
    salineAverage <= normalAverage,
    "Higher salinity should not improve average suitability.",
  );
});

// ============================================================
// TEST 15
// ============================================================

test("Missing texture does not reduce suitability score", () => {
  const completeResult = runService();

  const missingTextureResult = runService({
    soilTexture: null,
  });

  completeResult.crops.forEach((completeCrop) => {
    const missingCrop = findCrop(missingTextureResult, completeCrop.crop);

    assert.ok(
      missingCrop.score >= completeCrop.score,
      `${completeCrop.crop} should not be penalized for missing texture.`,
    );

    assert.equal(
      missingCrop.scoreBreakdown.soilTexture,
      0,
      `${completeCrop.crop} texture contribution should be zero when unavailable.`,
    );
  });
});

// ============================================================
// TEST 16
// ============================================================

test("Missing soil reaction does not reduce suitability score", () => {
  const completeResult = runService();

  const missingReactionResult = runService({
    values: {
      ...goodSoilAnalysis.values,

      pH: {
        value: null,
        unit: "",
        classification: null,
      },
    },
  });

  completeResult.crops.forEach((completeCrop) => {
    const missingCrop = findCrop(missingReactionResult, completeCrop.crop);

    assert.ok(
      missingCrop.score >= completeCrop.score,
      `${completeCrop.crop} should not be penalized for missing soil reaction.`,
    );

    assert.equal(
      missingCrop.scoreBreakdown.soilReaction,
      0,
      `${completeCrop.crop} reaction contribution should be zero when unavailable.`,
    );
  });
});

// ============================================================
// TEST 17
// ============================================================

test("Missing salinity does not reduce suitability score", () => {
  const completeResult = runService();

  const missingSalinityResult = runService({
    values: {
      ...goodSoilAnalysis.values,

      electricalConductivity: {
        value: null,
        unit: "dS/m",
        classification: null,
      },
    },
  });

  completeResult.crops.forEach((completeCrop) => {
    const missingCrop = findCrop(missingSalinityResult, completeCrop.crop);

    assert.ok(
      missingCrop.score >= completeCrop.score,
      `${completeCrop.crop} should not be penalized for missing salinity.`,
    );

    assert.equal(
      missingCrop.scoreBreakdown.salinity,
      0,
      `${completeCrop.crop} salinity contribution should be zero when unavailable.`,
    );
  });
});

// ============================================================
// TEST 18
// ============================================================

test("All suitability factors unavailable produce zero score", () => {
  const result = runService({
    soilTexture: null,

    values: {
      ...goodSoilAnalysis.values,

      pH: {
        value: null,
        unit: "",
        classification: null,
      },

      electricalConductivity: {
        value: null,
        unit: "dS/m",
        classification: null,
      },
    },
  });

  result.crops.forEach((crop) => {
    assert.equal(
      crop.score,
      0,
      `${crop.crop} should score zero when all suitability factors are unavailable.`,
    );

    assert.equal(crop.scoreBreakdown.soilTexture, 0);

    assert.equal(crop.scoreBreakdown.soilReaction, 0);

    assert.equal(crop.scoreBreakdown.salinity, 0);
  });
});

// ============================================================
// TEST 19
// ============================================================
//
// The major purpose of this phase:
//
// Different crops must not all behave identically.
//
// ============================================================

test("Crop profiles produce differentiated scores under normal soil conditions", () => {
  const result = runService();

  const scores = new Set(result.crops.map((crop) => crop.score));

  assert.ok(
    scores.size > 1,
    "Crop-specific profiles should produce more than one suitability score.",
  );
});

// ============================================================
// TEST 20
// ============================================================

test("Crop profiles produce differentiated salinity responses", () => {
  const result = runService({
    values: {
      ...goodSoilAnalysis.values,

      electricalConductivity: {
        value: 1.2,
        unit: "dS/m",
        classification: "Moderately saline",
      },
    },
  });

  const cotton = findCrop(result, "Cotton");
  const maize = findCrop(result, "Maize");
  const sugarcane = findCrop(result, "Sugarcane");

  assert.ok(
    cotton.score > maize.score,
    "Cotton should be more tolerant of moderate salinity than maize.",
  );

  assert.ok(
    cotton.score > sugarcane.score,
    "Cotton should be more tolerant of moderate salinity than sugarcane.",
  );
});

// ============================================================
// TEST 21
// ============================================================

test("Crop profiles produce differentiated texture responses", () => {
  const result = runService({
    soilTexture: "Sandy Loam",
  });

  const groundnut = findCrop(result, "Groundnut");
  const rice = findCrop(result, "Rice");
  const cotton = findCrop(result, "Cotton");

  assert.ok(
    groundnut.score > rice.score,
    "Groundnut should respond more favorably than rice to sandy-loam texture.",
  );

  assert.ok(
    groundnut.score > cotton.score,
    "Groundnut should respond more favorably than cotton to sandy-loam texture.",
  );
});

// ============================================================
// TEST 22
// ============================================================

test("Crop profiles produce differentiated soil reaction responses", () => {
  const result = runService({
    values: {
      ...goodSoilAnalysis.values,

      pH: {
        value: 8.2,
        unit: "",
        classification: "Alkaline",
      },
    },
  });

  const cotton = findCrop(result, "Cotton");
  const rice = findCrop(result, "Rice");
  const groundnut = findCrop(result, "Groundnut");

  assert.ok(
    cotton.score > rice.score,
    "Cotton should respond more favorably than rice to alkaline soil reaction.",
  );

  assert.ok(
    cotton.score > groundnut.score,
    "Cotton should respond more favorably than groundnut to alkaline soil reaction.",
  );
});

// ============================================================
// TEST 23
// ============================================================

test("Cotton has a stronger salinity score than maize under moderate salinity", () => {
  const result = runService({
    values: {
      ...goodSoilAnalysis.values,

      electricalConductivity: {
        value: 1.2,
        unit: "dS/m",
        classification: "Moderately saline",
      },
    },
  });

  const cotton = findCrop(result, "Cotton");
  const maize = findCrop(result, "Maize");

  assert.ok(
    cotton.scoreBreakdown.salinity > maize.scoreBreakdown.salinity,
    "Cotton should receive a higher salinity contribution than maize.",
  );
});

// ============================================================
// TEST 24
// ============================================================

test("Rice and cotton respond differently to alkaline soil", () => {
  const result = runService({
    values: {
      ...goodSoilAnalysis.values,

      pH: {
        value: 8.2,
        unit: "",
        classification: "Alkaline",
      },
    },
  });

  const rice = findCrop(result, "Rice");
  const cotton = findCrop(result, "Cotton");

  assert.notEqual(
    rice.scoreBreakdown.soilReaction,
    cotton.scoreBreakdown.soilReaction,
    "Rice and cotton should have different alkaline-soil reaction scores.",
  );
});

// ============================================================
// TEST 25
// ============================================================

test("Crop ranking is deterministic", () => {
  const first = runService();
  const second = runService();

  assert.deepEqual(
    first.crops,
    second.crops,
    "Repeated evaluation of the same soil should produce identical rankings.",
  );
});

// ============================================================
// TEST 26
// ============================================================

test("Fertility remains contextual and does not alter suitability score", () => {
  const moderate = runService({
    overallFertility: "Moderate / Good",
  });

  const low = runService({
    overallFertility: "Low",
  });

  moderate.crops.forEach((crop) => {
    const lowCrop = findCrop(low, crop.crop);

    assert.equal(
      crop.score,
      lowCrop.score,
      `${crop.crop} suitability score should not change solely because fertility classification changes.`,
    );
  });
});

// ============================================================
// TEST 27
// ============================================================

test("Low nutrient classifications appear in fertility context", () => {
  const result = runService({
    values: {
      ...goodSoilAnalysis.values,

      nitrogen: {
        value: 100,
        unit: "kg/ha",
        classification: "Low",
      },

      phosphorus: {
        value: 8,
        unit: "kg/ha",
        classification: "Low",
      },
    },

    overallFertility: "Low",
  });

  result.crops.forEach((crop) => {
    assert.ok(crop.fertilityContext.limitingNutrients.includes("Nitrogen"));

    assert.ok(crop.fertilityContext.limitingNutrients.includes("Phosphorus"));
  });
});

// ============================================================
// TEST 28
// ============================================================

test("rankCropSuitability sorts arbitrary crop results correctly", () => {
  const crops = [
    {
      crop: "Crop C",
      score: 60,
    },

    {
      crop: "Crop A",
      score: 90,
    },

    {
      crop: "Crop B",
      score: 75,
    },
  ];

  const ranked = rankCropSuitability(crops);

  assert.deepEqual(
    ranked.map((crop) => crop.crop),
    ["Crop A", "Crop B", "Crop C"],
  );

  assert.deepEqual(
    ranked.map((crop) => crop.rank),
    [1, 2, 3],
  );
});

// ============================================================
// TEST 29
// ============================================================

test("Rank ties are resolved alphabetically", () => {
  const crops = [
    {
      crop: "Zeta",
      score: 80,
    },

    {
      crop: "Alpha",
      score: 80,
    },

    {
      crop: "Beta",
      score: 80,
    },
  ];

  const ranked = rankCropSuitability(crops);

  assert.deepEqual(
    ranked.map((crop) => crop.crop),
    ["Alpha", "Beta", "Zeta"],
  );
});

// ============================================================
// TEST 30
// ============================================================

test("generateCropRecommendations returns complete suitability result", () => {
  const result = generateCropRecommendations(
    {
      soil_texture: "Loamy",
    },
    goodSoilAnalysis,
  );

  assert.ok(result);
  assert.ok(result.scoring);
  assert.ok(Array.isArray(result.crops));
  assert.ok(result.crops.length > 0);
});

// ============================================================
// TEST 31
// ============================================================
//
// Complete data should provide maximum assessment confidence.
//
// Weights:
// Texture  = 40%
// Reaction = 30%
// Salinity = 30%
//
// ============================================================

test("Complete suitability data produces 100 percent completeness and High confidence", () => {
  const result = runService();

  assert.ok(
    result.scoring.dataCompleteness,
    "Scoring should contain data completeness information.",
  );

  assert.equal(
    result.scoring.dataCompleteness.percentage,
    100,
    "Complete suitability data should produce 100% completeness.",
  );

  assert.equal(
    result.scoring.dataCompleteness.confidence,
    "High",
    "Complete suitability data should produce High confidence.",
  );

  assert.equal(
    result.scoring.assessmentConfidence,
    "High",
    "Top-level assessment confidence should be High.",
  );

  assert.equal(
    result.scoring.dataCompleteness.availableFactors,
    3,
    "All three suitability factors should be available.",
  );

  assert.equal(
    result.scoring.dataCompleteness.totalFactors,
    3,
    "There should be three suitability factors.",
  );

  assert.equal(
    result.scoring.dataCompleteness.availableWeight,
    100,
    "All suitability weights should be available.",
  );

  assert.equal(
    result.scoring.dataCompleteness.totalWeight,
    100,
    "Total suitability weight should be 100.",
  );
});

// ============================================================
// TEST 32
// ============================================================
//
// Missing texture:
// Available reaction = 30%
// Available salinity = 30%
// Total available = 60%
//
// ============================================================

test("Missing texture produces 60 percent completeness and Moderate confidence", () => {
  const result = runService({
    soilTexture: null,
  });

  assert.equal(
    result.scoring.dataCompleteness.percentage,
    60,
    "Missing texture should leave 60% of weighted suitability data available.",
  );

  assert.equal(
    result.scoring.dataCompleteness.confidence,
    "Moderate",
    "60% completeness should produce Moderate confidence.",
  );

  assert.equal(
    result.scoring.assessmentConfidence,
    "Moderate",
    "Assessment confidence should be Moderate.",
  );

  assert.equal(
    result.scoring.dataCompleteness.availableFactors,
    2,
    "Two suitability factors should remain available.",
  );

  assert.equal(
    result.scoring.dataCompleteness.availableWeight,
    60,
    "Available suitability weight should be 60.",
  );
});

// ============================================================
// TEST 33
// ============================================================
//
// Missing pH / soil reaction:
// Available texture = 40%
// Available salinity = 30%
// Total available = 70%
//
// ============================================================

test("Missing soil reaction produces 70 percent completeness and Moderate confidence", () => {
  const result = runService({
    values: {
      ...goodSoilAnalysis.values,

      pH: {
        value: null,
        unit: "",
        classification: null,
      },
    },
  });

  assert.equal(
    result.scoring.dataCompleteness.percentage,
    70,
    "Missing soil reaction should leave 70% of weighted suitability data available.",
  );

  assert.equal(
    result.scoring.dataCompleteness.confidence,
    "Moderate",
    "70% completeness should produce Moderate confidence.",
  );

  assert.equal(
    result.scoring.assessmentConfidence,
    "Moderate",
    "Assessment confidence should be Moderate.",
  );

  assert.equal(
    result.scoring.dataCompleteness.availableFactors,
    2,
    "Two suitability factors should remain available.",
  );

  assert.equal(
    result.scoring.dataCompleteness.availableWeight,
    70,
    "Available suitability weight should be 70.",
  );
});

// ============================================================
// TEST 34
// ============================================================
//
// Missing salinity:
// Available texture = 40%
// Available reaction = 30%
// Total available = 70%
//
// ============================================================

test("Missing salinity produces 70 percent completeness and Moderate confidence", () => {
  const result = runService({
    values: {
      ...goodSoilAnalysis.values,

      electricalConductivity: {
        value: null,
        unit: "dS/m",
        classification: null,
      },
    },
  });

  assert.equal(
    result.scoring.dataCompleteness.percentage,
    70,
    "Missing salinity should leave 70% of weighted suitability data available.",
  );

  assert.equal(
    result.scoring.dataCompleteness.confidence,
    "Moderate",
    "70% completeness should produce Moderate confidence.",
  );

  assert.equal(
    result.scoring.assessmentConfidence,
    "Moderate",
    "Assessment confidence should be Moderate.",
  );

  assert.equal(
    result.scoring.dataCompleteness.availableFactors,
    2,
    "Two suitability factors should remain available.",
  );

  assert.equal(
    result.scoring.dataCompleteness.availableWeight,
    70,
    "Available suitability weight should be 70.",
  );
});

// ============================================================
// TEST 35
// ============================================================
//
// Only texture available:
// Texture = 40%
//
// ============================================================

test("Only soil texture available produces 40 percent completeness and Low confidence", () => {
  const result = runService({
    values: {
      ...goodSoilAnalysis.values,

      pH: {
        value: null,
        unit: "",
        classification: null,
      },

      electricalConductivity: {
        value: null,
        unit: "dS/m",
        classification: null,
      },
    },
  });

  assert.equal(
    result.scoring.dataCompleteness.percentage,
    40,
    "Only texture available should produce 40% completeness.",
  );

  assert.equal(
    result.scoring.dataCompleteness.confidence,
    "Low",
    "40% completeness should produce Low confidence.",
  );

  assert.equal(
    result.scoring.assessmentConfidence,
    "Low",
    "Assessment confidence should be Low.",
  );

  assert.equal(
    result.scoring.dataCompleteness.availableFactors,
    1,
    "Only one suitability factor should be available.",
  );

  assert.equal(
    result.scoring.dataCompleteness.availableWeight,
    40,
    "Available suitability weight should be 40.",
  );
});

// ============================================================
// TEST 36
// ============================================================
//
// Only soil reaction available:
// Reaction = 30%
//
// ============================================================

test("Only soil reaction available produces 30 percent completeness and Low confidence", () => {
  const result = runService({
    soilTexture: null,

    values: {
      ...goodSoilAnalysis.values,

      pH: {
        value: 6.8,
        unit: "",
        classification: "Neutral",
      },

      electricalConductivity: {
        value: null,
        unit: "dS/m",
        classification: null,
      },
    },
  });

  assert.equal(
    result.scoring.dataCompleteness.percentage,
    30,
    "Only soil reaction available should produce 30% completeness.",
  );

  assert.equal(
    result.scoring.dataCompleteness.confidence,
    "Low",
    "30% completeness should produce Low confidence.",
  );

  assert.equal(
    result.scoring.assessmentConfidence,
    "Low",
    "Assessment confidence should be Low.",
  );

  assert.equal(
    result.scoring.dataCompleteness.availableFactors,
    1,
    "Only one suitability factor should be available.",
  );

  assert.equal(
    result.scoring.dataCompleteness.availableWeight,
    30,
    "Available suitability weight should be 30.",
  );
});

// ============================================================
// TEST 37
// ============================================================
//
// Only salinity available:
// Salinity = 30%
//
// ============================================================

test("Only salinity available produces 30 percent completeness and Low confidence", () => {
  const result = runService({
    soilTexture: null,

    values: {
      ...goodSoilAnalysis.values,

      pH: {
        value: null,
        unit: "",
        classification: null,
      },

      electricalConductivity: {
        value: 0.35,
        unit: "dS/m",
        classification: "Non-saline",
      },
    },
  });

  assert.equal(
    result.scoring.dataCompleteness.percentage,
    30,
    "Only salinity available should produce 30% completeness.",
  );

  assert.equal(
    result.scoring.dataCompleteness.confidence,
    "Low",
    "30% completeness should produce Low confidence.",
  );

  assert.equal(
    result.scoring.assessmentConfidence,
    "Low",
    "Assessment confidence should be Low.",
  );

  assert.equal(
    result.scoring.dataCompleteness.availableFactors,
    1,
    "Only one suitability factor should be available.",
  );

  assert.equal(
    result.scoring.dataCompleteness.availableWeight,
    30,
    "Available suitability weight should be 30.",
  );
});

// ============================================================
// TEST 38
// ============================================================
//
// No suitability factors available.
//
// ============================================================

test("All suitability factors unavailable produce zero completeness and Unavailable confidence", () => {
  const result = runService({
    soilTexture: null,

    values: {
      ...goodSoilAnalysis.values,

      pH: {
        value: null,
        unit: "",
        classification: null,
      },

      electricalConductivity: {
        value: null,
        unit: "dS/m",
        classification: null,
      },
    },
  });

  assert.equal(
    result.scoring.dataCompleteness.percentage,
    0,
    "No available suitability data should produce 0% completeness.",
  );

  assert.equal(
    result.scoring.dataCompleteness.confidence,
    "Unavailable",
    "No available suitability data should produce Unavailable confidence.",
  );

  assert.equal(
    result.scoring.assessmentConfidence,
    "Unavailable",
    "Assessment confidence should be Unavailable.",
  );

  assert.equal(
    result.scoring.dataCompleteness.availableFactors,
    0,
    "No suitability factors should be available.",
  );

  assert.equal(
    result.scoring.dataCompleteness.availableWeight,
    0,
    "Available suitability weight should be zero.",
  );
});

// ============================================================
// TEST 39
// ============================================================
//
// Every crop uses the same underlying sample-level completeness.
//
// ============================================================

test("Every crop inherits the same sample-level data completeness and confidence", () => {
  const result = runService({
    soilTexture: null,
  });

  assert.equal(
    result.scoring.dataCompleteness.percentage,
    60,
    "Sample-level completeness should be 60%.",
  );

  assert.equal(
    result.scoring.assessmentConfidence,
    "Moderate",
    "Sample-level assessment confidence should be Moderate.",
  );

  result.crops.forEach((crop) => {
    assert.ok(
      crop.dataCompleteness,
      `${crop.crop} should contain data completeness information.`,
    );

    assert.equal(
      crop.dataCompleteness.percentage,
      60,
      `${crop.crop} should inherit 60% data completeness.`,
    );

    assert.equal(
      crop.dataCompleteness.availableFactors,
      2,
      `${crop.crop} should inherit two available suitability factors.`,
    );

    assert.equal(
      crop.dataCompleteness.totalFactors,
      3,
      `${crop.crop} should inherit three total suitability factors.`,
    );

    assert.equal(
      crop.dataCompleteness.availableWeight,
      60,
      `${crop.crop} should inherit 60 available weight.`,
    );

    assert.equal(
      crop.dataCompleteness.totalWeight,
      100,
      `${crop.crop} should inherit 100 total weight.`,
    );

    assert.equal(
      crop.dataCompleteness.confidence,
      "Moderate",
      `${crop.crop} should have Moderate assessment confidence.`,
    );

    assert.equal(
      crop.assessmentConfidence,
      "Moderate",
      `${crop.crop} assessment confidence should be Moderate.`,
    );
  });
});

// ============================================================
// TEST 40
// ============================================================
//
// Data completeness describes confidence in the assessment.
//
// It must not introduce an additional penalty into the
// suitability score.
//
// The suitability score may legitimately change when a factor
// becomes unavailable because the service recalculates the
// score using the remaining available factors.
//
// ============================================================

test("Data completeness does not independently penalize suitability score", () => {
  const completeResult = runService();

  const missingTextureResult = runService({
    soilTexture: null,
  });

  completeResult.crops.forEach((completeCrop) => {
    const missingCrop = findCrop(missingTextureResult, completeCrop.crop);

    assert.ok(
      missingCrop.score >= completeCrop.score,
      `${completeCrop.crop} should not be penalized solely because texture is unavailable.`,
    );

    assert.equal(
      missingCrop.scoreBreakdown.soilTexture,
      0,
      `${completeCrop.crop} texture contribution should be zero when texture is unavailable.`,
    );

    assert.equal(
      missingCrop.dataCompleteness.percentage,
      60,
      `${completeCrop.crop} should report 60% data completeness when texture is unavailable.`,
    );

    assert.equal(
      missingCrop.assessmentConfidence,
      "Moderate",
      `${completeCrop.crop} should report Moderate assessment confidence when texture is unavailable.`,
    );
  });
});

// ============================================================
// VALIDATION TESTS
// ============================================================

// ============================================================

test("Missing soil analysis is rejected", () => {
  assert.throws(
    () => evaluateCropSuitability(null),
    /Soil analysis is required/i,
  );
});

// ============================================================

test("Undefined soil analysis is rejected", () => {
  assert.throws(
    () => evaluateCropSuitability(undefined),
    /Soil analysis is required/i,
  );
});

// ============================================================

test("Empty soil analysis object is rejected", () => {
  assert.throws(() => evaluateCropSuitability({}), /Soil analysis/i);
});

// ============================================================

test("Missing analysis values are rejected", () => {
  assert.throws(
    () =>
      evaluateCropSuitability({
        soilTexture: "Loamy",
      }),
    /Soil analysis values are required/i,
  );
});

// ============================================================

test("Missing sample is rejected when separate analysis is supplied", () => {
  assert.throws(
    () => evaluateCropSuitability(null, goodSoilAnalysis),
    /Soil sample is required/i,
  );
});

// ============================================================
// FINAL
// ============================================================

console.log("");
console.log("========================================");
console.log(" CROP SUITABILITY SERVICE TESTS");
console.log("========================================");
console.log("");
