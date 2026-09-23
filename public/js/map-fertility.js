// FERTILITY ZONING STATE
// ============================================================
let fertilityZoningConfiguration = null;
let fertilityZoningResult = null;
let fertilityZoningLayerGroup = null;
let fertilityZoningVisible = false;
let fertilityZoningRequestInProgress = false;

// ------------------------------------------------------------
// Phase 9.5 UI state
// ------------------------------------------------------------
let fertilityZoningControl = null;
let fertilityZoningStatusControl = null;
let fertilityZoningLegendControl = null;

// ============================================================
// FERTILITY ZONING API
// ============================================================
const FERTILITY_ZONING_API_BASE = "/api/soil-fertility-zoning";

// ============================================================
// FERTILITY ZONE PRESENTATION
// ============================================================
//
// These are presentation colors only.
//
// The frontend does NOT determine which cell belongs to which
// class. The backend supplies fertilityClass.
//
// ============================================================
const FERTILITY_ZONE_PRESENTATION = {
  low: {
    label: "Low",
    fillColor: "#c0392b",
    color: "#8f241b",
    fillOpacity: 0.48,
    weight: 1,
  },

  moderate_good: {
    label: "Moderate / Good",
    fillColor: "#d9a300",
    color: "#9a7400",
    fillOpacity: 0.48,
    weight: 1,
  },

  high: {
    label: "High",
    fillColor: "#2e8b57",
    color: "#216a42",
    fillOpacity: 0.48,
    weight: 1,
  },

  unavailable: {
    label: "Unavailable",
    fillColor: "#7f8c8d",
    color: "#606b6c",
    fillOpacity: 0.28,
    weight: 1,
  },
};

// ============================================================
// NORMALIZE FERTILITY ZONE CLASS
// ============================================================
//
// The backend remains authoritative.
//
// This function only normalizes the backend's returned class
// label so that it can be mapped to a presentation definition.
//
// No scientific interpretation occurs here.
//
// ============================================================
function normalizeFertilityZoneClass(fertilityClass) {
  if (
    fertilityClass === null ||
    fertilityClass === undefined ||
    String(fertilityClass).trim() === ""
  ) {
    return "unavailable";
  }

  const normalized = String(fertilityClass)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  switch (normalized) {
    case "low":
      return "low";

    case "moderate / good":
    case "moderate/good":
      return "moderate_good";

    case "high":
      return "high";

    case "unavailable":
      return "unavailable";

    default:
      console.warn(
        `Unknown fertility zoning class "${fertilityClass}". Rendering as Unavailable.`,
      );

      return "unavailable";
  }
}

// ============================================================
// INITIALIZE FERTILITY ZONING CONTROL
// ============================================================
//
// Phase 9.5.3
//
// This creates the Leaflet control container and connects the
// Phase 9.5 UI builder to the existing fertility zoning API.
//
// Scientific processing remains entirely in the backend.
//
// ============================================================
function initializeFertilityZoningControl() {
  if (!map) {
    return null;
  }

  if (fertilityZoningControl) {
    return fertilityZoningControl;
  }

  fertilityZoningControl = L.control({
    position: "topright",
  });

  fertilityZoningControl.onAdd = function () {
    const container = L.DomUtil.create("div", "soil-fertility-zoning-control");

    container.setAttribute(
      "aria-label",
      "Overall soil fertility zoning controls",
    );

    if (typeof buildFertilityZoningControl === "function") {
      buildFertilityZoningControl(container, fertilityZoningConfiguration, {
        onGenerate: generateFertilityZoning,

        onClear: clearFertilityZoning,

        onVisibilityChange: setFertilityZoningVisible,
      });
    }

    L.DomEvent.disableClickPropagation(container);

    L.DomEvent.disableScrollPropagation(container);

    return container;
  };

  fertilityZoningControl.addTo(map);

  console.log("Fertility zoning control initialized.");

  return fertilityZoningControl;
}
function toggleFertilityZoningControl() {
  if (!map) {
    return false;
  }

  if (!fertilityZoningControl) {
    initializeFertilityZoningControl();
  }

  if (!fertilityZoningControl) {
    return false;
  }

  const container = fertilityZoningControl.getContainer();

  if (!container) {
    return false;
  }

  const isVisible = container.style.display !== "none";

  if (isVisible) {
    container.style.display = "none";
  } else {
    container.style.display = "";
  }

  return !isVisible;
}

