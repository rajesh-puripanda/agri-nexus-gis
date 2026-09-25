// ============================================================
// public/js/spatial-query.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.4
// Spatial Query Controls & Result Layer
//
// Built on:
//   Phase 10.3.3 — Spatial Query REST API
//
// Responsibilities:
//
//   1. Spatial query parameter/classification metadata
//   2. Spatial query state
//   3. Spatial query input validation
//   4. Spatial query request construction
//   5. Spatial query API communication
//   6. Spatial query result state
//   7. Independent spatial query result layer
//   8. Spatial query result presentation
//   9. Spatial query clear/focus operations
//  10. Spatial query control UI
//  11. Spatial query control height/scroll management
//
// Architecture:
//
//   - Scientific classification remains backend-authoritative.
//   - This module does NOT reproduce scientific thresholds.
//   - Thematic filtering remains independent.
//   - Phase 10.2.5 point inspection remains independent.
//   - Interpolation and fertility zoning remain independent.
//   - Spatial query results use their own Leaflet layer and pane.
//   - Spatial query result markers remain visually independent of
//     thematic marker symbology.
//   - Control height is constrained by the actual Leaflet map
//     container rather than the browser viewport.
//

/* ============================================================
   CONFIGURATION
   ============================================================ */

const SPATIAL_QUERY_API_BASE = "/api/soil-analysis/query";

const SPATIAL_QUERY_RADIUS_MIN = 0;
const SPATIAL_QUERY_RADIUS_MAX = 100000;

const SPATIAL_QUERY_CONTROL_MAP_MARGIN = 20;

const SPATIAL_QUERY_RESULT_PANE_NAME = "spatialQueryResultPane";

const SPATIAL_QUERY_RESULT_PANE_Z_INDEX = 700;

/* ============================================================
   SPATIAL QUERY PARAMETERS
   ============================================================ */

const SPATIAL_QUERY_PARAMETERS = [
  {
    value: "ph",
    label: "pH",
    classifications: [
      {
        value: "acidic",
        label: "Acidic",
      },
      {
        value: "neutral",
        label: "Neutral",
      },
      {
        value: "alkaline",
        label: "Alkaline",
      },
    ],
  },
  {
    value: "nitrogen",
    label: "Nitrogen",
    classifications: [
      {
        value: "low",
        label: "Low",
      },
      {
        value: "medium",
        label: "Medium",
      },
      {
        value: "high",
        label: "High",
      },
    ],
  },
  {
    value: "phosphorus",
    label: "Phosphorus",
    classifications: [
      {
        value: "low",
        label: "Low",
      },
      {
        value: "medium",
        label: "Medium",
      },
      {
        value: "high",
        label: "High",
      },
      {
        value: "very_high",
        label: "Very High",
      },
    ],
  },
  {
    value: "potassium",
    label: "Potassium",
    classifications: [
      {
        value: "low",
        label: "Low",
      },
      {
        value: "medium",
        label: "Medium",
      },
      {
        value: "high",
        label: "High",
      },
      {
        value: "very_high",
        label: "Very High",
      },
    ],
  },
  {
    value: "organic_carbon",
    label: "Organic Carbon",
    classifications: [
      {
        value: "low",
        label: "Low",
      },
      {
        value: "medium",
        label: "Medium",
      },
      {
        value: "high",
        label: "High",
      },
    ],
  },
  {
    value: "electrical_conductivity",
    label: "Electrical Conductivity",
    classifications: [
      {
        value: "non_saline",
        label: "Non-saline",
      },
      {
        value: "very_slightly_saline",
        label: "Very slightly saline",
      },
      {
        value: "moderately_saline",
        label: "Moderately saline",
      },
      {
        value: "strongly_saline",
        label: "Strongly saline",
      },
    ],
  },
  {
    value: "overall_fertility",
    label: "Overall Fertility",
    classifications: [
      {
        value: "low",
        label: "Low",
      },
      {
        value: "moderate_good",
        label: "Moderate / Good",
      },
      {
        value: "high",
        label: "High",
      },
      {
        value: "unavailable",
        label: "Unavailable",
      },
    ],
  },
];

/* ============================================================
   SPATIAL QUERY STATE
   ============================================================ */

let spatialQueryMap = null;

let spatialQueryControl = null;

let spatialQueryControlContainer = null;

let spatialQueryResult = null;

let spatialQueryResultLayerGroup = null;

let spatialQueryRequestInProgress = false;

let spatialQueryRequestSequence = 0;

let spatialQueryResizeHandlerAttached = false;

let spatialQueryMapInteractionHandlersAttached = false;

let spatialQueryMapInteractionMode = "none";

let spatialQueryDrawingStartLatLng = null;

let spatialQuerySelectionRectangle = null;

let spatialQueryLocationMarker = null;

let spatialQueryMapDraggingWasEnabled = false;

let spatialQueryIgnoreNextMapClick = false;

let spatialQueryState = {
  parameter: "",
  classification: "",
  spatialType: "none",
  latitude: "",
  longitude: "",
  radius: "",
  minLatitude: "",
  maxLatitude: "",
  minLongitude: "",
  maxLongitude: "",
};

/* ============================================================
   SPATIAL QUERY CONTROL UI
   ============================================================ */

function buildSpatialQueryControl() {
  if (typeof L === "undefined") {
    console.warn("Spatial Query: Leaflet is not available.");

    return null;
  }

  const SpatialQueryControl = L.Control.extend({
    options: {
      position: "topright",
    },

    onAdd: function () {
      const container = L.DomUtil.create(
        "div",
        "leaflet-control spatial-query-control",
      );

      container.setAttribute("aria-label", "Spatial query controls");

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      container.innerHTML = `
        <div class="spatial-query-header">
  <span class="spatial-query-title">
    Spatial Query
  </span>

          <div class="spatial-query-header-actions">
            <button
              type="button"
              class="analytical-control-move-button"
              title="Move Spatial Query panel"
              aria-label="Move Spatial Query panel"
            >
                            ↕
            </button>

            <button
              type="button"
              class="spatial-query-toggle"
              aria-expanded="true"
              aria-controls="spatialQueryControlContent"
              title="Collapse spatial query controls"
            >
              âˆ’
            </button>
          </div>
        </div>

        <div
          id="spatialQueryControlContent"
          class="spatial-query-content"
        >
          <div class="spatial-query-field">
            <label for="spatialQueryParameter">
              Parameter
            </label>

            <select
              id="spatialQueryParameter"
              class="spatial-query-select"
            >
              <option value="">
                Select parameter
              </option>
            </select>
          </div>

          <div class="spatial-query-field">
            <label for="spatialQueryClassification">
              Classification
            </label>

            <select
              id="spatialQueryClassification"
              class="spatial-query-select"
              disabled
            >
              <option value="">
                Select classification
              </option>
            </select>
          </div>

          <div class="spatial-query-field">
            <label for="spatialQuerySpatialType">
              Spatial Filter
            </label>

            <select
              id="spatialQuerySpatialType"
              class="spatial-query-select"
            >
              <option value="none">
                None
              </option>

              <option value="radius">
                Radius
              </option>

              <option value="bbox">
                Bounding Box
              </option>
            </select>
          </div>

          <div
            id="spatialQuerySpatialFields"
            class="spatial-query-spatial-fields"
          ></div>

          <div
            id="spatialQueryStatus"
            class="spatial-query-status"
            role="status"
            aria-live="polite"
          >
            Select a query condition.
          </div>
        </div>

        <div class="spatial-query-actions">
          <button
            type="button"
            id="spatialQueryExecute"
            class="spatial-query-button spatial-query-button-primary"
          >
            Execute Query
          </button>

          <button
            type="button"
            id="spatialQueryFocus"
            class="spatial-query-button spatial-query-button-secondary"
            disabled
          >
            Focus Results
          </button>

          <button
            type="button"
            id="spatialQueryClear"
            class="spatial-query-button spatial-query-button-secondary"
            disabled
          >
            Clear Results
          </button>
        </div>
      `;

      spatialQueryControlContainer = container;

      populateSpatialQueryParameterOptions(container);

      bindSpatialQueryControlEvents(container);

      updateSpatialQueryClassificationOptions(container);

      updateSpatialQuerySpatialFields(container);

      updateSpatialQueryControlState(container);

      return container;
    },
  });

  return new SpatialQueryControl();
}

