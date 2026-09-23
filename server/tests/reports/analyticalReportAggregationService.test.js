"use strict";

// ============================================================
// server/tests/reports/analyticalReportAggregationService.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.6.3 — Analytical Report Aggregation Service Tests
//
// Test responsibilities:
//   1. Validate report contract
//   2. Validate sample selection
//   3. Validate section orchestration
//   4. Validate section failure isolation
//   5. Validate report status
//   6. Validate historical integration
//   7. Validate provenance
//   8. Validate overall summary
//
// Scientific calculations are NOT re-tested here.
// Existing analytical services remain authoritative.
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

// ============================================================
// MODULES UNDER TEST
// ============================================================

const soilRepository =
  require("../../repositories/soilRepository");

const soilAnalysisReportService =
  require("../../services/reports/soilAnalysisReportService");

const spatialAnalysisService =
  require("../../services/spatialAnalysisService");

const spatialQueryService =
  require("../../services/spatialQueryService");

const interpolationService =
  require("../../services/interpolationService");

const fertilityZoningService =
  require("../../services/fertilityZoningService");

const historicalContextService =
  require("../../services/historicalContextService");

const aggregationService =
  require("../../services/reports/analyticalReportAggregationService");

// ============================================================
// SAMPLE FIXTURES
// ============================================================

const SAMPLE_001 = {
  id: 1,
  sample_code: "S-001",
  sample_date: "2026-01-15",
  latitude: 17.71234,
  longitude: 83.30125,
  depth_from_cm: 0,
  depth_to_cm: 15,
  soil_texture: "Loamy",
  ph: 6.8,
  nitrogen: 215,
  phosphorus: 18,
  potassium: 240,
  organic_carbon: 0.72,
  electrical_conductivity: 0.35,
};

const SAMPLE_002 = {
  id: 2,
  sample_code: "S-002",
  sample_date: "2026-01-16",
  latitude: 17.70,
  longitude: 83.29,
  depth_from_cm: 0,
  depth_to_cm: 15,
  soil_texture: "Clay Loam",
  ph: 7.1,
  nitrogen: 300,
  phosphorus: 22,
  potassium: 300,
  organic_carbon: 0.8,
  electrical_conductivity: 0.42,
};

const SAMPLE_003 = {
  id: 3,
  sample_code: "S-003",
  sample_date: "2026-01-17",
  latitude: 17.69,
  longitude: 83.28,
  depth_from_cm: 15,
  depth_to_cm: 30,
  soil_texture: "Sandy Loam",
  ph: 6.4,
  nitrogen: 180,
  phosphorus: 8,
  potassium: 100,
  organic_carbon: 0.4,
  electrical_conductivity: 0.3,
};

const ALL_SAMPLES = [
  SAMPLE_001,
  SAMPLE_002,
  SAMPLE_003,
];

// ============================================================
// STUB HELPERS
// ============================================================

function createMethodStub(object, methodName, implementation) {
  const original = object[methodName];

  object[methodName] = implementation;

  return () => {
    object[methodName] = original;
  };
}

function createRestoreStack() {
  const restores = [];

  return {
    add(object, methodName, implementation) {
      restores.push(
        createMethodStub(
          object,
          methodName,
          implementation,
        ),
      );
    },

    restore() {
      for (let index = restores.length - 1; index >= 0; index -= 1) {
        restores[index]();
      }
    },
  };
}

function stubCalculateSampleExtent(samples) {
  return {
    minLatitude: Math.min(
      ...samples.map((sample) => sample.latitude),
    ),
    maxLatitude: Math.max(
      ...samples.map((sample) => sample.latitude),
    ),
    minLongitude: Math.min(
      ...samples.map((sample) => sample.longitude),
    ),
    maxLongitude: Math.max(
      ...samples.map((sample) => sample.longitude),
    ),
  };
}

function createThematicReport(sample) {
  return {
    sample: {
      id: sample.id,
      sample_code: sample.sample_code,
      sample_date: sample.sample_date,

      location: {
        latitude: sample.latitude,
        longitude: sample.longitude,
      },

      depth: {
        from_cm: sample.depth_from_cm,
        to_cm: sample.depth_to_cm,
      },

      soil_texture: sample.soil_texture,
    },

    laboratoryResults: {
      ph: sample.ph,
      nitrogen: sample.nitrogen,
      phosphorus: sample.phosphorus,
      potassium: sample.potassium,
      organicCarbon: sample.organic_carbon,
      electricalConductivity:
        sample.electrical_conductivity,
    },

    analysis: {
      standard: "soil_standard",
      version: "1.0",
    },

    interpretation: {},
    cropSuitability: {},
    managementPlan: {},

    reportMetadata: {
      generatedAt: "2026-09-11T00:00:00.000Z",
      version: "1.0",
    },
  };
}