window.toggleFertilityZoningControl =
  toggleFertilityZoningControl;
// ============================================================
// LOAD FERTILITY ZONING CONFIGURATION
// ============================================================
async function loadFertilityZoningConfiguration() {
  try {
    console.log("Loading fertility zoning configuration...");

    const response = await fetch(`${FERTILITY_ZONING_API_BASE}/config`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    let data = null;

    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error(
        `Fertility zoning API returned an invalid response (${response.status}).`,
      );
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data && data.message
          ? data.message
          : "Failed to load fertility zoning configuration.",
      );
    }

    fertilityZoningConfiguration = data;

    console.log(
      "Fertility zoning configuration loaded successfully.",
      fertilityZoningConfiguration,
    );

    // ----------------------------------------------------------
    // Apply backend defaults to the already-created Phase 9.5
    // control.
    // ----------------------------------------------------------
    updateFertilityZoningControl(fertilityZoningConfiguration);

    setFertilityZoningStatus("idle", "Ready to generate fertility zoning.");

    return fertilityZoningConfiguration;
  } catch (error) {
    console.error("Failed to load fertility zoning configuration:", error);

    setFertilityZoningStatus(
      "error",
      "Fertility zoning configuration could not be loaded.",
    );

    return null;
  }
}

// ============================================================
// FERTILITY ZONING STATUS
// ============================================================
//
// Phase 9.5.3
//
// Status is presentation-only. It reports the state of the
// frontend/API workflow and does not perform any scientific
// processing.
//
// ============================================================
function setFertilityZoningStatus(status, message) {
  if (!map) {
    return;
  }

  if (!fertilityZoningControl) {
    initializeFertilityZoningControl();
  }

  if (!fertilityZoningControl) {
    return;
  }

  const controlContainer = fertilityZoningControl.getContainer();

  if (!controlContainer) {
    return;
  }

  const statusContainer = controlContainer.querySelector(
    "#soilFertilityZoningStatus",
  );

  if (!statusContainer) {
    return;
  }

  fertilityZoningStatusControl = {
    getContainer: () => statusContainer,
  };

  if (typeof buildFertilityZoningStatus === "function") {
    buildFertilityZoningStatus(statusContainer, status, message);
  }
}

// ============================================================
// SET FERTILITY ZONING CONTROL BUSY STATE
// ============================================================
//
// Phase 9.5.3
//
// Prevents duplicate generation requests while the backend is
// processing the zoning request.
//
// ============================================================
function setFertilityZoningControlBusy(isBusy) {
  const busy = Boolean(isBusy);

  const generateButton = document.getElementById("soilFertilityZoningGenerate");

  const clearButton = document.getElementById("soilFertilityZoningClear");

  const powerInput = document.getElementById("soilFertilityZoningPower");

  const resolutionInput = document.getElementById(
    "soilFertilityZoningResolution",
  );

  if (generateButton) {
    generateButton.disabled = busy;

    generateButton.textContent = busy ? "Generating..." : "Generate Zoning";
  }

  if (clearButton) {
    clearButton.disabled = busy;
  }

  if (powerInput) {
    powerInput.disabled = busy;
  }

  if (resolutionInput) {
    resolutionInput.disabled = busy;
  }
}

// ============================================================
// UPDATE FERTILITY ZONING LEGEND
// ============================================================
//
// Phase 9.5.3
//
// The legend is presentation-only and receives the already
// classified backend result.
//
// Position:
//
//   Fertility zoning legend:
//       bottomright
//
//   Existing thematic legend:
//       bottomright
//
// Leaflet automatically stacks controls occupying the same
// corner.
//
// ============================================================
function updateFertilityZoningLegend(data) {
  if (!map || !data) {
    return;
  }

  if (!fertilityZoningLegendControl) {
    fertilityZoningLegendControl = L.control({
      position: "bottomright",
    });

    fertilityZoningLegendControl.onAdd = function () {
      const container = L.DomUtil.create(
        "div",
        "soil-fertility-zoning-legend-control",
      );

      container.setAttribute("aria-label", "Soil fertility zoning legend");

      L.DomEvent.disableClickPropagation(container);

      L.DomEvent.disableScrollPropagation(container);

      return container;
    };
  }

  if (fertilityZoningLegendControl._map !== map) {
    fertilityZoningLegendControl.addTo(map);
  }

  const container = fertilityZoningLegendControl.getContainer();

  if (!container) {
    return;
  }

  if (typeof buildFertilityZoningLegend === "function") {
    buildFertilityZoningLegend(container, data);
  }
}