/* ============================================================
   CONTROL LAYOUT
   ============================================================ */

function updateSpatialQueryControlLayout() {
  if (!spatialQueryMap || !spatialQueryControlContainer) {
    return;
  }

  const mapContainer = spatialQueryMap.getContainer();

  if (!mapContainer) {
    return;
  }

  const mapRect = mapContainer.getBoundingClientRect();

  const container = spatialQueryControlContainer;

  container.style.height = "auto";
  container.style.maxHeight = "none";

  const controlRect = container.getBoundingClientRect();

  const availableHeight = Math.max(
    0,
    mapRect.bottom - controlRect.top - SPATIAL_QUERY_CONTROL_MAP_MARGIN,
  );

  const naturalHeight = container.scrollHeight;

  if (availableHeight <= 0) {
    return;
  }

  if (naturalHeight <= availableHeight) {
    container.style.height = "auto";
    container.style.maxHeight = `${availableHeight}px`;
  } else {
    container.style.height = `${availableHeight}px`;
    container.style.maxHeight = `${availableHeight}px`;
  }
}

function scheduleSpatialQueryControlLayoutUpdate() {
  if (!spatialQueryControlContainer) {
    return;
  }

  if (typeof window === "undefined") {
    updateSpatialQueryControlLayout();

    return;
  }

  window.requestAnimationFrame(() => {
    updateSpatialQueryControlLayout();
  });
}

function attachSpatialQueryMapResizeHandler() {
  if (!spatialQueryMap || spatialQueryResizeHandlerAttached) {
    return;
  }

  spatialQueryMap.on("resize", updateSpatialQueryControlLayout);

  window.addEventListener("resize", scheduleSpatialQueryControlLayoutUpdate);

  spatialQueryResizeHandlerAttached = true;
}

/* ============================================================
   PARAMETER OPTIONS
   ============================================================ */

function populateSpatialQueryParameterOptions(container) {
  const select = container.querySelector("#spatialQueryParameter");

  if (!select) {
    return;
  }

  select.innerHTML = `
    <option value="">
      Select parameter
    </option>
  `;

  SPATIAL_QUERY_PARAMETERS.forEach((parameter) => {
    const option = document.createElement("option");

    option.value = parameter.value;
    option.textContent = parameter.label;

    select.appendChild(option);
  });

  select.value = spatialQueryState.parameter;
}

/* ============================================================
   CLASSIFICATION OPTIONS
   ============================================================ */

function updateSpatialQueryClassificationOptions(container) {
  const parameterSelect = container.querySelector("#spatialQueryParameter");

  const classificationSelect = container.querySelector(
    "#spatialQueryClassification",
  );

  if (!parameterSelect || !classificationSelect) {
    return;
  }

  const parameter = parameterSelect.value;

  classificationSelect.innerHTML = `
    <option value="">
      Select classification
    </option>
  `;

  const parameterDefinition = getSpatialQueryParameter(parameter);

  if (!parameterDefinition) {
    classificationSelect.disabled = true;

    spatialQueryState.classification = "";

    scheduleSpatialQueryControlLayoutUpdate();

    return;
  }

  parameterDefinition.classifications.forEach((classification) => {
    const option = document.createElement("option");

    option.value = classification.value;
    option.textContent = classification.label;

    classificationSelect.appendChild(option);
  });

  classificationSelect.disabled = false;

  classificationSelect.value = spatialQueryState.classification;

  if (classificationSelect.value !== spatialQueryState.classification) {
    spatialQueryState.classification = "";
  }

  scheduleSpatialQueryControlLayoutUpdate();
}

/* ============================================================
   SPATIAL FIELD HELPERS
   ============================================================ */

function updateSpatialQuerySpatialFields(container) {
  const fieldsContainer = container.querySelector(
    "#spatialQuerySpatialFields",
  );

  if (!fieldsContainer) {
    return;
  }

  cancelSpatialQueryMapInteraction(false);

  fieldsContainer.innerHTML = "";

  if (spatialQueryState.spatialType === "radius") {
    fieldsContainer.innerHTML = `
      <div class="spatial-query-field">
        <label for="spatialQueryLatitude">
          Latitude
        </label>

        <input
          type="number"
          id="spatialQueryLatitude"
          class="spatial-query-input"
          min="-90"
          max="90"
          step="any"
          placeholder="17.6868"
          value="${escapeSpatialQueryAttribute(
            spatialQueryState.latitude,
          )}"
        />
      </div>

      <div class="spatial-query-field">
        <label for="spatialQueryLongitude">
          Longitude
        </label>

        <input
          type="number"
          id="spatialQueryLongitude"
          class="spatial-query-input"
          min="-180"
          max="180"
          step="any"
          placeholder="83.2185"
          value="${escapeSpatialQueryAttribute(
            spatialQueryState.longitude,
          )}"
        />
      </div>

      <div class="spatial-query-field">
        <label for="spatialQueryRadius">
          Radius (m)
        </label>

        <input
          type="number"
          id="spatialQueryRadius"
          class="spatial-query-input"
          min="0"
          max="100000"
          step="1"
          placeholder="2000"
          value="${escapeSpatialQueryAttribute(
            spatialQueryState.radius,
          )}"
        />

        <small class="spatial-query-help">
          Maximum 100,000 meters.
        </small>
      </div>

      <div class="spatial-query-map-tools">
        <button
          type="button"
          id="spatialQueryPickCoordinates"
          class="spatial-query-button spatial-query-button-secondary"
        >
          Pick Coordinates
        </button>

        <button
          type="button"
          id="spatialQueryClearSelection"
          class="spatial-query-button spatial-query-button-secondary"
        >
          Clear Selection
        </button>

        <small
          id="spatialQueryMapToolStatus"
          class="spatial-query-help"
          aria-live="polite"
        >
          Click "Pick Coordinates", then click the map.
        </small>
      </div>
    `;

    bindSpatialQueryMapToolEvents(container);

    scheduleSpatialQueryControlLayoutUpdate();

    return;
  }

  if (spatialQueryState.spatialType === "bbox") {
    fieldsContainer.innerHTML = `
      <div class="spatial-query-field">
        <label for="spatialQueryMinLatitude">
          Minimum Latitude
        </label>

        <input
          type="number"
          id="spatialQueryMinLatitude"
          class="spatial-query-input"
          min="-90"
          max="90"
          step="any"
          value="${escapeSpatialQueryAttribute(
            spatialQueryState.minLatitude,
          )}"
        />
      </div>

      <div class="spatial-query-field">
        <label for="spatialQueryMaxLatitude">
          Maximum Latitude
        </label>

        <input
          type="number"
          id="spatialQueryMaxLatitude"
          class="spatial-query-input"
          min="-90"
          max="90"
          step="any"
          value="${escapeSpatialQueryAttribute(
            spatialQueryState.maxLatitude,
          )}"
        />
      </div>

      <div class="spatial-query-field">
        <label for="spatialQueryMinLongitude">
          Minimum Longitude
        </label>

        <input
          type="number"
          id="spatialQueryMinLongitude"
          class="spatial-query-input"
          min="-180"
          max="180"
          step="any"
          value="${escapeSpatialQueryAttribute(
            spatialQueryState.minLongitude,
          )}"
        />
      </div>

      <div class="spatial-query-field">
        <label for="spatialQueryMaxLongitude">
          Maximum Longitude
        </label>

        <input
          type="number"
          id="spatialQueryMaxLongitude"
          class="spatial-query-input"
          min="-180"
          max="180"
          step="any"
          value="${escapeSpatialQueryAttribute(
            spatialQueryState.maxLongitude,
          )}"
        />
      </div>

      <div class="spatial-query-map-tools">
        <button
          type="button"
          id="spatialQueryDrawBox"
          class="spatial-query-button spatial-query-button-secondary"
        >
          Draw Box
        </button>

        <button
          type="button"
          id="spatialQueryClearSelection"
          class="spatial-query-button spatial-query-button-secondary"
        >
          Clear Selection
        </button>

        <small
          id="spatialQueryMapToolStatus"
          class="spatial-query-help"
          aria-live="polite"
        >
          Click "Draw Box", then drag on the map.
        </small>
      </div>
    `;

    bindSpatialQueryMapToolEvents(container);

    scheduleSpatialQueryControlLayoutUpdate();

    return;
  }

  scheduleSpatialQueryControlLayoutUpdate();
}