function createSpatialAnalysisResult() {
  return {
    success: true,
    phase: "10.2",

    location: {
      latitude: 17.71234,
      longitude: 83.30125,
    },

    spatialContext: {
      withinSampleExtent: true,

      nearestSample: {
        id: 1,
        sample_code: "S-001",
        latitude: 17.71234,
        longitude: 83.30125,
      },

      sampleExtent: stubCalculateSampleExtent(
        ALL_SAMPLES,
      ),
    },

    interpolatedAnalysis: {
      pH: {
        value: 6.8,
        classification: "Neutral",
      },
    },

    sampleContext: {
      soilTexture: "Loamy",
    },

    metadata: {
      interpolationMethod: "idw",
      power: 2,
      sampleCount: 3,
      classificationLocation: "backend",
      interpolationLocation: "backend",
      presentationLocation: "frontend",
      textureSource: "nearest_sample",
      generatedAt:
        "2026-09-11T00:00:00.000Z",
    },
  };
}

function createSpatialQueryResult() {
  return {
    success: true,
    phase: "10.3",

    query: {
      parameter: "ph",
      classification: "neutral",
    },

    result: {
      count: 1,

      samples: [
        {
          id: 1,
          sample_code: "S-001",
        },
      ],
    },

    spatialMetadata: {
      sampleExtent:
        stubCalculateSampleExtent(
          ALL_SAMPLES,
        ),
    },

    metadata: {
      classificationLocation: "backend",
      filteringLocation: "backend",
      distanceCalculation: "haversine",
      generatedAt:
        "2026-09-11T00:00:00.000Z",
    },
  };
}

function createInterpolationResult() {
  return {
    success: true,
    phase: "8.3",
    status: "completed",

    configuration: {
      parameter: {
        key: "ph",
        label: "pH",
        field: "ph",
        unit: "pH",
      },

      method: {
        key: "idw",
        label: "Inverse Distance Weighting",
      },

      settings: {
        power: 2,
        resolution: 50,
      },

      spatialExtent:
        stubCalculateSampleExtent(
          ALL_SAMPLES,
        ),

      sampleCount: 3,

      architecture: {
        calculationLocation: "backend",
        presentationLocation: "frontend",
        surfaceType: "continuous",
        extentConstraint: "sample_extent",
      },
    },

    statistics: {
      validCellCount: 100,
      minimum: 6.4,
      maximum: 7.1,
      average: 6.77,
    },

    sourcePoints: [],
    grid: {
      rows: 10,
      columns: 10,
      cellCount: 100,
      cells: [],
    },
  };
}

function createFertilityZoningResult() {
  return {
    success: true,
    phase: "9.2",
    status: "completed",

    configuration: {
      zoningType: "fertility",
      interpolationMethod: "idw",
      power: 2,
      resolution: 50,
    },

    zoneDefinitions: [
      {
        key: "low",
        label: "Low",
      },
      {
        key: "moderate_good",
        label: "Moderate / Good",
      },
      {
        key: "high",
        label: "High",
      },
      {
        key: "unavailable",
        label: "Unavailable",
      },
    ],

    statistics: {
      low: 40,
      moderateGood: 50,
      high: 10,
      unavailable: 0,
    },

    sourcePoints: [],
    grid: {
      rows: 10,
      columns: 10,
      cellCount: 100,
      cells: [],
    },
  };
}

function createHistoricalContextResult() {
  return {
    success: true,
    phase: "10.6",

    status: "available",

    currentSample: {
      id: 1,
      sample_code: "S-001",
    },

    parameter: {
  key: "ph",
  label: "pH",
  unit: "pH",
},
    candidate: {
      datasetCode: "H2",
      datasetName:
        "Visakhapatnam Kharif Rice Soil Fertility Dataset",
      mandal: "Anakapalle",
      siteNo: 1,
      distanceMeters: 2500,
      eligible: true,
    },

    comparison: {
      eligible: true,

      observations: [
        {
          stage: "Before sowing",
          value: 7.2,
          classification: "Neutral",
        },

        {
          stage: "During growth",
          value: 7.2,
          classification: "Neutral",
        },

        {
          stage: "After harvesting",
          value: 7.2,
          classification: "Neutral",
        },
      ],

      changes: [],
    },

    provenance: {
      scientificAuthority: "Backend",
      calculationLocation: "Backend",
      classificationLocation: "Backend",
      source: "historical_database",
    },

    metadata: {
      candidateDiscovery: "historical_database",
      comparison: "historical_database",
      candidateSelection:
        "nearest_candidate_only",

      generatedAt:
        "2026-09-11T00:00:00.000Z",

      source: "historical_database",
    },
  };
}

// ============================================================
// TEST SETUP
// ============================================================

