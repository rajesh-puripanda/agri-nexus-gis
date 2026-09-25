"use strict";

// ============================================================
// AgriNexus GIS
// server/scientific/remoteSensing/indices/arvi.js
// ============================================================
//
// Phase 13.2  Remote Sensing Index Definitions
//
// Atmospherically Resistant Vegetation Index (ARVI)
//
// Definition only.
// No raster processing or index calculation is performed here.
//
// ============================================================

const arviDefinition = Object.freeze({
  code: "ARVI",

  name: "Atmospherically Resistant Vegetation Index",

  description:
    "A vegetation index designed to reduce the influence of atmospheric effects by incorporating blue-band reflectance together with red and near-infrared reflectance.",

  formula:
    "(NIR - (2 * Red - Blue)) / (NIR + (2 * Red - Blue))",

  requiredBands: Object.freeze([
    "NIR",
    "Red",
    "Blue",
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
    "Higher ARVI values generally indicate greater vegetation presence and vigor. The blue-band correction component is intended to reduce sensitivity to atmospheric scattering compared with conventional red and near-infrared vegetation indices.",

  classificationRules: Object.freeze({
    method: "baseline_qualitative",
    note:
      "Baseline classes are interpretive guidance only; agricultural thresholds should be calibrated for crop, sensor, season, atmospheric conditions, soil background, and study area.",
    classes: Object.freeze([
      Object.freeze({
        code: "very_low",
        min: -1,
        max: 0.0,
        label: "Very Low Vegetation",
      }),
      Object.freeze({
        code: "low",
        min: 0.0,
        max: 0.2,
        label: "Low Vegetation",
      }),
      Object.freeze({
        code: "moderate",
        min: 0.2,
        max: 0.5,
        label: "Moderate Vegetation",
      }),
      Object.freeze({
        code: "high",
        min: 0.5,
        max: 0.8,
        label: "High Vegetation",
      }),
      Object.freeze({
        code: "very_high",
        min: 0.8,
        max: 1.0,
        label: "Very High Vegetation",
      }),
    ]),
  }),

  visualizationRules: Object.freeze({
    recommendedDisplay: "continuous",
    legendType: "sequential",
    clampToValidRange: true,
    nodataHandling: "exclude",
  }),

  parameters: Object.freeze({
    gamma: 1.0,
  }),
});

module.exports = arviDefinition;