/* ============================================================
   MAP SELECTION / INTERACTION HELPERS
   ============================================================ */

function clearSpatialQuerySelection() {
  if (spatialQueryLocationMarker) {
    if (
      spatialQueryMap &&
      spatialQueryMap.hasLayer(spatialQueryLocationMarker)
    ) {
      spatialQueryMap.removeLayer(spatialQueryLocationMarker);
    }

    spatialQueryLocationMarker = null;
  }

  if (spatialQuerySelectionRectangle) {
    if (
      spatialQueryMap &&
      spatialQueryMap.hasLayer(spatialQuerySelectionRectangle)
    ) {
      spatialQueryMap.removeLayer(spatialQuerySelectionRectangle);
    }

    spatialQuerySelectionRectangle = null;
  }

  spatialQueryDrawingStartLatLng = null;

  return true;
}

function updateSpatialQueryRadiusCoordinates(
  latitude,
  longitude,
) {
  const container = spatialQueryControlContainer;

  if (!container) {
    return;
  }

  const latitudeInput = container.querySelector(
    "#spatialQueryLatitude",
  );

  const longitudeInput = container.querySelector(
    "#spatialQueryLongitude",
  );

  if (latitudeInput) {
    latitudeInput.value = Number(latitude).toFixed(7);
  }

  if (longitudeInput) {
    longitudeInput.value = Number(longitude).toFixed(7);
  }

  captureSpatialQuerySpatialFields(container);

  updateSpatialQueryControlState(container);
}

function updateSpatialQueryBoundingBox(bounds) {
  if (!bounds || !bounds.isValid()) {
    return;
  }

  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  const container = spatialQueryControlContainer;

  if (!container) {
    return;
  }

  const minLatitudeInput = container.querySelector(
    "#spatialQueryMinLatitude",
  );

  const maxLatitudeInput = container.querySelector(
    "#spatialQueryMaxLatitude",
  );

  const minLongitudeInput = container.querySelector(
    "#spatialQueryMinLongitude",
  );

  const maxLongitudeInput = container.querySelector(
    "#spatialQueryMaxLongitude",
  );

  if (minLatitudeInput) {
    minLatitudeInput.value = Number(southWest.lat).toFixed(7);
  }

  if (maxLatitudeInput) {
    maxLatitudeInput.value = Number(northEast.lat).toFixed(7);
  }

  if (minLongitudeInput) {
    minLongitudeInput.value = Number(southWest.lng).toFixed(7);
  }

  if (maxLongitudeInput) {
    maxLongitudeInput.value = Number(northEast.lng).toFixed(7);
  }

  captureSpatialQuerySpatialFields(container);

  updateSpatialQueryControlState(container);
}


/* ============================================================
   HTML ATTRIBUTE ESCAPING
   ============================================================ */

function escapeSpatialQueryAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ============================================================
   HTML CONTENT ESCAPING
   ============================================================ */

function escapeSpatialQueryHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ============================================================
   CONTROL EVENTS
   ============================================================ */

function bindSpatialQueryControlEvents(container) {
  const parameterSelect = container.querySelector("#spatialQueryParameter");

  const classificationSelect = container.querySelector(
    "#spatialQueryClassification",
  );

  const spatialTypeSelect = container.querySelector("#spatialQuerySpatialType");

  const spatialFieldsContainer = container.querySelector(
    "#spatialQuerySpatialFields",
  );

  const executeButton = container.querySelector("#spatialQueryExecute");

  const focusButton = container.querySelector("#spatialQueryFocus");

  const clearButton = container.querySelector("#spatialQueryClear");

  const toggleButton = container.querySelector(".spatial-query-toggle");
  const moveButton = container.querySelector(
  ".analytical-control-move-button",
);

if (
  moveButton &&
  typeof window.enableMovableAnalyticalControl ===
    "function"
) {
  window.enableMovableAnalyticalControl(
    container,
    moveButton,
  );
}

  if (parameterSelect) {
    parameterSelect.addEventListener("change", () => {
      spatialQueryState.parameter = parameterSelect.value;

      spatialQueryState.classification = "";

      updateSpatialQueryClassificationOptions(container);

      updateSpatialQueryControlState(container);

      scheduleSpatialQueryControlLayoutUpdate();
    });
  }

  if (classificationSelect) {
    classificationSelect.addEventListener("change", () => {
      spatialQueryState.classification = classificationSelect.value;

      updateSpatialQueryControlState(container);
    });
  }

  if (spatialTypeSelect) {
    spatialTypeSelect.value = spatialQueryState.spatialType;

    spatialTypeSelect.addEventListener("change", () => {
      captureSpatialQuerySpatialFields(container);

      spatialQueryState.spatialType = spatialTypeSelect.value;

      updateSpatialQuerySpatialFields(container);

      updateSpatialQueryControlState(container);

      scheduleSpatialQueryControlLayoutUpdate();
    });
  }

  /*
   * Spatial fields are dynamically created whenever the spatial
   * filter changes. Event delegation keeps state synchronized
   * for all dynamically created inputs.
   */
  if (spatialFieldsContainer) {
    spatialFieldsContainer.addEventListener("input", () => {
      captureSpatialQuerySpatialFields(container);

      updateSpatialQueryControlState(container);
    });

    spatialFieldsContainer.addEventListener("change", () => {
      captureSpatialQuerySpatialFields(container);

      updateSpatialQueryControlState(container);
    });
  }

  if (executeButton) {
    executeButton.addEventListener("click", async () => {
      captureSpatialQueryControlState(container);

      await handleSpatialQueryExecution(container);
    });
  }

  if (focusButton) {
    focusButton.addEventListener("click", () => {
      focusSpatialQueryResults();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      clearSpatialQueryResults();

      updateSpatialQueryStatus(
        container,
        "Spatial query results cleared.",
        "success",
      );

      updateSpatialQueryControlState(container);
    });
  }

  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      toggleSpatialQueryControl(container);
    });
  }
}

/* ============================================================
   CAPTURE SPATIAL FIELDS
   ============================================================ */