function stubCoreServices(restores) {
  restores.add(
    soilRepository,
    "getAllSoilSamples",
    async () => ALL_SAMPLES,
  );

  restores.add(
    spatialQueryService,
    "calculateSampleExtent",
    (samples) =>
      stubCalculateSampleExtent(samples),
  );

  restores.add(
    soilAnalysisReportService,
    "buildSoilAnalysisReport",
    async (sample) =>
      createThematicReport(sample),
  );

  restores.add(
    spatialAnalysisService,
    "getSpatialAnalysis",
    async () =>
      createSpatialAnalysisResult(),
  );

  restores.add(
    spatialQueryService,
    "querySamples",
    async () =>
      createSpatialQueryResult(),
  );

  restores.add(
    interpolationService,
    "prepareInterpolation",
    async () =>
      createInterpolationResult(),
  );

  restores.add(
    fertilityZoningService,
    "prepareFertilityZoning",
    async () =>
      createFertilityZoningResult(),
  );

  restores.add(
    historicalContextService,
    "getHistoricalContext",
    async () =>
      createHistoricalContextResult(),
  );
}

// ============================================================
// CONTRACT TESTS
// ============================================================

test(
  "creates an integrated analytical GIS report with the canonical contract",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {},
        );

      assert.equal(
        report.contractVersion,
        "1.0",
      );

      assert.equal(
        report.reportType,
        "integrated_analytical_gis",
      );

      assert.equal(
        report.status,
        "complete",
      );

      assert.ok(report.generatedAt);

      assert.ok(report.analysisContext);

      assert.ok(report.sections);

      assert.ok(report.provenance);

      assert.ok(Array.isArray(report.warnings));

      assert.ok(Array.isArray(report.errors));

      const expectedSections = [
        "sampleSummary",
        "thematicAnalysis",
        "spatialAnalysis",
        "spatialQuery",
        "interpolation",
        "fertilityZoning",
        "historicalComparison",
        "overallSummary",
      ];

      for (const sectionName of expectedSections) {
        assert.ok(
          report.sections[sectionName],
          `Missing section: ${sectionName}`,
        );

        assert.ok(
          aggregationService.SECTION_STATUSES.includes(
            report.sections[sectionName].status,
          ),
          `Invalid status for ${sectionName}`,
        );
      }
    } finally {
      restores.restore();
    }
  },
);

// ============================================================
// SAMPLE CONTEXT
// ============================================================

test(
  "sampleIds omitted selects all current samples",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {},
        );

      assert.equal(
        report.analysisContext.sampleCount,
        3,
      );

      assert.deepEqual(
        report.analysisContext.sampleIds,
        [1, 2, 3],
      );

      assert.equal(
        report.sections.sampleSummary.status,
        "available",
      );

      assert.equal(
        report.sections.sampleSummary.data.count,
        3,
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "sampleIds empty array selects all current samples",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            sampleIds: [],
          },
        );

      assert.equal(
        report.analysisContext.sampleCount,
        3,
      );

      assert.deepEqual(
        report.analysisContext.sampleIds,
        [1, 2, 3],
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "sampleIds filters the current sample context",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            sampleIds: [1, 3],
          },
        );

      assert.equal(
        report.analysisContext.sampleCount,
        2,
      );

      assert.deepEqual(
        report.analysisContext.sampleIds,
        [1, 3],
      );

      assert.equal(
        report.sections.thematicAnalysis.data.count,
        2,
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "missing sample IDs generate warnings",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            sampleIds: [1, 999],
          },
        );

      assert.equal(
        report.status,
        "complete",
      );

      assert.deepEqual(
        report.analysisContext.sampleIds,
        [1],
      );

      const warning =
        report.warnings.find(
          (item) =>
            item.code ===
            "REQUESTED_SAMPLES_NOT_FOUND",
        );

      assert.ok(warning);

      assert.deepEqual(
        warning.sampleIds,
        [999],
      );
    } finally {
      restores.restore();
    }
  },
);

// ============================================================
// THEMATIC ANALYSIS
// ============================================================

test(
  "aggregates thematic reports for all selected samples",
  async () => {
    const restores = createRestoreStack();

    let calls = 0;

    try {
      stubCoreServices(restores);

      restores.add(
        soilAnalysisReportService,
        "buildSoilAnalysisReport",
        async (sample) => {
          calls += 1;
          return createThematicReport(sample);
        },
      );

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            sampleIds: [1, 2],
          },
        );

      assert.equal(calls, 2);

      assert.equal(
        report.sections.thematicAnalysis.status,
        "available",
      );

      assert.equal(
        report.sections.thematicAnalysis.data.count,
        2,
      );

      assert.deepEqual(
        report.sections.thematicAnalysis.data.sampleIds,
        [1, 2],
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "thematic report metadata is preserved as section provenance",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            sampleIds: [1],
          },
        );

      const provenance =
        report.provenance.sections
          .thematicAnalysis;

      assert.ok(provenance);

      assert.ok(
        Array.isArray(
          provenance.reportMetadata,
        ),
      );

      assert.equal(
        provenance.reportMetadata.length,
        1,
      );

      assert.equal(
        provenance.reportMetadata[0].version,
        "1.0",
      );
    } finally {
      restores.restore();
    }
  },
);

// ============================================================
// OPTIONAL SECTION STATES
// ============================================================

