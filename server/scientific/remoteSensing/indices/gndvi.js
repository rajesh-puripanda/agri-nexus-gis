"use strict";

// ============================================================
// AgriNexus GIS
// server/scientific/remoteSensing/indices/gndvi.js
// ============================================================
//
// Phase 13.2  Remote Sensing Index Definitions
//
// Green Normalized Difference Vegetation Index (GNDVI)
//
// Definition only.
// No raster processing or index calculation is performed here.
//
// ============================================================

const gndviDefinition = Object.freeze({
  code: "GNDVI",

  name: "Green Normalized Difference Vegetation Index",

  description:
    "A normalized vegetation index that uses green and near-infrared reflectance and can provide sensitivity to vegetation chlorophyll and nitrogen-related canopy characteristics.",

  formula: "(NIR - Green) / (NIR + Green)",

  requiredBands: Object.freeze([
    "NIR",
    "Green",
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
    "Higher GNDVI values generally indicate greater vegetation presence and canopy vigor. GNDVI can provide sensitivity to chlorophyll-related variation that differs from conventional red-band vegetation indices.",

  classificationRules: Object.freeze({
    method: "baseline_qualitative",
    note:
      "Baseline classes are interpretive guidance only; agricultural thresholds should be calibrated for crop, sensor, season, soil background, and study area.",
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
});

module.exports = gndviDefinition;
