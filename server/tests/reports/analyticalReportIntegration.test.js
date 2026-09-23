"use strict";

// ============================================================
// server/tests/reports/analyticalReportIntegration.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.6.7  Integrated Analytical GIS HTTP Integration Test
//
// Test responsibilities:
//   1. Exercise the real Express application
//   2. Exercise the real reporting route
//   3. Exercise the real reporting controller
//   4. Exercise the real aggregation service
//   5. Isolate the database and optional analytical service boundaries
//   6. Validate the HTTP response contract
//
// Scientific calculations are NOT re-tested here.
// Existing analytical services remain authoritative.
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

// ============================================================
// APPLICATION
// ============================================================

const { app } = require("../../server");

// ============================================================
// REPOSITORY
// ============================================================

const soilRepository =
  require("../../repositories/soilRepository");

const interpolationService =
  require("../../services/interpolationService");

const fertilityZoningService =
  require("../../services/fertilityZoningService");

const spatialQueryService =
  require("../../services/spatialQueryService");

const spatialAnalysisService =
  require("../../services/spatialAnalysisService");

const historicalContextService =
  require("../../services/historicalContextService");

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
// HELPERS
// ============================================================

function stubRepository() {
  const original = soilRepository.getAllSoilSamples;

  soilRepository.getAllSoilSamples = async () =>
    ALL_SAMPLES.map((sample) => ({
      ...sample,
    }));

  return () => {
    soilRepository.getAllSoilSamples = original;
  };
}

async function startTestServer() {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1");

    server.once("listening", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close();

        reject(
          new Error(
            "Unable to determine integration test server address.",
          ),
        );

        return;
      }

      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });

    server.once("error", reject);
  });
}

async function stopTestServer(server) {
  if (!server) {
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

// ============================================================
// HAPPY-PATH HTTP INTEGRATION
// ============================================================

test(
  "POST /api/reports/integrated-analytical-gis returns canonical report",
  async () => {
    const restoreRepository = stubRepository();
    const { server, baseUrl } = await startTestServer();

    try {
      const response = await fetch(
        `${baseUrl}/api/reports/integrated-analytical-gis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sampleIds: [1],
            parameter: "ph",
          }),
        },
      );

      assert.equal(response.status, 200);

      const payload = await response.json();

      assert.equal(payload.success, true);
      assert.ok(payload.data);

      const report = payload.data;

      // --------------------------------------------------------
      // ROOT CONTRACT
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // REPORT SECTIONS
      // --------------------------------------------------------

      assert.ok(report.sections);

      const requiredSections = [
        "sampleSummary",
        "thematicAnalysis",
        "spatialAnalysis",
        "spatialQuery",
        "interpolation",
        "fertilityZoning",
        "historicalComparison",
        "overallSummary",
      ];

      for (const section of requiredSections) {
        assert.ok(
          Object.prototype.hasOwnProperty.call(
            report.sections,
            section,
          ),
          `Missing report section: ${section}`,
        );
      }

      // --------------------------------------------------------
      // SAMPLE CONTEXT
      // --------------------------------------------------------

      assert.equal(
        report.sections.sampleSummary.status,
        "available",
      );

      assert.equal(
        report.sections.sampleSummary.data.count,
        1,
      );

      assert.deepEqual(
        report.sections.sampleSummary.data.sampleIds,
        [1],
      );

      // --------------------------------------------------------
      // THEMATIC ANALYSIS
      // --------------------------------------------------------

      assert.equal(
        report.sections.thematicAnalysis.status,
        "available",
      );

      assert.equal(
        report.sections.thematicAnalysis.data.count,
        1,
      );

      // --------------------------------------------------------
      // NOT REQUESTED OPTIONAL SECTIONS
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // OVERALL SUMMARY
      // --------------------------------------------------------

      assert.equal(
        report.sections.overallSummary.status,
        "available",
      );

      assert.ok(
        report.sections.overallSummary.data,
      );

      // --------------------------------------------------------
      // ANALYSIS CONTEXT
      // --------------------------------------------------------

      assert.equal(
        report.analysisContext.sampleCount,
        1,
      );

      assert.deepEqual(
        report.analysisContext.sampleIds,
        [1],
      );

      assert.equal(
        report.analysisContext.selectedParameter.key,
        "ph",
      );

      // --------------------------------------------------------
      // PROVENANCE
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // WARNINGS / ERRORS
      // --------------------------------------------------------

      assert.deepEqual(
        report.warnings,
        [],
      );

      assert.deepEqual(
        report.errors,
        [],
      );
    } finally {
      restoreRepository();
      await stopTestServer(server);
    }
  },
);

// ============================================================
// VALIDATION ERROR HTTP INTEGRATION
// ============================================================

test(
  "POST /api/reports/integrated-analytical-gis returns report error for invalid parameter",
  async () => {
    const restoreRepository = stubRepository();
    const { server, baseUrl } = await startTestServer();

    try {
      const response = await fetch(
        `${baseUrl}/api/reports/integrated-analytical-gis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sampleIds: [1],
            parameter: "invalid_parameter",
          }),
        },
      );

      assert.equal(response.status, 200);

      const payload = await response.json();

      assert.equal(payload.success, true);
      assert.ok(payload.data);

      const report = payload.data;

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
        "error",
      );

      assert.ok(
        Array.isArray(report.errors),
      );

      assert.ok(
        report.errors.length >= 1,
      );

      assert.equal(
        report.errors[0].section,
        "report",
      );

      assert.equal(
        report.errors[0].code,
        "INTEGRATED_REPORT_ERROR",
      );

      assert.match(
        report.errors[0].message,
        /Unsupported report parameter/,
      );
    } finally {
      restoreRepository();
      await stopTestServer(server);
    }
  },
);