test(
  "unrequested analytical sections remain not_requested",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {},
        );

      assert.equal(
        report.sections.spatialAnalysis.status,
        "not_requested",
      );

      assert.equal(
        report.sections.spatialQuery.status,
        "not_requested",
      );

      assert.equal(
        report.sections.interpolation.status,
        "not_requested",
      );

      assert.equal(
        report.sections.fertilityZoning.status,
        "not_requested",
      );

      assert.equal(
        report.sections.historicalComparison.status,
        "not_requested",
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "spatial analysis without coordinates is not_applicable",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            spatialAnalysis: {},
          },
        );

      assert.equal(
        report.sections.spatialAnalysis.status,
        "not_applicable",
      );
    } finally {
      restores.restore();
    }
  },
);

// ============================================================
// SPATIAL ANALYSIS
// ============================================================

test(
  "integrates spatial analysis through spatialAnalysisService",
  async () => {
    const restores = createRestoreStack();

    let receivedLatitude = null;
    let receivedLongitude = null;

    try {
      stubCoreServices(restores);

      restores.add(
        spatialAnalysisService,
        "getSpatialAnalysis",
        async (latitude, longitude) => {
          receivedLatitude = latitude;
          receivedLongitude = longitude;

          return createSpatialAnalysisResult();
        },
      );

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            spatialAnalysis: {
              latitude: 17.71234,
              longitude: 83.30125,
            },
          },
        );

      assert.equal(
        receivedLatitude,
        17.71234,
      );

      assert.equal(
        receivedLongitude,
        83.30125,
      );

      assert.equal(
        report.sections.spatialAnalysis.status,
        "available",
      );
    } finally {
      restores.restore();
    }
  },
);

// ============================================================
// SPATIAL QUERY
// ============================================================

test(
  "integrates spatial query through spatialQueryService",
  async () => {
    const restores = createRestoreStack();

    let receivedQuery = null;

    try {
      stubCoreServices(restores);

      restores.add(
        spatialQueryService,
        "querySamples",
        async (query) => {
          receivedQuery = query;
          return createSpatialQueryResult();
        },
      );

      const query = {
        parameter: "ph",
        classification: "neutral",
      };

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            spatialQuery: query,
          },
        );

      assert.deepEqual(
        receivedQuery,
        query,
      );

      assert.equal(
        report.sections.spatialQuery.status,
        "available",
      );

      assert.deepEqual(
        report.analysisContext
          .spatialQueryContext,
        query,
      );
    } finally {
      restores.restore();
    }
  },
);

// ============================================================
// INTERPOLATION
// ============================================================

test(
  "integrates interpolation through interpolationService",
  async () => {
    const restores = createRestoreStack();

    let receivedOptions = null;

    try {
      stubCoreServices(restores);

      restores.add(
        interpolationService,
        "prepareInterpolation",
        async (options) => {
          receivedOptions = options;
          return createInterpolationResult();
        },
      );

      const options = {
        parameter: "ph",
        power: 2,
        resolution: 50,
      };

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            interpolation: options,
          },
        );

      assert.deepEqual(
        receivedOptions,
        options,
      );

      assert.equal(
        report.sections.interpolation.status,
        "available",
      );

      assert.deepEqual(
        report.analysisContext
          .interpolationContext,
        report.sections.interpolation.data
          .configuration,
      );
    } finally {
      restores.restore();
    }
  },
);

// ============================================================
// FERTILITY ZONING
// ============================================================

test(
  "integrates fertility zoning through fertilityZoningService",
  async () => {
    const restores = createRestoreStack();

    let receivedOptions = null;

    try {
      stubCoreServices(restores);

      restores.add(
        fertilityZoningService,
        "prepareFertilityZoning",
        async (options) => {
          receivedOptions = options;
          return createFertilityZoningResult();
        },
      );

      const options = {
        power: 2,
        resolution: 50,
      };

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            fertilityZoning: options,
          },
        );

      assert.deepEqual(
        receivedOptions,
        options,
      );

      assert.equal(
        report.sections.fertilityZoning.status,
        "available",
      );

      assert.deepEqual(
        report.analysisContext
          .fertilityZoningContext,
        report.sections.fertilityZoning.data
          .configuration,
      );
    } finally {
      restores.restore();
    }
  },
);

// ============================================================
// HISTORICAL INTEGRATION
// ============================================================

test(
  "integrates historical analysis exclusively through historicalContextService",
  async () => {
    const restores = createRestoreStack();

    let receivedRequest = null;

    try {
      stubCoreServices(restores);

      restores.add(
        historicalContextService,
        "getHistoricalContext",
        async (request) => {
          receivedRequest = request;
          return createHistoricalContextResult();
        },
      );

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            historical: {
              sampleId: 1,
              parameter: "ph",
            },
          },
        );

      assert.deepEqual(
        receivedRequest,
        {
          sampleId: 1,
          parameter: "ph",
        },
      );

      assert.equal(
        report.sections
          .historicalComparison.status,
        "available",
      );

      assert.equal(
        report.analysisContext
          .historicalContext.sampleId,
        1,
      );

      assert.equal(
        report.analysisContext
          .historicalContext.parameter.key,
        "ph",
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "historical provenance preserves nearest-candidate-only rule",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            historical: {
              sampleId: 1,
              parameter: "ph",
            },
          },
        );

      assert.equal(
        report.provenance.sections
          .historicalComparison
          .candidateSelection,
        "nearest_candidate_only",
      );

      assert.equal(
        report.provenance.sections
          .historicalComparison
          .source,
        "historical_database",
      );
    } finally {
      restores.restore();
    }
  },
);

