// ============================================================
// public/js/map-ui-spatial-analysis.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.2.5
// Spatial Analytical Popup UI
//
// Historical GIS Context Integration
// ============================================================

"use strict";

// ============================================================
// SPATIAL ANALYSIS VALUE
// ============================================================

function formatSpatialAnalysisValue(parameter, value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "Unavailable";
  }

  switch (parameter) {
    case "pH":
      return numericValue.toFixed(2);

    case "nitrogen":
    case "phosphorus":
    case "potassium":
      return numericValue.toFixed(2);

    case "organicCarbon":
    case "electricalConductivity":
      return numericValue.toFixed(3);

    default:
      return numericValue.toFixed(2);
  }
}

// ============================================================
// SPATIAL ANALYSIS SOURCE
// ============================================================

function getSpatialAnalysisSourceLabel(sourceType) {
  switch (sourceType) {
    case "sample":
      return "Measured sample";

    case "interpolated":
      return "IDW interpolated";

    default:
      return "Unavailable";
  }
}

// ============================================================
// SPATIAL ANALYSIS LOADING POPUP
// ============================================================

function buildSpatialAnalysisLoadingPopup(latitude, longitude) {
  const formattedLatitude =
    Number.isFinite(Number(latitude))
      ? Number(latitude).toFixed(5)
      : "";

  const formattedLongitude =
    Number.isFinite(Number(longitude))
      ? Number(longitude).toFixed(5)
      : "";

  return (
    '<div class="soil-sample-popup spatial-analysis-popup">' +
    '<div class="soil-sample-popup-title">Spatial Analysis</div>' +
    "<div><strong>Location:</strong> " +
    escapeHtml(formattedLatitude) +
    ", " +
    escapeHtml(formattedLongitude) +
    "</div>" +
    '<div class="soil-sample-popup-section"><strong>Analytical Result</strong></div>' +
    "<div>Loading spatial analytical result...</div>" +
    "</div>"
  );
}

// ============================================================
// SPATIAL ANALYSIS ERROR POPUP
// ============================================================

function buildSpatialAnalysisErrorPopup(
  latitude,
  longitude,
  message,
) {
  const formattedLatitude =
    Number.isFinite(Number(latitude))
      ? Number(latitude).toFixed(5)
      : "";

  const formattedLongitude =
    Number.isFinite(Number(longitude))
      ? Number(longitude).toFixed(5)
      : "";

  return (
    '<div class="soil-sample-popup spatial-analysis-popup">' +
    '<div class="soil-sample-popup-title">Spatial Analysis</div>' +
    "<div><strong>Location:</strong> " +
    escapeHtml(formattedLatitude) +
    ", " +
    escapeHtml(formattedLongitude) +
    "</div>" +
    '<div class="soil-sample-popup-section"><strong>Analysis Error</strong></div>' +
    "<div>" +
    escapeHtml(
      String(message || "Spatial analysis failed."),
    ) +
    "</div>" +
    "</div>"
  );
}

// ============================================================
// HISTORICAL CONTEXT HELPERS
// ============================================================

function formatHistoricalValue(value, unit) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "Unavailable";
  }

  return (
    numericValue.toFixed(2) +
    (unit
      ? ` ${escapeHtml(String(unit))}`
      : "")
  );
}

function formatHistoricalChange(change) {
  if (!change) {
    return "Unavailable";
  }

  const absoluteValue =
    Number(change.absoluteChange);

  const percentageValue =
    Number(change.percentageChange);

  const unit =
    change.unit
      ? String(change.unit)
      : "";

  const absoluteText =
    Number.isFinite(absoluteValue)
      ? `${
          absoluteValue >= 0 ? "+" : ""
        }${absoluteValue.toFixed(2)}${
          unit ? ` ${escapeHtml(unit)}` : ""
        }`
      : "Unavailable";

  const percentageText =
    Number.isFinite(percentageValue)
      ? `${
          percentageValue >= 0 ? "+" : ""
        }${percentageValue.toFixed(2)}%`
      : "Unavailable";

  return `${absoluteText} (${percentageText})`;
}

function getHistoricalParameterLabel(parameter) {
  switch (parameter) {
    case "ph":
      return "pH";

    case "nitrogen":
      return "Nitrogen";

    case "phosphorus":
      return "Phosphorus";

    case "potassium":
      return "Potassium";

    case "organic_carbon":
      return "Organic Carbon";

    case "electrical_conductivity":
      return "Electrical Conductivity";

    default:
      return parameter || "Unavailable";
  }
}

