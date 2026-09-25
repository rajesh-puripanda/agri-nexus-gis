// ============================================================
// public/js/map.js
// ============================================================
//
// Soil Analysis GIS
//
// Leaflet map management.
//
// Built on:
//   Phase 7.5  — Thematic Spatial Analysis & Statistical Summary
//   Phase 7.6.1 — Map UI HTML Extraction
//   Phase 7.7  — Map UI Refinement
//   Phase 8.1  — Interpolation Architecture & Backend Foundation
//   Phase 8.2  — IDW Interpolation Engine + Frontend Integration
//   Phase 8.3  — Interpolation REST API
//   Phase 8.4  — Leaflet Interpolation Surface
//   Phase 8.5  — Interpolation Controls & UI
//   Phase 8.6  — Dynamic Interpolation Legend
//
// IMPORTANT:
//
//   Scientific classification and interpolation calculations remain
//   entirely in the backend.
//
//   This file is responsible only for:
//
//     1. Leaflet map management
//     2. Soil sample markers
//     3. Direct map-based soil sample location selection
//     4. Thematic marker presentation
//     5. Thematic filtering
//     6. Descriptive sample statistics
//     7. Interpolation API communication
//     8. Interpolation surface presentation
//     9. Interpolation legend/status presentation
//    10. Interpolation visibility management
//    11. Interpolation presentation opacity
//
// ============================================================

"use strict";

// ============================================================
// GLOBAL MAP STATE
// ============================================================
let map = null;
let soilMarkers = [];
let selectedSoilSample = null;

// ============================================================
// SAMPLE LABEL STATE
// ============================================================
let sampleLabelsVisible = false;

// ============================================================
// DIRECT MAP SAMPLE ENTRY STATE
// ============================================================
let addSampleModeActive = false;
let addSampleButton = null;

// ============================================================
// THEMATIC MAP STATE
// ============================================================
let thematicMapParameter = "standard";
let thematicMapControl = null;
let thematicMapReports = new Map();
let thematicFilterCategory = null;
let thematicAnalysisStats = null;
let thematicAnalysisControl = null;
let thematicLegendControl = null;
let thematicLegendVisible = true;
// ============================================================
// INTERPOLATION STATE
// ============================================================
let interpolationConfiguration = null;
let interpolationResult = null;
let interpolationLayerGroup = null;
let interpolationLegendControl = null;
let interpolationControl = null;
let interpolationStatusControl = null;
let interpolationVisible = false;
let interpolationRequestInProgress = false;

// ------------------------------------------------------------
// Interpolation presentation opacity
// ------------------------------------------------------------
const DEFAULT_INTERPOLATION_OPACITY = 0.62;
let interpolationOpacity = DEFAULT_INTERPOLATION_OPACITY;

// ============================================================
// PHASE 10.2.5 — SPATIAL ANALYTICAL INSPECTION
// ============================================================
let spatialAnalysisPopup = null;
let spatialAnalysisRequestInProgress = false;
let spatialAnalysisRequestSequence = 0;

// ============================================================
// PHASE 10.6 — HISTORICAL GIS CONTEXT
// ============================================================
let historicalContextLayerGroup = null;


const SPATIAL_ANALYSIS_API_BASE = "/api/soil-analysis/spatial";

// ============================================================
// INTERPOLATION API
// ============================================================
const INTERPOLATION_API_BASE = "/api/soil-interpolation";

// ============================================================
// THEMATIC MAP PARAMETERS
// ============================================================
const THEMATIC_MAP_PARAMETERS = [
  { value: "standard", label: "Standard Sample View" },
  { value: "ph", label: "pH" },
  { value: "nitrogen", label: "Nitrogen" },
  { value: "phosphorus", label: "Phosphorus" },
  { value: "potassium", label: "Potassium" },
  { value: "organic_carbon", label: "Organic Carbon" },
  {
    value: "electrical_conductivity",
    label: "Electrical Conductivity",
  },
];

const DEFAULT_MAP_CENTER = [17.6868, 83.2185];
const DEFAULT_MAP_ZOOM = 12;

// ============================================================
// THEMATIC PRESENTATION CATEGORIES
// ============================================================
const THEMATIC_PRESENTATION_CATEGORIES = {
  high: {
    label: "High",
    symbol: "H",
    className: "thematic-high",
  },
  medium: {
    label: "Medium",
    symbol: "M",
    className: "thematic-medium",
  },
  low: {
    label: "Low",
    symbol: "L",
    className: "thematic-low",
  },
  warning: {
    label: "Warning",
    symbol: "!",
    className: "thematic-warning",
  },
  neutral: {
    label: "Neutral",
    symbol: "N",
    className: "thematic-neutral",
  },
  unavailable: {
    label: "Unavailable",
    symbol: "?",
    className: "thematic-unavailable",
  },
};

/* ============================================================
   GET MAP INSTANCE
   ============================================================ */

function getMap() {
  return map;
}

function initializeAnalyticalToolbarControls() {
  const mapParameterToggle =
    document.getElementById("mapParameterToggle");
  const mapParameterLegendToggle =
    document.getElementById(
      "mapParameterLegendToggle",
    );
  const spatialQueryToggle =
    document.getElementById("spatialQueryToggle");

  const thematicAnalysisToggle =
    document.getElementById("thematicAnalysisToggle");

  const spatialInterpolationToggle =
    document.getElementById("spatialInterpolationToggle");

  const fertilityZoningToggle =
    document.getElementById("fertilityZoningToggle");

  if (mapParameterToggle) {
    mapParameterToggle.addEventListener("click", () => {
      if (!thematicMapControl || !map) {
        return;
      }

      const container =
        thematicMapControl.getContainer();

      if (!container) {
        return;
      }

      const isVisible =
        container.style.display !== "none";

      container.style.display =
        isVisible ? "none" : "";

      mapParameterToggle.setAttribute(
        "aria-expanded",
        String(!isVisible),
      );
    });
  }

  if (mapParameterLegendToggle) {
    mapParameterLegendToggle.addEventListener("click", () => {
      if (!map || !thematicLegendControl) {
        return;
      }

      const container =
        thematicLegendControl.getContainer();

      if (!container) {
        return;
      }

      thematicLegendVisible =
        !thematicLegendVisible;

      container.style.display =
        thematicLegendVisible ? "" : "none";

      mapParameterLegendToggle.setAttribute(
        "aria-expanded",
        String(thematicLegendVisible),
      );
    });
  }

  if (spatialQueryToggle) {
    spatialQueryToggle.addEventListener("click", () => {
      if (
        typeof window.toggleSpatialQueryControl !==
        "function"
      ) {
        return;
      }

      const visible =
        window.toggleSpatialQueryControl();

      spatialQueryToggle.setAttribute(
        "aria-expanded",
        String(visible),
      );
    });
  }

  if (thematicAnalysisToggle) {
    thematicAnalysisToggle.addEventListener("click", () => {
      if (!map) {
        return;
      }

      if (thematicMapParameter === "standard") {
        thematicAnalysisToggle.setAttribute(
          "aria-expanded",
          "false",
        );

        return;
      }

      if (!thematicAnalysisControl) {
        initializeThematicAnalysisControl();
      }

      if (!thematicAnalysisControl) {
        return;
      }

      const container =
        thematicAnalysisControl.getContainer();

      if (!container) {
        return;
      }

      const isVisible =
        container.style.display !== "none";

      container.style.display =
        isVisible ? "none" : "";

      thematicAnalysisToggle.setAttribute(
        "aria-expanded",
        String(!isVisible),
      );
    });
  }

  if (spatialInterpolationToggle) {
    spatialInterpolationToggle.addEventListener("click", () => {
      if (!interpolationControl || !map) {
        return;
      }

      const container =
        interpolationControl.getContainer();

      if (!container) {
        return;
      }

      const isVisible =
        container.style.display !== "none";

      container.style.display =
        isVisible ? "none" : "";

      spatialInterpolationToggle.setAttribute(
        "aria-expanded",
        String(!isVisible),
      );
    });
  }

  if (fertilityZoningToggle) {
    fertilityZoningToggle.addEventListener("click", () => {
      if (
        typeof window.toggleFertilityZoningControl !==
        "function"
      ) {
        return;
      }

      const visible =
        window.toggleFertilityZoningControl();

      fertilityZoningToggle.setAttribute(
        "aria-expanded",
        String(visible),
      );
    });
  }
}

function hideInitialAnalyticalControls() {
  const controls = [
    thematicMapControl,
    spatialQueryControl,
    interpolationControl,
    fertilityZoningControl,
    thematicAnalysisControl,
    thematicLegendControl,
    interpolationLegendControl,
    fertilityZoningLegendControl,
  ];

  controls.forEach((control) => {
    if (!control) {
      return;
    }

    const container =
      control.getContainer();

    if (!container) {
      return;
    }

    container.style.display = "none";
  });

  thematicLegendVisible = false;

  const mapParameterToggle =
    document.getElementById(
      "mapParameterToggle",
    );

  if (mapParameterToggle) {
    mapParameterToggle.setAttribute(
      "aria-expanded",
      "false",
    );
  }

  const mapParameterLegendToggle =
    document.getElementById(
      "mapParameterLegendToggle",
    );

  if (mapParameterLegendToggle) {
    mapParameterLegendToggle.setAttribute(
      "aria-expanded",
      "false",
    );
  }

  const spatialQueryToggle =
    document.getElementById(
      "spatialQueryToggle",
    );

  if (spatialQueryToggle) {
    spatialQueryToggle.setAttribute(
      "aria-expanded",
      "false",
    );
  }

  const thematicAnalysisToggle =
    document.getElementById(
      "thematicAnalysisToggle",
    );

  if (thematicAnalysisToggle) {
    thematicAnalysisToggle.setAttribute(
      "aria-expanded",
      "false",
    );
  }

  const spatialInterpolationToggle =
    document.getElementById(
      "spatialInterpolationToggle",
    );

  if (spatialInterpolationToggle) {
    spatialInterpolationToggle.setAttribute(
      "aria-expanded",
      "false",
    );
  }

  const fertilityZoningToggle =
    document.getElementById(
      "fertilityZoningToggle",
    );

  if (fertilityZoningToggle) {
    fertilityZoningToggle.setAttribute(
      "aria-expanded",
      "false",
    );
  }
}