function captureSpatialQuerySpatialFields(container) {
  const latitude = container.querySelector("#spatialQueryLatitude");

  const longitude = container.querySelector("#spatialQueryLongitude");

  const radius = container.querySelector("#spatialQueryRadius");

  const minLatitude = container.querySelector("#spatialQueryMinLatitude");

  const maxLatitude = container.querySelector("#spatialQueryMaxLatitude");

  const minLongitude = container.querySelector("#spatialQueryMinLongitude");

  const maxLongitude = container.querySelector("#spatialQueryMaxLongitude");

  if (latitude) {
    spatialQueryState.latitude = latitude.value;
  }

  if (longitude) {
    spatialQueryState.longitude = longitude.value;
  }

  if (radius) {
    spatialQueryState.radius = radius.value;
  }

  if (minLatitude) {
    spatialQueryState.minLatitude = minLatitude.value;
  }

  if (maxLatitude) {
    spatialQueryState.maxLatitude = maxLatitude.value;
  }

  if (minLongitude) {
    spatialQueryState.minLongitude = minLongitude.value;
  }

  if (maxLongitude) {
    spatialQueryState.maxLongitude = maxLongitude.value;
  }
}

/* ============================================================
   CAPTURE CONTROL STATE
   ============================================================ */

function captureSpatialQueryControlState(container) {
  const parameterSelect = container.querySelector("#spatialQueryParameter");

  const classificationSelect = container.querySelector(
    "#spatialQueryClassification",
  );

  const spatialTypeSelect = container.querySelector("#spatialQuerySpatialType");

  if (parameterSelect) {
    spatialQueryState.parameter = parameterSelect.value;
  }

  if (classificationSelect) {
    spatialQueryState.classification = classificationSelect.value;
  }

  if (spatialTypeSelect) {
    spatialQueryState.spatialType = spatialTypeSelect.value;
  }

  captureSpatialQuerySpatialFields(container);
}

/* ============================================================
   CONTROL STATE
   ============================================================ */

function updateSpatialQueryControlState(container) {
  const executeButton = container.querySelector("#spatialQueryExecute");

  const focusButton = container.querySelector("#spatialQueryFocus");

  const clearButton = container.querySelector("#spatialQueryClear");

  const validationErrors = validateSpatialQueryState(spatialQueryState);

  if (executeButton) {
    executeButton.disabled =
      spatialQueryRequestInProgress || validationErrors.length > 0;

    executeButton.textContent = spatialQueryRequestInProgress
      ? "Querying..."
      : "Execute Query";
  }

  if (focusButton) {
    focusButton.disabled =
      !hasSpatialQueryResults() || spatialQueryRequestInProgress;
  }

  if (clearButton) {
    clearButton.disabled = !spatialQueryResult || spatialQueryRequestInProgress;
  }
}

/* ============================================================
   EXECUTION HANDLER
   ============================================================ */

async function handleSpatialQueryExecution(container) {
  captureSpatialQueryControlState(container);

  const validationErrors = validateSpatialQueryState(spatialQueryState);

  if (validationErrors.length > 0) {
    updateSpatialQueryStatus(container, validationErrors.join(" "), "error");

    updateSpatialQueryControlState(container);

    return;
  }

  updateSpatialQueryStatus(container, "Executing spatial query...", "loading");

  updateSpatialQueryControlState(container);

  const result = await executeSpatialQuery(spatialQueryState);

  if (!result?.success) {
    if (result?.stale) {
      return;
    }

    const errorMessage = [
      result?.message,
      ...(Array.isArray(result?.errors) ? result.errors : []),
    ]
      .filter(Boolean)
      .filter((message, index, messages) => messages.indexOf(message) === index)
      .join(" ");

    updateSpatialQueryStatus(
      container,
      errorMessage || "Spatial query failed.",
      "error",
    );

    updateSpatialQueryControlState(container);

    return;
  }

  const count = result?.result?.count ?? 0;

  if (count === 0) {
    updateSpatialQueryStatus(
      container,
      "No matching soil samples found.",
      "empty",
    );
  } else {
    updateSpatialQueryStatus(
      container,
      `${count} matching soil sample${count === 1 ? "" : "s"} found.`,
      "success",
    );
  }

  updateSpatialQueryControlState(container);

  scheduleSpatialQueryControlLayoutUpdate();
}

/* ============================================================
   STATUS
   ============================================================ */

function updateSpatialQueryStatus(container, message, type = "info") {
  const status = container.querySelector("#spatialQueryStatus");

  if (!status) {
    return;
  }

  status.textContent = message;

  status.className = "spatial-query-status";

  if (type) {
    status.classList.add(`spatial-query-status-${type}`);
  }

  scheduleSpatialQueryControlLayoutUpdate();
}

/* ============================================================
   CONTROL TOGGLE
   ============================================================ */

function toggleSpatialQueryControl(container) {
  const content = container.querySelector("#spatialQueryControlContent");

  const toggleButton = container.querySelector(".spatial-query-toggle");

  if (!content || !toggleButton) {
    return;
  }

  const collapsed = content.hasAttribute("hidden");

  if (collapsed) {
    content.removeAttribute("hidden");

    toggleButton.textContent = "−";

    toggleButton.setAttribute("aria-expanded", "true");

    toggleButton.setAttribute("title", "Collapse spatial query controls");
  } else {
    content.setAttribute("hidden", "");

    toggleButton.textContent = "+";

    toggleButton.setAttribute("aria-expanded", "false");

    toggleButton.setAttribute("title", "Expand spatial query controls");
  }

  scheduleSpatialQueryControlLayoutUpdate();
}

/* ============================================================
   CONTROL UPDATE
   ============================================================ */

function updateSpatialQueryControl() {
  if (!spatialQueryControl) {
    return;
  }

  const container =
    spatialQueryControlContainer || spatialQueryControl.getContainer();

  if (!container) {
    return;
  }

  populateSpatialQueryParameterOptions(container);

  updateSpatialQueryClassificationOptions(container);

  const spatialTypeSelect = container.querySelector("#spatialQuerySpatialType");

  if (spatialTypeSelect) {
    spatialTypeSelect.value = spatialQueryState.spatialType;
  }

  updateSpatialQuerySpatialFields(container);

  updateSpatialQueryControlState(container);

  scheduleSpatialQueryControlLayoutUpdate();
}

/* ============================================================
   PARAMETER HELPERS
   ============================================================ */

function getSpatialQueryParameter(parameter) {
  return SPATIAL_QUERY_PARAMETERS.find((item) => item.value === parameter);
}

function getSpatialQueryClassification(parameter, classification) {
  const parameterDefinition = getSpatialQueryParameter(parameter);

  if (!parameterDefinition) {
    return null;
  }

  return parameterDefinition.classifications.find(
    (item) => item.value === classification,
  );
}

function getSpatialQueryParameterLabel(parameter) {
  return getSpatialQueryParameter(parameter)?.label ?? parameter;
}

function getSpatialQueryClassificationLabel(parameter, classification) {
  return (
    getSpatialQueryClassification(parameter, classification)?.label ??
    classification
  );
}

/* ============================================================
   VALIDATION HELPERS
   ============================================================ */

function isFiniteNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return false;
  }

  return Number.isFinite(Number(value));
}

function isValidLatitude(value) {
  if (value === "" || value === null || value === undefined) {
    return false;
  }

  const numericValue = Number(value);

  return (
    Number.isFinite(numericValue) && numericValue >= -90 && numericValue <= 90
  );
}

function isValidLongitude(value) {
  if (value === "" || value === null || value === undefined) {
    return false;
  }

  const numericValue = Number(value);

  return (
    Number.isFinite(numericValue) && numericValue >= -180 && numericValue <= 180
  );
}