test(
  "POST /api/reports/integrated-analytical-gis includes interpolation section",
  async () => {
    const restoreRepository = stubRepository();
    const { server, baseUrl } = await startTestServer();

    const originalPrepareInterpolation =
      interpolationService.prepareInterpolation;

    let receivedOptions = null;

    interpolationService.prepareInterpolation =
      async (options) => {
        receivedOptions = options;

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

            spatialExtent: {
              minLatitude: 17.69,
              maxLatitude: 17.71234,
              minLongitude: 83.28,
              maxLongitude: 83.30125,
            },

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
      };

    try {
      const response = await fetch(
        `${baseUrl}/api/reports/integrated-analytical-gis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sampleIds: [1],
            parameter: "ph",
            interpolation: {
              parameter: "ph",
              power: 2,
              resolution: 50,
            },
          }),
        },
      );

      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.success, true);

      const report = payload.data;

      assert.equal(report.status, "complete");

      assert.deepEqual(receivedOptions, {
        parameter: "ph",
        power: 2,
        resolution: 50,
      });

      assert.equal(
        report.sections.interpolation.status,
        "available",
      );

      assert.equal(
        report.sections.interpolation.data.success,
        true,
      );

      assert.equal(
        report.sections.interpolation.data.phase,
        "8.3",
      );

      assert.equal(
        report.sections.interpolation.data.status,
        "completed",
      );

      assert.equal(
        report.sections.interpolation.data.configuration
          .parameter.key,
        "ph",
      );

      assert.equal(
        report.sections.interpolation.data.configuration
          .method.key,
        "idw",
      );

      assert.equal(
        report.sections.interpolation.data.configuration
          .settings.power,
        2,
      );

      assert.equal(
        report.sections.interpolation.data.configuration
          .settings.resolution,
        50,
      );

      assert.equal(
        report.sections.interpolation.data.statistics
          .validCellCount,
        100,
      );

      assert.deepEqual(
        report.errors,
        [],
      );
    } finally {
      interpolationService.prepareInterpolation =
        originalPrepareInterpolation;

      restoreRepository();

      await stopTestServer(server);
    }
  },
);
test(
  "POST /api/reports/integrated-analytical-gis includes fertility zoning section",
  async () => {
    const restoreRepository = stubRepository();
    const { server, baseUrl } = await startTestServer();

    const originalPrepareFertilityZoning =
      fertilityZoningService.prepareFertilityZoning;

    let receivedOptions = null;

    fertilityZoningService.prepareFertilityZoning =
      async (options) => {
        receivedOptions = options;

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
      };

    try {
      const response = await fetch(
        `${baseUrl}/api/reports/integrated-analytical-gis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sampleIds: [1],
            parameter: "ph",
            fertilityZoning: {
              power: 2,
              resolution: 50,
            },
          }),
        },
      );

      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.success, true);

      const report = payload.data;

      assert.equal(report.status, "complete");

      assert.deepEqual(receivedOptions, {
        power: 2,
        resolution: 50,
      });

      assert.equal(
        report.sections.fertilityZoning.status,
        "available",
      );

      const zoning =
        report.sections.fertilityZoning.data;

      assert.equal(zoning.success, true);
      assert.equal(zoning.phase, "9.2");
      assert.equal(zoning.status, "completed");

      assert.equal(
        zoning.configuration.zoningType,
        "fertility",
      );

      assert.equal(
        zoning.configuration.interpolationMethod,
        "idw",
      );

      assert.equal(
        zoning.configuration.power,
        2,
      );

      assert.equal(
        zoning.configuration.resolution,
        50,
      );

      assert.equal(
        zoning.zoneDefinitions.length,
        4,
      );

      assert.equal(
        zoning.statistics.low,
        40,
      );

      assert.equal(
        zoning.statistics.moderateGood,
        50,
      );

      assert.equal(
        zoning.statistics.high,
        10,
      );

      assert.equal(
        zoning.statistics.unavailable,
        0,
      );

      assert.deepEqual(report.errors, []);
    } finally {
      fertilityZoningService.prepareFertilityZoning =
        originalPrepareFertilityZoning;

      restoreRepository();

      await stopTestServer(server);
    }
  },
);
test(
  "POST /api/reports/integrated-analytical-gis includes spatial query section",
  async () => {
    const restoreRepository = stubRepository();
    const { server, baseUrl } = await startTestServer();

    const originalQuerySamples =
      spatialQueryService.querySamples;

    let receivedOptions = null;

    spatialQueryService.querySamples =
      async (options) => {
        receivedOptions = options;

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
            sampleExtent: {
              minLatitude: 17.69,
              maxLatitude: 17.71234,
              minLongitude: 83.28,
              maxLongitude: 83.30125,
            },
          },

          metadata: {
            classificationLocation: "backend",
            filteringLocation: "backend",
            distanceCalculation: "haversine",
            generatedAt:
              "2026-09-11T00:00:00.000Z",
          },
        };
      };

    try {
      const response = await fetch(
        `${baseUrl}/api/reports/integrated-analytical-gis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sampleIds: [1],
            parameter: "ph",
            spatialQuery: {
              parameter: "ph",
              classification: "neutral",
            },
          }),
        },
      );

      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.success, true);

      const report = payload.data;

      assert.equal(report.status, "complete");

      assert.deepEqual(receivedOptions, {
        parameter: "ph",
        classification: "neutral",
      });

      assert.equal(
        report.sections.spatialQuery.status,
        "available",
      );

      const spatialQuery =
        report.sections.spatialQuery.data;

      assert.equal(spatialQuery.success, true);
      assert.equal(spatialQuery.phase, "10.3");

      assert.equal(
        spatialQuery.query.parameter,
        "ph",
      );

      assert.equal(
        spatialQuery.query.classification,
        "neutral",
      );

      assert.equal(
        spatialQuery.result.count,
        1,
      );

      assert.equal(
        spatialQuery.result.samples.length,
        1,
      );

      assert.equal(
        spatialQuery.result.samples[0].id,
        1,
      );

      assert.equal(
        spatialQuery.result.samples[0].sample_code,
        "S-001",
      );

      assert.equal(
        spatialQuery.metadata.classificationLocation,
        "backend",
      );

      assert.equal(
        spatialQuery.metadata.filteringLocation,
        "backend",
      );

      assert.equal(
        spatialQuery.metadata.distanceCalculation,
        "haversine",
      );

      assert.deepEqual(report.errors, []);
    } finally {
      spatialQueryService.querySamples =
        originalQuerySamples;

      restoreRepository();

      await stopTestServer(server);
    }
  },
);
test(
  "POST /api/reports/integrated-analytical-gis includes spatial analysis section",
  async () => {
    const restoreRepository = stubRepository();
    const { server, baseUrl } = await startTestServer();

    const originalGetSpatialAnalysis =
      spatialAnalysisService.getSpatialAnalysis;

    let receivedLatitude = null;
    let receivedLongitude = null;

    spatialAnalysisService.getSpatialAnalysis =
      async (latitude, longitude) => {
        receivedLatitude = latitude;
        receivedLongitude = longitude;

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

            sampleExtent: {
              minLatitude: 17.69,
              maxLatitude: 17.71234,
              minLongitude: 83.28,
              maxLongitude: 83.30125,
            },
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
      };

    try {
      const response = await fetch(
        `${baseUrl}/api/reports/integrated-analytical-gis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sampleIds: [1],
            parameter: "ph",
            spatialAnalysis: {
              latitude: 17.71234,
              longitude: 83.30125,
            },
          }),
        },
      );

      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.success, true);

      const report = payload.data;

      assert.equal(report.status, "complete");

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

      const spatialAnalysis =
        report.sections.spatialAnalysis.data;

      assert.equal(
        spatialAnalysis.success,
        true,
      );

      assert.equal(
        spatialAnalysis.phase,
        "10.2",
      );

      assert.equal(
        spatialAnalysis.location.latitude,
        17.71234,
      );

      assert.equal(
        spatialAnalysis.location.longitude,
        83.30125,
      );

      assert.equal(
        spatialAnalysis.spatialContext
          .withinSampleExtent,
        true,
      );

      assert.equal(
        spatialAnalysis.spatialContext
          .nearestSample.id,
        1,
      );

      assert.equal(
        spatialAnalysis.spatialContext
          .nearestSample.sample_code,
        "S-001",
      );

      assert.equal(
        spatialAnalysis.interpolatedAnalysis
          .pH.value,
        6.8,
      );

      assert.equal(
        spatialAnalysis.interpolatedAnalysis
          .pH.classification,
        "Neutral",
      );

      assert.equal(
        spatialAnalysis.sampleContext.soilTexture,
        "Loamy",
      );

      assert.equal(
        spatialAnalysis.metadata
          .classificationLocation,
        "backend",
      );

      assert.equal(
        spatialAnalysis.metadata
          .interpolationLocation,
        "backend",
      );

      assert.equal(
        spatialAnalysis.metadata
          .presentationLocation,
        "frontend",
      );

      assert.deepEqual(report.errors, []);
    } finally {
      spatialAnalysisService.getSpatialAnalysis =
        originalGetSpatialAnalysis;

      restoreRepository();

      await stopTestServer(server);
    }
  },
);
test(
  "POST /api/reports/integrated-analytical-gis includes historical comparison section",
  async () => {
    const restoreRepository = stubRepository();
    const { server, baseUrl } = await startTestServer();

    const originalGetHistoricalContext =
      historicalContextService.getHistoricalContext;

    let receivedOptions = null;

    historicalContextService.getHistoricalContext =
      async (options) => {
        receivedOptions = options;

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
      };

    try {
      const response = await fetch(
        `${baseUrl}/api/reports/integrated-analytical-gis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sampleIds: [1],
            parameter: "ph",
            historical: {
              sampleId: 1,
              parameter: "ph",
            },
          }),
        },
      );

      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.success, true);

      const report = payload.data;

      assert.equal(report.status, "complete");

      assert.deepEqual(receivedOptions, {
        sampleId: 1,
        parameter: "ph",
      });

      assert.equal(
        report.sections.historicalComparison.status,
        "available",
      );

      const historical =
        report.sections.historicalComparison.data;

      assert.equal(historical.success, true);
      assert.equal(historical.phase, "10.6");
      assert.equal(historical.status, "available");

      assert.equal(
        historical.currentSample.id,
        1,
      );

      assert.equal(
        historical.currentSample.sample_code,
        "S-001",
      );

      assert.equal(
        historical.parameter.key,
        "ph",
      );

      assert.equal(
        historical.parameter.label,
        "pH",
      );

      assert.equal(
        historical.candidate.datasetCode,
        "H2",
      );

      assert.equal(
        historical.candidate.datasetName,
        "Visakhapatnam Kharif Rice Soil Fertility Dataset",
      );

      assert.equal(
        historical.candidate.eligible,
        true,
      );

      assert.equal(
        historical.comparison.eligible,
        true,
      );

      assert.equal(
        historical.comparison.observations.length,
        3,
      );

      assert.equal(
        historical.comparison.observations[0].stage,
        "Before sowing",
      );

      assert.equal(
        historical.comparison.observations[0].value,
        7.2,
      );

      assert.equal(
        historical.comparison.observations[0].classification,
        "Neutral",
      );

      assert.deepEqual(
        historical.comparison.changes,
        [],
      );

      assert.equal(
        historical.provenance.scientificAuthority,
        "Backend",
      );

      assert.equal(
        historical.provenance.calculationLocation,
        "Backend",
      );

      assert.equal(
        historical.provenance.classificationLocation,
        "Backend",
      );

      assert.equal(
        historical.provenance.source,
        "historical_database",
      );

      assert.equal(
        historical.metadata.candidateSelection,
        "nearest_candidate_only",
      );

      assert.equal(
        historical.metadata.source,
        "historical_database",
      );

      assert.deepEqual(report.errors, []);
    } finally {
      historicalContextService.getHistoricalContext =
        originalGetHistoricalContext;

      restoreRepository();

      await stopTestServer(server);
    }
  },
);
test(
  "POST /api/reports/integrated-analytical-gis isolates optional section failure",
  async () => {
    const restoreRepository = stubRepository();
    const { server, baseUrl } = await startTestServer();

    const originalPrepareInterpolation =
      interpolationService.prepareInterpolation;

    interpolationService.prepareInterpolation =
      async () => {
        throw new Error(
          "Interpolation service failed during integration test.",
        );
      };

    try {
      const response = await fetch(
        `${baseUrl}/api/reports/integrated-analytical-gis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sampleIds: [1],
            parameter: "ph",

            interpolation: {
              parameter: "ph",
              method: "idw",
              power: 2,
              resolution: 50,
            },

            spatialQuery: {
              parameter: "ph",
              classification: "neutral",
            },

            fertilityZoning: {
              power: 2,
              resolution: 50,
            },
          }),
        },
      );

      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.success, true);

      const report = payload.data;

      // --------------------------------------------------------
      // ROOT REPORT STATUS
      // --------------------------------------------------------

      assert.equal(report.contractVersion, "1.0");

      assert.equal(
        report.reportType,
        "integrated_analytical_gis",
      );

      assert.equal(report.status, "partial");

      // --------------------------------------------------------
      // INTERPOLATION MUST FAIL IN ISOLATION
      // --------------------------------------------------------

      assert.equal(
        report.sections.interpolation.status,
        "error",
      );

      assert.equal(
        report.sections.interpolation.data,
        null,
      );

      // --------------------------------------------------------
      // OTHER OPTIONAL SECTIONS MUST REMAIN AVAILABLE
      // --------------------------------------------------------

      assert.equal(
        report.sections.spatialQuery.status,
        "available",
      );

      assert.equal(
        report.sections.fertilityZoning.status,
        "available",
      );

      // --------------------------------------------------------
      // MANDATORY SECTIONS MUST REMAIN AVAILABLE
      // --------------------------------------------------------

      assert.equal(
        report.sections.sampleSummary.status,
        "available",
      );

      assert.equal(
        report.sections.thematicAnalysis.status,
        "available",
      );

      assert.equal(
        report.sections.overallSummary.status,
        "available",
      );

      // --------------------------------------------------------
      // ERROR MUST IDENTIFY INTERPOLATION
      // --------------------------------------------------------

      assert.ok(Array.isArray(report.errors));

      assert.ok(
        report.errors.some(
          (error) =>
            error.section === "interpolation",
        ),
      );

      const interpolationError =
        report.errors.find(
          (error) =>
            error.section === "interpolation",
        );

      assert.equal(
        interpolationError.message,
        "Interpolation service failed during integration test.",
      );

      // --------------------------------------------------------
      // REPORT MUST NOT BECOME A TOP-LEVEL ERROR
      // --------------------------------------------------------

      assert.notEqual(report.status, "error");
    } finally {
      interpolationService.prepareInterpolation =
        originalPrepareInterpolation;

      restoreRepository();

      await stopTestServer(server);
    }
  },
);