// ============================================================
// Cursor Coordinate Display
// ============================================================

function initializeCursorCoordinateControl() {
  if (!map) {
    return;
  }

  const CursorCoordinateControl =
    L.Control.extend({
      options: {
        position: "bottomleft",
      },

      onAdd: function () {
        const container =
          L.DomUtil.create(
            "div",
            "map-cursor-coordinate-control",
          );

        container.textContent =
          "Lat: --.------  |  Lng: --.------";

        return container;
      },
    });

  const cursorCoordinateControl =
    new CursorCoordinateControl();

  cursorCoordinateControl.addTo(map);

  const container =
    cursorCoordinateControl.getContainer();

  if (!container) {
    return;
  }

  map.on("mousemove", (event) => {
    if (
      !event ||
      !event.latlng
    ) {
      return;
    }

    const latitude =
      event.latlng.lat.toFixed(6);

    const longitude =
      event.latlng.lng.toFixed(6);

    container.textContent =
      `Lat: ${latitude}  |  Lng: ${longitude}`;
  });

  map.on("mouseout", () => {
    container.textContent =
      "Lat: --.------  |  Lng: --.------";
  });

  console.log(
    "Cursor coordinate control initialized.",
  );
}
// ============================================================
// INITIALIZE MAP
// ============================================================
function initializeMap() {
  console.log("");
  console.log("========================================");
  console.log("Initializing Soil Analysis GIS map...");
  console.log("========================================");

  if (typeof L === "undefined") {
    console.error("Leaflet library is not loaded.");
    showMapError(
      "Leaflet could not be loaded. Check your internet connection.",
    );
    return false;
  }

  const mapElement = document.getElementById("map");

  if (!mapElement) {
    console.error("Map container #map was not found.");
    return false;
  }

  if (map !== null) {
    console.warn("Leaflet map is already initialized.");
    return true;
  }

  try {
    map = L.map("map", {
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });
    historicalContextLayerGroup = L.layerGroup().addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    map.on("click", handleMapClick);

    initializeThematicMapControl();
    initializeInterpolationControl();
    initializeSampleLabelToggleControl();
    initializeAddSampleControl();
    initializeInterpolationStatusControl();
    initializeFertilityZoningControl();
    initializeCursorCoordinateControl();
    
    if (typeof window.initializeSpatialQuery === "function") {
      window.initializeSpatialQuery({ map });
    }
    initializeAnalyticalToolbarControls();
    hideInitialAnalyticalControls();
    clearMapError();

    setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 100);

    loadInterpolationConfiguration();
    loadFertilityZoningConfiguration();

    console.log("Leaflet map initialized successfully.");

    return true;
  } catch (error) {
    console.error("Leaflet initialization failed:", error);
    showMapError(`Map initialization failed: ${error.message}`);
    return false;
  }
}


// ============================================================
// DIRECT MAP SAMPLE ENTRY CONTROL
// ============================================================
//
// GIS WORKFLOW:
//
//   1. User clicks "Add Soil Sample"
//   2. Map enters add-sample mode
//   3. Cursor becomes crosshair
//   4. User clicks desired location
//   5. Latitude/longitude are captured
//   6. Existing app.js sample modal opens
//   7. Add mode exits
//
// ============================================================

function toggleAddSampleMode() {
  if (addSampleModeActive) {
    stopAddSampleMode();
    return false;
  }

  startAddSampleMode();
  return true;
}

function startAddSampleMode() {
  if (!map) {
    console.warn(
      "Cannot activate Add Soil Sample mode because the map is not initialized.",
    );
    return false;
  }

  addSampleModeActive = true;

  const mapContainer = map.getContainer();

  if (mapContainer) {
    mapContainer.classList.add("soil-map-add-sample-mode");
    mapContainer.style.cursor = "crosshair";
  }

  updateAddSampleControl();

  console.log(
    "Add Soil Sample mode activated. Click the map to select the sample location.",
  );

  return true;
}

/* ============================================================
   CHECK SAMPLE LABEL VISIBILITY
   ============================================================ */

function areSampleLabelsVisible() {
  return sampleLabelsVisible;
}

function stopAddSampleMode() {
  addSampleModeActive = false;

  if (map) {
    const mapContainer = map.getContainer();

    if (mapContainer) {
      mapContainer.classList.remove("soil-map-add-sample-mode");
      mapContainer.style.cursor = "";
    }
  }

  updateAddSampleControl();

  console.log("Add Soil Sample mode deactivated.");

  return true;
}

function updateAddSampleControl() {
  const button =
    addSampleButton || document.getElementById("addSoilSample");

  if (!button) {
    return;
  }

  if (addSampleModeActive) {
    button.title = "Cancel Add Soil Sample mode";
    button.setAttribute(
      "aria-label",
      "Cancel Add Soil Sample mode",
    );
    button.setAttribute("aria-pressed", "true");
    button.classList.add("active");
  } else {
    button.title = "Add Soil Sample";
    button.setAttribute(
      "aria-label",
      "Add soil sample by clicking on the map",
    );
    button.setAttribute("aria-pressed", "false");
    button.classList.remove("active");
  }
}

function isAddSampleModeActive() {
  return addSampleModeActive;
}

// ============================================================
// THEMATIC MAP CONTROL
// ============================================================
function initializeThematicMapControl() {
  if (!map) {
    return;
  }

  const ThematicControl = L.Control.extend({
    options: {
      position: "topleft",
    },

    onAdd: function () {
      const container = L.DomUtil.create(
        "div",
        "soil-map-control",
      );

      buildThematicMapParameterControl(
        container,
        THEMATIC_MAP_PARAMETERS,
        thematicMapParameter,
        (parameter) => {
          setThematicMapParameter(parameter);
        },
      );

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      return container;
    },
  });

  thematicMapControl = new ThematicControl();

  thematicMapControl.addTo(map);

  console.log(
    "Thematic map parameter control initialized.",
  );
}
// ============================================================
// THEMATIC PARAMETER API
// ============================================================
function setThematicMapParameter(parameter) {
  const valid = THEMATIC_MAP_PARAMETERS.some(
    (item) => item.value === parameter,
  );

thematicMapParameter =
  valid ? parameter : "standard";

thematicFilterCategory = null;

thematicLegendVisible =
  thematicMapParameter !== "standard";
  const mapParameterLegendToggle =
    document.getElementById(
      "mapParameterLegendToggle",
    );

  if (mapParameterLegendToggle) {
    mapParameterLegendToggle.setAttribute(
      "aria-expanded",
      String(thematicLegendVisible),
    );
  }
  const thematicAnalysisToggle =
    document.getElementById(
      "thematicAnalysisToggle",
    );

  if (thematicAnalysisToggle) {
    thematicAnalysisToggle.setAttribute(
      "aria-expanded",
      "false",
    );
  }

  const select = document.getElementById("soilMapParameter");

  if (select) {
    select.value = thematicMapParameter;
  }

  console.log(
    `Thematic map parameter selected: ${getThematicMapParameterLabel()}`,
  );

  applyThematicMarkerSymbology();
  applyThematicFilter();
  updateSampleMarkerLabels();
  updateThematicLegend();
  refreshOpenThematicInspection();
  updateThematicAnalysisPanel();

  return thematicMapParameter;
}

function getThematicMapParameter() {
  return thematicMapParameter;
}

function getThematicMapParameterLabel() {
  const parameter = THEMATIC_MAP_PARAMETERS.find(
    (item) => item.value === thematicMapParameter,
  );

  return parameter ? parameter.label : "Standard Sample View";
}

function resetThematicMapParameter() {
  return setThematicMapParameter("standard");
}

// ============================================================
// THEMATIC REPORT DATA
// ============================================================
function updateThematicMapData(reports) {
  thematicMapReports = new Map();

  if (!Array.isArray(reports)) {
    console.warn("updateThematicMapData() expected an array of reports.");

    applyThematicMarkerSymbology();
    applyThematicFilter();
    updateSampleMarkerLabels();
    updateThematicLegend();
    updateThematicAnalysisPanel();

    return false;
  }

  reports.forEach((report) => {
    if (!report || !report.sample) {
      return;
    }

    const sampleId = report.sample.id;

    if (sampleId === null || sampleId === undefined) {
      return;
    }

    thematicMapReports.set(String(sampleId), report);
  });

  console.log(
    `Thematic map data updated for ${thematicMapReports.size} soil sample(s).`,
  );

  applyThematicMarkerSymbology();
  applyThematicFilter();
  updateSampleMarkerLabels();
  updateThematicLegend();
  refreshOpenThematicInspection();
  updateThematicAnalysisPanel();

  return true;
}

function updateThematicMapReport(report) {
  if (!report || !report.sample) {
    return false;
  }

  const sampleId = report.sample.id;

  if (sampleId === null || sampleId === undefined) {
    return false;
  }

  thematicMapReports.set(String(sampleId), report);

  applyThematicMarkerSymbology();
  applyThematicFilter();
  updateSampleMarkerLabels();
  updateThematicLegend();
  refreshOpenThematicInspection();
  updateThematicAnalysisPanel();

  return true;
}

function getThematicReportForSample(sampleId) {
  if (sampleId === null || sampleId === undefined) {
    return null;
  }

  return thematicMapReports.get(String(sampleId)) || null;
}