function validateSpatialQueryState(state = spatialQueryState) {
  const errors = [];

  const parameter = state.parameter?.trim() ?? "";

  const classification = state.classification?.trim() ?? "";

  const spatialType = state.spatialType?.trim() || "none";

  /* ----------------------------------------------------------
     Attribute condition
     ---------------------------------------------------------- */

  if (!parameter && classification) {
    errors.push("Parameter is required when classification is provided.");
  }

  if (parameter) {
    const parameterDefinition = getSpatialQueryParameter(parameter);

    if (!parameterDefinition) {
      errors.push("Invalid spatial query parameter.");
    }

    if (!classification) {
      errors.push("Classification is required when parameter is provided.");
    } else if (
      parameterDefinition &&
      !getSpatialQueryClassification(parameter, classification)
    ) {
      errors.push("Invalid classification for the selected parameter.");
    }
  }

  /* ----------------------------------------------------------
     Spatial condition
     ---------------------------------------------------------- */

  if (!["none", "radius", "bbox"].includes(spatialType)) {
    errors.push("Invalid spatial query type.");
  }

  if (spatialType === "radius") {
    if (!isValidLatitude(state.latitude)) {
      errors.push("Latitude must be between -90 and 90.");
    }

    if (!isValidLongitude(state.longitude)) {
      errors.push("Longitude must be between -180 and 180.");
    }

    if (!isFiniteNumber(state.radius)) {
      errors.push("Radius must be a valid number.");
    } else {
      const radius = Number(state.radius);

      if (radius <= SPATIAL_QUERY_RADIUS_MIN) {
        errors.push("Radius must be greater than 0 meters.");
      }

      if (radius > SPATIAL_QUERY_RADIUS_MAX) {
        errors.push("Radius cannot exceed 100000 meters.");
      }
    }
  }

  if (spatialType === "bbox") {
    if (!isValidLatitude(state.minLatitude)) {
      errors.push("Minimum latitude must be between -90 and 90.");
    }

    if (!isValidLatitude(state.maxLatitude)) {
      errors.push("Maximum latitude must be between -90 and 90.");
    }

    if (!isValidLongitude(state.minLongitude)) {
      errors.push("Minimum longitude must be between -180 and 180.");
    }

    if (!isValidLongitude(state.maxLongitude)) {
      errors.push("Maximum longitude must be between -180 and 180.");
    }

    if (
      isValidLatitude(state.minLatitude) &&
      isValidLatitude(state.maxLatitude) &&
      Number(state.minLatitude) > Number(state.maxLatitude)
    ) {
      errors.push("Minimum latitude cannot be greater than maximum latitude.");
    }

    if (
      isValidLongitude(state.minLongitude) &&
      isValidLongitude(state.maxLongitude) &&
      Number(state.minLongitude) > Number(state.maxLongitude)
    ) {
      errors.push(
        "Minimum longitude cannot be greater than maximum longitude.",
      );
    }
  }

  /* ----------------------------------------------------------
     Unrestricted query protection
     ---------------------------------------------------------- */

  if (!parameter && spatialType === "none") {
    errors.push(
      "Select an attribute condition or spatial condition before executing the query.",
    );
  }

  return errors;
}

/* ============================================================
   QUERY REQUEST BUILDER
   ============================================================ */

/*
 * Phase 10.3 REST API contract:
 *
 * Attribute filters use the parameter/classification pair:
 *
 *   ?parameter=ph&classification=acidic
 *   ?parameter=nitrogen&classification=medium
 *   ?parameter=phosphorus&classification=high
 *   ?parameter=potassium&classification=very_high
 *   ?parameter=organic_carbon&classification=medium
 *   ?parameter=electrical_conductivity&classification=non_saline
 *   ?parameter=overall_fertility&classification=low
 *
 * Spatial filters are represented independently:
 *
 *   ?latitude=...
 *   &longitude=...
 *   &radius=...
 *
 * or:
 *
 *   ?minLatitude=...
 *   &maxLatitude=...
 *   &minLongitude=...
 *   &maxLongitude=...
 *
 * Attribute and spatial conditions may be combined.
 *
 * Scientific classification remains backend-authoritative.
 * The frontend only sends the selected classification ID.
 */

function buildSpatialQueryParams(state = spatialQueryState) {
  const errors = validateSpatialQueryState(state);

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      params: null,
    };
  }

  const params = new URLSearchParams();

  /* ----------------------------------------------------------
     Attribute condition
     ---------------------------------------------------------- */

  if (state.parameter) {
    params.set("parameter", state.parameter);
    params.set("classification", state.classification);
  }

  /* ----------------------------------------------------------
     Radius condition
     ---------------------------------------------------------- */

  if (state.spatialType === "radius") {
    params.set("latitude", String(Number(state.latitude)));

    params.set("longitude", String(Number(state.longitude)));

    params.set("radius", String(Number(state.radius)));
  }

  /* ----------------------------------------------------------
     Bounding box condition
     ---------------------------------------------------------- */

  if (state.spatialType === "bbox") {
    params.set("minLatitude", String(Number(state.minLatitude)));

    params.set("maxLatitude", String(Number(state.maxLatitude)));

    params.set("minLongitude", String(Number(state.minLongitude)));

    params.set("maxLongitude", String(Number(state.maxLongitude)));
  }

  return {
    valid: true,
    errors: [],
    params,
  };
}

/* ============================================================
   QUERY STATE ACCESS
   ============================================================ */

function getSpatialQueryState() {
  return {
    ...spatialQueryState,
  };
}

function setSpatialQueryState(nextState = {}) {
  spatialQueryState = {
    ...spatialQueryState,
    ...nextState,
  };

  updateSpatialQueryControl();

  return getSpatialQueryState();
}

function resetSpatialQueryState() {
  spatialQueryState = {
    parameter: "",
    classification: "",
    spatialType: "none",
    latitude: "",
    longitude: "",
    radius: "",
    minLatitude: "",
    maxLatitude: "",
    minLongitude: "",
    maxLongitude: "",
  };

  updateSpatialQueryControl();

  return getSpatialQueryState();
}

/* ============================================================
   QUERY RESULT HELPERS
   ============================================================ */

function getSpatialQueryResult() {
  return spatialQueryResult;
}

function getSpatialQueryResultSamples() {
  return spatialQueryResult?.result?.samples ?? [];
}

function getSpatialQueryResultCount() {
  return spatialQueryResult?.result?.count ?? 0;
}

function hasSpatialQueryResults() {
  return getSpatialQueryResultCount() > 0;
}

/* ============================================================
   RESULT PANE
   ============================================================ */

/*
 * The result pane is intentionally placed above the normal
 * overlay pane and marker pane.
 *
 * This makes the spatial-query result presentation independent
 * of thematic marker symbology and normal sample markers.
 */

function ensureSpatialQueryResultPane() {
  if (!spatialQueryMap) {
    return null;
  }

  const mapContainer = spatialQueryMap.getContainer();

  if (!mapContainer) {
    return null;
  }

  let pane = spatialQueryMap.getPane(SPATIAL_QUERY_RESULT_PANE_NAME);

  if (!pane) {
    pane = spatialQueryMap.createPane(SPATIAL_QUERY_RESULT_PANE_NAME);
  }

  pane.style.zIndex = SPATIAL_QUERY_RESULT_PANE_Z_INDEX;

  pane.style.pointerEvents = "auto";

  return pane;
}

/* ============================================================
   RESULT LAYER
   ============================================================ */

