// ============================================================
// public/js/map-ui-sample.js
// ============================================================
//
// Soil Analysis GIS
//
// Soil Sample Inspection & Popup UI
//
// ============================================================

"use strict";

// ============================================================
// THEMATIC INSPECTION
// ============================================================

function buildThematicInspection(sample) {
  if (
    !sample ||
    thematicMapParameter === "standard"
  ) {
    return "";
  }

  const report =
    getThematicReportForSample(
      sample.id,
    );

  const valueObject =
    getThematicValueObject(
      report,
      thematicMapParameter,
    );

  const classification =
    getThematicClassification(
      report,
      thematicMapParameter,
    );

  const parameterLabel =
    getThematicMapParameterLabel();

  const value =
    valueObject &&
    valueObject.value !== null &&
    valueObject.value !== undefined
      ? valueObject.value
      : "";

  const unit =
    valueObject &&
    valueObject.unit
      ? valueObject.unit
      : "";

  return (
    '<div class="soil-thematic-inspection">' +
    '<div class="soil-thematic-inspection-title">' +
    "Thematic Analysis" +
    "</div>" +
    '<div class="soil-thematic-inspection-row">' +
    "<strong>Parameter:</strong> " +
    escapeHtml(parameterLabel) +
    "</div>" +
    '<div class="soil-thematic-inspection-row">' +
    "<strong>Value:</strong> " +
    escapeHtml(String(value)) +
    " " +
    escapeHtml(String(unit)) +
    "</div>" +
    '<div class="soil-thematic-inspection-row">' +
    "<strong>Classification:</strong> " +
    '<span class="soil-thematic-inspection-classification">' +
    escapeHtml(
      classification ||
        "Unavailable",
    ) +
    "</span>" +
    "</div>" +
    "</div>"
  );
}

// ============================================================
// HISTORICAL CONTEXT LOADING
// ============================================================

function buildHistoricalContextPlaceholder(sample) {
  if (
    !sample ||
    !sample.id ||
    thematicMapParameter === "standard"
  ) {
    return "";
  }

  return (
    '<div id="historical-context-' +
    escapeHtml(String(sample.id)) +
    '" class="soil-sample-popup-historical-context">' +
    '<div class="soil-sample-popup-section">' +
    "<strong>Historical Context</strong>" +
    "</div>" +
    '<div class="spatial-analysis-status">' +
    "Loading historical context..." +
    "</div>" +
    "</div>"
  );
}

// ============================================================
// LOAD HISTORICAL CONTEXT INTO POPUP
// ============================================================

async function loadHistoricalContextIntoPopup(
  sample,
  popupElement,
  requestSequence,
  marker,
) {
  if (
    !sample ||
    !sample.id ||
    thematicMapParameter === "standard" ||
    !popupElement
  ) {
    return;
  }

  if (
    typeof buildHistoricalContextHtml !==
    "function"
  ) {
    console.warn(
      "buildHistoricalContextHtml() is not available.",
    );

    return;
  }

  const parameter =
    String(
      thematicMapParameter,
    );

  const params =
    new URLSearchParams();

  params.set(
    "sampleId",
    String(sample.id),
  );

  params.set(
    "parameter",
    parameter,
  );

  try {
    const response =
      await fetch(
        "/api/soil-analysis/historical-context?" +
          params.toString(),
      );

    const result =
      await response.json();

    if (
      marker &&
      Number(marker.historicalContextRequestSequence) !==
        Number(requestSequence)
    ) {
      return;
    }

    if (!response.ok) {
      throw new Error(
        result?.message ||
          "Historical context request failed.",
      );
    }

    const currentPopupElement =
      marker &&
      marker.getPopup &&
      marker.getPopup()
        ? marker.getPopup().getElement()
        : popupElement;

    if (!currentPopupElement) {
      return;
    }

    const currentContainer =
      currentPopupElement.querySelector(
        "#historical-context-" +
          String(sample.id),
      );

    if (!currentContainer) {
      return;
    }

    currentContainer.outerHTML =
      buildHistoricalContextHtml(
        result,
      );
  } catch (error) {
    if (
      marker &&
      Number(marker.historicalContextRequestSequence) !==
        Number(requestSequence)
    ) {
      return;
    }

    console.error(
      "Historical context request failed:",
      error,
    );

    const currentPopupElement =
      marker &&
      marker.getPopup &&
      marker.getPopup()
        ? marker.getPopup().getElement()
        : popupElement;

    if (!currentPopupElement) {
      return;
    }

    const currentContainer =
      currentPopupElement.querySelector(
        "#historical-context-" +
          String(sample.id),
      );

    if (!currentContainer) {
      return;
    }

    currentContainer.innerHTML =
      '<div class="soil-sample-popup-section">' +
      "<strong>Historical Context</strong>" +
      "</div>" +
      '<div class="spatial-analysis-status unavailable">' +
      escapeHtml(
        error.message ||
          "Historical context unavailable.",
      ) +
      "</div>";
  }
}