// ============================================================
// THEMATIC VALUE / CLASSIFICATION HELPERS
// ============================================================
function getThematicValueObject(report, parameter) {
  if (!report || !report.analysis || !report.analysis.values) {
    return null;
  }

  const values = report.analysis.values;

  switch (parameter) {
    case "ph":
      return values.pH ?? null;
    case "nitrogen":
      return values.nitrogen ?? null;
    case "phosphorus":
      return values.phosphorus ?? null;
    case "potassium":
      return values.potassium ?? null;
    case "organic_carbon":
      return values.organicCarbon ?? null;
    case "electrical_conductivity":
      return values.electricalConductivity ?? null;
    default:
      return null;
  }
}

function getThematicClassification(report, parameter) {
  const valueObject = getThematicValueObject(report, parameter);

  if (!valueObject) {
    return null;
  }

  const classification = valueObject.classification;

  if (
    classification === null ||
    classification === undefined ||
    String(classification).trim() === ""
  ) {
    return null;
  }

  return String(classification).trim();
}

function getThematicPresentationCategory(classification) {
  if (!classification) {
    return "unavailable";
  }

  const normalized = String(classification).trim().toLowerCase();

  switch (normalized) {
    case "high":
    case "high fertility":
    case "good":
    case "good fertility":
    case "very high":
    case "very high fertility":
      return "high";

    case "medium":
    case "moderate":
    case "moderately fertile":
    case "medium fertility":
    case "moderate fertility":
    case "moderate / good":
    case "moderate/good":
      return "medium";

    case "low":
    case "low fertility":
    case "poor":
    case "poor fertility":
    case "very low":
    case "very low fertility":
      return "low";

    case "acidic":
    case "alkaline":
    case "saline":
    case "very slightly saline":
    case "moderately saline":
    case "strongly saline":
      return "warning";

    case "neutral":
    case "non-saline":
      return "neutral";

    default:
      return "unavailable";
  }
}

// ============================================================
// MARKER ICONS / SYMBOLOGY
// ============================================================
function createStandardMarkerIcon() {
  return new L.Icon.Default();
}

function createThematicMarkerIcon(category) {
  const presentation =
    THEMATIC_PRESENTATION_CATEGORIES[category] ||
    THEMATIC_PRESENTATION_CATEGORIES.unavailable;

  return L.divIcon({
    className: "",
    html:
      `<div class="soil-thematic-marker ${presentation.className}" ` +
      `title="${escapeHtml(presentation.label)}" ` +
      `aria-label="${escapeHtml(presentation.label)}">` +
      `${escapeHtml(presentation.symbol)}` +
      `</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function applyThematicMarkerSymbology() {
  if (!Array.isArray(soilMarkers)) {
    return;
  }

  soilMarkers.forEach((marker) => {
    if (!marker || !marker.soilSample) {
      return;
    }

    if (thematicMapParameter === "standard") {
      marker.setIcon(createStandardMarkerIcon());
      marker.thematicCategory = "standard";
      marker.thematicClassification = null;
      return;
    }

    const report = getThematicReportForSample(marker.soilSampleId);
    const classification = getThematicClassification(
      report,
      thematicMapParameter,
    );
    const category = getThematicPresentationCategory(classification);

    marker.setIcon(createThematicMarkerIcon(category));
    marker.thematicCategory = category;
    marker.thematicClassification = classification;
  });

  console.log(
    `Applied thematic marker symbology for ${getThematicMapParameterLabel()}.`,
  );
}

// ============================================================
// THEMATIC FILTERING
// ============================================================
function setThematicFilterCategory(category) {
  if (thematicMapParameter === "standard") {
    thematicFilterCategory = null;
    applyThematicFilter();
    updateThematicLegend();
    updateThematicAnalysisPanel();
    return null;
  }

  const validCategories = getLegendCategoriesForParameter();

  if (category === null || category === undefined || category === "") {
    thematicFilterCategory = null;
  } else if (validCategories.includes(category)) {
    thematicFilterCategory = category;
  } else {
    console.warn(`Invalid thematic filter category "${category}".`);
    return thematicFilterCategory;
  }

  applyThematicFilter();
  updateThematicLegend();
  updateSampleMarkerLabels();
  updateThematicAnalysisPanel();

  console.log(
    thematicFilterCategory
      ? `Thematic map filtered to ${THEMATIC_PRESENTATION_CATEGORIES[thematicFilterCategory].label}.`
      : "Thematic map filter cleared.",
  );

  return thematicFilterCategory;
}

function clearThematicFilter() {
  return setThematicFilterCategory(null);
}

function getThematicFilterCategory() {
  return thematicFilterCategory;
}

function applyThematicFilter() {
  if (!map || !Array.isArray(soilMarkers)) {
    return;
  }

  soilMarkers.forEach((marker) => {
    if (!marker) {
      return;
    }

    const shouldShow =
      thematicMapParameter === "standard" ||
      thematicFilterCategory === null ||
      marker.thematicCategory === thematicFilterCategory;

    if (shouldShow) {
      if (!map.hasLayer(marker)) {
        marker.addTo(map);
      }
    } else if (map.hasLayer(marker)) {
      map.removeLayer(marker);
    }
  });
}

// ============================================================
// THEMATIC LEGEND
// ============================================================

function updateThematicLegend() {
  if (!map) {
    return;
  }

  if (thematicMapParameter === "standard") {
    removeThematicLegend();
    return;
  }

  if (!thematicLegendControl) {
    thematicLegendControl = L.control({
      position: "bottomright",
    });

    thematicLegendControl.onAdd = function () {
      const container = L.DomUtil.create(
        "div",
        "soil-thematic-legend-control",
      );

      container.setAttribute(
        "aria-label",
        "Thematic map legend and filter",
      );

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      return container;
    };
  }

  if (thematicLegendControl._map !== map) {
    thematicLegendControl.addTo(map);
  }

  const container =
    thematicLegendControl.getContainer();

  if (!container) {
    console.warn(
      "Thematic legend container could not be created.",
    );
    return;
  }

  container.style.display =
    thematicLegendVisible ? "" : "none";

  const categories =
    getLegendCategoriesForParameter();

  const categoryCounts =
    getThematicCategoryCounts();

  const filterCategoryLabel =
    thematicFilterCategory &&
    THEMATIC_PRESENTATION_CATEGORIES[
      thematicFilterCategory
    ]
      ? THEMATIC_PRESENTATION_CATEGORIES[
          thematicFilterCategory
        ].label
      : "";

  buildThematicLegend(
    container,
    getThematicMapParameterLabel(),
    thematicFilterCategory,
    filterCategoryLabel,
    categories,
    categoryCounts,
    THEMATIC_PRESENTATION_CATEGORIES,
    (categoryName) => {
      if (
        thematicFilterCategory ===
        categoryName
      ) {
        clearThematicFilter();
      } else {
        setThematicFilterCategory(
          categoryName,
        );
      }
    },
    () => {
      clearThematicFilter();
    },
  );

  console.log(
    `Thematic legend updated for ${getThematicMapParameterLabel()}.`,
  );
}

function getLegendCategoriesForParameter() {
  switch (thematicMapParameter) {
    case "ph":
    case "electrical_conductivity":
      return ["warning", "neutral", "unavailable"];

    default:
      return ["high", "medium", "low", "unavailable"];
  }
}

function getThematicCategoryCounts() {
  const counts = {};

  if (!Array.isArray(soilMarkers)) {
    return counts;
  }

  soilMarkers.forEach((marker) => {
    if (!marker) {
      return;
    }

    const category = marker.thematicCategory;

    if (!category || category === "standard") {
      return;
    }

    counts[category] = (counts[category] || 0) + 1;
  });

  return counts;
}

function removeThematicLegend() {
  if (!map || !thematicLegendControl) {
    return;
  }

  thematicLegendVisible = false;

  if (thematicLegendControl._map === map) {
    map.removeControl(thematicLegendControl);
  }

  const mapParameterLegendToggle =
    document.getElementById(
      "mapParameterLegendToggle",
    );

  if (mapParameterLegendToggle) {
    mapParameterLegendToggle.setAttribute(
      "aria-expanded",
      "false",
    );
  }
}

// ============================================================
// THEMATIC INSPECTION
// ============================================================
async function refreshMarkerPopup(marker) {
  if (!marker || !marker.soilSample) {
    return;
  }

  if (typeof buildSamplePopup !== "function") {
    return;
  }

  // ----------------------------------------------------------
  // Rebuild the normal soil-sample popup.
  //
  // Standard view contains no historical context.
  // Analytical views contain the historical loading placeholder.
  // ----------------------------------------------------------
  marker.setPopupContent(
    buildSamplePopup(marker.soilSample),
  );

  // ----------------------------------------------------------
  // Historical Context is required only for an analytical
  // thematic parameter.
  // ----------------------------------------------------------
  if (thematicMapParameter === "standard") {
    return;
  }

  if (typeof loadHistoricalContextIntoPopup !== "function") {
    console.warn(
      "loadHistoricalContextIntoPopup() is not available.",
    );

    return;
  }

  // ----------------------------------------------------------
  // The popup must currently have a DOM element.
  // ----------------------------------------------------------
  const popup = marker.getPopup();

  if (!popup) {
    return;
  }

  const popupElement = popup.getElement();

  if (!popupElement) {
    return;
  }

  // ----------------------------------------------------------
  // Start a new historical-context request sequence.
  //
  // The sequence is maintained on the marker so that each
  // popup refresh gets a unique request generation.
  // ----------------------------------------------------------
  marker.historicalContextRequestSequence =
    Number(
      marker.historicalContextRequestSequence || 0,
    ) + 1;

  await loadHistoricalContextIntoPopup(
    marker.soilSample,
    popupElement,
    marker.historicalContextRequestSequence,
    marker,
  );
}

function refreshOpenThematicInspection() {
  if (!Array.isArray(soilMarkers)) {
    return;
  }

  soilMarkers.forEach((marker) => {
    refreshMarkerPopup(marker);
  });
}

// ============================================================
// THEMATIC SPATIAL ANALYSIS
// ============================================================
function getThematicStatisticUnit(parameter) {
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

function getNumericThematicValue(report, parameter) {
  const valueObject = getThematicValueObject(report, parameter);

  if (!valueObject) {
    return null;
  }

  const candidates = [
    valueObject.value,
    valueObject.result,
    valueObject.measurement,
  ];

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") {
      continue;
    }

    const numeric = Number(candidate);

    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return null;
}

function formatThematicStatisticValue(value, parameter) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(2)} ${getThematicStatisticUnit(parameter)}`.trim();
}

function getThematicReportCategory(report, parameter) {
  return getThematicPresentationCategory(
    getThematicClassification(report, parameter),
  );
}

function getThematicAnalysisReports() {
  const reports = Array.from(thematicMapReports.values());

  if (thematicMapParameter === "standard") {
    return [];
  }

  if (!thematicFilterCategory) {
    return reports;
  }

  return reports.filter(
    (report) =>
      getThematicReportCategory(report, thematicMapParameter) ===
      thematicFilterCategory,
  );
}

function calculateThematicAnalysisStats() {
  if (thematicMapParameter === "standard") {
    return null;
  }

  const reports = getThematicAnalysisReports();
  const categoryCounts = {};
  const numericValues = [];

  reports.forEach((report) => {
    const category = getThematicReportCategory(
      report,
      thematicMapParameter,
    );

    if (category) {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }

    const numericValue = getNumericThematicValue(
      report,
      thematicMapParameter,
    );

    if (numericValue !== null) {
      numericValues.push(numericValue);
    }
  });

  const average = numericValues.length
    ? numericValues.reduce((sum, value) => sum + value, 0) /
      numericValues.length
    : null;

  return {
    parameter: thematicMapParameter,
    parameterLabel: getThematicMapParameterLabel(),
    filterCategory: thematicFilterCategory,
    sampleCount: reports.length,
    measuredSampleCount: numericValues.length,
    average,
    minimum: numericValues.length ? Math.min(...numericValues) : null,
    maximum: numericValues.length ? Math.max(...numericValues) : null,
    categoryCounts,
  };
}

function getThematicAnalysisStats() {
  return thematicAnalysisStats;
}

// ============================================================
// MOVABLE ANALYTICAL CONTROL SUPPORT
// ============================================================

function enableMovableAnalyticalControl(container, moveButton) {
  if (!container || !moveButton) {
    return;
  }

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  const stopDragging = () => {
    if (!dragging) {
      return;
    }

    dragging = false;
    container.classList.remove("is-dragging");
    moveButton.classList.remove("is-active");

    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", stopDragging);

    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", stopDragging);
  };

  const onMouseMove = (event) => {
    if (!dragging) {
      return;
    }

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    container.style.left = `${startLeft + deltaX}px`;
    container.style.top = `${startTop + deltaY}px`;
    container.style.right = "auto";
  };

  const onTouchMove = (event) => {
    if (!dragging || !event.touches.length) {
      return;
    }

    const touch = event.touches[0];

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    container.style.left = `${startLeft + deltaX}px`;
    container.style.top = `${startTop + deltaY}px`;
    container.style.right = "auto";

    event.preventDefault();
  };

  const startDragging = (clientX, clientY, event) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = container.getBoundingClientRect();

    dragging = true;
    startX = clientX;
    startY = clientY;
    startLeft = rect.left;
    startTop = rect.top;

    container.style.position = "fixed";
    container.style.left = `${rect.left}px`;
    container.style.top = `${rect.top}px`;
    container.style.right = "auto";
    container.style.margin = "0";
    container.style.zIndex = "1300";

    container.classList.add("is-dragging");
    moveButton.classList.add("is-active");

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", stopDragging);

    document.addEventListener("touchmove", onTouchMove, {
      passive: false,
    });

    document.addEventListener("touchend", stopDragging);
  };

  moveButton.addEventListener("mousedown", (event) => {
    startDragging(event.clientX, event.clientY, event);
  });

  moveButton.addEventListener("touchstart", (event) => {
    if (!event.touches.length) {
      return;
    }

    const touch = event.touches[0];

    startDragging(touch.clientX, touch.clientY, event);
  });

  moveButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
}

window.enableMovableAnalyticalControl =
  enableMovableAnalyticalControl;

function initializeThematicAnalysisControl() {
  if (!map || thematicAnalysisControl) {
    return thematicAnalysisControl;
  }

  thematicAnalysisControl = L.control({
    position: "topright",
  });

  thematicAnalysisControl.onAdd = function () {
    const container = L.DomUtil.create(
      "div",
      "soil-thematic-analysis-control",
    );

    container.setAttribute(
      "aria-label",
      "Thematic spatial analysis summary",
    );

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    return container;
  };

  thematicAnalysisControl.addTo(map);

  return thematicAnalysisControl;
}

function removeThematicAnalysisControl() {
  if (!map || !thematicAnalysisControl) {
    return;
  }

  map.removeControl(thematicAnalysisControl);
  thematicAnalysisControl = null;
}

function updateThematicAnalysisPanel() {
  if (!map) {
    return;
  }

  if (thematicMapParameter === "standard") {
    thematicAnalysisStats = null;
    removeThematicAnalysisControl();
    return;
  }

  initializeThematicAnalysisControl();

  if (!thematicAnalysisControl) {
    return;
  }

  const container = thematicAnalysisControl.getContainer();

  if (!container) {
    return;
  }

  thematicAnalysisStats = calculateThematicAnalysisStats();

  buildThematicAnalysis(
    container,
    thematicAnalysisStats,
    thematicMapParameter,
    THEMATIC_PRESENTATION_CATEGORIES,
    getLegendCategoriesForParameter(),
    formatThematicStatisticValue,
  );
}

function refreshThematicAnalysis() {
  updateThematicAnalysisPanel();
  return thematicAnalysisStats;
}

// ============================================================
// SAMPLE LABEL CONTROL
// ============================================================
function initializeSampleLabelToggleControl() {
  const button = document.getElementById("soilSampleLabelToggle");

  if (!button) {
    console.warn("Soil sample label toggle button was not found.");
    return;
  }

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleSampleLabels();
  });

  updateSampleLabelToggleButton(button);

  console.log("External sample label toggle control initialized.");
}

