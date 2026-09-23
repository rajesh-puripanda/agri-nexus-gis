"use strict";

// ============================================================
// server/services/historicalComparisonService.js
// Soil Analysis GIS â€” Phase 10.4.2
// Historical Comparison Service
// ============================================================

const historicalRepository = require("../repositories/historicalRepository");
const soilAnalysisService = require("./soilAnalysisService");

const API_PHASE = "10.4";

const STAGE_ORDER = ["Before sowing", "During growth", "After harvesting"];

const PARAMETERS = {
  ph: {
    label: "pH",
    unit: "pH",
    field: "ph",
    classifier: soilAnalysisService.classifyPH,
  },
  nitrogen: {
    label: "Nitrogen",
    unit: "kg/ha",
    field: "nitrogen",
    classifier: soilAnalysisService.classifyNitrogen,
  },
  phosphorus: {
    label: "Phosphorus",
    unit: "kg/ha",
    field: "phosphorus",
    classifier: soilAnalysisService.classifyPhosphorus,
  },
  potassium: {
    label: "Potassium",
    unit: "kg/ha",
    field: "potassium",
    classifier: soilAnalysisService.classifyPotassium,
  },
  organic_carbon: {
    label: "Organic Carbon",
    unit: "%",
    field: "organic_carbon",
    classifier: soilAnalysisService.classifyOrganicCarbon,
  },
  electrical_conductivity: {
    label: "Electrical Conductivity",
    unit: "dS/m",
    field: "electrical_conductivity",
    classifier: soilAnalysisService.classifyEC,
  },
};