function getHistoricalParameterUnit(parameter) {
  switch (parameter) {
    case "ph":
      return "pH";

    case "nitrogen":
    case "phosphorus":
    case "potassium":
      return "kg/ha";

    case "organic_carbon":
      return "%";

    case "electrical_conductivity":
      return "dS/m";

    default:
      return "";
  }
}

function formatHistoricalSiteName(site) {
  if (!site) {
    return "Unavailable";
  }

  const mandal =
    site.mandal
      ? String(site.mandal).trim()
      : "";

  const village =
    site.village
      ? String(site.village).trim()
      : "";

  const siteNo = Number(site.siteNo);

  const parts = [];

  if (mandal) {
    parts.push(mandal);
  }

  if (village) {
    parts.push(village);
  }

  if (Number.isInteger(siteNo)) {
    parts.push(`Site ${siteNo}`);
  }

  return parts.length
    ? parts.join(" — ")
    : "Unavailable";
}

function formatHistoricalDatasetName(name) {
  const value = String(name || "").trim();

  return value.replace(/\s+Dataset$/i, "");
}

// ============================================================
// HISTORICAL CONTEXT HTML
// ============================================================

function buildHistoricalContextHtml(
  historicalContext,
) {
  if (!historicalContext) {
    return "";
  }

  const status =
    historicalContext.status ||
    "unavailable";

  if (status === "not_requested") {
    return "";
  }

  const parameter =
    historicalContext.parameter?.key ||
    historicalContext.comparison?.parameter?.key ||
    "";

  const parameterLabel =
    historicalContext.parameter?.label ||
    historicalContext.comparison?.parameter?.label ||
    getHistoricalParameterLabel(parameter);

  const unit =
    historicalContext.parameter?.unit ||
    historicalContext.comparison?.parameter?.unit ||
    getHistoricalParameterUnit(parameter);

  const candidate =
    historicalContext.candidate ||
    null;

  const comparison =
    historicalContext.comparison ||
    null;

  const candidateDataset =
    candidate?.dataset ||
    {};

  const candidateSite =
    candidate?.site ||
    {};

  const comparisonDataset =
    comparison?.dataset ||
    {};

  const comparisonSite =
    comparison?.site ||
    {};

  const datasetCode =
    candidateDataset.code ??
    comparisonDataset.code ??
    "Unavailable";

  const datasetName =
    candidateDataset.name ??
    comparisonDataset.name ??
    "";

  // Compact popup only:
  // remove trailing "Dataset" from the display name.
  const cleanDatasetName =
    formatHistoricalDatasetName(datasetName);

  const datasetText =
    cleanDatasetName
      ? `${datasetCode} — ${cleanDatasetName}`
      : String(datasetCode);

  // Prefer the candidate site, but fall back to the
  // comparison site when candidate.site is empty.
  const siteName =
    formatHistoricalSiteName(
      Object.keys(candidateSite).length
        ? candidateSite
        : comparisonSite,
    );

  const distance =
    Number(candidate?.distance?.value);

  const distanceUnit =
    candidate?.distance?.unit ??
    "";

  let distanceText = "Unavailable";

  if (Number.isFinite(distance)) {
    if (
      distanceUnit === "m" &&
      distance >= 1000
    ) {
      distanceText =
        `${(distance / 1000).toFixed(3)} km`;
    } else {
      distanceText =
        `${distance.toFixed(3)} ${distanceUnit}`.trim();
    }
  }

  const depth =
    comparison?.depth ||
    candidate?.historicalDepth ||
    {};

  const depthFrom =
    depth.fromCm ??
    depth.depthFromCm;

  const depthTo =
    depth.toCm ??
    depth.depthToCm;

  const depthText =
    Number.isFinite(Number(depthFrom)) &&
    Number.isFinite(Number(depthTo))
      ? `${Number(depthFrom)}–${Number(depthTo)} cm`
      : "Unavailable";

  const observations =
    Array.isArray(comparison?.observations)
      ? comparison.observations
      : [];

  const stages = observations.length;

  const eligibility =
    comparison?.eligible === true ||
    status === "available";

  const comparisonStatus =
    eligibility
      ? "Eligible"
      : status === "not_eligible"
        ? "Not eligible"
        : "Unavailable";

  const changes =
    Array.isArray(comparison?.changes)
      ? comparison.changes
      : [];

  let transitionsHtml = "";

  if (changes.length > 0) {
    transitionsHtml =
      changes
        .map((change) => {
          const fromStage =
            change.fromStage ??
            change.from ??
            "Unknown";

          const toStage =
            change.toStage ??
            change.to ??
            "Unknown";

          const transition =
            change.classificationTransition ||
            change.transition ||
            {};

          const fromClassification =
            transition.from ??
            change.fromClassification ??
            "Unavailable";

          const toClassification =
            transition.to ??
            change.toClassification ??
            "Unavailable";

          const formattedChange =
            formatHistoricalChange({
              absoluteChange:
                change.absoluteChange,
              percentageChange:
                change.percentageChange,
              unit:
                change.unit || unit,
            });

          return (
            '<div class="spatial-analysis-historical-transition">' +
            "<div><strong>" +
            escapeHtml(String(fromStage)) +
            " → " +
            escapeHtml(String(toStage)) +
            ":</strong> " +
            escapeHtml(formattedChange) +
            "</div>" +
            "<div>" +
            escapeHtml(
              String(fromClassification),
            ) +
            " → " +
            escapeHtml(
              String(toClassification),
            ) +
            "</div>" +
            "</div>"
          );
        })
        .join("");
  } else {
    transitionsHtml =
      '<div class="spatial-analysis-status unavailable">' +
      "No historical transitions available." +
      "</div>";
  }

  const currentSampleId =
    historicalContext.currentSample?.id ??
    candidate?.currentSample?.id ??
    null;

  let historicalLinkHtml = "";

  if (
    currentSampleId &&
    parameter
  ) {
    const historicalUrl =
      "/historical-analysis.html?" +
      "sampleId=" +
      encodeURIComponent(
        String(currentSampleId),
      ) +
      "&parameter=" +
      encodeURIComponent(parameter);

    historicalLinkHtml =
      '<div class="spatial-analysis-historical-link">' +
      '<a href="' +
      escapeHtml(historicalUrl) +
      '">' +
      "Open Historical Analysis" +
      "</a>" +
      "</div>";
  }

  return (
    '<div class="soil-sample-popup-section">' +
    "<strong>Historical Context</strong>" +
    "</div>" +
    "<div><strong>Parameter:</strong> " +
    escapeHtml(String(parameterLabel)) +
    "</div>" +
    "<div><strong>Dataset:</strong> " +
    escapeHtml(datasetText) +
    "</div>" +
    "<div><strong>Site:</strong> " +
    escapeHtml(String(siteName)) +
    "</div>" +
    "<div><strong>Distance:</strong> " +
    escapeHtml(distanceText) +
    "</div>" +
    "<div><strong>Depth:</strong> " +
    escapeHtml(depthText) +
    "</div>" +
    "<div><strong>Stages:</strong> " +
    escapeHtml(String(stages)) +
    "</div>" +
    "<div><strong>Comparison:</strong> " +
    escapeHtml(comparisonStatus) +
    "</div>" +
    '<div class="soil-sample-popup-section">' +
    "<strong>Transitions</strong>" +
    "</div>" +
    transitionsHtml +
    historicalLinkHtml
  );
}