function initializeAddSampleControl() {
  const button = document.getElementById("addSoilSample");

  if (!button) {
    console.warn("Add soil sample button was not found.");
    return;
  }

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleAddSampleMode();
  });

  addSampleButton = button;
  updateAddSampleControl();

  console.log("Direct map soil sample control initialized.");
}

function toggleSampleLabels() {
  sampleLabelsVisible = !sampleLabelsVisible;

  updateSampleMarkerLabels();
  updateSampleLabelToggleButton();

  console.log(
    `Soil sample labels ${
      sampleLabelsVisible ? "enabled" : "disabled"
    }.`,
  );

  return sampleLabelsVisible;
}

function setSampleLabelsVisible(visible) {
  sampleLabelsVisible = Boolean(visible);
  window.areSampleLabelsVisible = areSampleLabelsVisible;

  updateSampleMarkerLabels();
  updateSampleLabelToggleButton();

  console.log(
    `Soil sample labels ${
      sampleLabelsVisible ? "enabled" : "disabled"
    }.`,
  );

  return sampleLabelsVisible;
}

function updateSampleLabelToggleButton(button) {
  const targetButton =
    button || document.getElementById("soilSampleLabelToggle");

  if (!targetButton) {
    return;
  }

  targetButton.title = sampleLabelsVisible
    ? "Hide Soil Labels"
    : "Show Soil Labels";

  targetButton.setAttribute(
    "aria-label",
    sampleLabelsVisible
      ? "Hide Soil Labels"
      : "Show Soil Labels",
  );

  targetButton.setAttribute(
    "aria-pressed",
    sampleLabelsVisible ? "true" : "false",
  );

  targetButton.classList.toggle(
    "is-active",
    sampleLabelsVisible,
  );
}

// ============================================================
// SAMPLE LABEL
// ============================================================
function buildSampleLabel(sample) {
  if (!sample) {
    return "Unnamed Sample";
  }

  return escapeHtml(sample.sample_code ?? sample.id ?? "Unnamed Sample");
}

function bindSampleMarkerLabel(marker) {
  if (!marker || !marker.soilSample) {
    return;
  }

  const label = buildSampleLabel(marker.soilSample);
  const existingTooltip = marker.getTooltip();

  if (existingTooltip) {
    existingTooltip.setContent(label);
    existingTooltip.options.permanent = sampleLabelsVisible;

    if (!sampleLabelsVisible) {
      marker.closeTooltip();
      return;
    }

    if (map && map.hasLayer(marker)) {
      marker.openTooltip();
    }

    return;
  }

  marker.bindTooltip(label, {
    permanent: sampleLabelsVisible,
    direction: "top",
    offset: [0, -8],
    opacity: 0.95,
    className: "soil-sample-label",
    interactive: false,
    sticky: false,
  });

  if (sampleLabelsVisible && map && map.hasLayer(marker)) {
    marker.openTooltip();
  }
}

function updateSampleMarkerLabels() {
  if (!Array.isArray(soilMarkers)) {
    return;
  }

  soilMarkers.forEach((marker) => {
    bindSampleMarkerLabel(marker);
  });
}