// ============================================================
// PHASE 10.6.4 — HISTORICAL DATA ↔ GIS INTEGRATION
// ============================================================

test(
  "historical analysis builds the canonical GIS historical context",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            historical: {
              sampleId: 1,
              parameter: "ph",
            },
          },
        );

      const historicalContext =
        report.analysisContext
          .historicalContext;

      assert.ok(historicalContext);

      assert.equal(
        historicalContext.requested,
        true,
      );

      assert.equal(
        historicalContext.sampleId,
        1,
      );

      assert.deepEqual(
        historicalContext.parameter,
        {
          key: "ph",
          label: "pH",
          unit: "pH",
        },
      );

      assert.equal(
        historicalContext.status,
        "available",
      );

      assert.equal(
        historicalContext.candidateSelection,
        "nearest_candidate_only",
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "historical GIS integration preserves the nearest-candidate-only rule in report context",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            historical: {
              sampleId: 1,
              parameter: "ph",
            },
          },
        );

      assert.equal(
        report.analysisContext
          .historicalContext
          .candidateSelection,
        "nearest_candidate_only",
      );

      assert.equal(
        report.provenance.sections
          .historicalComparison
          .candidateSelection,
        "nearest_candidate_only",
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "historical GIS integration preserves historical database provenance",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            historical: {
              sampleId: 1,
              parameter: "ph",
            },
          },
        );

      const provenance =
        report.provenance.sections
          .historicalComparison;

      assert.equal(
        provenance.scientificAuthority,
        "backend",
      );

      assert.equal(
        provenance.calculationLocation,
        "backend",
      );

      assert.equal(
        provenance.classificationLocation,
        "backend",
      );

      assert.equal(
        provenance.source,
        "historical_database",
      );

      assert.equal(
        provenance.candidateSelection,
        "nearest_candidate_only",
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "historical unavailable status remains a successful historical section",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      restores.add(
        historicalContextService,
        "getHistoricalContext",
        async () => ({
          success: true,
          phase: "10.6",
          status: "unavailable",

          currentSample: {
            id: 1,
            sample_code: "S-001",
          },

          parameter: "ph",

          candidateSummary: {
            candidateCount: 0,
          },

          candidate: null,
          comparison: null,

          provenance: {
            scientificAuthority: "Backend",
            calculationLocation: "Backend",
            classificationLocation: "Backend",
            source: "historical_database",
          },

          metadata: {
            candidateSelection:
              "nearest_candidate_only",
            source: "historical_database",
          },
        }),
      );

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            historical: {
              sampleId: 1,
              parameter: "ph",
            },
          },
        );

      assert.equal(
        report.sections
          .historicalComparison.status,
        "available",
      );

      assert.equal(
        report.sections
          .historicalComparison.data.status,
        "unavailable",
      );

      assert.equal(
        report.analysisContext
          .historicalContext.status,
        "unavailable",
      );

      assert.equal(
        report.status,
        "complete",
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "historical not_eligible status remains a successful historical section",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      restores.add(
        historicalContextService,
        "getHistoricalContext",
        async () => ({
          success: true,
          phase: "10.6",
          status: "not_eligible",

          currentSample: {
            id: 1,
            sample_code: "S-001",
          },

          parameter: "ph",

          candidate: {
            datasetCode: "H2",
            mandal: "Anakapalle",
            siteNo: 1,
            eligible: false,
          },

          comparison: null,

          provenance: {
            scientificAuthority: "Backend",
            calculationLocation: "Backend",
            classificationLocation: "Backend",
            source: "historical_database",
          },

          metadata: {
            candidateSelection:
              "nearest_candidate_only",
            source: "historical_database",
          },
        }),
      );

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            historical: {
              sampleId: 1,
              parameter: "ph",
            },
          },
        );

      assert.equal(
        report.sections
          .historicalComparison.status,
        "available",
      );

      assert.equal(
        report.sections
          .historicalComparison.data.status,
        "not_eligible",
      );

      assert.equal(
        report.status,
        "complete",
      );

      assert.equal(
        report.analysisContext
          .historicalContext
          .candidateSelection,
        "nearest_candidate_only",
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "historical comparison_unavailable remains distinguishable from technical section failure",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      restores.add(
        historicalContextService,
        "getHistoricalContext",
        async () => ({
          success: true,
          phase: "10.6",
          status: "comparison_unavailable",

          currentSample: {
            id: 1,
            sample_code: "S-001",
          },

          parameter: "ph",

          candidate: {
            datasetCode: "H2",
            mandal: "Anakapalle",
            siteNo: 1,
            eligible: true,
          },

          comparison: {
            available: false,
            code: "COMPARISON_UNAVAILABLE",
            message:
              "Historical comparison unavailable.",
          },

          provenance: {
            scientificAuthority: "Backend",
            calculationLocation: "Backend",
            classificationLocation: "Backend",
            source: "historical_database",
          },

          metadata: {
            candidateSelection:
              "nearest_candidate_only",
            source: "historical_database",
          },
        }),
      );

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            historical: {
              sampleId: 1,
              parameter: "ph",
            },
          },
        );

      assert.equal(
        report.sections
          .historicalComparison.status,
        "available",
      );

      assert.equal(
        report.sections
          .historicalComparison.data.status,
        "comparison_unavailable",
      );

      assert.equal(
        report.status,
        "complete",
      );

      assert.equal(
        report.errors.length,
        0,
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "historical service failure produces partial report while preserving current GIS analysis",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      restores.add(
        historicalContextService,
        "getHistoricalContext",
        async () => {
          throw new Error(
            "Simulated historical integration failure.",
          );
        },
      );

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            sampleIds: [1],

            parameter: "ph",

            historical: {
              sampleId: 1,
              parameter: "ph",
            },
          },
        );

      assert.equal(
        report.status,
        "partial",
      );

      assert.equal(
        report.sections.sampleSummary.status,
        "available",
      );

      assert.equal(
        report.sections.thematicAnalysis.status,
        "available",
      );

      assert.equal(
        report.sections
          .historicalComparison.status,
        "error",
      );

      assert.ok(
        report.errors.some(
          (error) =>
            error.section ===
              "historicalComparison" &&
            error.code ===
              "HISTORICAL_COMPARISON_ERROR",
        ),
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "historical request is not executed when historical inputs are incomplete",
  async () => {
    const restores = createRestoreStack();

    let historicalCalls = 0;

    try {
      stubCoreServices(restores);

      restores.add(
        historicalContextService,
        "getHistoricalContext",
        async () => {
          historicalCalls += 1;
          return createHistoricalContextResult();
        },
      );

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            historical: {
              sampleId: 1,
            },
          },
        );

      assert.equal(
        historicalCalls,
        0,
      );

      assert.equal(
        report.sections
          .historicalComparison.status,
        "not_applicable",
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "historical integration does not directly invoke candidate or comparison services",
  async () => {
    const restores = createRestoreStack();

    let historicalContextCalls = 0;

    try {
      stubCoreServices(restores);

      restores.add(
        historicalContextService,
        "getHistoricalContext",
        async (request) => {
          historicalContextCalls += 1;

          assert.deepEqual(
            request,
            {
              sampleId: 1,
              parameter: "nitrogen",
            },
          );

          return createHistoricalContextResult();
        },
      );

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            historical: {
              sampleId: 1,
              parameter: "nitrogen",
            },
          },
        );

      assert.equal(
        historicalContextCalls,
        1,
      );

      assert.equal(
        report.sections
          .historicalComparison.status,
        "available",
      );
    } finally {
      restores.restore();
    }
  },
);
// ============================================================
// PARAMETER CONTEXT
// ============================================================