// ============================================================
// SAMPLE POPUP
// ============================================================

function buildSamplePopup(sample) {
  if (!sample) {
    return "No sample information available.";
  }

  const latitude =
    Number(sample.latitude);

  const longitude =
    Number(sample.longitude);

  const formattedLatitude =
    Number.isFinite(latitude)
      ? latitude.toFixed(5)
      : "";

  const formattedLongitude =
    Number.isFinite(longitude)
      ? longitude.toFixed(5)
      : "";

  const depthFrom =
    sample.depth_from_cm ??
    sample.depthFromCm ??
    "";

  const depthTo =
    sample.depth_to_cm ??
    sample.depthToCm ??
    "";

  const sampleCode =
    sample.sample_code ??
    sample.sampleCode ??
    `Sample ${sample.id ?? ""}`;

  const pH =
    sample.ph ??
    sample.pH ??
    "";

  const nitrogen =
    sample.nitrogen ??
    "";

  const phosphorus =
    sample.phosphorus ??
    "";

  const potassium =
    sample.potassium ??
    "";

  const organicCarbon =
    sample.organic_carbon ??
    sample.organicCarbon ??
    "";

  const electricalConductivity =
    sample.electrical_conductivity ??
    sample.electricalConductivity ??
    "";

  const texture =
    sample.texture ??
    sample.soil_texture ??
    "";

  return (
    '<div class="soil-sample-popup">' +
    '<div class="soil-sample-popup-title">' +
    escapeHtml(
      String(sampleCode),
    ) +
    "</div>" +
    "<div>" +
    "<strong>Location:</strong> " +
    escapeHtml(formattedLatitude) +
    ", " +
    escapeHtml(formattedLongitude) +
    "</div>" +
    "<div>" +
    "<strong>Depth:</strong> " +
    escapeHtml(
      String(depthFrom),
    ) +
    " - " +
    escapeHtml(
      String(depthTo),
    ) +
    " cm" +
    "</div>" +
    '<div class="soil-sample-popup-section">' +
    "<strong>Soil Properties</strong>" +
    "</div>" +
    "<div>" +
    "<strong>pH:</strong> " +
    escapeHtml(String(pH)) +
    "</div>" +
    "<div>" +
    "<strong>Nitrogen:</strong> " +
    escapeHtml(
      String(nitrogen),
    ) +
    " kg/ha" +
    "</div>" +
    "<div>" +
    "<strong>Phosphorus:</strong> " +
    escapeHtml(
      String(phosphorus),
    ) +
    " kg/ha" +
    "</div>" +
    "<div>" +
    "<strong>Potassium:</strong> " +
    escapeHtml(
      String(potassium),
    ) +
    " kg/ha" +
    "</div>" +
    "<div>" +
    "<strong>Organic Carbon:</strong> " +
    escapeHtml(
      String(organicCarbon),
    ) +
    " %" +
    "</div>" +
    "<div>" +
    "<strong>Electrical Conductivity:</strong> " +
    escapeHtml(
      String(electricalConductivity),
    ) +
    " dS/m" +
    "</div>" +
    "<div>" +
    "<strong>Texture:</strong> " +
    escapeHtml(
      String(texture),
    ) +
    "</div>" +
    buildThematicInspection(
      sample,
    ) +
    buildHistoricalContextPlaceholder(
      sample,
    ) +
    "</div>"
  );
}

console.log(
  "map-ui-sample.js loaded successfully.",
);