function restoreSampleMarkerLabel(marker) {
  if (
    !marker ||
    !marker.soilSample ||
    !sampleLabelsVisible ||
    !map ||
    !map.hasLayer(marker)
  ) {
    return;
  }

  bindSampleMarkerLabel(marker);

  setTimeout(() => {
    if (sampleLabelsVisible && map && map.hasLayer(marker)) {
      bindSampleMarkerLabel(marker);
    }
  }, 0);

  setTimeout(() => {
    if (sampleLabelsVisible && map && map.hasLayer(marker)) {
      bindSampleMarkerLabel(marker);
    }
  }, 100);
}

/* ============================================================
   CLEAR SOIL SAMPLE MARKERS
   ============================================================ */

function clearSoilSampleMarkers() {
  clearMarkers();
  selectedSoilSample = null;

  console.log("Existing soil sample markers cleared.");
}

/* ============================================================
   GET SOIL SAMPLE MARKERS
   ============================================================ */

function getSoilSampleMarkers() {
  return soilMarkers;
}

// ============================================================
// RENDER / MARKERS
// ============================================================
function renderSoilSamples(samples) {
  if (typeof window.clearSpatialQueryResults === "function") {
    window.clearSpatialQueryResults();
  }

  console.log("");
  console.log("========================================");
  console.log("Rendering soil samples on map...");
  console.log("========================================");

  if (!map) {
    console.error(
      "Cannot render soil samples because the Leaflet map has not been initialized.",
    );
    return false;
  }

  if (!Array.isArray(samples)) {
    console.warn("renderSoilSamples() expected an array of samples.");
    samples = [];
  }

  // ----------------------------------------------------------
  // Invalidate existing interpolation when source samples change.
  // ----------------------------------------------------------
  if (interpolationResult) {
    clearInterpolationLayerOnly();
    interpolationResult = null;
    removeInterpolationLegend();

    setInterpolationStatus(
      "idle",
      "Source samples changed. Regenerate the interpolation surface.",
    );

    updateInterpolationVisibilityControl(false);

    console.log(
      "Existing interpolation surface invalidated because soil samples were reloaded.",
    );
  }

  // ----------------------------------------------------------
  // Invalidate existing fertility zoning when source samples change.
  // ----------------------------------------------------------
  if (fertilityZoningResult) {
    clearFertilityZoningLayerOnly();
    fertilityZoningResult = null;
    removeFertilityZoningLegend();

    updateFertilityZoningVisibility(false, false);

    setFertilityZoningStatus(
      "idle",
      "Source samples changed. Regenerate the fertility zoning surface.",
    );

    console.log(
      "Existing fertility zoning surface invalidated because soil samples were reloaded.",
    );
  }

  clearMarkers();
  thematicFilterCategory = null;

  let renderedCount = 0;

  samples.forEach((sample) => {
    if (addSampleMarker(sample)) {
      renderedCount++;
    }
  });

  applyThematicMarkerSymbology();
  applyThematicFilter();
  updateSampleMarkerLabels();
  updateThematicLegend();
  updateThematicAnalysisPanel();

  if (renderedCount > 0) {
    fitMapToSamples(samples);
  } else {
    map.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
  }

  setTimeout(() => {
    if (map) {
      map.invalidateSize();
    }
  }, 100);

  console.log(
    `Rendered ${renderedCount} of ${samples.length} soil sample(s) on map.`,
  );

  return true;
}

// ============================================================
// PHASE 10.6 — HISTORICAL GIS CONTEXT
// ============================================================

function ensureHistoricalContextLayerGroup() {
  if (!map) {
    return null;
  }

  if (!historicalContextLayerGroup) {
    historicalContextLayerGroup = L.layerGroup();
  }

  return historicalContextLayerGroup;
}

function clearHistoricalContextLayer() {
  const layerGroup = ensureHistoricalContextLayerGroup();

  if (!layerGroup) {
    return;
  }

  layerGroup.clearLayers();

  if (!map.hasLayer(layerGroup)) {
    layerGroup.addTo(map);
  }
}

// ============================================================
// PHASE 10.6 — HISTORICAL GIS CONTEXT
// ============================================================

function ensureHistoricalContextLayerGroup() {
  if (!map) {
    return null;
  }

  if (!historicalContextLayerGroup) {
    historicalContextLayerGroup = L.layerGroup();
  }

  return historicalContextLayerGroup;
}

function clearHistoricalContextLayer() {
  const layerGroup = ensureHistoricalContextLayerGroup();

  if (!layerGroup) {
    return;
  }

  layerGroup.clearLayers();

  if (!map.hasLayer(layerGroup)) {
    layerGroup.addTo(map);
  }
}