test(
  "normalizes selected parameter into analysis context",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            parameter: "electrical_conductivity",
          },
        );

      assert.deepEqual(
        report.analysisContext
          .selectedParameter,
        {
          key: "electrical_conductivity",
          label: "Electrical Conductivity",
          unit: "dS/m",
        },
      );
    } finally {
      restores.restore();
    }
  },
);

// ============================================================
// PROVENANCE
// ============================================================

test(
  "integrated report preserves backend scientific authority",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {},
        );

      assert.equal(
        report.provenance.scientificAuthority,
        "backend",
      );

      assert.equal(
        report.provenance.calculationLocation,
        "backend",
      );

      assert.equal(
        report.provenance.classificationLocation,
        "backend",
      );
    } finally {
      restores.restore();
    }
  },
);

// ============================================================
// OVERALL SUMMARY
// ============================================================

test(
  "builds an aggregation-only overall summary",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            spatialAnalysis: {
              latitude: 17.71234,
              longitude: 83.30125,
            },

            interpolation: {
              parameter: "ph",
              power: 2,
              resolution: 50,
            },
          },
        );

      assert.equal(
        report.sections.overallSummary.status,
        "available",
      );

      const summary =
        report.sections.overallSummary.data;

      assert.equal(
        summary.sampleCount,
        3,
      );

      assert.deepEqual(
        summary.sampleIds,
        [1, 2, 3],
      );

      assert.equal(
        summary.sections.available,
        4,
        );

      assert.equal(
        summary.sections.notRequested,
        3,
      );
    } finally {
      restores.restore();
    }
  },
);

// ============================================================
// FAILURE ISOLATION
// ============================================================