// ============================================================
// REMOVE FERTILITY ZONING LEGEND
// ============================================================
function removeFertilityZoningLegend() {
  if (!map || !fertilityZoningLegendControl) {
    return;
  }

  if (fertilityZoningLegendControl._map === map) {
    map.removeControl(fertilityZoningLegendControl);
  }
}

// ============================================================
// ENSURE FERTILITY ZONING LAYER GROUP
// ============================================================
function ensureFertilityZoningLayerGroup() {
  if (!map) {
    return null;
  }

  if (!fertilityZoningLayerGroup) {
    fertilityZoningLayerGroup = L.layerGroup();
  }

  return fertilityZoningLayerGroup;
}

// ============================================================
// FERTILITY ZONING EXTENT
// ============================================================
function getFertilityZoningExtent(data) {
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

// ============================================================
// FERTILITY ZONING GRID DIMENSIONS
// ============================================================
function getFertilityZoningGridDimensions(grid) {
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

  return {
    rows,
    columns,
  };
}

// ============================================================
// FERTILITY CELL POSITION
// ============================================================
//
// Backend convention:
//
//   row 0          = north
//   last row       = south
//   column 0       = west
//   last column    = east
//
// The backend already supplies row / column metadata.
//
// ============================================================
function getFertilityZoningCellPosition(cell, index, rows, columns) {
  if (
    cell &&
    Number.isInteger(Number(cell.row)) &&
    Number.isInteger(Number(cell.column))
  ) {
    const row = Number(cell.row);

    const column = Number(cell.column);

    if (row >= 0 && row < rows && column >= 0 && column < columns) {
      return {
        row,
        column,
      };
    }
  }

  return {
    row: Math.floor(index / columns),
    column: index % columns,
  };
}

// ============================================================
// FERTILITY CELL BOUNDS
// ============================================================
//
// Converts one backend grid position into the geographic bounds
// of the corresponding Leaflet rectangle.
//
// No scientific calculation is performed here.
//
// ============================================================
function getFertilityZoningCellBounds(row, column, rows, columns, extent) {
  if (!extent) {
    return null;
  }

  if (row < 0 || row >= rows || column < 0 || column >= columns) {
    return null;
  }

  const latitudeRange = extent.maxLatitude - extent.minLatitude;

  const longitudeRange = extent.maxLongitude - extent.minLongitude;

  const latitudeStep = latitudeRange / rows;

  const longitudeStep = longitudeRange / columns;

  // Row 0 is the northernmost row.
  const north = extent.maxLatitude - row * latitudeStep;

  const south = extent.maxLatitude - (row + 1) * latitudeStep;

  const west = extent.minLongitude + column * longitudeStep;

  const east = extent.minLongitude + (column + 1) * longitudeStep;

  return {
    north,
    south,
    west,
    east,
  };
}

// ============================================================
// CREATE FERTILITY ZONE CELL
// ============================================================
//
// This function presents the class supplied by the backend.
//
// The frontend does not derive the class from N/P/K/OC values.
//
// ============================================================
function createFertilityZoningCell(cell, bounds) {
  if (!cell || !bounds) {
    return null;
  }

  const zoneKey = normalizeFertilityZoneClass(cell.fertilityClass);

  const presentation =
    FERTILITY_ZONE_PRESENTATION[zoneKey] ||
    FERTILITY_ZONE_PRESENTATION.unavailable;

  const rectangle = L.rectangle(
    [
      [bounds.south, bounds.west],
      [bounds.north, bounds.east],
    ],
    {
      stroke: true,
      color: presentation.color,
      weight: presentation.weight,
      opacity: 0.75,
      fill: true,
      fillColor: presentation.fillColor,
      fillOpacity: presentation.fillOpacity,
      interactive: true,
    },
  );

  rectangle.fertilityZone = true;

  rectangle.fertilityClass = cell.fertilityClass ?? "Unavailable";

  rectangle.fertilityZoneKey = zoneKey;

  rectangle.fertilityCell = cell;

  rectangle.fertilityRow = Number(cell.row);

  rectangle.fertilityColumn = Number(cell.column);

  rectangle.bindTooltip(buildFertilityZoningCellTooltip(cell), {
    direction: "top",
    sticky: false,
    opacity: 0.95,
  });

  return rectangle;
}

// ============================================================
// FERTILITY ZONING CELL TOOLTIP
// ============================================================
//
// Presentation/inspection only.
//
// Continuous values are displayed exactly as supplied by the
// backend.
//
// No classification is performed here.
//
// ============================================================
function buildFertilityZoningCellTooltip(cell) {
  if (!cell) {
    return "Soil fertility: Unavailable";
  }

  const fertilityClass = cell.fertilityClass ?? "Unavailable";

  const latitude = Number(cell.latitude);

  const longitude = Number(cell.longitude);

  const latitudeText = Number.isFinite(latitude) ? latitude.toFixed(5) : "—";

  const longitudeText = Number.isFinite(longitude) ? longitude.toFixed(5) : "—";

  const values =
    cell.values && typeof cell.values === "object" ? cell.values : {};

  const nitrogen = Number(values.nitrogen);

  const phosphorus = Number(values.phosphorus);

  const potassium = Number(values.potassium);

  const organicCarbon = Number(values.organic_carbon);

  const lines = [
    `<strong>Overall Soil Fertility</strong>`,
    `Class: <strong>${escapeHtml(fertilityClass)}</strong>`,
    `Location: ${latitudeText}, ${longitudeText}`,
  ];

  if (Number.isFinite(nitrogen)) {
    lines.push(`N: ${nitrogen.toFixed(2)} kg/ha`);
  }

  if (Number.isFinite(phosphorus)) {
    lines.push(`P: ${phosphorus.toFixed(2)} kg/ha`);
  }

  if (Number.isFinite(potassium)) {
    lines.push(`K: ${potassium.toFixed(2)} kg/ha`);
  }

  if (Number.isFinite(organicCarbon)) {
    lines.push(`Organic Carbon: ${organicCarbon.toFixed(3)} %`);
  }

  return lines.join("<br>");
}

// ============================================================
// RENDER FERTILITY ZONING SURFACE
// ============================================================
//
// Backend:
//
//   continuous interpolation
//          ↓
//   nutrient classification
//          ↓
//   overall fertility assessment
//          ↓
//   classified grid
//
// Frontend:
//
//   classified grid
//          ↓
//   Leaflet rectangles
//
// ============================================================
function renderFertilityZoningSurface(data) {
  if (!map || !data || !data.grid) {
    return false;
  }

  clearFertilityZoningLayerOnly();

  const extent = getFertilityZoningExtent(data);

  if (!extent) {
    console.warn(
      "Fertility zoning surface cannot be rendered because spatial extent is missing or invalid.",
    );

    return false;
  }

  const dimensions = getFertilityZoningGridDimensions(data.grid);

  if (!dimensions) {
    console.warn(
      "Fertility zoning surface cannot be rendered because grid dimensions are invalid.",
    );

    return false;
  }

  const cells = Array.isArray(data.grid.cells) ? data.grid.cells : [];

  if (cells.length === 0) {
    console.warn("Fertility zoning grid contains no cells.");

    return false;
  }

  const layerGroup = ensureFertilityZoningLayerGroup();

  if (!layerGroup) {
    return false;
  }

  const rows = dimensions.rows;

  const columns = dimensions.columns;

  let renderedCellCount = 0;
  let lowCount = 0;
  let moderateGoodCount = 0;
  let highCount = 0;
  let unavailableCount = 0;

  cells.forEach((cell, index) => {
    if (!cell) {
      return;
    }

    const position = getFertilityZoningCellPosition(cell, index, rows, columns);

    const cellBounds = getFertilityZoningCellBounds(
      position.row,
      position.column,
      rows,
      columns,
      extent,
    );

    if (!cellBounds) {
      return;
    }

    const rectangle = createFertilityZoningCell(cell, cellBounds);

    if (!rectangle) {
      return;
    }

    layerGroup.addLayer(rectangle);

    renderedCellCount++;

    const zoneKey = normalizeFertilityZoneClass(cell.fertilityClass);

    switch (zoneKey) {
      case "low":
        lowCount++;
        break;

      case "moderate_good":
        moderateGoodCount++;
        break;

      case "high":
        highCount++;
        break;

      case "unavailable":
      default:
        unavailableCount++;
        break;
    }
  });

  if (renderedCellCount === 0) {
    console.warn("No fertility zoning cells could be rendered.");

    return false;
  }

  layerGroup.addTo(map);

  fertilityZoningVisible = true;

  fertilityZoningResult = data;

  console.log(
    `Rendered fertility zoning surface: ${renderedCellCount} cell(s), ${rows} × ${columns}.`,
  );

  console.log("Fertility zoning presentation counts:", {
    Low: lowCount,
    "Moderate / Good": moderateGoodCount,
    High: highCount,
    Unavailable: unavailableCount,
  });

  return true;
}

// ============================================================
// GENERATE FERTILITY ZONING
// ============================================================
//
// Phase 9.4 / 9.5.
//
// The frontend sends only generation settings.
//
// Scientific processing remains in:
//
//   server/services/fertilityZoningService.js
//
// ============================================================
async function generateFertilityZoning(options = {}) {
  if (!map) {
    console.warn(
      "Cannot generate fertility zoning because the map is not initialized.",
    );

    return false;
  }

  if (fertilityZoningRequestInProgress) {
    console.warn("A fertility zoning request is already in progress.");

    return false;
  }

  const powerValue =
    options.power ?? getFertilityZoningOptionValue("soilFertilityZoningPower");

  const resolutionValue =
    options.resolution ??
    getFertilityZoningOptionValue("soilFertilityZoningResolution");

  const power =
    powerValue === "" || powerValue === null || powerValue === undefined
      ? 2
      : Number(powerValue);

  const resolution =
    resolutionValue === "" ||
    resolutionValue === null ||
    resolutionValue === undefined
      ? 50
      : Number(resolutionValue);

  if (!Number.isFinite(power)) {
    const message = "Fertility zoning power must be a valid number.";

    console.error(message);

    setFertilityZoningStatus("error", message);

    return false;
  }

  if (!Number.isInteger(resolution)) {
    const message = "Fertility zoning resolution must be a whole number.";

    console.error(message);

    setFertilityZoningStatus("error", message);

    return false;
  }

  const requestData = {
    power,
    resolution,
  };

  fertilityZoningRequestInProgress = true;

  setFertilityZoningControlBusy(true);

  setFertilityZoningStatus(
    "loading",
    "Generating overall soil fertility zoning surface...",
  );

  console.log(
    "Generating overall soil fertility zoning with request:",
    requestData,
  );

  try {
    const response = await fetch(FERTILITY_ZONING_API_BASE, {
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
        `Fertility zoning API returned an invalid response (${response.status}).`,
      );
    }

    if (!response.ok || !data.success) {
      const message =
        data && data.message
          ? data.message
          : "Fertility zoning generation failed.";

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
      throw new Error("Fertility zoning API returned no grid cells.");
    }

    fertilityZoningConfiguration =
      data.configuration || fertilityZoningConfiguration;

    // ----------------------------------------------------------
    // Render first.
    //
    // renderFertilityZoningSurface() stores the successful
    // result only after a valid surface has been constructed.
    // ----------------------------------------------------------
    const rendered = renderFertilityZoningSurface(data);

    if (!rendered) {
      throw new Error("Fertility zoning surface could not be rendered.");
    }

    updateFertilityZoningLegend(data);

    updateFertilityZoningVisibility(true, true);

    setFertilityZoningStatus(
      "success",
      "Overall soil fertility zoning generated successfully.",
    );

    console.log("Overall soil fertility zoning generated successfully.", data);

    return true;
  } catch (error) {
    console.error("Fertility zoning generation failed:", error);

    setFertilityZoningStatus(
      "error",
      error.message || "Fertility zoning generation failed.",
    );

    return false;
  } finally {
    fertilityZoningRequestInProgress = false;

    setFertilityZoningControlBusy(false);
  }
}

// ============================================================
// GET FERTILITY ZONING OPTION
// ============================================================
//
// This helper allows the Phase 9.5 control to provide
// power/resolution values without changing the zoning API.
//
// ============================================================
function getFertilityZoningOptionValue(id) {
  const element = document.getElementById(id);

  if (!element) {
    return "";
  }

  return element.value;
}

// ============================================================
// FERTILITY ZONING VISIBILITY
// ============================================================
function setFertilityZoningVisible(visible) {
  const shouldShow = Boolean(visible);

  if (!map || !fertilityZoningLayerGroup || !fertilityZoningResult) {
    fertilityZoningVisible = false;

    updateFertilityZoningVisibility(false, Boolean(fertilityZoningResult));

    return false;
  }

  if (shouldShow) {
    if (!map.hasLayer(fertilityZoningLayerGroup)) {
      fertilityZoningLayerGroup.addTo(map);
    }

    fertilityZoningVisible = true;

    updateFertilityZoningLegend(fertilityZoningResult);
  } else {
    if (map.hasLayer(fertilityZoningLayerGroup)) {
      map.removeLayer(fertilityZoningLayerGroup);
    }

    fertilityZoningVisible = false;

    removeFertilityZoningLegend();
  }

  updateFertilityZoningVisibility(fertilityZoningVisible, true);

  return fertilityZoningVisible;
}

// ============================================================
// CLEAR ONLY FERTILITY ZONING LEAFLET LAYER
// ============================================================
function clearFertilityZoningLayerOnly() {
  if (!map || !fertilityZoningLayerGroup) {
    fertilityZoningVisible = false;

    updateFertilityZoningVisibility(false, Boolean(fertilityZoningResult));

    return;
  }

  fertilityZoningLayerGroup.clearLayers();

  if (map.hasLayer(fertilityZoningLayerGroup)) {
    map.removeLayer(fertilityZoningLayerGroup);
  }

  fertilityZoningVisible = false;

  updateFertilityZoningVisibility(false, Boolean(fertilityZoningResult));
}

// ============================================================
// CLEAR COMPLETE FERTILITY ZONING
// ============================================================
function clearFertilityZoning() {
  clearFertilityZoningLayerOnly();

  fertilityZoningResult = null;

  removeFertilityZoningLegend();

  updateFertilityZoningVisibility(false, false);

  setFertilityZoningStatus("idle", "Fertility zoning surface cleared.");

  console.log("Fertility zoning surface cleared.");

  return true;
}

// ============================================================
// FERTILITY ZONING GETTERS
// ============================================================
function getFertilityZoningResult() {
  return fertilityZoningResult;
}

function getFertilityZoningConfiguration() {
  return fertilityZoningConfiguration;
}

function isFertilityZoningVisible() {
  return fertilityZoningVisible;
}

function isFertilityZoningRequestInProgress() {
  return fertilityZoningRequestInProgress;
}

// ============================================================
// FERTILITY ZONING STATISTICS
// ============================================================
//
// Statistics are taken directly from the backend response.
//
// No frontend recalculation of scientific results occurs.
//
// ============================================================
function getFertilityZoningStatistics() {
  if (!fertilityZoningResult || !fertilityZoningResult.statistics) {
    return null;
  }

  return fertilityZoningResult.statistics;
}
window.loadFertilityZoningConfiguration = loadFertilityZoningConfiguration;

window.generateFertilityZoning = generateFertilityZoning;

window.renderFertilityZoningSurface = renderFertilityZoningSurface;

window.clearFertilityZoning = clearFertilityZoning;

window.setFertilityZoningVisible = setFertilityZoningVisible;

window.getFertilityZoningResult = getFertilityZoningResult;

window.getFertilityZoningConfiguration = getFertilityZoningConfiguration;

window.getFertilityZoningStatistics = getFertilityZoningStatistics;

window.isFertilityZoningVisible = isFertilityZoningVisible;

window.isFertilityZoningRequestInProgress = isFertilityZoningRequestInProgress;