function ensureSpatialQueryResultLayer() {
  if (!spatialQueryMap) {
    return null;
  }

  ensureSpatialQueryResultPane();

  if (!spatialQueryResultLayerGroup) {
    spatialQueryResultLayerGroup = L.layerGroup();
  }

  if (!spatialQueryMap.hasLayer(spatialQueryResultLayerGroup)) {
    spatialQueryResultLayerGroup.addTo(spatialQueryMap);
  }

  return spatialQueryResultLayerGroup;
}

function clearSpatialQueryResultLayer() {
  if (!spatialQueryResultLayerGroup) {
    return;
  }

  spatialQueryResultLayerGroup.clearLayers();

  if (
    spatialQueryMap &&
    spatialQueryMap.hasLayer(spatialQueryResultLayerGroup)
  ) {
    spatialQueryMap.removeLayer(spatialQueryResultLayerGroup);
  }
}

function clearSpatialQueryResults() {
  spatialQueryResult = null;

  clearSpatialQueryResultLayer();

  updateSpatialQueryControl();

  return true;
}

/* ============================================================
   RESULT MARKER
   ============================================================ */

/*
 * Spatial query results intentionally use a distinct symbol.
 *
 * Normal soil sample markers are controlled by map.js thematic
 * symbology. These markers are not.
 *
 * The result marker:
 *
 *   - uses the dedicated result pane
 *   - is larger than normal markers
 *   - has a strong outline
 *   - is independently interactive
 *   - is explicitly brought to the front
 */

function createSpatialQueryResultMarker(sample) {
  if (!spatialQueryMap || !sample) {
    return null;
  }

  const latitude = Number(sample.latitude);

  const longitude = Number(sample.longitude);

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null;
  }

  ensureSpatialQueryResultPane();

  const marker = L.circleMarker([latitude, longitude], {
    pane: SPATIAL_QUERY_RESULT_PANE_NAME,
    radius: 11,
    weight: 4,
    opacity: 1,
    fillOpacity: 0.95,
    className: "spatial-query-result-marker",
  });

  marker.bindPopup(buildSpatialQueryResultPopup(sample));

  marker.on("add", () => {
    if (typeof marker.bringToFront === "function") {
      marker.bringToFront();
    }
  });

  return marker;
}

function renderSpatialQueryResults() {
  clearSpatialQueryResultLayer();

  const samples = getSpatialQueryResultSamples();

  if (!spatialQueryMap || samples.length === 0) {
    return 0;
  }

  const layerGroup = ensureSpatialQueryResultLayer();

  if (!layerGroup) {
    return 0;
  }

  let renderedCount = 0;

  samples.forEach((sample) => {
    const marker = createSpatialQueryResultMarker(sample);

    if (!marker) {
      return;
    }

    layerGroup.addLayer(marker);

    /*
     * Explicitly bring every result marker to the
     * front after it has been added.
     */
    if (typeof marker.bringToFront === "function") {
      marker.bringToFront();
    }

    renderedCount += 1;
  });

  /*
   * Reassert the result pane z-index after rendering.
   * This protects the result presentation from other
   * map-layer operations.
   */
  ensureSpatialQueryResultPane();

  return renderedCount;
}

/* ============================================================
   RESULT POPUP
   ============================================================ */

function buildSpatialQueryResultPopup(sample) {
  const sampleCode = sample.sample_code ?? sample.id ?? "Unknown";

  const latitude = Number(sample.latitude);

  const longitude = Number(sample.longitude);

  const parameter =
    spatialQueryResult?.query?.attribute?.parameter ??
    spatialQueryState.parameter;

  const classification =
    spatialQueryResult?.query?.attribute?.classification ??
    spatialQueryState.classification;

  let analysisLabel = "";

  let analysisValue = "";

  if (parameter === "overall_fertility") {
    analysisLabel = "Overall Fertility";

    analysisValue =
      sample.analysis?.overall_fertility ?? classification ?? "Unavailable";
  } else if (parameter) {
    analysisLabel = getSpatialQueryParameterLabel(parameter);

    analysisValue =
      sample.analysis?.[parameter] ?? classification ?? "Unavailable";
  }

  const distanceMarkup =
    sample.distance !== undefined && sample.distance !== null
      ? `
          <div>
            <strong>Distance:</strong>
            ${Number(sample.distance).toFixed(1)}
            ${escapeSpatialQueryHtml(sample.distanceUnit ?? "m")}
          </div>
        `
      : "";

  const analysisMarkup = analysisLabel
    ? `
        <div>
          <strong>
            ${escapeSpatialQueryHtml(analysisLabel)}:
          </strong>
          ${escapeSpatialQueryHtml(
            getSpatialQueryClassificationLabel(parameter, analysisValue),
          )}
        </div>
      `
    : "";

  return `
    <div class="spatial-query-result-popup">
      <div>
        <strong>Spatial Query Result</strong>
      </div>

      <div>
        <strong>Sample:</strong>
        ${escapeSpatialQueryHtml(sampleCode)}
      </div>

      <div>
        <strong>Latitude:</strong>
        ${Number.isFinite(latitude) ? latitude.toFixed(6) : "Unavailable"}
      </div>

      <div>
        <strong>Longitude:</strong>
        ${Number.isFinite(longitude) ? longitude.toFixed(6) : "Unavailable"}
      </div>

      ${distanceMarkup}

      ${analysisMarkup}
    </div>
  `;
}

/* ============================================================
   FOCUS RESULTS
   ============================================================ */

function focusSpatialQueryResults() {
  const samples = getSpatialQueryResultSamples();

  if (!spatialQueryMap || samples.length === 0) {
    return false;
  }

  const bounds = [];

  samples.forEach((sample) => {
    const latitude = Number(sample.latitude);

    const longitude = Number(sample.longitude);

    if (isValidLatitude(latitude) && isValidLongitude(longitude)) {
      bounds.push([latitude, longitude]);
    }
  });

  if (bounds.length === 0) {
    return false;
  }

  spatialQueryMap.fitBounds(L.latLngBounds(bounds), {
    padding: [30, 30],
    maxZoom: 15,
  });

  /*
   * fitBounds may cause map/layer redraws.
   * Reassert result marker visibility afterwards.
   */
  window.requestAnimationFrame(() => {
    ensureSpatialQueryResultPane();

    if (spatialQueryResultLayerGroup) {
      spatialQueryResultLayerGroup.eachLayer((layer) => {
        if (typeof layer.bringToFront === "function") {
          layer.bringToFront();
        }
      });
    }
  });

  return true;
}

/* ============================================================
   API REQUEST
   ============================================================ */