test(
  "isolates spatial-analysis failure and returns partial report",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      restores.add(
        spatialAnalysisService,
        "getSpatialAnalysis",
        async () => {
          throw new Error(
            "Simulated spatial analysis failure.",
          );
        },
      );

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            spatialAnalysis: {
              latitude: 17.71234,
              longitude: 83.30125,
            },

            interpolation: {
              parameter: "ph",
              power: 2,
              resolution: 50,
            },
          },
        );

      assert.equal(
        report.status,
        "partial",
      );

      assert.equal(
        report.sections.spatialAnalysis.status,
        "error",
      );

      assert.equal(
        report.sections.interpolation.status,
        "available",
      );

      assert.equal(
        report.sections.sampleSummary.status,
        "available",
      );

      assert.ok(
        report.errors.some(
          (error) =>
            error.section ===
            "spatialAnalysis",
        ),
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "isolates interpolation failure without affecting historical analysis",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      restores.add(
        interpolationService,
        "prepareInterpolation",
        async () => {
          throw new Error(
            "Simulated interpolation failure.",
          );
        },
      );

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            interpolation: {
              parameter: "ph",
              power: 2,
              resolution: 50,
            },

            historical: {
              sampleId: 1,
              parameter: "ph",
            },
          },
        );

      assert.equal(
        report.status,
        "partial",
      );

      assert.equal(
        report.sections.interpolation.status,
        "error",
      );

      assert.equal(
        report.sections
          .historicalComparison.status,
        "available",
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "isolates historical failure without affecting interpolation",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      restores.add(
        historicalContextService,
        "getHistoricalContext",
        async () => {
          throw new Error(
            "Simulated historical context failure.",
          );
        },
      );

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            historical: {
              sampleId: 1,
              parameter: "ph",
            },

            interpolation: {
              parameter: "ph",
              power: 2,
              resolution: 50,
            },
          },
        );

      assert.equal(
        report.status,
        "partial",
      );

      assert.equal(
        report.sections
          .historicalComparison.status,
        "error",
      );

      assert.equal(
        report.sections.interpolation.status,
        "available",
      );
    } finally {
      restores.restore();
    }
  },
);

// ============================================================
// FUNDAMENTAL CONTEXT FAILURE
// ============================================================

test(
  "returns root error when sample repository fails",
  async () => {
    const restores = createRestoreStack();

    try {
      restores.add(
        soilRepository,
        "getAllSoilSamples",
        async () => {
          throw new Error(
            "Simulated repository failure.",
          );
        },
      );

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {},
        );

      assert.equal(
        report.status,
        "error",
      );

      assert.equal(
        report.errors.length,
        1,
      );

      assert.equal(
        report.errors[0].section,
        "report",
      );

      assert.equal(
        report.errors[0].code,
        "INTEGRATED_REPORT_ERROR",
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "returns root error when selected sample set is empty",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            sampleIds: [999],
          },
        );

      assert.equal(
        report.status,
        "error",
      );

      assert.equal(
        report.sections.sampleSummary.status,
        "unavailable",
      );

      assert.ok(
        report.errors.some(
          (error) =>
            error.code ===
            "SAMPLE_CONTEXT_UNAVAILABLE",
        ),
      );
    } finally {
      restores.restore();
    }
  },
);

// ============================================================
// VALIDATION
// ============================================================

test(
  "rejects a non-object request",
  () => {
    assert.throws(
      () =>
        aggregationService.validateRequest(
          null,
        ),
      /Report request must be an object/,
    );
  },
);

test(
  "rejects invalid sampleIds",
  () => {
    assert.throws(
      () =>
        aggregationService.validateRequest({
          sampleIds: [0],
        }),
      /Invalid sampleId/,
    );
  },
);

test(
  "rejects unsupported report parameter",
  () => {
    assert.throws(
      () =>
        aggregationService.validateRequest({
          parameter: "unsupported",
        }),
      /Unsupported report parameter/,
    );
  },
);

test(
  "rejects non-object analytical section requests",
  () => {
    assert.throws(
      () =>
        aggregationService.validateRequest({
          interpolation: "ph",
        }),
      /interpolation must be an object/,
    );
  },
);

// ============================================================
// HISTORICAL SECTION STATES
// ============================================================

test(
  "historical section becomes not_applicable when required inputs are missing",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            historical: {
              sampleId: 1,
            },
          },
        );

      assert.equal(
        report.sections
          .historicalComparison.status,
        "not_applicable",
      );
    } finally {
      restores.restore();
    }
  },
);

// ============================================================
// SECTION FAILURE STATUS
// ============================================================

test(
  "requested section returning null becomes unavailable",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      restores.add(
        interpolationService,
        "prepareInterpolation",
        async () => null,
      );

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            interpolation: {
              parameter: "ph",
              power: 2,
              resolution: 50,
            },
          },
        );

      assert.equal(
        report.sections.interpolation.status,
        "unavailable",
      );

      assert.equal(
        report.status,
        "partial",
      );

      assert.ok(
        report.warnings.some(
          (warning) =>
            warning.section ===
            "interpolation",
        ),
      );
    } finally {
      restores.restore();
    }
  },
);

// ============================================================
// COMPLETE MULTI-SECTION REPORT
// ============================================================

