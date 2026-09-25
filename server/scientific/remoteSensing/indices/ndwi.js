"use strict";

// ============================================================
// AgriNexus GIS
// server/scientific/remoteSensing/indices/ndwi.js
// ============================================================
//
// Phase 13.3  Water & Moisture Spectral Index Definitions
//
// Normalized Difference Water Index (NDWI)
//
// Uses the McFeeters formulation for water-body detection.
//
// Definition only.
// No raster processing or index calculation is performed here.
//
// ============================================================

const ndwiDefinition = Object.freeze({
  code: "NDWI",

  name: "Normalized Difference Water Index",

  description:
    "A normalized spectral index using green and near-infrared reflectance to enhance the detection of open water and distinguish water bodies from many terrestrial surfaces.",

  formula:
    "(Green - NIR) / (Green + NIR)",

  requiredBands: Object.freeze([
    "Green",
    "NIR",
  ]),

  sensorCompatibility: Object.freeze([
    "Landsat",
    "Sentinel-2",
    "MODIS",
    "Generic multispectral",
  ]),

  validRange: Object.freeze({
    min: -1,
    max: 1,
  }),

  interpretation:
    "Higher NDWI values generally indicate stronger water-related spectral response, while lower or negative values generally indicate non-water surfaces. Interpretation can be affected by vegetation, soil, built surfaces, atmospheric conditions, and sensor characteristics.",

  classificationRules: Object.freeze({
    method: "baseline_qualitative",

    note:
      "Baseline classes are interpretive guidance only; water-detection thresholds should be calibrated for sensor, season, atmospheric conditions, land cover, water properties, and study area.",

    classes: Object.freeze([
      Object.freeze({
        code: "very_low",
        min: -1,
        max: 0.0,
        label: "Very Low Water Signal",
      }),
      Object.freeze({
        code: "low",
        min: 0.0,
        max: 0.2,
        label: "Low Water Signal",
      }),
      Object.freeze({
        code: "moderate",
        min: 0.2,
        max: 0.5,
        label: "Moderate Water Signal",
      }),
      Object.freeze({
        code: "high",
        min: 0.5,
        max: 0.8,
        label: "High Water Signal",
      }),
      Object.freeze({
        code: "very_high",
        min: 0.8,
        max: 1.0,
        label: "Very High Water Signal",
      }),
    ]),
  }),

  visualizationRules: Object.freeze({
    recommendedDisplay: "continuous",
    legendType: "sequential",
    clampToValidRange: true,
    nodataHandling: "exclude",
  }),
});

module.exports = ndwiDefinition;
