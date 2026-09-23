"use strict";

// ============================================================
// server/services/reports/analyticalReportAggregationService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.6.3 â€” Analytical Report Aggregation Service
//
// Responsibilities:
//   1. Validate integrated analytical GIS report requests
//   2. Establish current sample/report context
//   3. Invoke existing authoritative analytical services
//   4. Normalize outputs into the Phase 10.6 report contract
//   5. Preserve backend scientific provenance
//   6. Isolate section-level failures
//   7. Determine overall report status
//   8. Build the integrated analytical GIS report
//
// Scientific authority:
//   Backend services only.
//
// IMPORTANT:
//   This service does NOT:
//     - classify soil parameters
//     - calculate IDW interpolation
//     - calculate fertility zoning
//     - calculate Haversine distances
//     - discover historical candidates
//     - calculate historical changes
//     - determine historical eligibility
//
// Existing authoritative services remain responsible for all
// scientific and analytical calculations.
//
// ============================================================

const soilRepository = require("../../repositories/soilRepository");

const soilAnalysisReportService =  require("../../services/reports/soilAnalysisReportService");
const spatialAnalysisService = require("../spatialAnalysisService");
const spatialQueryService = require("../spatialQueryService");
const interpolationService = require("../interpolationService");
const fertilityZoningService = require("../fertilityZoningService");
const historicalContextService = require("../historicalContextService");

// ============================================================
// CONSTANTS
// ============================================================

const API_PHASE = "10.6.3";

const CONTRACT_VERSION = "1.0";

const REPORT_TYPE = "integrated_analytical_gis";

const REPORT_STATUSES = Object.freeze([
  "complete",
  "partial",
  "error",
]);

const SECTION_STATUSES = Object.freeze([
  "available",
  "unavailable",
  "not_requested",
  "not_applicable",
  "error",
]);

const SUPPORTED_PARAMETERS = Object.freeze([
  "standard",
  "ph",
  "nitrogen",
  "phosphorus",
  "potassium",
  "organic_carbon",
  "electrical_conductivity",
]);

const PARAMETER_METADATA = Object.freeze({
  standard: {
    key: "standard",
    label: "Standard Sample View",
    unit: null,
  },

  ph: {
    key: "ph",
    label: "pH",
    unit: "pH",
  },

  nitrogen: {
    key: "nitrogen",
    label: "Nitrogen",
    unit: "mg/kg",
  },

  phosphorus: {
    key: "phosphorus",
    label: "Phosphorus",
    unit: "mg/kg",
  },

  potassium: {
    key: "potassium",
    label: "Potassium",
    unit: "mg/kg",
  },

  organic_carbon: {
    key: "organic_carbon",
    label: "Organic Carbon",
    unit: "%",
  },

  electrical_conductivity: {
    key: "electrical_conductivity",
    label: "Electrical Conductivity",
    unit: "dS/m",
  },
});

// ============================================================
// REPORT FACTORIES
// ============================================================

function createSection(status, data = null, error = null) {
  if (!SECTION_STATUSES.includes(status)) {
    throw new Error(`Invalid report section status: ${status}`);
  }

  const section = {
    status,
    data,
  };

  if (error) {
    section.error = error;
  }

  return section;
}

function createAnalysisContext() {
  return {
    sampleCount: 0,
    sampleIds: [],
    geographicExtent: null,
    depthContext: null,
    selectedParameter: null,
    spatialQueryContext: null,
    interpolationContext: null,
    fertilityZoningContext: null,
    historicalContext: null,
  };
}

function createProvenance() {
  return {
    scientificAuthority: "backend",
    calculationLocation: "backend",
    classificationLocation: "backend",
    sections: {},
  };
}

function createEmptyReport() {
  return {
    contractVersion: CONTRACT_VERSION,
    reportType: REPORT_TYPE,
    status: "error",
    generatedAt: new Date().toISOString(),

    analysisContext: createAnalysisContext(),

    sections: {
      sampleSummary: createSection("unavailable"),
      thematicAnalysis: createSection("not_requested"),
      spatialAnalysis: createSection("not_requested"),
      spatialQuery: createSection("not_requested"),
      interpolation: createSection("not_requested"),
      fertilityZoning: createSection("not_requested"),
      historicalComparison: createSection("not_requested"),
      overallSummary: createSection("unavailable"),
    },

    provenance: createProvenance(),

    warnings: [],
    errors: [],
  };
}

// ============================================================
// REQUEST VALIDATION
// ============================================================