test(
  "builds a complete report when all requested sections succeed",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            sampleIds: [1, 2],

            parameter: "ph",

            spatialAnalysis: {
              latitude: 17.71234,
              longitude: 83.30125,
            },

            spatialQuery: {
              parameter: "ph",
              classification: "neutral",
            },

            interpolation: {
              parameter: "ph",
              power: 2,
              resolution: 50,
            },

            fertilityZoning: {
              power: 2,
              resolution: 50,
            },

            historical: {
              sampleId: 1,
              parameter: "ph",
            },
          },
        );

      assert.equal(
        report.status,
        "complete",
      );

      assert.equal(
        report.sections.sampleSummary.status,
        "available",
      );

      assert.equal(
        report.sections.thematicAnalysis.status,
        "available",
      );

      assert.equal(
        report.sections.spatialAnalysis.status,
        "available",
      );

      assert.equal(
        report.sections.spatialQuery.status,
        "available",
      );

      assert.equal(
        report.sections.interpolation.status,
        "available",
      );

      assert.equal(
        report.sections.fertilityZoning.status,
        "available",
      );

      assert.equal(
        report.sections.historicalComparison.status,
        "available",
      );

      assert.equal(
        report.sections.overallSummary.status,
        "available",
      );

      assert.equal(
        report.analysisContext.sampleCount,
        2,
      );

      assert.deepEqual(
        report.analysisContext.sampleIds,
        [1, 2],
      );

      assert.equal(
        report.analysisContext
          .selectedParameter.key,
        "ph",
      );
    } finally {
      restores.restore();
    }
  },
);
// ============================================================
// PHASE 10.6.6  CONTRACT HARDENING TESTS
// ============================================================

test(
  "rejects an array request",
  () => {
    assert.throws(
      () =>
        aggregationService.validateRequest([]),
      /Report request must be an object/,
    );
  },
);

test(
  "rejects non-array sampleIds",
  () => {
    assert.throws(
      () =>
        aggregationService.validateRequest({
          sampleIds: 1,
        }),
      /sampleIds must be an array/,
    );
  },
);

test(
  "rejects negative sampleIds",
  () => {
    assert.throws(
      () =>
        aggregationService.validateRequest({
          sampleIds: [-1],
        }),
      /Invalid sampleId/,
    );
  },
);

test(
  "accepts numeric-string sampleIds",
  () => {
    assert.doesNotThrow(
      () =>
        aggregationService.validateRequest({
          sampleIds: ["1", "2"],
        }),
    );
  },
);

test(
  "duplicate sampleIds do not duplicate selected samples",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            sampleIds: [1, 1, 2, 2],
          },
        );

      assert.equal(
        report.analysisContext.sampleCount,
        2,
      );

      assert.deepEqual(
        report.analysisContext.sampleIds,
        [1, 2],
      );

      assert.equal(
        report.sections.thematicAnalysis.data.count,
        2,
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "accepts every supported report parameter",
  () => {
    const parameters = [
      "standard",
      "ph",
      "nitrogen",
      "phosphorus",
      "potassium",
      "organic_carbon",
      "electrical_conductivity",
    ];

    for (const parameter of parameters) {
      assert.doesNotThrow(
        () =>
          aggregationService.validateRequest({
            parameter,
          }),
        `Parameter should be accepted: ${parameter}`,
      );
    }
  },
);

test(
  "rejects non-object optional analytical sections",
  () => {
    const fields = [
      "spatialAnalysis",
      "spatialQuery",
      "interpolation",
      "fertilityZoning",
      "historical",
    ];

    for (const field of fields) {
      assert.throws(
        () =>
          aggregationService.validateRequest({
            [field]: "invalid",
          }),
        new RegExp(`${field} must be an object`),
      );
    }
  },
);

test(
  "accepts null optional analytical sections",
  () => {
    assert.doesNotThrow(
      () =>
        aggregationService.validateRequest({
          spatialAnalysis: null,
          spatialQuery: null,
          interpolation: null,
          fertilityZoning: null,
          historical: null,
        }),
    );
  },
);

test(
  "spatial analysis with only one coordinate is not_applicable",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            spatialAnalysis: {
              latitude: 17.71234,
            },
          },
        );

      assert.equal(
        report.sections.spatialAnalysis.status,
        "not_applicable",
      );
    } finally {
      restores.restore();
    }
  },
);

test(
  "requested section returning undefined becomes unavailable",
  async () => {
    const restores = createRestoreStack();

    try {
      stubCoreServices(restores);

      restores.add(
        interpolationService,
        "prepareInterpolation",
        async () => undefined,
      );

      const report =
        await aggregationService.buildIntegratedAnalyticalGISReport(
          {
            interpolation: {
              parameter: "ph",
              power: 2,
              resolution: 50,
            },
          },
        );

      assert.equal(
        report.sections.interpolation.status,
        "unavailable",
      );

      assert.equal(
        report.status,
        "partial",
      );
    } finally {
      restores.restore();
    }
  },
);