// ============================================================
// SPATIAL ANALYSIS RESULT POPUP
// ============================================================

function buildSpatialAnalysisPopup(data) {
  if (!data || !data.success) {
    return "No spatial analytical information available.";
  }

  const location =
    data.location || {};

  const spatialContext =
    data.spatialContext || {};

  const interpolatedAnalysis =
    data.interpolatedAnalysis || {};

  const sampleContext =
    data.sampleContext || {};

  const historicalContext =
    data.historicalContext || null;

  const latitude =
    Number(location.latitude);

  const longitude =
    Number(location.longitude);

  const formattedLatitude =
    Number.isFinite(latitude)
      ? latitude.toFixed(5)
      : "";

  const formattedLongitude =
    Number.isFinite(longitude)
      ? longitude.toFixed(5)
      : "";

  const withinSampleExtent =
    spatialContext.withinSampleExtent === true;

  const nearestSample =
    spatialContext.nearestSample ||
    null;

  const pH =
    interpolatedAnalysis.pH || {};

  const nitrogen =
    interpolatedAnalysis.nitrogen || {};

  const phosphorus =
    interpolatedAnalysis.phosphorus || {};

  const potassium =
    interpolatedAnalysis.potassium || {};

  const organicCarbon =
    interpolatedAnalysis.organicCarbon || {};

  const electricalConductivity =
    interpolatedAnalysis.electricalConductivity || {};

  const overallFertility =
    interpolatedAnalysis.overallFertility ??
    "Unavailable";

  const soilTexture =
    sampleContext.soilTexture ??
    "Unavailable";

  const buildParameterRow = (
    label,
    parameterKey,
    result = {},
  ) => {
    if (result.available !== true) {
      return (
        "<div>" +
        `<strong>${escapeHtml(label)}:</strong> ` +
        "Unavailable" +
        "</div>"
      );
    }

    const value =
      formatSpatialAnalysisValue(
        parameterKey,
        result.value,
      );

    const unit = result.unit
      ? ` ${escapeHtml(String(result.unit))}`
      : "";

    const sourceLabel =
      getSpatialAnalysisSourceLabel(
        result.sourceType,
      );

    const classification =
      result.classification ??
      "Unavailable";

    return (
      "<div>" +
      `<strong>${escapeHtml(label)}:</strong> ` +
      escapeHtml(value) +
      unit +
      " — " +
      escapeHtml(String(classification)) +
      " " +
      '<span class="spatial-analysis-source">(' +
      escapeHtml(sourceLabel) +
      ")</span>" +
      "</div>"
    );
  };

  let nearestSampleHtml = "";

  if (nearestSample) {
    const sampleCode =
      nearestSample.sample_code ??
      nearestSample.sampleCode ??
      nearestSample.id ??
      "Unknown";

    const distance =
      Number(nearestSample.distance);

    const formattedDistance =
      Number.isFinite(distance)
        ? distance.toFixed(3)
        : "";

    const distanceUnit =
      nearestSample.distanceUnit ??
      "m";

    nearestSampleHtml =
      "<div>" +
      "<strong>Nearest Sample:</strong> " +
      escapeHtml(String(sampleCode)) +
      "</div>" +
      "<div>" +
      "<strong>Distance:</strong> " +
      escapeHtml(formattedDistance) +
      " " +
      escapeHtml(String(distanceUnit)) +
      "</div>";
  }

  const extentStatus =
    withinSampleExtent
      ? "Within sample analytical extent"
      : "Outside sample analytical extent";

  const extentClass =
    withinSampleExtent
      ? "available"
      : "unavailable";

  return (
    '<div class="soil-sample-popup spatial-analysis-popup">' +
    '<div class="soil-sample-popup-title">' +
    "Spatial Analysis" +
    "</div>" +
    "<div><strong>Location:</strong> " +
    escapeHtml(formattedLatitude) +
    ", " +
    escapeHtml(formattedLongitude) +
    "</div>" +
    '<div class="soil-sample-popup-section">' +
    "<strong>Spatial Context</strong>" +
    "</div>" +
    `<div class="spatial-analysis-status ${extentClass}">` +
    escapeHtml(extentStatus) +
    "</div>" +
    nearestSampleHtml +
    '<div class="soil-sample-popup-section">' +
    "<strong>Analytical Soil Properties</strong>" +
    "</div>" +
    buildParameterRow("pH", "pH", pH) +
    buildParameterRow(
      "Nitrogen",
      "nitrogen",
      nitrogen,
    ) +
    buildParameterRow(
      "Phosphorus",
      "phosphorus",
      phosphorus,
    ) +
    buildParameterRow(
      "Potassium",
      "potassium",
      potassium,
    ) +
    buildParameterRow(
      "Organic Carbon",
      "organicCarbon",
      organicCarbon,
    ) +
    buildParameterRow(
      "Electrical Conductivity",
      "electricalConductivity",
      electricalConductivity,
    ) +
    "<div><strong>Overall Fertility:</strong> " +
    escapeHtml(String(overallFertility)) +
    "</div>" +
    '<div class="soil-sample-popup-section">' +
    "<strong>Sample Context</strong>" +
    "</div>" +
    "<div><strong>Soil Texture:</strong> " +
    escapeHtml(String(soilTexture)) +
    "</div>" +
    buildHistoricalContextHtml(
      historicalContext,
    ) +
    "</div>"
  );
}

// ============================================================
// MODULE LOAD
// ============================================================

console.log(
  "map-ui-spatial-analysis.js loaded successfully.",
);