function renderHistoricalContextLayer(
  historicalContext,
  queryLatitude,
  queryLongitude,
) {
  const layerGroup = ensureHistoricalContextLayerGroup();

  if (!layerGroup) {
    return false;
  }

  layerGroup.clearLayers();

  if (!historicalContext) {
    return false;
  }

  if (historicalContext.status !== "available") {
    return false;
  }

  const currentSample =
    historicalContext.currentSample;

  const candidate =
    historicalContext.candidate;

  const historicalSite =
    candidate?.site;

  if (
    !currentSample ||
    !historicalSite ||
    !Number.isFinite(Number(queryLatitude)) ||
    !Number.isFinite(Number(queryLongitude)) ||
    !Number.isFinite(Number(historicalSite.latitude)) ||
    !Number.isFinite(Number(historicalSite.longitude))
  ) {
    console.warn(
      "Historical GIS context is available but contains invalid coordinates.",
    );

    return false;
  }

  const currentLatitude =
    Number(queryLatitude);

  const currentLongitude =
    Number(queryLongitude);

  const historicalLatitude =
    Number(historicalSite.latitude);

  const historicalLongitude =
    Number(historicalSite.longitude);

  const dataset =
    candidate.dataset || {};

  const distance =
    candidate.distance || {};

  // ----------------------------------------------------------
  // Spatial Analysis Location
  // ----------------------------------------------------------
  const currentMarker = L.circleMarker(
    [currentLatitude, currentLongitude],
    {
      radius: 8,
      weight: 3,
      fillOpacity: 0.85,
    },
  );

  currentMarker.bindPopup(`
    <div class="historical-context-popup">
      <strong>Spatial Analysis Location</strong><br>
      Location:
      ${escapeHtml(
        `${currentLatitude.toFixed(5)}, ${currentLongitude.toFixed(5)}`,
      )}<br>
      Nearest Current Sample:
      ${escapeHtml(
        currentSample.sampleCode || "Unavailable",
      )}<br>
      Depth:
      ${escapeHtml(
        `${currentSample.depth?.fromCm ?? "?"}–${currentSample.depth?.toCm ?? "?"} cm`,
      )}
    </div>
  `);

  // ----------------------------------------------------------
  // Historical Reference Site
  // ----------------------------------------------------------
  const historicalMarker = L.circleMarker(
    [historicalLatitude, historicalLongitude],
    {
      radius: 9,
      weight: 3,
      fillOpacity: 0.85,
    },
  );

  historicalMarker.bindPopup(`
    <div class="historical-context-popup">
      <strong>Historical Reference Site</strong><br>
      Dataset:
      ${escapeHtml(
        dataset.code || "Unavailable",
      )}<br>
      Site:
      ${escapeHtml(
        historicalSite.mandal || "Unavailable",
      )}
      ${
        historicalSite.siteNo != null
          ? ` — Site ${escapeHtml(
              String(historicalSite.siteNo),
            )}`
          : ""
      }<br>
      Distance:
      ${escapeHtml(
        `${distance.value ?? "Unavailable"} ${distance.unit || ""}`,
      )}<br>
      Parameter:
      ${escapeHtml(
        historicalContext.parameter?.label ||
          historicalContext.parameter?.key ||
          "Unavailable",
      )}
    </div>
  `);

  // ----------------------------------------------------------
  // Spatial relationship
  //
  // This line represents the relationship between the
  // analytical query location and the historical reference
  // site. It does NOT represent historical interpolation.
  // ----------------------------------------------------------
  const relationshipLine = L.polyline(
    [
      [currentLatitude, currentLongitude],
      [historicalLatitude, historicalLongitude],
    ],
    {
      weight: 2,
      dashArray: "8, 8",
      opacity: 0.8,
    },
  );

  layerGroup.addLayer(currentMarker);
  layerGroup.addLayer(historicalMarker);
  layerGroup.addLayer(relationshipLine);

  if (!map.hasLayer(layerGroup)) {
    layerGroup.addTo(map);
  }

  return true;
}
// ============================================================
// PHASE 10.2.5 — SPATIAL ANALYTICAL QUERY
// ============================================================
async function querySpatialAnalysis(latitude, longitude) {
  if (!map) {
    return false;
  }

  if (spatialAnalysisRequestInProgress) {
    console.warn("A spatial analytical request is already in progress.");
    return false;
  }

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    console.warn("Spatial analytical query received invalid coordinates.");
    return false;
  }

  spatialAnalysisRequestInProgress = true;
  clearHistoricalContextLayer();

  const requestSequence = ++spatialAnalysisRequestSequence;

  const popup = L.popup({
    closeButton: true,
    autoClose: true,
    closeOnClick: true,
    maxWidth: 360,
  })
    .setLatLng([latitude, longitude])
    .setContent(
      typeof buildSpatialAnalysisLoadingPopup === "function"
        ? buildSpatialAnalysisLoadingPopup(latitude, longitude)
        : "Loading spatial analytical result...",
    );

  spatialAnalysisPopup = popup;
  popup.openOn(map);

  console.log(`Querying spatial analysis at ${latitude}, ${longitude}.`);

  try {
    const selectedParameter = getThematicMapParameter();

    const query = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
    });

    if (selectedParameter && selectedParameter !== "standard") {
      query.set("parameter", selectedParameter);
    }

    const response = await fetch(
      `${SPATIAL_ANALYSIS_API_BASE}?${query.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    let data = null;

    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error(
        `Spatial analysis API returned an invalid response (${response.status}).`,
      );
    }

    if (!response.ok || !data.success) {
      const message =
        data && data.message
          ? data.message
          : "Spatial analytical query failed.";

      const validationText =
        data && Array.isArray(data.errors) && data.errors.length > 0
          ? ` ${data.errors.join(" ")}`
          : "";

      throw new Error(`${message}${validationText}`);
    }

    if (requestSequence !== spatialAnalysisRequestSequence) {
      return false;
    }

    if (
      spatialAnalysisPopup &&
      spatialAnalysisPopup.isOpen &&
      typeof buildSpatialAnalysisPopup === "function"
    ) {
      spatialAnalysisPopup.setContent(buildSpatialAnalysisPopup(data));
    }
    renderHistoricalContextLayer(
      data.historicalContext,
      latitude,
      longitude,
    );
    console.log("Spatial analytical result received successfully.", data);

    return true;
  } catch (error) {
    if (requestSequence !== spatialAnalysisRequestSequence) {
      return false;
    }

    console.error("Spatial analytical query failed:", error);

    if (
      spatialAnalysisPopup &&
      spatialAnalysisPopup.isOpen &&
      typeof buildSpatialAnalysisErrorPopup === "function"
    ) {
      spatialAnalysisPopup.setContent(
        buildSpatialAnalysisErrorPopup(
          latitude,
          longitude,
          error.message,
        ),
      );
    }

    return false;
  } finally {
    if (requestSequence === spatialAnalysisRequestSequence) {
      spatialAnalysisRequestInProgress = false;
    }
  }
}

// ============================================================
// MAP CLICK HANDLER
// ============================================================
function handleMapClick(event) {
  if (!event || !event.latlng) {
    return;
  }

  if (
    typeof window.isSpatialQueryMapInteractionActive ===
      "function" &&
    window.isSpatialQueryMapInteractionActive()
  ) {
    return;
  }

  if (
    typeof window.consumeSpatialQueryIgnoredMapClick ===
      "function" &&
    window.consumeSpatialQueryIgnoredMapClick()
  ) {
    return;
  }

  const latitude = Number(event.latlng.lat);
  const longitude = Number(event.latlng.lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    console.warn("Map click returned invalid coordinates.");
    return;
  }

  console.log(`Map clicked at ${latitude}, ${longitude}.`);

  if (addSampleModeActive) {
    console.log(
      `Add Soil Sample location selected: ${latitude}, ${longitude}`,
    );

    if (typeof openAddSampleForm === "function") {
      openAddSampleForm(latitude, longitude);
    } else {
      console.error("openAddSampleForm() is not available in app.js.");
    }

    return;
  }

  querySpatialAnalysis(latitude, longitude);
}

// ============================================================
// ADD SAMPLE MARKER
// ============================================================
function addSampleMarker(sample) {
  if (!sample) {
    console.warn("Skipping empty soil sample.");
    return null;
  }

  const latitude = Number(sample.latitude);
  const longitude = Number(sample.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    console.warn("Invalid coordinates for soil sample:", sample);
    return null;
  }

  if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    console.warn("Coordinates outside valid geographic range:", sample);
    return null;
  }

  const marker = L.marker([latitude, longitude], {
    icon: createStandardMarkerIcon(),
  }).addTo(map);

  marker.soilSample = sample;
  marker.soilSampleId = sample.id;
  marker.thematicCategory = "standard";
  marker.thematicClassification = null;

  marker.bindPopup(buildSamplePopup(sample));
  bindSampleMarkerLabel(marker);

  marker.on("click", () => {
    handleSampleMarkerClick(sample);
    restoreSampleMarkerLabel(marker);
  });

  marker.on("popupopen", () => {
    refreshMarkerPopup(marker);
    restoreSampleMarkerLabel(marker);
  });

  marker.on("popupclose", () => restoreSampleMarkerLabel(marker));

  marker.on("tooltipclose", () => {
    if (sampleLabelsVisible) {
      restoreSampleMarkerLabel(marker);
    }
  });

  soilMarkers.push(marker);

  console.log(
    `Added marker for sample ${
      sample.sample_code ?? sample.id
    } at ${latitude}, ${longitude}.`,
  );

  return marker;
}

/* ============================================================
   SELECTED SOIL SAMPLE
   ============================================================ */

function getSelectedSoilSample() {
  return selectedSoilSample;
}

function setSelectedSoilSample(sample) {
  selectedSoilSample = sample || null;
  return selectedSoilSample;
}

function handleSampleMarkerClick(sample) {
  if (!sample) {
    return;
  }

  console.log(
    "Soil sample marker selected:",
    sample.sample_code ?? sample.id,
  );

  if (typeof window.handleSoilSampleSelected === "function") {
    try {
      window.handleSoilSampleSelected(sample);
    } catch (error) {
      console.error("Soil sample selection callback failed:", error);
    }
  }
}

function fitMapToSamples(samples) {
  if (!map || !Array.isArray(samples) || samples.length === 0) {
    return;
  }

  const bounds = L.latLngBounds([]);
  let validCoordinateCount = 0;

  samples.forEach((sample) => {
    const latitude = Number(sample.latitude);
    const longitude = Number(sample.longitude);

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      bounds.extend([latitude, longitude]);
      validCoordinateCount++;
    }
  });

  if (validCoordinateCount === 0 || !bounds.isValid()) {
    console.warn("No valid coordinates available for map fitting.");
    return;
  }

  if (validCoordinateCount === 1) {
    map.setView(bounds.getCenter(), 15);
    return;
  }

  map.fitBounds(bounds, {
    padding: [30, 30],
    maxZoom: 16,
  });
}

function clearMarkers() {
  if (!map) {
    soilMarkers = [];
    return;
  }

  soilMarkers.forEach((marker) => {
    if (map.hasLayer(marker)) {
      map.removeLayer(marker);
    }
  });

  soilMarkers = [];
  thematicFilterCategory = null;
  thematicAnalysisStats = null;

  console.log("Existing soil sample markers cleared.");

  updateThematicLegend();
  updateThematicAnalysisPanel();
}

function getSampleMarker(sampleId) {
  if (!Array.isArray(soilMarkers)) {
    return null;
  }

  return (
    soilMarkers.find(
      (marker) => String(marker.soilSampleId) === String(sampleId),
    ) || null
  );
}

function focusSampleMarker(sampleId) {
  if (!map) {
    console.warn("Cannot focus sample marker because map is not initialized.");
    return false;
  }

  const marker = getSampleMarker(sampleId);

  if (!marker) {
    console.warn(`Map marker for soil sample ${sampleId} was not found.`);
    return false;
  }

  if (!map.hasLayer(marker) && thematicFilterCategory !== null) {
    clearThematicFilter();
  }

  const position = marker.getLatLng();

  map.setView(position, 17, {
    animate: true,
  });

  marker.openPopup();
  restoreSampleMarkerLabel(marker);

  console.log(`Focused map on soil sample ${sampleId}.`);

  return true;
}

function refreshMapSize() {
  if (!map) {
    return;
  }

  setTimeout(() => {
    if (map) {
      map.invalidateSize();
    }
  }, 100);
}

// ============================================================
// INTERPOLATION
// ============================================================
async function loadInterpolationConfiguration() {
  try {
    console.log("Loading interpolation configuration...");

    const response = await fetch(`${INTERPOLATION_API_BASE}/config`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Failed to load interpolation configuration.",
      );
    }

    interpolationConfiguration = data;

    console.log(
      "Interpolation configuration loaded successfully.",
      interpolationConfiguration,
    );

    updateInterpolationControlFromConfiguration(
      interpolationConfiguration,
    );

    return interpolationConfiguration;
  } catch (error) {
    console.error("Failed to load interpolation configuration:", error);

    setInterpolationStatus(
      "error",
      "Interpolation configuration could not be loaded.",
    );

    return null;
  }
}

function initializeInterpolationControl() {
  if (!map) {
    return;
  }

  interpolationControl = L.control({
    position: "topleft",
  });

  interpolationControl.onAdd = function () {
    const container = L.DomUtil.create(
      "div",
      "soil-interpolation-control",
    );

    container.setAttribute(
      "aria-label",
      "Soil interpolation controls",
    );

    if (typeof buildInterpolationControl === "function") {
      buildInterpolationControl(container, interpolationConfiguration, {
        onGenerate: generateInterpolationSurface,
        onClear: clearInterpolationSurface,
      });
    }

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    return container;
  };

  interpolationControl.addTo(map);

  console.log("Interpolation control initialized.");
}

function getInterpolationStatusContainer() {
  if (!interpolationControl) {
    return null;
  }

  const container = interpolationControl.getContainer();

  if (!container) {
    return null;
  }

  let statusContainer = container.querySelector(
    ".soil-interpolation-status-control",
  );

  if (!statusContainer) {
    statusContainer = document.createElement("div");
    statusContainer.className = "soil-interpolation-status-control";
    statusContainer.setAttribute("aria-label", "Interpolation status");

    container.appendChild(statusContainer);

    L.DomEvent.disableClickPropagation(statusContainer);
    L.DomEvent.disableScrollPropagation(statusContainer);
  }

  return statusContainer;
}

function initializeInterpolationStatusControl() {
  if (!map || !interpolationControl) {
    return null;
  }

  const statusContainer = getInterpolationStatusContainer();

  if (!statusContainer) {
    return null;
  }

  interpolationStatusControl = {
    getContainer: () => statusContainer,
  };

  setInterpolationStatus("idle", "Interpolation ready.");

  return interpolationStatusControl;
}

async function generateInterpolationSurface(options = {}) {
  if (!map) {
    console.warn(
      "Cannot generate interpolation because the map is not initialized.",
    );
    return false;
  }

  if (interpolationRequestInProgress) {
    console.warn("An interpolation request is already in progress.");
    return false;
  }

  const parameter =
    options.parameter ||
    getInterpolationControlValue("soilInterpolationParameter") ||
    "ph";

  const method =
    options.method ||
    getInterpolationControlValue("soilInterpolationMethod") ||
    "idw";

  const powerValue =
    options.power ??
    getInterpolationControlValue("soilInterpolationPower");

  const resolutionValue =
    options.resolution ??
    getInterpolationControlValue("soilInterpolationResolution");

  const resolution =
    resolutionValue === "" || resolutionValue === null
      ? 50
      : Number(resolutionValue);

  if (!parameter) {
    setInterpolationStatus("error", "Select an interpolation parameter.");
    return false;
  }

  if (!method) {
    setInterpolationStatus("error", "Select an interpolation method.");
    return false;
  }

  if (!Number.isInteger(resolution)) {
    setInterpolationStatus(
      "error",
      "Interpolation resolution must be a whole number.",
    );
    return false;
  }

  // ----------------------------------------------------------
  // IDW power is relevant only to IDW.
  // ----------------------------------------------------------
  let power = null;

  if (method === "idw") {
    power =
      powerValue === "" || powerValue === null
        ? 2
        : Number(powerValue);

    if (!Number.isFinite(power)) {
      setInterpolationStatus(
        "error",
        "Interpolation power must be a valid number.",
      );
      return false;
    }
  }

  // ----------------------------------------------------------
  // Build method-specific request.
  //
  // IDW:
  //   parameter, method, power, resolution
  //
  // Other methods:
  //   parameter, method, resolution
  // ----------------------------------------------------------
  const requestData = {
    parameter,
    method,
    resolution,
  };

  if (method === "idw") {
    requestData.power = power;
  }

  interpolationRequestInProgress = true;
  setInterpolationControlBusy(true);

  const methodLabel = getInterpolationMethodLabel(method);

  setInterpolationStatus(
    "loading",
    `Generating ${methodLabel} interpolation surface...`,
  );

  console.log(
    "Generating interpolation surface with request:",
    requestData,
  );

  try {
    const response = await fetch(INTERPOLATION_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestData),
    });

    let data = null;

    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error(
        `Interpolation API returned an invalid response (${response.status}).`,
      );
    }

    if (!response.ok || !data.success) {
      const message =
        data && data.message
          ? data.message
          : "Interpolation surface generation failed.";

      const validationText =
        data && Array.isArray(data.errors) && data.errors.length > 0
          ? ` ${data.errors.join(" ")}`
          : "";

      throw new Error(`${message}${validationText}`);
    }

    if (
      !data.grid ||
      !Array.isArray(data.grid.cells) ||
      data.grid.cells.length === 0
    ) {
      throw new Error("Interpolation API returned no grid cells.");
    }

    interpolationResult = data;

    if (!renderInterpolationSurface(data)) {
      throw new Error("Interpolation surface could not be rendered.");
    }

    updateInterpolationLegend(data);

    setInterpolationStatus(
      "success",
      `${methodLabel} interpolation surface generated successfully.`,
    );

    updateInterpolationVisibilityControl(true);

    console.log(
      "Interpolation surface generated successfully.",
      data,
    );

    return true;
  } catch (error) {
    console.error("Interpolation surface generation failed:", error);

    setInterpolationStatus(
      "error",
      error.message || "Interpolation failed.",
    );

    return false;
  } finally {
    interpolationRequestInProgress = false;
    setInterpolationControlBusy(false);
  }
}

function getInterpolationMethodLabel(methodKey) {
  if (
    interpolationConfiguration &&
    Array.isArray(interpolationConfiguration.methods)
  ) {
    const method = interpolationConfiguration.methods.find(
      (item) => item.key === methodKey,
    );

    if (method) {
      return method.label;
    }
  }

  return methodKey === "idw"
    ? "Inverse Distance Weighting"
    : "Interpolation";
}

function getInterpolationControlValue(id) {
  const element = document.getElementById(id);
  return element ? element.value : "";
}

function setInterpolationControlBusy(isBusy) {
  const generateButton = document.getElementById(
    "soilInterpolationGenerate",
  );

  const clearButton = document.getElementById("soilInterpolationClear");

  if (generateButton) {
    generateButton.disabled = Boolean(isBusy);
    generateButton.textContent = isBusy
      ? "Generating..."
      : "Generate Surface";
  }

  if (clearButton) {
    clearButton.disabled = Boolean(isBusy);
  }
}

function setInterpolationSurfaceOpacity(opacity) {
  return setInterpolationOpacity(opacity);
}

function updateInterpolationControlFromConfiguration(config) {
  if (typeof updateInterpolationControl === "function" && config) {
    updateInterpolationControl(config);

    interpolationStatusControl = null;
    initializeInterpolationStatusControl();
  }
}

function ensureInterpolationLayerGroup() {
  if (!map) {
    return null;
  }

  if (!interpolationLayerGroup) {
    interpolationLayerGroup = L.layerGroup();
  }

  return interpolationLayerGroup;
}

function getInterpolationExtent(data) {
  if (!data || !data.configuration || !data.configuration.spatialExtent) {
    return null;
  }

  const extent = data.configuration.spatialExtent;

  const minLatitude = Number(extent.minLatitude);
  const maxLatitude = Number(extent.maxLatitude);
  const minLongitude = Number(extent.minLongitude);
  const maxLongitude = Number(extent.maxLongitude);

  if (
    !Number.isFinite(minLatitude) ||
    !Number.isFinite(maxLatitude) ||
    !Number.isFinite(minLongitude) ||
    !Number.isFinite(maxLongitude)
  ) {
    return null;
  }

  if (
    minLatitude >= maxLatitude ||
    minLongitude >= maxLongitude ||
    minLatitude < -90 ||
    maxLatitude > 90 ||
    minLongitude < -180 ||
    maxLongitude > 180
  ) {
    return null;
  }

  return {
    minLatitude,
    maxLatitude,
    minLongitude,
    maxLongitude,
  };
}

function getInterpolationGridDimensions(grid) {
  if (!grid) {
    return null;
  }

  const rows = Number(grid.rows);
  const columns = Number(grid.columns);

  if (
    !Number.isInteger(rows) ||
    !Number.isInteger(columns) ||
    rows <= 0 ||
    columns <= 0
  ) {
    return null;
  }

  return { rows, columns };
}

function getInterpolationCellPosition(cell, index, rows, columns) {
  if (
    cell &&
    Number.isInteger(Number(cell.row)) &&
    Number.isInteger(Number(cell.column))
  ) {
    const row = Number(cell.row);
    const column = Number(cell.column);

    if (
      row >= 0 &&
      row < rows &&
      column >= 0 &&
      column < columns
    ) {
      return { row, column };
    }
  }

  return {
    row: Math.floor(index / columns),
    column: index % columns,
  };
}

function createInterpolationRaster(data) {
  if (!data || !data.grid) {
    return null;
  }

  const dimensions = getInterpolationGridDimensions(data.grid);

  if (!dimensions) {
    console.warn("Invalid interpolation grid dimensions.");
    return null;
  }

  const { rows, columns } = dimensions;
  const cells = Array.isArray(data.grid.cells)
    ? data.grid.cells
    : [];

  if (cells.length === 0) {
    console.warn("Interpolation grid contains no cells.");
    return null;
  }

  const minimum = Number(data.statistics?.minimum);
  const maximum = Number(data.statistics?.maximum);

  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    console.warn(
      "Interpolation statistics contain invalid minimum/maximum.",
    );
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = columns;
  canvas.height = rows;

  const context = canvas.getContext("2d", {
    alpha: true,
  });

  if (!context) {
    console.error("Unable to create interpolation raster canvas.");
    return null;
  }

  context.clearRect(0, 0, columns, rows);

  let renderedCellCount = 0;

  cells.forEach((cell, index) => {
    if (!cell) {
      return;
    }

    const value = Number(cell.value);

    if (!Number.isFinite(value)) {
      return;
    }

    const position = getInterpolationCellPosition(
      cell,
      index,
      rows,
      columns,
    );

    if (
      position.row < 0 ||
      position.row >= rows ||
      position.column < 0 ||
      position.column >= columns
    ) {
      return;
    }

    context.fillStyle = getInterpolationColor(
      value,
      minimum,
      maximum,
    );

    context.fillRect(
      position.column,
      position.row,
      1,
      1,
    );

    renderedCellCount++;
  });

  if (renderedCellCount === 0) {
    console.warn("No valid interpolation cells could be rasterized.");
    return null;
  }

  let imageUrl = null;

  try {
    imageUrl = canvas.toDataURL("image/png");
  } catch (error) {
    console.error(
      "Failed to create interpolation raster image:",
      error,
    );
    return null;
  }

  return {
    imageUrl,
    width: columns,
    height: rows,
    renderedCellCount,
  };
}

function renderInterpolationSurface(data) {
  if (!map || !data || !data.grid) {
    return false;
  }

  clearInterpolationLayerOnly();

  const extent = getInterpolationExtent(data);

  if (!extent) {
    console.warn(
      "Interpolation surface cannot be rendered because spatial extent is missing or invalid.",
    );
    return false;
  }

  const dimensions = getInterpolationGridDimensions(data.grid);

  if (!dimensions) {
    console.warn(
      "Interpolation surface cannot be rendered because grid dimensions are invalid.",
    );
    return false;
  }

  const raster = createInterpolationRaster(data);

  if (!raster || !raster.imageUrl) {
    console.warn("Interpolation raster could not be created.");
    return false;
  }

  const layer = ensureInterpolationLayerGroup();

  if (!layer) {
    return false;
  }

  const bounds = L.latLngBounds(
    [extent.minLatitude, extent.minLongitude],
    [extent.maxLatitude, extent.maxLongitude],
  );

  if (!bounds.isValid()) {
    console.warn("Interpolation ImageOverlay bounds are invalid.");
    return false;
  }

  const imageOverlay = L.imageOverlay(
    raster.imageUrl,
    bounds,
    {
      opacity: interpolationOpacity,
      interactive: false,
      crossOrigin: false,
      className: "soil-interpolation-surface",
    },
  );

  imageOverlay.interpolationSurface = true;
  imageOverlay.interpolationGridRows = dimensions.rows;
  imageOverlay.interpolationGridColumns = dimensions.columns;
  imageOverlay.interpolationRenderedCellCount =
    raster.renderedCellCount;
  imageOverlay.interpolationExtent = extent;
  imageOverlay.interpolationOpacity = interpolationOpacity;

  layer.addLayer(imageOverlay);
  layer.addTo(map);

  interpolationVisible = true;

  updateInterpolationVisibilityControl(true);

  console.log(
    `Rendered continuous interpolation surface from ${raster.renderedCellCount} valid grid cell(s) using a ${dimensions.rows} × ${dimensions.columns} raster at ${(interpolationOpacity * 100).toFixed(0)}% opacity.`,
  );

  return true;
}

function clearInterpolationLayerOnly() {
  if (!map || !interpolationLayerGroup) {
    interpolationVisible = false;
    updateInterpolationVisibilityControl(false);
    return;
  }

  interpolationLayerGroup.clearLayers();

  if (map.hasLayer(interpolationLayerGroup)) {
    map.removeLayer(interpolationLayerGroup);
  }

  interpolationVisible = false;
  updateInterpolationVisibilityControl(false);
}

function setInterpolationOpacity(value) {
  let numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    numericValue = DEFAULT_INTERPOLATION_OPACITY;
  }

  numericValue = Math.max(0, Math.min(1, numericValue));
  interpolationOpacity = numericValue;

  if (interpolationLayerGroup) {
    interpolationLayerGroup.eachLayer((layer) => {
      if (
        layer &&
        layer.interpolationSurface &&
        typeof layer.setOpacity === "function"
      ) {
        layer.setOpacity(interpolationOpacity);
        layer.interpolationOpacity = interpolationOpacity;
      }
    });
  }

  console.log(
    `Interpolation surface opacity set to ${(interpolationOpacity * 100).toFixed(0)}%.`,
  );

  return interpolationOpacity;
}

function getInterpolationOpacity() {
  return interpolationOpacity;
}

function setInterpolationVisible(visible) {
  const shouldShow = Boolean(visible);

  if (!map || !interpolationLayerGroup || !interpolationResult) {
    interpolationVisible = false;
    updateInterpolationVisibilityControl(false);
    return false;
  }

  if (shouldShow) {
    if (!map.hasLayer(interpolationLayerGroup)) {
      interpolationLayerGroup.addTo(map);
    }

    setInterpolationOpacity(interpolationOpacity);
    interpolationVisible = true;
    updateInterpolationLegend(interpolationResult);
  } else {
    if (map.hasLayer(interpolationLayerGroup)) {
      map.removeLayer(interpolationLayerGroup);
    }

    interpolationVisible = false;
    removeInterpolationLegend();
  }

  updateInterpolationVisibilityControl(interpolationVisible);

  return interpolationVisible;
}

function updateInterpolationVisibilityControl(visible) {
  if (typeof updateInterpolationVisibility === "function") {
    updateInterpolationVisibility(Boolean(visible));
  }
}

function setInterpolationSurfaceVisible(visible) {
  return setInterpolationVisible(visible);
}

function clearInterpolationSurface() {
  clearInterpolationLayerOnly();

  interpolationResult = null;

  removeInterpolationLegend();
  updateInterpolationVisibilityControl(false);

  setInterpolationStatus("idle", "Interpolation surface cleared.");

  console.log("Interpolation surface cleared.");

  return true;
}

function getInterpolationColor(value, minimum, maximum) {
  if (!Number.isFinite(value)) {
    return "rgba(128, 128, 128, 0)";
  }

  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    return "rgba(128, 128, 128, 0)";
  }

  if (maximum === minimum) {
    return "hsl(120, 75%, 45%)";
  }

  let normalized = (value - minimum) / (maximum - minimum);
  normalized = Math.max(0, Math.min(1, normalized));

  const hue = 240 - normalized * 240;

  return `hsl(${hue}, 75%, 48%)`;
}

function updateInterpolationLegend(data) {
  if (!map || !data || !data.statistics) {
    return;
  }

  if (!interpolationLegendControl) {
    interpolationLegendControl = L.control({
      position: "bottomright",
    });

    interpolationLegendControl.onAdd = function () {
      const container = L.DomUtil.create(
        "div",
        "soil-interpolation-legend-control",
      );

      container.setAttribute(
        "aria-label",
        "Soil interpolation legend",
      );

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      return container;
    };
  }

  if (interpolationLegendControl._map !== map) {
    interpolationLegendControl.addTo(map);
  }

  const container = interpolationLegendControl.getContainer();

  if (!container) {
    return;
  }

  if (typeof buildInterpolationLegend === "function") {
    buildInterpolationLegend(container, data);
  }
}

function removeInterpolationLegend() {
  if (!map || !interpolationLegendControl) {
    return;
  }

  if (interpolationLegendControl._map === map) {
    map.removeControl(interpolationLegendControl);
  }
}

function setInterpolationStatus(status, message) {
  if (!map) {
    return;
  }

  let statusContainer = getInterpolationStatusContainer();

  if (!statusContainer) {
    initializeInterpolationStatusControl();
    statusContainer = getInterpolationStatusContainer();
  }

  if (!statusContainer) {
    return;
  }

  interpolationStatusControl = {
    getContainer: () => statusContainer,
  };

  if (typeof buildInterpolationStatus === "function") {
    buildInterpolationStatus(statusContainer, status, message);
  }
}

function getInterpolationResult() {
  return interpolationResult;
}

function getInterpolationConfiguration() {
  return interpolationConfiguration;
}

function isInterpolationVisible() {
  return interpolationVisible;
}

function isInterpolationRequestInProgress() {
  return interpolationRequestInProgress;
}

function isInterpolationSurfaceVisible() {
  return interpolationVisible;
}

// ============================================================
// MAP ERROR HANDLING
// ============================================================
function clearMapError() {
  const container = document.querySelector("#mapError");

  if (!container) {
    return;
  }

  container.textContent = "";
  container.style.display = "none";
}

function showMapError(message) {
  console.error("Map error:", message);

  const container = document.querySelector("#mapError");

  if (!container) {
    return;
  }

  container.textContent = String(
    message || "An unexpected map error occurred.",
  );

  container.style.display = "block";
}

/* ============================================================
   HTML ESCAPE HELPER
   ============================================================ */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ============================================================
   ESCAPE KEY HANDLER
   ============================================================ */

document.addEventListener("keydown", function (event) {
  if (event.key !== "Escape") {
    return;
  }

  const modal = document.querySelector(".soil-sample-modal");

  if (modal && modal.classList.contains("visible")) {
    modal.classList.remove("visible");
  }
});

/* ============================================================
   PUBLIC API
   ============================================================ */

function getInterpolationStatistics() {
  if (!interpolationResult) {
    return null;
  }

  return interpolationResult.statistics || null;
}

let mapSpatialQueryResult = null;
let mapSpatialQueryLayerGroup = null;
let mapSpatialQueryControl = null;
let mapSpatialQueryStatusControl = null;
let mapSpatialQueryRequestInProgress = false;
let mapSpatialQueryRequestSequence = 0;

const MAP_SPATIAL_QUERY_API_BASE = "/api/soil-analysis/query";

window.initializeMap = initializeMap;
window.getMap = getMap;
window.clearMapError = clearMapError;

/* ------------------------------------------------------------
   SOIL SAMPLE MAP
   ------------------------------------------------------------ */

window.renderSoilSamples = renderSoilSamples;
window.clearSoilSampleMarkers = clearSoilSampleMarkers;
window.getSoilSampleMarkers = getSoilSampleMarkers;
window.getSelectedSoilSample = getSelectedSoilSample;
window.setSelectedSoilSample = setSelectedSoilSample;

/* ------------------------------------------------------------
   THEMATIC MAP
   ------------------------------------------------------------ */

window.updateThematicMapData = updateThematicMapData;
window.applyThematicMarkerSymbology = applyThematicMarkerSymbology;
window.getThematicMapParameter = getThematicMapParameter;
window.setThematicMapParameter = setThematicMapParameter;

/* ------------------------------------------------------------
   SAMPLE LABELS
   ------------------------------------------------------------ */

window.setSampleLabelsVisible = setSampleLabelsVisible;
window.areSampleLabelsVisible = areSampleLabelsVisible;

/* ------------------------------------------------------------
   INTERPOLATION
   ------------------------------------------------------------ */

window.loadInterpolationConfiguration =
  loadInterpolationConfiguration;

window.generateInterpolationSurface =
  generateInterpolationSurface;

window.renderInterpolationSurface =
  renderInterpolationSurface;

window.clearInterpolationSurface =
  clearInterpolationSurface;

window.setInterpolationSurfaceVisible =
  setInterpolationSurfaceVisible;

window.setInterpolationSurfaceOpacity =
  setInterpolationSurfaceOpacity;

window.getInterpolationResult =
  getInterpolationResult;

window.getInterpolationConfiguration =
  getInterpolationConfiguration;

window.getInterpolationStatistics =
  getInterpolationStatistics;

window.isInterpolationSurfaceVisible =
  isInterpolationSurfaceVisible;

window.isInterpolationRequestInProgress =
  isInterpolationRequestInProgress;

window.querySpatialAnalysis = querySpatialAnalysis;

window.isSpatialAnalysisRequestInProgress = () =>
  spatialAnalysisRequestInProgress;

/* ============================================================
   FINAL LOAD MESSAGE
   ============================================================ */