function validateRequest(request) {
  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request)
  ) {
    throw new Error("Report request must be an object.");
  }

  if (request.sampleIds !== undefined) {
    if (!Array.isArray(request.sampleIds)) {
      throw new Error("sampleIds must be an array.");
    }

    for (const sampleId of request.sampleIds) {
      const numericId = Number(sampleId);

      if (
        !Number.isInteger(numericId) ||
        numericId <= 0
      ) {
        throw new Error(
          `Invalid sampleId in report request: ${sampleId}`,
        );
      }
    }
  }

  if (
    request.parameter !== undefined &&
    request.parameter !== null
  ) {
    if (
      typeof request.parameter !== "string" ||
      !SUPPORTED_PARAMETERS.includes(request.parameter)
    ) {
      throw new Error(
        `Unsupported report parameter: ${request.parameter}`,
      );
    }
  }

  validateOptionalObject(
    request.spatialAnalysis,
    "spatialAnalysis",
  );

  validateOptionalObject(
    request.spatialQuery,
    "spatialQuery",
  );

  validateOptionalObject(
    request.interpolation,
    "interpolation",
  );

  validateOptionalObject(
    request.fertilityZoning,
    "fertilityZoning",
  );

  validateOptionalObject(
    request.historical,
    "historical",
  );

  return true;
}