async function executeSpatialQuery(state = spatialQueryState) {
  const request = buildSpatialQueryParams(state);

  if (!request.valid) {
    return {
      success: false,
      phase: "10.4",
      message: request.errors[0],
      errors: request.errors,
    };
  }

  if (spatialQueryRequestInProgress) {
    return {
      success: false,
      phase: "10.4",
      message: "A spatial query is already in progress.",
      errors: ["A spatial query is already in progress."],
    };
  }

  spatialQueryRequestInProgress = true;

  const requestSequence = ++spatialQueryRequestSequence;

  clearSpatialQueryResults();

  updateSpatialQueryControl();

  try {
    const queryString = request.params.toString();

    console.log(
      "Executing spatial query:",
      `${SPATIAL_QUERY_API_BASE}?${queryString}`,
    );

    const response = await fetch(`${SPATIAL_QUERY_API_BASE}?${queryString}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    let data = null;

    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (requestSequence !== spatialQueryRequestSequence) {
      return {
        success: false,
        phase: "10.4",
        message: "Spatial query response is stale.",
        errors: ["Spatial query response is stale."],
        stale: true,
      };
    }

    if (!response.ok || !data?.success) {
      const errors = Array.isArray(data?.errors) ? data.errors : [];

      return {
        success: false,
        phase: data?.phase ?? "10.4",
        message: data?.message ?? "Failed to execute spatial query.",
        errors,
      };
    }

    /*
     * Phase 10.3 response contract:
     *
     * {
     *   success: true,
     *   phase: "10.3",
     *   query: {...},
     *   result: {
     *     count: number,
     *     samples: [...]
     *   },
     *   spatialMetadata: {...},
     *   metadata: {...}
     * }
     */

    const resultCount = data?.result?.count ?? 0;

    const resultSamples = Array.isArray(data?.result?.samples)
      ? data.result.samples
      : [];

    console.log("Spatial query API result:", {
      success: data.success,
      phase: data.phase,
      count: resultCount,
      samples: resultSamples,
      query: data.query,
    });

    /*
     * Preserve the complete backend response.
     * Do not reconstruct or alter the scientific
     * classification result.
     */
    spatialQueryResult = data;

    renderSpatialQueryResults();

    return data;
  } catch (error) {
    return {
      success: false,
      phase: "10.4",
      message: error?.message ?? "Failed to execute spatial query.",
      errors: [error?.message ?? "Failed to execute spatial query."],
    };
  } finally {
    if (requestSequence === spatialQueryRequestSequence) {
      spatialQueryRequestInProgress = false;

      updateSpatialQueryControl();
    }
  }
}

/* ============================================================
   INITIALIZATION
   ============================================================ */


/* ============================================================
   MAP INTERACTION SUBSYSTEM
   ============================================================ */

/* ============================================================
   MAP INTERACTION STATE / HELPERS
   ============================================================ */

function isSpatialQueryMapInteractionActive() {
  return spatialQueryMapInteractionMode !== "none";
}

function setSpatialQueryMapCursor(active) {
  if (!spatialQueryMap) {
    return;
  }

  const mapContainer = spatialQueryMap.getContainer();

  if (!mapContainer) {
    return;
  }

  mapContainer.classList.toggle(
    "spatial-query-map-tool-active",
    Boolean(active),
  );
}

function updateSpatialQueryMapToolStatus(message) {
  if (!spatialQueryControlContainer) {
    return;
  }

  const status =
    spatialQueryControlContainer.querySelector(
      "#spatialQueryMapToolStatus",
    );

  if (status) {
    status.textContent = message || "";
  }
}

/* ============================================================
   START COORDINATE PICKER
   ============================================================ */

function startSpatialQueryCoordinatePicker() {
  if (!spatialQueryMap) {
    return false;
  }

  cancelSpatialQueryMapInteraction(true);

  spatialQueryMapInteractionMode = "pick_coordinates";

  setSpatialQueryMapCursor(true);

  updateSpatialQueryMapToolStatus(
    "Click the map to select coordinates.",
  );

  return true;
}

/* ============================================================
   START BOUNDING BOX DRAWING
   ============================================================ */

function startSpatialQueryBoxDrawing() {
  if (!spatialQueryMap) {
    return false;
  }

  cancelSpatialQueryMapInteraction(true);

  spatialQueryMapInteractionMode = "draw_box";

  spatialQueryDrawingStartLatLng = null;

  spatialQueryMapDraggingWasEnabled =
    spatialQueryMap.dragging.enabled();

  /*
   * Disable Leaflet's normal map dragging while the user
   * draws the rectangle.
   */
  spatialQueryMap.dragging.disable();

  setSpatialQueryMapCursor(true);

  updateSpatialQueryMapToolStatus(
    "Drag on the map to draw the bounding box.",
  );

  return true;
}

function markSpatialQueryMapClickToIgnore() {
  spatialQueryIgnoreNextMapClick = true;
}

function consumeSpatialQueryIgnoredMapClick() {
  if (!spatialQueryIgnoreNextMapClick) {
    return false;
  }

  spatialQueryIgnoreNextMapClick = false;

  return true;
}

/* ============================================================
   MAP CLICK  PICK COORDINATES
   ============================================================ */

function handleSpatialQueryMapClick(event) {
  if (
    spatialQueryMapInteractionMode !== "pick_coordinates" ||
    !event?.latlng
  ) {
    return;
  }

  const latitude = Number(event.latlng.lat);
  const longitude = Number(event.latlng.lng);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    updateSpatialQueryMapToolStatus(
      "Invalid map coordinates. Please try again.",
    );

    return;
  }

  clearSpatialQuerySelection();

  spatialQueryLocationMarker = L.circleMarker(
    [latitude, longitude],
    {
      radius: 7,
      weight: 2,
      fillOpacity: 0.85,
      interactive: false,
    },
  );

  spatialQueryLocationMarker.addTo(spatialQueryMap);

  updateSpatialQueryRadiusCoordinates(
    latitude,
    longitude,
  );

  finishSpatialQueryMapInteraction();

  updateSpatialQueryMapToolStatus(
    `Selected ${latitude.toFixed(7)}, ${longitude.toFixed(7)}.`,
  );
}

/* ============================================================
   MAP MOUSE DOWN  START BOX
   ============================================================ */

function handleSpatialQueryMapMouseDown(event) {
  if (
    spatialQueryMapInteractionMode !== "draw_box" ||
    !event?.latlng
  ) {
    return;
  }

  spatialQueryDrawingStartLatLng = event.latlng;

  clearSpatialQuerySelection();

  /*
   * clearSpatialQuerySelection() clears the drawing start
   * coordinate, so restore it immediately afterward.
   */
  spatialQueryDrawingStartLatLng = event.latlng;

  /*
   * Prevent this mouse action from being interpreted as
   * another map operation.
   */
  if (event.originalEvent) {
    L.DomEvent.stop(event.originalEvent);
  }
}

/* ============================================================
   MAP MOUSE MOVE  UPDATE BOX
   ============================================================ */

function handleSpatialQueryMapMouseMove(event) {
  if (
    spatialQueryMapInteractionMode !== "draw_box" ||
    !spatialQueryDrawingStartLatLng ||
    !event?.latlng
  ) {
    return;
  }

  const bounds = L.latLngBounds(
    spatialQueryDrawingStartLatLng,
    event.latlng,
  );

  if (spatialQuerySelectionRectangle) {
    spatialQuerySelectionRectangle.setBounds(bounds);
  } else {
    spatialQuerySelectionRectangle = L.rectangle(
      bounds,
      {
        weight: 2,
        fillOpacity: 0.12,
        interactive: false,
      },
    ).addTo(spatialQueryMap);
  }

  if (event.originalEvent) {
    L.DomEvent.stop(event.originalEvent);
  }
}

/* ============================================================
   MAP MOUSE UP  COMPLETE BOX
   ============================================================ */

function handleSpatialQueryMapMouseUp(event) {
  if (
    spatialQueryMapInteractionMode !== "draw_box" ||
    !spatialQueryDrawingStartLatLng ||
    !event?.latlng
  ) {
    return;
  }

  const bounds = L.latLngBounds(
    spatialQueryDrawingStartLatLng,
    event.latlng,
  );

  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  if (
    northEast.lat === southWest.lat ||
    northEast.lng === southWest.lng
  ) {
    cancelSpatialQueryMapInteraction(false);

    updateSpatialQueryMapToolStatus(
      "Draw a box with a non-zero width and height.",
    );

    return;
  }

  if (spatialQuerySelectionRectangle) {
    spatialQuerySelectionRectangle.setBounds(bounds);
  } else {
    spatialQuerySelectionRectangle = L.rectangle(
      bounds,
      {
        weight: 2,
        fillOpacity: 0.12,
        interactive: false,
      },
    ).addTo(spatialQueryMap);
  }

  updateSpatialQueryBoundingBox(bounds);

  /*
   * The mouseup that completes the rectangle can generate
   * a Leaflet click immediately afterward.
   *
   * Tell the map-level Spatial Analysis handler to ignore
   * exactly that click.
   */
  markSpatialQueryMapClickToIgnore();

  finishSpatialQueryMapInteraction();

  updateSpatialQueryMapToolStatus(
    "Bounding box selected. You can edit the values manually.",
  );
}

/* ============================================================
   MAP INTERACTION HANDLERS
   ============================================================ */

function attachSpatialQueryMapInteractionHandlers() {
  if (
    !spatialQueryMap ||
    spatialQueryMapInteractionHandlersAttached
  ) {
    return;
  }

  spatialQueryMap.on(
    "click",
    handleSpatialQueryMapClick,
  );

  spatialQueryMap.on(
    "mousedown",
    handleSpatialQueryMapMouseDown,
  );

  spatialQueryMap.on(
    "mousemove",
    handleSpatialQueryMapMouseMove,
  );

  spatialQueryMap.on(
    "mouseup",
    handleSpatialQueryMapMouseUp,
  );

  spatialQueryMapInteractionHandlersAttached = true;
}

/* ============================================================
   MAP TOOL BUTTON EVENTS
   ============================================================ */

function bindSpatialQueryMapToolEvents(container) {
  const pickCoordinatesButton = container.querySelector(
    "#spatialQueryPickCoordinates",
  );

  const drawBoxButton = container.querySelector(
    "#spatialQueryDrawBox",
  );

  const clearSelectionButton = container.querySelector(
    "#spatialQueryClearSelection",
  );

  if (pickCoordinatesButton) {
    pickCoordinatesButton.addEventListener(
      "click",
      () => {
        startSpatialQueryCoordinatePicker();
      },
    );
  }

  if (drawBoxButton) {
    drawBoxButton.addEventListener(
      "click",
      () => {
        startSpatialQueryBoxDrawing();
      },
    );
  }

  if (clearSelectionButton) {
    clearSelectionButton.addEventListener(
      "click",
      () => {
        cancelSpatialQueryMapInteraction(true);

        if (spatialQueryState.spatialType === "radius") {
          spatialQueryState.latitude = "";
          spatialQueryState.longitude = "";

          const latitudeInput = container.querySelector(
            "#spatialQueryLatitude",
          );

          const longitudeInput = container.querySelector(
            "#spatialQueryLongitude",
          );

          if (latitudeInput) {
            latitudeInput.value = "";
          }

          if (longitudeInput) {
            longitudeInput.value = "";
          }
        }

        if (spatialQueryState.spatialType === "bbox") {
          spatialQueryState.minLatitude = "";
          spatialQueryState.maxLatitude = "";
          spatialQueryState.minLongitude = "";
          spatialQueryState.maxLongitude = "";

          [
            "#spatialQueryMinLatitude",
            "#spatialQueryMaxLatitude",
            "#spatialQueryMinLongitude",
            "#spatialQueryMaxLongitude",
          ].forEach((selector) => {
            const input = container.querySelector(selector);

            if (input) {
              input.value = "";
            }
          });
        }

        updateSpatialQueryControlState(container);

        updateSpatialQueryMapToolStatus(
          "Selection cleared.",
        );
      },
    );
  }
}
function finishSpatialQueryMapInteraction() {
  const completedMode =
    spatialQueryMapInteractionMode;

  spatialQueryMapInteractionMode = "none";

  spatialQueryDrawingStartLatLng = null;

  setSpatialQueryMapCursor(false);

  if (
    completedMode === "draw_box" &&
    spatialQueryMap &&
    spatialQueryMapDraggingWasEnabled
  ) {
    spatialQueryMap.dragging.enable();
  }
}

function cancelSpatialQueryMapInteraction(
  clearSelection = true,
) {
  if (
    spatialQueryMap &&
    spatialQueryMapInteractionMode === "draw_box"
  ) {
    if (spatialQueryMapDraggingWasEnabled) {
      spatialQueryMap.dragging.enable();
    }
  }

  spatialQueryMapInteractionMode = "none";

  spatialQueryDrawingStartLatLng = null;

  setSpatialQueryMapCursor(false);

  if (clearSelection) {
    clearSpatialQuerySelection();
  }

  return true;
}


function initializeSpatialQuery(options = {}) {
  const suppliedMap = options.map;

  if (!suppliedMap) {
    console.warn("Spatial Query: Leaflet map instance was not provided.");

    return false;
  }

  spatialQueryMap = suppliedMap;

  attachSpatialQueryMapInteractionHandlers();

  ensureSpatialQueryResultPane();

  if (!spatialQueryResultLayerGroup) {
    spatialQueryResultLayerGroup = L.layerGroup();
  }

  if (!spatialQueryControl) {
    const control = buildSpatialQueryControl();

    if (control) {
      spatialQueryControl = control;

      spatialQueryControl.addTo(spatialQueryMap);
    }
  }

  attachSpatialQueryMapResizeHandler();

  scheduleSpatialQueryControlLayoutUpdate();

  return true;
}
function toggleSpatialQueryControl() {
  if (!spatialQueryMap) {
    return false;
  }

  if (!spatialQueryControl) {
    initializeSpatialQuery({
      map: spatialQueryMap,
    });
  }

  if (!spatialQueryControl) {
    return false;
  }

  const container =
    spatialQueryControl.getContainer();

  if (!container) {
    return false;
  }

  const isVisible =
    container.style.display !== "none";

  if (isVisible) {
    container.style.display = "none";
  } else {
    container.style.display = "";
  }

  return !isVisible;
}

window.toggleSpatialQueryControl =
  toggleSpatialQueryControl;
/* ============================================================
   REQUEST STATE
   ============================================================ */

function isSpatialQueryRequestInProgress() {
  return spatialQueryRequestInProgress;
}

/* ============================================================
   PUBLIC API
   ============================================================ */

window.initializeSpatialQuery = initializeSpatialQuery;

window.buildSpatialQueryControl = buildSpatialQueryControl;

window.updateSpatialQueryControl = updateSpatialQueryControl;

window.getSpatialQueryParameters = () =>
  SPATIAL_QUERY_PARAMETERS.map((parameter) => ({
    ...parameter,
    classifications: parameter.classifications.map((classification) => ({
      ...classification,
    })),
  }));

window.getSpatialQueryState = getSpatialQueryState;

window.setSpatialQueryState = setSpatialQueryState;

window.resetSpatialQueryState = resetSpatialQueryState;

window.validateSpatialQueryState = validateSpatialQueryState;

window.buildSpatialQueryParams = buildSpatialQueryParams;

window.executeSpatialQuery = executeSpatialQuery;

window.getSpatialQueryResult = getSpatialQueryResult;

window.getSpatialQueryResultSamples = getSpatialQueryResultSamples;

window.getSpatialQueryResultCount = getSpatialQueryResultCount;

window.hasSpatialQueryResults = hasSpatialQueryResults;

window.renderSpatialQueryResults = renderSpatialQueryResults;

window.focusSpatialQueryResults = focusSpatialQueryResults;

window.clearSpatialQueryResults = clearSpatialQueryResults;

window.isSpatialQueryRequestInProgress = isSpatialQueryRequestInProgress;

window.consumeSpatialQueryIgnoredMapClick =
  consumeSpatialQueryIgnoredMapClick;

/* ============================================================
   LOAD MESSAGE
   ============================================================ */

console.log(
  "spatial-query.js loaded successfully. Phase 10.4 spatial query controls, API contract handling, and independent result layer enabled.",
);