function fail(code, message, details = {}) {
  return {
    success: false,
    phase: API_PHASE,
    code,
    message,
    ...details,
  };
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundValue(value, decimals = 6) {
  if (!Number.isFinite(value)) return null;

  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function validateRequest(request) {
  if (!request || typeof request !== "object") {
    return "Comparison request is required.";
  }

  if (typeof request.datasetCode !== "string" || !request.datasetCode.trim()) {
    return "datasetCode is required.";
  }

  if (typeof request.mandal !== "string" || !request.mandal.trim()) {
    return "mandal is required.";
  }

  const siteNo = Number(request.siteNo);

  if (!Number.isInteger(siteNo) || siteNo <= 0) {
    return "siteNo must be a positive integer.";
  }

  if (typeof request.parameter !== "string" || !PARAMETERS[request.parameter]) {
    return "Unsupported historical comparison parameter.";
  }

  if (request.stages !== undefined) {
    if (!Array.isArray(request.stages) || request.stages.length < 2) {
      return "stages must contain at least two stages.";
    }

    const uniqueStages = new Set(request.stages);

    if (uniqueStages.size !== request.stages.length) {
      return "stages must not contain duplicates.";
    }

    for (const stage of request.stages) {
      if (!STAGE_ORDER.includes(stage)) {
        return `Unsupported historical stage: ${stage}.`;
      }
    }
  }

  return null;
}

function sortByStage(rows) {
  return [...rows].sort(
    (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage),
  );
}

function getDepth(rows) {
  const depths = rows.map((row) => ({
    fromCm: normalizeNumber(row.depth_from_cm),
    toCm: normalizeNumber(row.depth_to_cm),
  }));

  const first = depths[0];

  if (!first || first.fromCm === null || first.toCm === null) {
    return {
      fromCm: first?.fromCm ?? null,
      toCm: first?.toCm ?? null,
      compatible: false,
    };
  }

  const compatible = depths.every(
    (depth) =>
      depth.fromCm !== null &&
      depth.toCm !== null &&
      depth.fromCm === first.fromCm &&
      depth.toCm === first.toCm,
  );

  return {
    fromCm: first.fromCm,
    toCm: first.toCm,
    compatible,
  };
}

function classifyValue(parameter, value) {
  const numericValue = normalizeNumber(value);

  if (numericValue === null) return null;

  return parameter.classifier(numericValue);
}

function calculateChange(from, to) {
  if (from === null || to === null) {
    return {
      absoluteChange: null,
      percentageChange: null,
      comparisonEligible: false,
      reason: "Missing parameter value.",
    };
  }

  const absoluteChange = roundValue(to - from);

  const percentageChange =
    from === 0 ? null : roundValue(((to - from) / from) * 100);

  return {
    absoluteChange,
    percentageChange,
    comparisonEligible: true,
    reason:
      from === 0
        ? "Comparison eligible; percentage change unavailable because the starting value is zero."
        : null,
  };
}

function buildClassificationTransition(from, to) {
  if (from === null || to === null) {
    return {
      from: from ?? null,
      to: to ?? null,
      changed: null,
    };
  }

  return {
    from,
    to,
    changed: from !== to,
  };
}

async function getHistoricalComparison(request) {
  const validationError = validateRequest(request);

  if (validationError) {
    return fail("INVALID_REQUEST", validationError);
  }

  const datasetCode = request.datasetCode.trim();
  const mandal = request.mandal.trim();
  const siteNo = Number(request.siteNo);
  const parameter = PARAMETERS[request.parameter];

  const dataset =
    await historicalRepository.getHistoricalDatasetByCode(datasetCode);

  if (!dataset) {
    return fail(
      "DATASET_NOT_FOUND",
      `Historical dataset "${datasetCode}" was not found.`,
    );
  }

  const exclusions = await historicalRepository.getHistoricalSiteExclusions(
    datasetCode,
    mandal,
    siteNo,
  );

  if (exclusions.length > 0) {
    return fail(
      "SITE_EXCLUDED",
      "Historical site is excluded from analytical comparison.",
      {
        exclusion: {
          datasetCode,
          mandal,
          siteNo,
          records: exclusions,
        },
      },
    );
  }

  let rows = await historicalRepository.getHistoricalSiteObservations(
    datasetCode,
    mandal,
    siteNo,
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return fail(
      "SITE_NOT_FOUND",
      "No historical observations were found for the requested site.",
    );
  }

  rows = sortByStage(rows);

  if (request.stages) {
    const requestedStages = request.stages;

    const missingStages = requestedStages.filter(
      (stage) => !rows.some((row) => row.stage === stage),
    );

    if (missingStages.length > 0) {
      return fail(
        "STAGE_NOT_FOUND",
        "One or more requested historical stages are unavailable.",
        {
          missingStages,
          availableStages: rows.map((row) => row.stage),
        },
      );
    }

    rows = rows.filter((row) => requestedStages.includes(row.stage));
  }

  if (rows.length < 2) {
    return fail(
      "INSUFFICIENT_STAGES",
      "At least two historical stages are required for comparison.",
    );
  }

  const depth = getDepth(rows);

  const observations = rows.map((row) => {
    const value = normalizeNumber(row[parameter.field]);

    return {
      sampleId: row.id,
      sampleCode: row.sample_code,
      stage: row.stage,
      collectionPeriod: {
        start: row.collection_period_start,
        end: row.collection_period_end,
      },
      value,
      classification: classifyValue(parameter, value),
      depthFromCm: normalizeNumber(row.depth_from_cm),
      depthToCm: normalizeNumber(row.depth_to_cm),
      sourceStatus: row.source_status,
    };
  });

  const changes = [];

  for (let i = 0; i < observations.length - 1; i += 1) {
    const from = observations[i];
    const to = observations[i + 1];

    const calculation = depth.compatible
      ? calculateChange(from.value, to.value)
      : {
          absoluteChange: null,
          percentageChange: null,
          comparisonEligible: false,
          reason: "Sampling depths are incompatible.",
        };

    changes.push({
      fromStage: from.stage,
      toStage: to.stage,
      fromValue: from.value,
      toValue: to.value,
      ...calculation,
      classificationTransition: buildClassificationTransition(
        from.classification,
        to.classification,
      ),
    });
  }

  return {
    success: true,
    phase: API_PHASE,

    comparison: {
      eligible: depth.compatible,
      eligibilityReason: depth.compatible
        ? null
        : "Sampling depths are incompatible.",

      dataset: {
        id: dataset.id,
        code: dataset.dataset_code,
        name: dataset.dataset_name,
        publicationYear: dataset.publication_year,
        status: dataset.status,
      },

      site: {
        mandal,
        siteNo,
        latitude: normalizeNumber(rows[0].latitude),
        longitude: normalizeNumber(rows[0].longitude),
      },

      depth,

      parameter: {
        key: request.parameter,
        label: parameter.label,
        unit: parameter.unit,
      },

      observations,
      changes,
    },

    metadata: {
      classificationLocation: "backend",
      calculationLocation: "backend",
      source: "historical_database",
      generatedAt: new Date().toISOString(),
    },
  };
}

module.exports = {
  API_PHASE,
  STAGE_ORDER,
  PARAMETERS,
  validateRequest,
  calculateChange,
  buildClassificationTransition,
  getHistoricalComparison,
};