function validateOptionalObject(value, fieldName) {
  if (value === undefined || value === null) {
    return;
  }

  if (
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${fieldName} must be an object.`);
  }
}

// ============================================================
// GENERAL HELPERS
// ============================================================

function normalizeParameter(parameter) {
  if (!parameter) {
    return null;
  }

  if (PARAMETER_METADATA[parameter]) {
    return {
      ...PARAMETER_METADATA[parameter],
    };
  }

  return {
    key: parameter,
    label: parameter,
    unit: null,
  };
}

function normalizeError(error, sectionName) {
  return {
    code: `${sectionName.toUpperCase()}_ERROR`,
    message:
      error && error.message
        ? error.message
        : String(error),
  };
}

async function executeSection(sectionName, operation) {
  try {
    const data = await operation();

    if (data === null || data === undefined) {
      return createSection("unavailable");
    }

    return createSection("available", data);
  } catch (error) {
    return createSection(
      "error",
      null,
      normalizeError(error, sectionName),
    );
  }
}

function isRequested(value) {
  return value !== undefined && value !== null;
}

function getSampleId(sample) {
  if (!sample || sample.id === undefined) {
    return null;
  }

  const numericId = Number(sample.id);

  return Number.isInteger(numericId)
    ? numericId
    : null;
}

function calculateDepthContext(samples) {
  const validDepths = samples
    .map((sample) => {
      if (
        !sample ||
        sample.depth_from_cm === undefined ||
        sample.depth_to_cm === undefined
      ) {
        return null;
      }

      const fromCm = Number(sample.depth_from_cm);
      const toCm = Number(sample.depth_to_cm);

      if (
        !Number.isFinite(fromCm) ||
        !Number.isFinite(toCm)
      ) {
        return null;
      }

      return {
        fromCm,
        toCm,
      };
    })
    .filter(Boolean);

  if (validDepths.length === 0) {
    return null;
  }

  const uniqueDepths = [
    ...new Map(
      validDepths.map((depth) => [
        `${depth.fromCm}-${depth.toCm}`,
        depth,
      ]),
    ).values(),
  ];

  return {
    samplesWithDepth: validDepths.length,
    uniqueDepths,
    commonDepth:
      uniqueDepths.length === 1
        ? uniqueDepths[0]
        : null,
  };
}

// ============================================================
// SAMPLE SELECTION
// ============================================================
//
// Contract decision:
//   sampleIds omitted or [] = all current samples.
//
// If sampleIds contains values, only those current samples are
// selected. Missing IDs generate warnings.
//
// ============================================================

function selectSamples(allSamples, requestedSampleIds, report) {
  if (
    !Array.isArray(requestedSampleIds) ||
    requestedSampleIds.length === 0
  ) {
    return allSamples;
  }

  const requestedIds = new Set(
    requestedSampleIds.map((id) => Number(id)),
  );

  const selectedSamples = allSamples.filter((sample) =>
    requestedIds.has(getSampleId(sample)),
  );

  const foundIds = new Set(
    selectedSamples
      .map(getSampleId)
      .filter((id) => id !== null),
  );

  const missingIds = [
    ...requestedIds,
  ].filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    report.warnings.push({
      code: "REQUESTED_SAMPLES_NOT_FOUND",
      message:
        "One or more requested sample IDs were not found.",
      sampleIds: missingIds,
    });
  }

  return selectedSamples;
}

// ============================================================
// SAMPLE SUMMARY
// ============================================================

function buildSampleSummary(samples) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return createSection("unavailable", {
      count: 0,
      sampleIds: [],
      samples: [],
      geographicExtent: null,
      depthContext: null,
    });
  }

  const sampleIds = samples
    .map(getSampleId)
    .filter((id) => id !== null);

  const geographicExtent =
    spatialQueryService.calculateSampleExtent(
      samples,
    );

  const depthContext =
    calculateDepthContext(samples);

  return createSection("available", {
    count: samples.length,
    sampleIds,
    samples,
    geographicExtent,
    depthContext,
  });
}

// ============================================================
// THEMATIC ANALYSIS
// ============================================================
//
// Uses the existing complete soil analysis report service.
// No classification, recommendation, crop suitability, or
// management logic is duplicated here.
//
// ============================================================

async function buildThematicAnalysis(samples) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return {
      count: 0,
      sampleIds: [],
      reports: [],
    };
  }

  const reports = [];

  for (const sample of samples) {
    const report =
      await soilAnalysisReportService.buildSoilAnalysisReport(
        sample,
      );

    reports.push(report);
  }

  return {
    count: reports.length,
    sampleIds: reports
      .map(
        (report) =>
          report &&
          report.sample &&
          report.sample.id,
      )
      .filter(
        (id) =>
          id !== undefined &&
          id !== null,
      )
      .map(Number),
    reports,
  };
}

// ============================================================
// SPATIAL ANALYSIS
// ============================================================

async function buildSpatialAnalysis(request) {
  if (!isRequested(request.spatialAnalysis)) {
    return createSection("not_requested");
  }

  const options = request.spatialAnalysis;

  if (
    options.latitude === undefined ||
    options.longitude === undefined
  ) {
    return createSection(
      "not_applicable",
      null,
    );
  }

  return executeSection(
    "spatial_analysis",
    () =>
      spatialAnalysisService.getSpatialAnalysis(
        Number(options.latitude),
        Number(options.longitude),
      ),
  );
}

// ============================================================
// SPATIAL QUERY
// ============================================================

async function buildSpatialQuery(request) {
  if (!isRequested(request.spatialQuery)) {
    return createSection("not_requested");
  }

  return executeSection(
    "spatial_query",
    () =>
      spatialQueryService.querySamples(
        request.spatialQuery,
      ),
  );
}

// ============================================================
// INTERPOLATION
// ============================================================

async function buildInterpolation(request) {
  if (!isRequested(request.interpolation)) {
    return createSection("not_requested");
  }

  return executeSection(
    "interpolation",
    () =>
      interpolationService.prepareInterpolation(
        request.interpolation,
      ),
  );
}

// ============================================================
// FERTILITY ZONING
// ============================================================

async function buildFertilityZoning(request) {
  if (!isRequested(request.fertilityZoning)) {
    return createSection("not_requested");
  }

  return executeSection(
    "fertility_zoning",
    () =>
      fertilityZoningService.prepareFertilityZoning(
        request.fertilityZoning,
      ),
  );
}

// ============================================================
// HISTORICAL COMPARISON
// ============================================================
//
// IMPORTANT:
//   historicalContextService is the ONLY historical entry point.
//
// Therefore:
//   - nearest candidate discovery remains authoritative
//   - nearest-candidate-only rule remains authoritative
//   - depth compatibility remains authoritative
//   - historical classification remains authoritative
//   - historical change calculations remain authoritative
//
// No candidate/comparison service is called directly here.
//
// ============================================================

async function buildHistoricalComparison(request) {
  if (!isRequested(request.historical)) {
    return createSection("not_requested");
  }

  const historical = request.historical;

  if (
    historical.sampleId === undefined ||
    historical.sampleId === null ||
    !historical.parameter
  ) {
    return createSection(
      "not_applicable",
      null,
    );
  }

  return executeSection(
    "historical_comparison",
    () =>
      historicalContextService.getHistoricalContext({
        sampleId: Number(historical.sampleId),
        parameter: historical.parameter,
      }),
  );
}

// ============================================================
// ANALYSIS CONTEXT
// ============================================================

function buildAnalysisContext(
  report,
  sampleSummary,
  request,
) {
  const sampleSummaryData =
    sampleSummary.data || {};

  report.analysisContext.sampleCount =
    sampleSummaryData.count || 0;

  report.analysisContext.sampleIds =
    Array.isArray(sampleSummaryData.sampleIds)
      ? sampleSummaryData.sampleIds
      : [];

  report.analysisContext.geographicExtent =
    sampleSummaryData.geographicExtent || null;

  report.analysisContext.depthContext =
    sampleSummaryData.depthContext || null;

  if (
    request.parameter !== undefined &&
    request.parameter !== null
  ) {
    report.analysisContext.selectedParameter =
      normalizeParameter(request.parameter);
  }

  if (
    report.sections.spatialQuery.status ===
      "available" &&
    report.sections.spatialQuery.data
  ) {
    report.analysisContext.spatialQueryContext =
      report.sections.spatialQuery.data.query ||
      null;
  }

  if (
    report.sections.interpolation.status ===
      "available" &&
    report.sections.interpolation.data
  ) {
    report.analysisContext.interpolationContext =
      report.sections.interpolation.data
        .configuration || null;
  }

  if (
    report.sections.fertilityZoning.status ===
      "available" &&
    report.sections.fertilityZoning.data
  ) {
    report.analysisContext.fertilityZoningContext =
      report.sections.fertilityZoning.data
        .configuration || null;
  }

  if (
  report.sections.historicalComparison.status ===
    "available" &&
  report.sections.historicalComparison.data
) {
  const historicalData =
    report.sections.historicalComparison.data;

  const historicalRequest =
    request.historical || {};

  const historicalMetadata =
    historicalData.metadata || {};

  const historicalProvenance =
    historicalData.provenance || {};

  report.analysisContext.historicalContext = {
    requested: true,

    sampleId:
      historicalRequest.sampleId !== undefined &&
      historicalRequest.sampleId !== null
        ? Number(historicalRequest.sampleId)
        : null,

    parameter:
      historicalRequest.parameter
        ? normalizeParameter(
            historicalRequest.parameter,
          )
        : null,

    status:
      historicalData.status || null,

    candidateSelection:
      historicalMetadata.candidateSelection ||
      historicalProvenance.candidateSelection ||
      "nearest_candidate_only",
  };
}
}

// ============================================================
// PROVENANCE
// ============================================================

function buildProvenance(report) {
  for (const [
    sectionName,
    section,
  ] of Object.entries(report.sections)) {
    if (
      section.status !== "available" ||
      !section.data
    ) {
      continue;
    }

    const metadata =
      getSectionMetadata(
        sectionName,
        section.data,
      );

    if (metadata) {
      buildSectionProvenance(
        report.provenance,
        sectionName,
        metadata,
      );
    }
  }

  // The integrated report itself is always backend-controlled.
  report.provenance.scientificAuthority =
    "backend";

  report.provenance.calculationLocation =
    "backend";

  report.provenance.classificationLocation =
    "backend";
}

function getSectionMetadata(
  sectionName,
  data,
) {
  if (!data || typeof data !== "object") {
    return null;
  }

  // soilAnalysisReportService uses reportMetadata.
  if (
    sectionName === "thematicAnalysis"
  ) {
    const reports = Array.isArray(
      data.reports,
    )
      ? data.reports
      : [];

    if (reports.length === 0) {
      return null;
    }

    return {
      reportMetadata: reports
        .map(
          (report) =>
            report &&
            report.reportMetadata,
        )
        .filter(Boolean),
    };
  }

// Historical context exposes provenance and metadata
// separately. Combine them without changing the
// authoritative historical result.
if (
  sectionName === "historicalComparison"
) {
  if (
    data.provenance ||
    data.metadata
  ) {
    return {
      ...(data.provenance || {}),
      ...(data.metadata || {}),
    };
  }

  return null;
}

// Other analytical services use metadata.
if (data.metadata) {
  return data.metadata;
}

return null;
}

function buildSectionProvenance(
  provenance,
  sectionName,
  metadata,
) {
  const sectionProvenance = {};

  // Thematic report metadata is a collection because there
  // can be multiple current samples.
  if (
    metadata.reportMetadata &&
    Array.isArray(metadata.reportMetadata)
  ) {
    sectionProvenance.reportMetadata =
      metadata.reportMetadata.map(
        (item) => ({
          generatedAt:
            item.generatedAt || null,
          version:
            item.version || null,
        }),
      );
  }

  if (
    metadata.scientificAuthority !== undefined
  ) {
    sectionProvenance.scientificAuthority =
      String(
        metadata.scientificAuthority,
      ).toLowerCase();
  }

  if (
    metadata.calculationLocation !== undefined
  ) {
    sectionProvenance.calculationLocation =
      String(
        metadata.calculationLocation,
      ).toLowerCase();
  }

  if (
    metadata.classificationLocation !== undefined
  ) {
    sectionProvenance.classificationLocation =
      String(
        metadata.classificationLocation,
      ).toLowerCase();
  }

  if (
    metadata.interpolationLocation !== undefined
  ) {
    sectionProvenance.interpolationLocation =
      String(
        metadata.interpolationLocation,
      ).toLowerCase();
  }

  if (
    metadata.filteringLocation !== undefined
  ) {
    sectionProvenance.filteringLocation =
      String(
        metadata.filteringLocation,
      ).toLowerCase();
  }

  if (
    metadata.distanceCalculation !== undefined
  ) {
    sectionProvenance.distanceCalculation =
      metadata.distanceCalculation;
  }

  if (
    metadata.source !== undefined
  ) {
    sectionProvenance.source =
      metadata.source;
  }

  if (
    metadata.candidateSelection !== undefined
  ) {
    sectionProvenance.candidateSelection =
      metadata.candidateSelection;
  }

  if (
    Object.keys(sectionProvenance).length > 0
  ) {
    provenance.sections[sectionName] =
      sectionProvenance;
  }
}

// ============================================================
// OVERALL SUMMARY
// ============================================================

function buildOverallSummary(report) {
  const sectionNames = [
    "sampleSummary",
    "thematicAnalysis",
    "spatialAnalysis",
    "spatialQuery",
    "interpolation",
    "fertilityZoning",
    "historicalComparison",
  ];

  const counts = {
    available: 0,
    unavailable: 0,
    notRequested: 0,
    notApplicable: 0,
    error: 0,
  };

  for (const sectionName of sectionNames) {
    const status =
      report.sections[sectionName].status;

    switch (status) {
      case "available":
        counts.available += 1;
        break;

      case "unavailable":
        counts.unavailable += 1;
        break;

      case "not_requested":
        counts.notRequested += 1;
        break;

      case "not_applicable":
        counts.notApplicable += 1;
        break;

      case "error":
        counts.error += 1;
        break;

      default:
        break;
    }
  }

  report.sections.overallSummary =
    createSection("available", {
      sections: counts,

      sampleCount:
        report.analysisContext.sampleCount,

      sampleIds:
        report.analysisContext.sampleIds,

      selectedParameter:
        report.analysisContext.selectedParameter,
    });

  return report.sections.overallSummary;
}

// ============================================================
// SECTION ERROR / WARNING COLLECTION
// ============================================================

function collectSectionErrors(report) {
  for (const [
    sectionName,
    section,
  ] of Object.entries(report.sections)) {
    if (
      section.status === "error" &&
      section.error
    ) {
      report.errors.push({
        section: sectionName,
        ...section.error,
      });
    }

    if (
      section.status === "unavailable"
    ) {
      report.warnings.push({
        section: sectionName,
        code:
          `${sectionName.toUpperCase()}_UNAVAILABLE`,
        message:
          `${sectionName} data is unavailable.`,
      });
    }
  }
}

// ============================================================
// ROOT REPORT STATUS
// ============================================================
//
// Rules:
//
//   error:
//     Fundamental sample/report context cannot be established.
//
//   partial:
//     Sample context exists, but one or more requested
//     analytical sections failed or became unavailable.
//
//   complete:
//     Fundamental context exists and every requested section
//     completed successfully.
//
// `not_requested` and `not_applicable` do not make the root
// report partial by themselves.
//
// ============================================================

function finalizeReportStatus(report) {
  if (
    report.sections.sampleSummary.status !==
    "available"
  ) {
    report.status = "error";
    return report.status;
  }

  const analyticalSections = [
    "thematicAnalysis",
    "spatialAnalysis",
    "spatialQuery",
    "interpolation",
    "fertilityZoning",
    "historicalComparison",
  ];

  const requestedSections =
    analyticalSections.filter(
      (sectionName) => {
        const status =
          report.sections[sectionName].status;

        return (
          status !== "not_requested" &&
          status !== "not_applicable"
        );
      },
    );

  const failedSections =
    requestedSections.filter(
      (sectionName) => {
        const status =
          report.sections[sectionName].status;

        return (
          status === "error" ||
          status === "unavailable"
        );
      },
    );

  if (failedSections.length > 0) {
    report.status = "partial";
  } else {
    report.status = "complete";
  }

  return report.status;
}

// ============================================================
// MAIN REPORT BUILDER
// ============================================================

async function buildIntegratedAnalyticalGISReport(
  request = {},
) {
  const report = createEmptyReport();

  try {
    // --------------------------------------------------------
    // 1. Validate request.
    // --------------------------------------------------------

    validateRequest(request);

    // --------------------------------------------------------
    // 2. Establish current sample context ONCE.
    // --------------------------------------------------------

    const allSamples =
      await soilRepository.getAllSoilSamples();

    if (!Array.isArray(allSamples)) {
      throw new Error(
        "Soil repository returned an invalid sample collection.",
      );
    }

    // --------------------------------------------------------
    // 3. Select current samples.
    //
    // sampleIds omitted or [] means all current samples.
    // --------------------------------------------------------

    const selectedSamples =
      selectSamples(
        allSamples,
        request.sampleIds,
        report,
      );

    // --------------------------------------------------------
    // 4. Mandatory sample summary.
    // --------------------------------------------------------

    report.sections.sampleSummary =
      buildSampleSummary(
        selectedSamples,
      );

    if (
      report.sections.sampleSummary.status !==
      "available"
    ) {
      report.status = "error";

      report.errors.push({
        section: "sampleSummary",
        code:
          "SAMPLE_CONTEXT_UNAVAILABLE",
        message:
          "Fundamental report sample context could not be established.",
      });

      return report;
    }

    // --------------------------------------------------------
    // 5. Thematic analysis.
    //
    // Thematic analysis is a core report section for the
    // selected current samples.
    // --------------------------------------------------------

    report.sections.thematicAnalysis =
      await executeSection(
        "thematic_analysis",
        () =>
          buildThematicAnalysis(
            selectedSamples,
          ),
      );

    // --------------------------------------------------------
    // 6. Spatial analysis.
    // --------------------------------------------------------

    report.sections.spatialAnalysis =
      await buildSpatialAnalysis(
        request,
      );

    // --------------------------------------------------------
    // 7. Spatial query.
    // --------------------------------------------------------

    report.sections.spatialQuery =
      await buildSpatialQuery(
        request,
      );

    // --------------------------------------------------------
    // 8. Interpolation.
    // --------------------------------------------------------

    report.sections.interpolation =
      await buildInterpolation(
        request,
      );

    // --------------------------------------------------------
    // 9. Fertility zoning.
    // --------------------------------------------------------

    report.sections.fertilityZoning =
      await buildFertilityZoning(
        request,
      );

    // --------------------------------------------------------
    // 10. Historical comparison.
    //
    // historicalContextService remains the sole entry point.
    // --------------------------------------------------------

    report.sections.historicalComparison =
      await buildHistoricalComparison(
        request,
      );

    // --------------------------------------------------------
    // 11. Build analysis context from established sections.
    // --------------------------------------------------------

    buildAnalysisContext(
      report,
      report.sections.sampleSummary,
      request,
    );

    // --------------------------------------------------------
    // 12. Preserve section provenance.
    // --------------------------------------------------------

    buildProvenance(report);

    // --------------------------------------------------------
    // 13. Build aggregation-only overall summary.
    // --------------------------------------------------------

    buildOverallSummary(report);

    // --------------------------------------------------------
    // 14. Collect section errors/warnings.
    // --------------------------------------------------------

    collectSectionErrors(report);

    // --------------------------------------------------------
    // 15. Determine final report status.
    // --------------------------------------------------------

    finalizeReportStatus(report);

    return report;
  } catch (error) {
    report.status = "error";

    report.errors.push({
      section: "report",
      code: "INTEGRATED_REPORT_ERROR",
      message:
        error && error.message
          ? error.message
          : String(error),
    });

    return report;
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  API_PHASE,
  CONTRACT_VERSION,
  REPORT_TYPE,
  REPORT_STATUSES,
  SECTION_STATUSES,
  SUPPORTED_PARAMETERS,
  PARAMETER_METADATA,

  createSection,
  createAnalysisContext,
  createProvenance,
  createEmptyReport,

  validateRequest,
  normalizeParameter,
  normalizeError,

  selectSamples,
  calculateDepthContext,

  buildSampleSummary,
  buildThematicAnalysis,
  buildSpatialAnalysis,
  buildSpatialQuery,
  buildInterpolation,
  buildFertilityZoning,
  buildHistoricalComparison,

  buildAnalysisContext,
  buildProvenance,
  buildOverallSummary,
  finalizeReportStatus,

  buildIntegratedAnalyticalGISReport,
};
