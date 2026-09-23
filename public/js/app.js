// ============================================================
// public/js/app.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 8.2
// IDW Interpolation Frontend Integration + UI Refinement
//
// Application / Dashboard / Soil Sample Entry
//
// Scientific classification and interpretation remain
// exclusively in the backend.
//
// ============================================================

"use strict";

// ============================================================
// APPLICATION STATE
// ============================================================

let soilSamplesLoadingPromise = null;
let analysisPanelsInitialized = false;

// ============================================================
// DOM READY
// ============================================================

document.addEventListener("DOMContentLoaded", initializeApplication);

// ============================================================
// APPLICATION INITIALIZATION
// ============================================================

async function initializeApplication() {
  console.log("");
  console.log("========================================");
  console.log(" SOIL ANALYSIS GIS FRONTEND");
  console.log("========================================");

  try {
    initializeModal();
    initializeSampleForm();
    initializeNumericSteppers();
    initializeRefreshButton();
    initializeSelectedSamplePanel();

    ensureSoilAnalysisTableHeader();

    initializeAnalysisPanels();

    setApplicationStatus("online");

    if (typeof initializeMap === "function") {
      console.log("Initializing map through map.js...");

      const initialized = initializeMap();

      if (!initialized) {
        console.error("Map initialization failed.");
        setApplicationStatus("offline");
      }
    } else {
      console.error(
        "initializeMap() is not available. " +
          "Check that map.js is loaded before app.js.",
      );

      setApplicationStatus("offline");
    }

    await loadSoilSamples();

    console.log("Frontend initialization completed.");
  } catch (error) {
    console.error("Frontend initialization failed:", error);
    setApplicationStatus("offline");
  }
}

// ============================================================
// MODAL
// ============================================================

function initializeModal() {
  const modal = document.getElementById("soilSampleModal");
  const closeButton = document.getElementById("closeModal");
  const cancelButton = document.getElementById("cancelSample");

  if (!modal) {
    console.warn("Soil sample modal was not found.");
    return;
  }

  if (closeButton) {
    closeButton.addEventListener("click", closeAddSampleForm);
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", closeAddSampleForm);
  }

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeAddSampleForm();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      closeAddSampleForm();
    }
  });
}

// ============================================================
// OPEN ADD SAMPLE FORM
// ============================================================

function openAddSampleForm(latitude, longitude) {
  const modal = document.getElementById("soilSampleModal");
  const latitudeInput = document.getElementById("latitude");
  const longitudeInput = document.getElementById("longitude");
  const sampleDateInput = document.getElementById("sampleDate");
  const formError = document.getElementById("formError");

  if (!modal) {
    return;
  }

  if (latitudeInput) {
    latitudeInput.value = Number(latitude).toFixed(7);
  }

  if (longitudeInput) {
    longitudeInput.value = Number(longitude).toFixed(7);
  }

  if (sampleDateInput && !sampleDateInput.value) {
    sampleDateInput.value = getTodayDate();
  }

  if (formError) {
    formError.textContent = "";
    formError.classList.add("hidden");
  }

  modal.classList.remove("hidden");

  const sampleCode = document.getElementById("sampleCode");

  if (sampleCode) {
    sampleCode.focus();
  }
}

// ============================================================
// CLOSE ADD SAMPLE FORM
// ============================================================

function closeAddSampleForm() {
  const modal = document.getElementById("soilSampleModal");

  if (modal) {
    modal.classList.add("hidden");
  }
}

// ============================================================
// SAMPLE FORM
// ============================================================

function initializeSampleForm() {
  const form = document.getElementById("soilSampleForm");

  if (!form) {
    console.warn("Soil sample form was not found.");
    return;
  }

  form.addEventListener("submit", handleSampleFormSubmit);
}

// ============================================================
// NUMERIC STEPPER CONTROLS
// ============================================================
//
// These controls are presentation/UI only.
//
// They do NOT perform scientific classification.
// They simply modify the value of the corresponding
// number input according to its HTML step/min/max.
//
// ============================================================

function initializeNumericSteppers() {
  const stepperButtons = document.querySelectorAll(".soil-stepper-button");

  if (!stepperButtons.length) {
    console.warn("No numeric soil stepper controls were found.");
    return;
  }

  stepperButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.stepperTarget;
      const action = button.dataset.stepperAction;

      const input = document.getElementById(targetId);

      if (!input) {
        console.warn(`Numeric stepper target not found: ${targetId}`);

        return;
      }

      updateNumericStepperValue(input, action);
    });
  });

  console.log(`Numeric stepper controls initialized: ${stepperButtons.length}`);
}

// ============================================================
// UPDATE NUMERIC STEPPER VALUE
// ============================================================

function updateNumericStepperValue(input, action) {
  if (!input || input.type !== "number") {
    return;
  }

  const step = Number(input.step);

  const minimum = input.min !== "" ? Number(input.min) : null;

  const maximum = input.max !== "" ? Number(input.max) : null;

  const effectiveStep = Number.isFinite(step) && step > 0 ? step : 1;

  let currentValue = Number(input.value);

  // ----------------------------------------------------------
  // Empty field
  // ----------------------------------------------------------

  if (!Number.isFinite(currentValue)) {
    if (action === "increment") {
      currentValue = minimum !== null && Number.isFinite(minimum) ? minimum : 0;
    } else {
      return;
    }
  } else if (action === "increment") {
    currentValue += effectiveStep;
  } else if (action === "decrement") {
    currentValue -= effectiveStep;
  } else {
    return;
  }

  // ----------------------------------------------------------
  // Minimum
  // ----------------------------------------------------------

  if (minimum !== null && Number.isFinite(minimum) && currentValue < minimum) {
    currentValue = minimum;
  }

  // ----------------------------------------------------------
  // Maximum
  // ----------------------------------------------------------

  if (maximum !== null && Number.isFinite(maximum) && currentValue > maximum) {
    currentValue = maximum;
  }

  // ----------------------------------------------------------
  // Avoid floating-point display artifacts
  // ----------------------------------------------------------

  const decimalPlaces = getStepDecimalPlaces(effectiveStep);

  if (decimalPlaces > 0) {
    currentValue = Number(currentValue.toFixed(decimalPlaces));
  }

  input.value = String(currentValue);

  input.dispatchEvent(
    new Event("input", {
      bubbles: true,
    }),
  );

  input.dispatchEvent(
    new Event("change", {
      bubbles: true,
    }),
  );

  input.focus();
}

// ============================================================
// GET STEP DECIMAL PLACES
// ============================================================

function getStepDecimalPlaces(step) {
  const stringValue = String(step);

  if (stringValue.includes("e-")) {
    const exponent = Number(stringValue.split("e-")[1]);

    return Number.isFinite(exponent) ? exponent : 0;
  }

  const decimalPart = stringValue.split(".")[1];

  return decimalPart ? decimalPart.length : 0;
}

// ============================================================
// FORM SUBMISSION
// ============================================================

async function handleSampleFormSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const saveButton = document.getElementById("saveSample");

  clearFormError();

  const formData = new FormData(form);

  const payload = buildSamplePayload(formData);

  const validationError = validateSamplePayload(payload);

  if (validationError) {
    showFormError(validationError);
    return;
  }

  try {
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Saving...";
    }

    console.log("Creating soil sample:", payload);

    const response = await fetch("/api/soil-samples", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify(payload),
    });

    const result = await response.json();

    console.log("Create soil sample response:", result);

    if (!response.ok || !result.success) {
      throw new Error(
        result.message ||
          (Array.isArray(result.errors)
            ? result.errors.join(", ")
            : "Failed to save soil sample."),
      );
    }

    console.log("Soil sample created:", result.data);

    closeAddSampleForm();

    form.reset();

    await loadSoilSamples();

    if (
      result.data &&
      result.data.id !== undefined &&
      typeof focusSampleMarker === "function"
    ) {
      focusSampleMarker(result.data.id);
    }
  } catch (error) {
    console.error("Save soil sample failed:", error);

    showFormError(error.message || "Failed to save soil sample.");
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = "Save Sample";
    }
  }
}

// ============================================================
// BUILD SAMPLE PAYLOAD
// ============================================================

function buildSamplePayload(formData) {
  return {
    sample_code: cleanString(formData.get("sample_code")),

    latitude: numberOrNull(formData.get("latitude")),

    longitude: numberOrNull(formData.get("longitude")),

    depth_from_cm: numberOrNull(formData.get("depth_from_cm")),

    depth_to_cm: numberOrNull(formData.get("depth_to_cm")),

    sample_date: cleanString(formData.get("sample_date")) || null,

    ph: numberOrNull(formData.get("ph")),

    nitrogen: numberOrNull(formData.get("nitrogen")),

    phosphorus: numberOrNull(formData.get("phosphorus")),

    potassium: numberOrNull(formData.get("potassium")),

    organic_carbon: numberOrNull(formData.get("organic_carbon")),

    electrical_conductivity: numberOrNull(
      formData.get("electrical_conductivity"),
    ),

    soil_texture: cleanString(formData.get("soil_texture")) || null,
  };
}

// ============================================================
// VALIDATE SAMPLE PAYLOAD
// ============================================================

function validateSamplePayload(payload) {
  if (!payload.sample_code) {
    return "Sample Code is required.";
  }

  if (payload.latitude === null || payload.longitude === null) {
    return "Sample coordinates are required.";
  }

  if (payload.latitude < -90 || payload.latitude > 90) {
    return "Latitude must be between -90 and 90.";
  }

  if (payload.longitude < -180 || payload.longitude > 180) {
    return "Longitude must be between -180 and 180.";
  }

  if (
    payload.depth_from_cm !== null &&
    payload.depth_to_cm !== null &&
    payload.depth_to_cm < payload.depth_from_cm
  ) {
    return "Ending depth cannot be less than starting depth.";
  }

  if (payload.ph !== null && (payload.ph < 0 || payload.ph > 14)) {
    return "pH must be between 0 and 14.";
  }

  return null;
}

// ============================================================
// LOAD SOIL SAMPLES
// ============================================================

async function loadSoilSamples() {
  if (soilSamplesLoadingPromise) {
    console.log("Soil samples request already in progress.");

    return soilSamplesLoadingPromise;
  }

  soilSamplesLoadingPromise = (async () => {
    try {
      console.log("Loading soil samples from API...");

      const response = await fetch("/api/soil-samples", {
        method: "GET",

        headers: {
          Accept: "application/json",
        },

        cache: "no-store",
      });

      const result = await response.json();

      console.log("Soil samples API response:", result);

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to retrieve soil samples.");
      }

      const samples = Array.isArray(result.data) ? result.data : [];

      console.log(`Loaded ${samples.length} soil sample(s).`);

      updateStatistics(samples);

      renderSamplesOnMap(samples);

      synchronizeSelectedSample(samples);

      await loadSoilAnalysis(samples);

      return samples;
    } catch (error) {
      console.error("Failed to load soil samples:", error);

      updateStatistics([]);

      clearSelectedSoilSample();

      renderAnalysisError(error.message);

      renderRecommendationError(error.message);

      renderCropSuitabilityError(error.message);

      renderSoilManagementError(error.message);

      setApplicationStatus("offline");

      throw error;
    } finally {
      soilSamplesLoadingPromise = null;
    }
  })();

  return soilSamplesLoadingPromise;
}

// ============================================================
// RENDER SAMPLES ON MAP
// ============================================================

function renderSamplesOnMap(samples) {
  if (typeof renderSoilSamples !== "function") {
    console.error(
      "renderSoilSamples() is not available. " +
        "Check that map.js is loaded before app.js.",
    );

    return;
  }

  console.log(`Sending ${samples.length} soil sample(s) to map.js...`);

  try {
    renderSoilSamples(samples);
  } catch (error) {
    console.error("renderSoilSamples() failed:", error);
  }
}

// ============================================================
// REFRESH BUTTON
// ============================================================

function initializeRefreshButton() {
  const refreshButton = document.getElementById("refreshMap");

  if (!refreshButton) {
    console.warn("Refresh button was not found.");

    return;
  }

  refreshButton.addEventListener("click", async () => {
    refreshButton.disabled = true;

    refreshButton.title = "Refreshing map...";
    refreshButton.setAttribute(
      "aria-label",
      "Refreshing map",
    );

    refreshButton.classList.add("is-loading");

    try {
      await loadSoilSamples();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      refreshButton.disabled = false;

      refreshButton.title = "Refresh Map";
      refreshButton.setAttribute(
        "aria-label",
        "Refresh Map",
      );

      refreshButton.classList.remove("is-loading");
    }
  });
}

// ============================================================
// SELECTED SOIL SAMPLE
// ============================================================

function initializeSelectedSamplePanel() {
  const container = document.getElementById("selectedSampleContainer");

  if (!container) {
    console.warn("Selected soil sample container was not found.");

    return;
  }

  renderSelectedSampleEmpty();
}

// ============================================================
// MAP -> APP CALLBACK
// ============================================================

window.handleSoilSampleSelected = function handleSoilSampleSelected(sample) {
  if (!sample) {
    return;
  }

  console.log("Application selected soil sample:", sample);

  selectedSoilSample = sample;

  renderSelectedSoilSample(sample);

  loadSelectedSampleReport(sample.id);
};

// ============================================================
// LOAD SELECTED SAMPLE REPORT
// ============================================================

async function loadSelectedSampleReport(sampleId) {
  if (sampleId === null || sampleId === undefined) {
    return;
  }

  try {
    console.log(`Loading complete report for selected sample ${sampleId}...`);

    const report = await loadCompleteSoilReport(sampleId);

    console.log("Selected sample complete report:", report);

    if (report.sample) {
      selectedSoilSample = {
        ...selectedSoilSample,
        ...report.sample,
      };

      renderSelectedSoilSample(selectedSoilSample);
    }

    if (typeof updateThematicMapReport === "function") {
      updateThematicMapReport(report);
    }

    renderSingleSoilAnalysisReport(report);

    renderSingleSoilInterpretationReport(report);

    renderSingleCropSuitabilityReport(report);

    renderSingleSoilManagementReport(report);
  } catch (error) {
    console.error(
      `Failed to load complete report for selected sample ${sampleId}:`,
      error,
    );

    renderRecommendationError(error.message);

    renderCropSuitabilityError(error.message);

    renderSoilManagementError(error.message);
  }
}

// ============================================================
// SYNCHRONIZE SELECTED SAMPLE
// ============================================================

function synchronizeSelectedSample(samples) {
  if (!selectedSoilSample) {
    return;
  }

  const matchingSample = samples.find(
    (sample) => String(sample.id) === String(selectedSoilSample.id),
  );

  if (matchingSample) {
    selectedSoilSample = matchingSample;

    renderSelectedSoilSample(matchingSample);
  } else {
    clearSelectedSoilSample();
  }
}

// ============================================================
// CLEAR SELECTED SAMPLE
// ============================================================

function clearSelectedSoilSample() {
  selectedSoilSample = null;

  renderSelectedSampleEmpty();
}

// ============================================================
// EMPTY SELECTED SAMPLE
// ============================================================

function renderSelectedSampleEmpty() {
  const container = document.getElementById("selectedSampleContainer");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="selected-sample-empty">
      <strong>
        No soil sample selected
      </strong>

      <p>
        Click a soil sample marker on the map
        to view its laboratory information.
      </p>
    </div>
  `;
}

// ============================================================
// RENDER SELECTED SAMPLE
// ============================================================

function renderSelectedSoilSample(sample) {
  const container = document.getElementById("selectedSampleContainer");

  if (!container || !sample) {
    return;
  }

  const latitude = Number(sample.latitude);

  const longitude = Number(sample.longitude);

  const sampleCode = escapeHtml(sample.sample_code || "Unnamed Sample");

  const sampleDate = escapeHtml(sample.sample_date || "—");

  const depthFrom = escapeHtml(sample.depth_from_cm ?? "—");

  const depthTo = escapeHtml(sample.depth_to_cm ?? "—");

  const ph = escapeHtml(sample.ph ?? "—");

  const nitrogen = escapeHtml(sample.nitrogen ?? "—");

  const phosphorus = escapeHtml(sample.phosphorus ?? "—");

  const potassium = escapeHtml(sample.potassium ?? "—");

  const organicCarbon = escapeHtml(sample.organic_carbon ?? "—");

  const ec = escapeHtml(sample.electrical_conductivity ?? "—");

  const texture = escapeHtml(sample.soil_texture || "—");

  const formattedLatitude = Number.isFinite(latitude)
    ? latitude.toFixed(7)
    : "—";

  const formattedLongitude = Number.isFinite(longitude)
    ? longitude.toFixed(7)
    : "—";

  container.innerHTML = `
    <div class="selected-sample-card">

      <div class="selected-sample-card-header">

        <div>

          <h3>
            ${sampleCode}
          </h3>

          <p>
            Soil Sample ID:
            ${escapeHtml(sample.id ?? "—")}
          </p>

        </div>

        <button
          type="button"
          class="selected-sample-map-button"
          id="focusSelectedSample"
        >
          Locate on Map
        </button>

      </div>

      <div class="selected-sample-grid">

        <div class="selected-sample-item">
          <span class="selected-sample-label">
            Sample Date
          </span>

          <strong>
            ${sampleDate}
          </strong>
        </div>

        <div class="selected-sample-item">
          <span class="selected-sample-label">
            Location
          </span>

          <strong>
            ${formattedLatitude},
            ${formattedLongitude}
          </strong>
        </div>

        <div class="selected-sample-item">
          <span class="selected-sample-label">
            Sampling Depth
          </span>

          <strong>
            ${depthFrom} -
            ${depthTo} cm
          </strong>
        </div>

        <div class="selected-sample-item">
          <span class="selected-sample-label">
            Soil Texture
          </span>

          <strong>
            ${texture}
          </strong>
        </div>

        <div class="selected-sample-item">
          <span class="selected-sample-label">
            pH
          </span>

          <strong>
            ${ph}
          </strong>
        </div>

        <div class="selected-sample-item">
          <span class="selected-sample-label">
            Nitrogen
          </span>

          <strong>
            ${nitrogen}
          </strong>
        </div>

        <div class="selected-sample-item">
          <span class="selected-sample-label">
            Phosphorus
          </span>

          <strong>
            ${phosphorus}
          </strong>
        </div>

        <div class="selected-sample-item">
          <span class="selected-sample-label">
            Potassium
          </span>

          <strong>
            ${potassium}
          </strong>
        </div>

        <div class="selected-sample-item">
          <span class="selected-sample-label">
            Organic Carbon
          </span>

          <strong>
            ${organicCarbon}
          </strong>
        </div>

        <div class="selected-sample-item">
          <span class="selected-sample-label">
            Electrical Conductivity
          </span>

          <strong>
            ${ec}
          </strong>
        </div>

      </div>

    </div>
  `;

  const focusButton = document.getElementById("focusSelectedSample");

  if (focusButton && typeof focusSampleMarker === "function") {
    focusButton.addEventListener("click", () => {
      focusSampleMarker(sample.id);
    });
  }
}

// ============================================================
// STATISTICS
// ============================================================

function updateStatistics(samples) {
  const sampleCountElement = document.getElementById("sampleCount");

  const averagePhElement = document.getElementById("averagePh");

  const lowNitrogenElement = document.getElementById("lowNitrogen");

  if (!Array.isArray(samples)) {
    samples = [];
  }

  if (sampleCountElement) {
    sampleCountElement.textContent = samples.length;
  }

  const phValues = samples
    .map((sample) => Number(sample.ph))
    .filter((value) => Number.isFinite(value));

  if (averagePhElement) {
    if (phValues.length > 0) {
      const total = phValues.reduce((sum, value) => sum + value, 0);

      const average = total / phValues.length;

      averagePhElement.textContent = average.toFixed(2);
    } else {
      averagePhElement.textContent = "-";
    }
  }

  if (lowNitrogenElement) {
    lowNitrogenElement.textContent = "0";
  }
}

// ============================================================
// SOIL ANALYSIS TABLE HEADER
// ============================================================

function ensureSoilAnalysisTableHeader() {
  const tableBody = document.getElementById("soilAnalysisTableBody");

  if (!tableBody) {
    console.warn("Soil analysis table body was not found.");

    return;
  }

  const table = tableBody.closest("table");

  if (!table) {
    console.warn("Soil analysis table was not found.");

    return;
  }

  let tableHead = table.querySelector("thead");

  if (!tableHead) {
    tableHead = document.createElement("thead");

    table.insertBefore(tableHead, tableBody);
  }

  tableHead.innerHTML = `
    <tr>
      <th scope="col">Sample</th>
      <th scope="col">pH</th>
      <th scope="col">Nitrogen</th>
      <th scope="col">Phosphorus</th>
      <th scope="col">Potassium</th>
      <th scope="col">Organic Carbon</th>
      <th scope="col">Electrical Conductivity</th>
      <th scope="col">Overall Fertility</th>
    </tr>
  `;
}

// ============================================================
// SOIL ANALYSIS
// ============================================================

async function loadSoilAnalysis(samples) {
  const tableBody = document.getElementById("soilAnalysisTableBody");

  if (!tableBody) {
    console.warn("Soil analysis table body was not found.");

    return;
  }

  ensureSoilAnalysisTableHeader();

  if (!Array.isArray(samples) || samples.length === 0) {
    if (typeof updateThematicMapData === "function") {
      updateThematicMapData([]);
    }

    renderAnalysisEmptyState();

    renderRecommendationEmptyState();

    return;
  }

  tableBody.innerHTML = `
    <tr>
      <td
        colspan="8"
        class="analysis-loading"
      >
        Loading complete soil analysis reports...
      </td>
    </tr>
  `;

  try {
    console.log(
      `Loading complete soil analysis reports for ${samples.length} soil sample(s)...`,
    );

    const reports = await Promise.all(
      samples.map((sample) => loadCompleteSoilReport(sample.id)),
    );

    console.log("Complete soil analysis reports loaded:", reports);

    if (typeof updateThematicMapData === "function") {
      updateThematicMapData(reports);
    }

    renderCompleteSoilReports(samples, reports);

    updateNitrogenStatisticFromReports(reports);
  } catch (error) {
    console.error("Failed to load complete soil analysis reports:", error);

    renderAnalysisError(error.message);

    renderRecommendationError(error.message);

    renderCropSuitabilityError(error.message);

    renderSoilManagementError(error.message);
  }
}

// ============================================================
// LOAD COMPLETE SOIL ANALYSIS REPORT
// ============================================================

async function loadCompleteSoilReport(sampleId) {
  const response = await fetch(
    `/api/soil-analysis/sample/${encodeURIComponent(sampleId)}/report`,
    {
      method: "GET",

      headers: {
        Accept: "application/json",
      },

      cache: "no-store",
    },
  );

  if (!response.ok) {
    const responseText = await response.text();

    console.error(
      `Complete report API error for sample ${sampleId}:`,
      response.status,
      responseText,
    );

    throw new Error(
      `Complete soil analysis report request failed for sample ${sampleId}.`,
    );
  }

  const result = await response.json();

  if (
    !result ||
    result.success !== true ||
    !result.data ||
    !result.data.analysis ||
    !result.data.interpretation ||
    !result.data.cropSuitability ||
    !result.data.managementPlan
  ) {
    throw new Error(
      result?.message ||
        `Invalid complete soil analysis report for sample ${sampleId}.`,
    );
  }

  return result.data;
}

// ============================================================
// RENDER COMPLETE SOIL ANALYSIS REPORTS
// ============================================================

function renderCompleteSoilReports(samples, reports) {
  renderSoilAnalysisFromReports(samples, reports);

  renderSoilInterpretationFromReports(samples, reports);

  renderCropSuitabilityFromReports(samples, reports);

  renderSoilManagementFromReports(samples, reports);
}

// ============================================================
// RENDER ANALYSIS FROM REPORTS
// ============================================================

function renderSoilAnalysisFromReports(samples, reports) {
  const tableBody = document.getElementById("soilAnalysisTableBody");

  if (!tableBody) {
    return;
  }

  ensureSoilAnalysisTableHeader();

  tableBody.innerHTML = "";

  samples.forEach((sample, index) => {
    const report = reports[index];

    if (!report || !report.analysis) {
      return;
    }

    const analysis = report.analysis;

    const values = analysis.values || {};

    const row = document.createElement("tr");

    row.innerHTML = `
        <td class="analysis-sample">
          ${escapeHtml(
            report.sample?.sample_code ||
              sample.sample_code ||
              "Unnamed Sample",
          )}
        </td>

        <td>
          ${renderAnalysisValue(values.pH)}
        </td>

        <td>
          ${renderAnalysisValue(values.nitrogen)}
        </td>

        <td>
          ${renderAnalysisValue(values.phosphorus)}
        </td>

        <td>
          ${renderAnalysisValue(values.potassium)}
        </td>

        <td>
          ${renderAnalysisValue(values.organicCarbon)}
        </td>

        <td>
          ${renderAnalysisValue(values.electricalConductivity)}
        </td>

        <td class="${getFertilityClass(analysis.overallFertility)}">
          <span class="analysis-fertility-value">
            ${escapeHtml(analysis.overallFertility || "-")}
          </span>
        </td>
      `;

    tableBody.appendChild(row);
  });

  if (tableBody.children.length === 0) {
    renderAnalysisEmptyState();
  }
}

// ============================================================
// SINGLE ANALYSIS REPORT
// ============================================================

function renderSingleSoilAnalysisReport(report) {
  if (!report) {
    return;
  }

  renderSoilAnalysisFromReports(
    [
      {
        sample_code: report.sample?.sample_code,
      },
    ],
    [report],
  );
}

// ============================================================
// RENDER ANALYSIS VALUE
// ============================================================

function renderAnalysisValue(valueObject) {
  if (
    !valueObject ||
    valueObject.value === null ||
    valueObject.value === undefined ||
    valueObject.value === ""
  ) {
    return `
      <div class="analysis-value analysis-value-empty">
        <span class="analysis-missing-value">
          -
        </span>
      </div>
    `;
  }

  const value = valueObject.value;

  const unit = valueObject.unit || "";

  const classification = valueObject.classification || "";

  const classificationClass = getAnalysisClassificationClass(classification);

  return `
    <div class="analysis-value">

      <strong class="analysis-value-number">
        ${escapeHtml(value)}
      </strong>

      ${
        unit
          ? `
            <span class="analysis-unit">
              ${escapeHtml(unit)}
            </span>
          `
          : ""
      }

      ${
        classification
          ? `
            <span
              class="analysis-classification ${classificationClass}"
            >
              ${escapeHtml(classification)}
            </span>
          `
          : ""
      }

    </div>
  `;
}

// ============================================================
// ANALYSIS CLASSIFICATION PRESENTATION
// ============================================================

function getAnalysisClassificationClass(classification) {
  if (!classification) {
    return "";
  }

  const normalized = String(classification).trim().toLowerCase();

  switch (normalized) {
    case "high":
    case "high fertility":
    case "good":
    case "good fertility":
    case "very high":
      return "status-good";

    case "medium":
    case "moderate":
    case "moderately fertile":
    case "medium fertility":
    case "moderate fertility":
    case "moderate / good":
    case "moderate/good":
      return "status-medium";

    case "low":
    case "low fertility":
    case "poor":
    case "poor fertility":
    case "very low":
    case "very low fertility":
      return "status-low";

    case "neutral":
    case "non-saline":
      return "status-neutral";

    case "acidic":
    case "alkaline":
    case "saline":
      return "status-warning";

    default:
      return "";
  }
}

// ============================================================
// FERTILITY CLASS
// ============================================================

function getFertilityClass(fertility) {
  if (!fertility) {
    return "fertility-unknown";
  }

  const normalized = String(fertility).trim().toLowerCase();

  switch (normalized) {
    case "high":
    case "high fertility":
    case "good":
    case "good fertility":
      return "fertility-high";

    case "medium":
    case "moderate":
    case "moderately fertile":
    case "medium fertility":
    case "moderate fertility":
    case "moderate / good":
    case "moderate/good":
      return "fertility-medium";

    case "low":
    case "low fertility":
    case "poor":
    case "poor fertility":
      return "fertility-low";

    case "very low":
    case "very low fertility":
      return "fertility-very-low";

    default:
      return "fertility-unknown";
  }
}

// ============================================================
// NITROGEN STATISTIC
// ============================================================

function updateNitrogenStatisticFromReports(reports) {
  const lowNitrogenElement = document.getElementById("lowNitrogen");

  if (!lowNitrogenElement) {
    return;
  }

  if (!Array.isArray(reports)) {
    lowNitrogenElement.textContent = "0";

    return;
  }

  const lowNitrogen = reports.filter((report) => {
    const nitrogen = report?.analysis?.values?.nitrogen;

    const classification = nitrogen?.classification;

    if (!classification) {
      return false;
    }

    const normalized = String(classification).trim().toLowerCase();

    return (
      normalized === "low" ||
      normalized === "very low" ||
      normalized === "low fertility" ||
      normalized === "very low fertility"
    );
  }).length;

  lowNitrogenElement.textContent = lowNitrogen;
}

// ============================================================
// PANEL CONTENT HELPER
// ============================================================

function getAnalysisPanelContent(panelTitle) {
  const panels = document.querySelectorAll(".analysis-panel");

  for (const panel of panels) {
    const heading = panel.querySelector(".analysis-panel-header h2");

    if (!heading) {
      continue;
    }

    const title = cleanString(heading.textContent);

    if (title === panelTitle) {
      return panel.querySelector(".analysis-panel-content");
    }
  }

  return null;
}

// ============================================================
// SOIL INTERPRETATION
// ============================================================

function renderSoilInterpretationFromReports(samples, reports) {
  const container = getAnalysisPanelContent(
    "Soil Interpretation & Recommendations",
  );

  if (!container) {
    console.warn(
      "Soil Interpretation & Recommendations panel content was not found.",
    );

    return;
  }

  container.innerHTML = "";

  const validReports = [];

  samples.forEach((sample, index) => {
    const report = reports[index];

    if (report && report.interpretation) {
      validReports.push({
        sample,
        report,
      });
    }
  });

  if (validReports.length === 0) {
    renderRecommendationEmptyState();
    return;
  }

  const tableWrapper = document.createElement("div");

  tableWrapper.className = "recommendation-table-container";

  const table = document.createElement("table");

  table.className = "recommendation-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>Sample</th>
        <th>Overall Fertility</th>
        <th>Limiting Nutrients</th>
        <th>Soil Reaction</th>
        <th>Salinity</th>
      </tr>
    </thead>

    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  const observationsWrapper = document.createElement("div");

  observationsWrapper.className = "management-observations-container";

  validReports.forEach(({ sample, report }) => {
    renderInterpretationRecord(sample, report, tbody, observationsWrapper);
  });

  tableWrapper.appendChild(table);

  container.appendChild(tableWrapper);

  if (observationsWrapper.children.length > 0) {
    container.appendChild(observationsWrapper);
  }
}

// ============================================================
// SINGLE INTERPRETATION REPORT
// ============================================================

function renderSingleSoilInterpretationReport(report) {
  if (!report) {
    return;
  }

  const container = getAnalysisPanelContent(
    "Soil Interpretation & Recommendations",
  );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!report.interpretation) {
    renderRecommendationEmptyState();
    return;
  }

  const tableWrapper = document.createElement("div");

  tableWrapper.className = "recommendation-table-container";

  const table = document.createElement("table");

  table.className = "recommendation-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>Sample</th>
        <th>Overall Fertility</th>
        <th>Limiting Nutrients</th>
        <th>Soil Reaction</th>
        <th>Salinity</th>
      </tr>
    </thead>

    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  const observationsContainer = document.createElement("div");

  observationsContainer.className = "management-observations-container";

  renderInterpretationRecord(
    report.sample || {},
    report,
    tbody,
    observationsContainer,
  );

  tableWrapper.appendChild(table);

  container.appendChild(tableWrapper);

  if (observationsContainer.children.length > 0) {
    container.appendChild(observationsContainer);
  }
}

// ============================================================
// RENDER INTERPRETATION RECORD
// ============================================================

function renderInterpretationRecord(
  sample,
  report,
  tableBody,
  observationsContainer,
) {
  const interpretation = report.interpretation || {};

  const limitingNutrients = Array.isArray(interpretation.limitingNutrients)
    ? interpretation.limitingNutrients
    : [];

  const limitingNutrientText =
    limitingNutrients.length > 0
      ? limitingNutrients
          .map(
            (item) => item.nutrient || item.parameter || item.name || "Unknown",
          )
          .join(", ")
      : "None identified";

  const soilReaction = interpretation.soilReaction || {};

  const salinity = interpretation.salinity || {};

  const row = document.createElement("tr");

  row.innerHTML = `
    <td class="recommendation-sample">
      ${escapeHtml(sample.sample_code || "Unnamed Sample")}
    </td>

    <td class="${getFertilityClass(interpretation.overallFertility)}">
      <strong>
        ${escapeHtml(interpretation.overallFertility || "-")}
      </strong>
    </td>

    <td>
      ${escapeHtml(limitingNutrientText)}
    </td>

    <td>
      <strong>
        ${escapeHtml(soilReaction.classification || "-")}
      </strong>
    </td>

    <td>
      <strong>
        ${escapeHtml(salinity.classification || "-")}
      </strong>
    </td>
  `;

  tableBody.appendChild(row);

  if (observationsContainer) {
    const observations = Array.isArray(interpretation.managementObservations)
      ? interpretation.managementObservations
      : [];

    const card = document.createElement("div");

    card.className = "management-observation-card";

    const heading = document.createElement("h3");

    heading.textContent = `${sample.sample_code || "Unnamed Sample"} - Management Observations`;

    card.appendChild(heading);

    if (observations.length > 0) {
      const list = document.createElement("ul");

      observations.forEach((observation) => {
        const item = document.createElement("li");

        item.textContent = observation;

        list.appendChild(item);
      });

      card.appendChild(list);
    } else {
      const paragraph = document.createElement("p");

      paragraph.textContent =
        "No specific management observations were identified.";

      card.appendChild(paragraph);
    }

    if (soilReaction.interpretation) {
      const paragraph = document.createElement("p");

      paragraph.innerHTML = `
        <strong>
          Soil Reaction:
        </strong>

        ${escapeHtml(soilReaction.interpretation)}
      `;

      card.appendChild(paragraph);
    }

    if (salinity.interpretation) {
      const paragraph = document.createElement("p");

      paragraph.innerHTML = `
        <strong>
          Salinity:
        </strong>

        ${escapeHtml(salinity.interpretation)}
      `;

      card.appendChild(paragraph);
    }

    observationsContainer.appendChild(card);
  }
}

// ============================================================
// CROP SUITABILITY
// ============================================================

function renderCropSuitabilityFromReports(samples, reports) {
  const container = getAnalysisPanelContent("Crop Suitability");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  samples.forEach((sample, index) => {
    const report = reports[index];

    if (!report || !report.cropSuitability) {
      return;
    }

    renderCropSuitabilityRecord(sample, report, container);
  });

  if (container.children.length === 0) {
    container.innerHTML = `
      <div class="recommendation-empty">
        No crop suitability data available.
      </div>
    `;
  }
}

// ============================================================
// SINGLE CROP SUITABILITY REPORT
// ============================================================

function renderSingleCropSuitabilityReport(report) {
  const container = getAnalysisPanelContent("Crop Suitability");

  if (!container || !report) {
    return;
  }

  container.innerHTML = "";

  if (!report.cropSuitability) {
    container.innerHTML = `
      <div class="recommendation-empty">
        No crop suitability data available.
      </div>
    `;

    return;
  }

  renderCropSuitabilityRecord(report.sample || {}, report, container);
}

// ============================================================
// RENDER CROP SUITABILITY RECORD
// ============================================================

function renderCropSuitabilityRecord(sample, report, container) {
  const cropSuitability = report.cropSuitability || {};

  const crops = Array.isArray(cropSuitability.crops)
    ? cropSuitability.crops
    : [];

  const sampleCard = document.createElement("div");

  sampleCard.className = "crop-suitability-card";

  const heading = document.createElement("h3");

  heading.textContent = `${sample.sample_code || "Unnamed Sample"} - Crop Suitability`;

  sampleCard.appendChild(heading);

  if (cropSuitability.scoring) {
    const scoring = cropSuitability.scoring;

    const scoringInfo = document.createElement("div");

    scoringInfo.className = "crop-scoring-info";

    const weights = scoring.weights || {};

    scoringInfo.innerHTML = `
      <div class="crop-scoring-method">
        <strong>
          Assessment Method:
        </strong>

        ${escapeHtml(scoring.method || "Weighted soil suitability assessment")}
      </div>

      <div class="crop-scoring-weights">

        <span>
          Soil Texture:
          <strong>
            ${escapeHtml(weights.soilTexture ?? "-")}
          </strong>
        </span>

        <span>
          Soil Reaction:
          <strong>
            ${escapeHtml(weights.soilReaction ?? "-")}
          </strong>
        </span>

        <span>
          Salinity:
          <strong>
            ${escapeHtml(weights.salinity ?? "-")}
          </strong>
        </span>

      </div>
    `;

    sampleCard.appendChild(scoringInfo);

    const dataCompleteness = scoring.dataCompleteness || {};

    const assessmentConfidence =
      scoring.assessmentConfidence ||
      dataCompleteness.confidence ||
      "Unavailable";

    const percentage = Number(dataCompleteness.percentage);

    const availableFactors = Number(dataCompleteness.availableFactors);

    const totalFactors = Number(dataCompleteness.totalFactors);

    const availableWeight = Number(dataCompleteness.availableWeight);

    const totalWeight = Number(dataCompleteness.totalWeight);

    const hasPercentage = Number.isFinite(percentage);

    const hasFactorCount =
      Number.isFinite(availableFactors) && Number.isFinite(totalFactors);

    const hasWeight =
      Number.isFinite(availableWeight) && Number.isFinite(totalWeight);

    const confidenceClass = getAssessmentConfidenceClass(assessmentConfidence);

    const qualityInfo = document.createElement("div");

    qualityInfo.className = "crop-assessment-quality";

    qualityInfo.innerHTML = `
      <div class="crop-assessment-quality-title">
        <strong>
          Assessment Quality
        </strong>
      </div>

      <div class="crop-assessment-quality-grid">

        <div class="crop-assessment-quality-item">
          <span>
            Assessment Confidence
          </span>

          <strong
            class="assessment-confidence-badge ${confidenceClass}"
          >
            ${escapeHtml(assessmentConfidence)}
          </strong>
        </div>

        <div class="crop-assessment-quality-item">
          <span>
            Data Completeness
          </span>

          <strong>
            ${hasPercentage ? `${escapeHtml(percentage)}%` : "Unavailable"}
          </strong>
        </div>

        <div class="crop-assessment-quality-item">
          <span>
            Factors Available
          </span>

          <strong>
            ${
              hasFactorCount
                ? `${escapeHtml(availableFactors)} / ${escapeHtml(
                    totalFactors,
                  )}`
                : "Unavailable"
            }
          </strong>
        </div>

        <div class="crop-assessment-quality-item">
          <span>
            Available Weight
          </span>

          <strong>
            ${
              hasWeight
                ? `${escapeHtml(availableWeight)} / ${escapeHtml(totalWeight)}`
                : "Unavailable"
            }
          </strong>
        </div>

      </div>
    `;

    sampleCard.appendChild(qualityInfo);
  }

  if (crops.length === 0) {
    const empty = document.createElement("p");

    empty.textContent = "No crop suitability results are available.";

    sampleCard.appendChild(empty);

    container.appendChild(sampleCard);

    return;
  }

  const tableWrapper = document.createElement("div");

  tableWrapper.className = "crop-table-container";

  const table = document.createElement("table");

  table.className = "crop-suitability-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>Rank</th>
        <th>Crop</th>
        <th>Category</th>
        <th>Suitability</th>
        <th>Score</th>
        <th>Texture</th>
        <th>Reaction</th>
        <th>Salinity</th>
      </tr>
    </thead>

    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  crops.forEach((crop) => {
    const row = document.createElement("tr");

    const suitabilityClass = getSuitabilityClass(crop.suitability);

    const breakdown = crop.scoreBreakdown || {};

    row.innerHTML = `
      <td>
        <strong>
          ${escapeHtml(crop.rank ?? "-")}
        </strong>
      </td>

      <td class="crop-name">
        <strong>
          ${escapeHtml(crop.crop || "Unknown")}
        </strong>
      </td>

      <td>
        ${escapeHtml(crop.category || "-")}
      </td>

      <td>
        <span
          class="suitability-badge ${suitabilityClass}"
        >
          ${escapeHtml(crop.suitability || "-")}
        </span>
      </td>

      <td class="crop-score">
        <strong>
          ${escapeHtml(crop.score ?? "0")}
        </strong>
        / 100
      </td>

      <td>
        ${escapeHtml(breakdown.soilTexture ?? 0)}
      </td>

      <td>
        ${escapeHtml(breakdown.soilReaction ?? 0)}
      </td>

      <td>
        ${escapeHtml(breakdown.salinity ?? 0)}
      </td>
    `;

    tbody.appendChild(row);

    const detailRow = document.createElement("tr");

    detailRow.className = "crop-detail-row";

    const detailCell = document.createElement("td");

    detailCell.colSpan = 8;

    const detailContainer = document.createElement("div");

    detailContainer.className = "crop-detail-container";

    const positiveFactors = Array.isArray(crop.positiveFactors)
      ? crop.positiveFactors
      : [];

    if (positiveFactors.length > 0) {
      appendDetailList(detailContainer, "Positive Factors", positiveFactors);
    }

    const limitingFactors = Array.isArray(crop.limitingFactors)
      ? crop.limitingFactors
      : [];

    if (limitingFactors.length > 0) {
      appendDetailList(detailContainer, "Limiting Factors", limitingFactors);
    }

    const managementConsiderations = Array.isArray(
      crop.managementConsiderations,
    )
      ? crop.managementConsiderations
      : [];

    if (managementConsiderations.length > 0) {
      appendDetailList(
        detailContainer,
        "Management Considerations",
        managementConsiderations,
      );
    }

    if (
      positiveFactors.length === 0 &&
      limitingFactors.length === 0 &&
      managementConsiderations.length === 0
    ) {
      const paragraph = document.createElement("p");

      paragraph.textContent =
        "No additional crop-specific considerations were identified.";

      detailContainer.appendChild(paragraph);
    }

    detailCell.appendChild(detailContainer);

    detailRow.appendChild(detailCell);

    tbody.appendChild(detailRow);
  });

  tableWrapper.appendChild(table);

  sampleCard.appendChild(tableWrapper);

  container.appendChild(sampleCard);
}

// ============================================================
// ASSESSMENT CONFIDENCE CLASS
// ============================================================

function getAssessmentConfidenceClass(confidence) {
  if (!confidence) {
    return "assessment-confidence-unknown";
  }

  const normalized = String(confidence).trim().toLowerCase();

  switch (normalized) {
    case "high":
      return "assessment-confidence-high";

    case "moderate":
      return "assessment-confidence-moderate";

    case "low":
      return "assessment-confidence-low";

    case "unavailable":
      return "assessment-confidence-unavailable";

    default:
      return "assessment-confidence-unknown";
  }
}

// ============================================================
// APPEND DETAIL LIST
// ============================================================

function appendDetailList(container, titleText, items) {
  const title = document.createElement("strong");

  title.textContent = titleText;

  container.appendChild(title);

  const list = document.createElement("ul");

  items.forEach((itemText) => {
    const item = document.createElement("li");

    item.textContent = itemText;

    list.appendChild(item);
  });

  container.appendChild(list);
}

// ============================================================
// CROP SUITABILITY CLASS
// ============================================================

function getSuitabilityClass(suitability) {
  if (!suitability) {
    return "suitability-unknown";
  }

  switch (String(suitability).trim()) {
    case "Highly Suitable":
      return "suitability-high";

    case "Suitable":
      return "suitability-good";

    case "Moderately Suitable":
      return "suitability-moderate";

    case "Marginal":
      return "suitability-marginal";

    case "Unsuitable":
      return "suitability-low";

    default:
      return "suitability-unknown";
  }
}

// ============================================================
// SOIL MANAGEMENT
// ============================================================

function renderSoilManagementFromReports(samples, reports) {
  const container = getAnalysisPanelContent("Soil Management Plan");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  samples.forEach((sample, index) => {
    const report = reports[index];

    if (!report || !report.managementPlan) {
      return;
    }

    renderSoilManagementRecord(sample, report, container);
  });

  if (container.children.length === 0) {
    container.innerHTML = `
      <div class="recommendation-empty">
        No soil management plan is available.
      </div>
    `;
  }
}

// ============================================================
// SINGLE SOIL MANAGEMENT REPORT
// ============================================================

function renderSingleSoilManagementReport(report) {
  const container = getAnalysisPanelContent("Soil Management Plan");

  if (!container || !report) {
    return;
  }

  container.innerHTML = "";

  if (!report.managementPlan) {
    container.innerHTML = `
      <div class="recommendation-empty">
        No soil management plan is available.
      </div>
    `;

    return;
  }

  renderSoilManagementRecord(report.sample || {}, report, container);
}

// ============================================================
// RENDER SOIL MANAGEMENT RECORD
// ============================================================

function renderSoilManagementRecord(sample, report, container) {
  const managementPlan = report.managementPlan || {};

  const card = document.createElement("div");

  card.className = "soil-management-card";

  const heading = document.createElement("h3");

  heading.textContent = `${sample.sample_code || "Unnamed Sample"} - Management Plan`;

  card.appendChild(heading);

  if (managementPlan.overallFertility) {
    const fertility = document.createElement("div");

    fertility.className = "management-fertility";

    fertility.innerHTML = `
      <strong>
        Overall Fertility:
      </strong>

      <span
        class="${getFertilityClass(managementPlan.overallFertility)}"
      >
        ${escapeHtml(managementPlan.overallFertility)}
      </span>
    `;

    card.appendChild(fertility);
  }

  const sections = [
    {
      title: "Nutrient Management",
      key: "nutrientManagement",
    },
    {
      title: "Organic Matter Management",
      key: "organicMatterManagement",
    },
    {
      title: "Soil Reaction Management",
      key: "soilReactionManagement",
    },
    {
      title: "Salinity Management",
      key: "salinityManagement",
    },
    {
      title: "Overall Management",
      key: "overallManagement",
    },
    {
      title: "General Management",
      key: "generalManagement",
    },
  ];

  sections.forEach((section) => {
    const items = Array.isArray(managementPlan[section.key])
      ? managementPlan[section.key]
      : [];

    if (items.length === 0) {
      return;
    }

    const sectionElement = document.createElement("div");

    sectionElement.className = "management-plan-section";

    const title = document.createElement("h4");

    title.textContent = section.title;

    sectionElement.appendChild(title);

    const list = document.createElement("ul");

    items.forEach((itemText) => {
      const item = document.createElement("li");

      item.textContent = itemText;

      list.appendChild(item);
    });

    sectionElement.appendChild(list);

    card.appendChild(sectionElement);
  });

  container.appendChild(card);
}

// ============================================================
// ANALYSIS EMPTY STATE
// ============================================================

function renderAnalysisEmptyState() {
  const tableBody = document.getElementById("soilAnalysisTableBody");

  if (!tableBody) {
    return;
  }

  ensureSoilAnalysisTableHeader();

  tableBody.innerHTML = `
    <tr>
      <td
        colspan="8"
        class="analysis-empty"
      >
        No soil analysis data available.
      </td>
    </tr>
  `;
}

// ============================================================
// ANALYSIS ERROR
// ============================================================

function renderAnalysisError(message) {
  const tableBody = document.getElementById("soilAnalysisTableBody");

  if (!tableBody) {
    return;
  }

  ensureSoilAnalysisTableHeader();

  tableBody.innerHTML = `
    <tr>
      <td
        colspan="8"
        class="analysis-error"
      >
        Unable to load soil analysis.

        ${message ? `<br><small>${escapeHtml(message)}</small>` : ""}
      </td>
    </tr>
  `;
}

// ============================================================
// RECOMMENDATION EMPTY STATE
// ============================================================

function renderRecommendationEmptyState() {
  const container = getAnalysisPanelContent(
    "Soil Interpretation & Recommendations",
  );

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="recommendation-empty">
      No soil interpretation data available.
    </div>
  `;
}

// ============================================================
// RECOMMENDATION ERROR
// ============================================================

function renderRecommendationError(message) {
  const container = getAnalysisPanelContent(
    "Soil Interpretation & Recommendations",
  );

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="recommendation-error">
      Unable to load soil interpretation.

      ${message ? `<br><small>${escapeHtml(message)}</small>` : ""}
    </div>
  `;
}

// ============================================================
// CROP SUITABILITY ERROR
// ============================================================

function renderCropSuitabilityError(message) {
  const container = getAnalysisPanelContent("Crop Suitability");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="recommendation-error">
      Unable to load crop suitability.

      ${message ? `<br><small>${escapeHtml(message)}</small>` : ""}
    </div>
  `;
}

// ============================================================
// SOIL MANAGEMENT ERROR
// ============================================================

function renderSoilManagementError(message) {
  const container = getAnalysisPanelContent("Soil Management Plan");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="recommendation-error">
      Unable to load soil management plan.

      ${message ? `<br><small>${escapeHtml(message)}</small>` : ""}
    </div>
  `;
}

// ============================================================
// ANALYSIS PANEL INITIALIZATION
// ============================================================

function initializeAnalysisPanels() {
  if (analysisPanelsInitialized) {
    return;
  }

  const panels = document.querySelectorAll(".analysis-panel");

  if (!panels.length) {
    console.warn("No analysis panels found.");

    return;
  }

  analysisPanelsInitialized = true;

  panels.forEach((panel) => {
    prepareAnalysisPanel(panel);
  });

  document.addEventListener("click", handleAnalysisPanelClick);

  console.log("Analysis panels initialized successfully.", panels.length);
}

// ============================================================
// PREPARE ANALYSIS PANEL
// ============================================================

function prepareAnalysisPanel(panel) {
  if (!panel) {
    return;
  }

  const toggleButton = panel.querySelector(".analysis-panel-toggle");

  const content = panel.querySelector(".analysis-panel-content");

  if (!toggleButton || !content) {
    console.warn(
      "Analysis panel is missing toggle button or content container.",
      panel,
    );

    return;
  }

  if (!content.id) {
    console.warn("Analysis panel content is missing an ID.", panel);

    return;
  }

  toggleButton.setAttribute("aria-controls", content.id);

  const initiallyExpanded =
    toggleButton.getAttribute("aria-expanded") !== "false";

  setAnalysisPanelState(panel, toggleButton, initiallyExpanded);
}

// ============================================================
// HANDLE ANALYSIS PANEL CLICK
// ============================================================

function handleAnalysisPanelClick(event) {
  const toggleButton = event.target.closest(".analysis-panel-toggle");

  if (!toggleButton) {
    return;
  }

  const panel = toggleButton.closest(".analysis-panel");

  if (!panel) {
    return;
  }

  const content = panel.querySelector(".analysis-panel-content");

  if (!content) {
    return;
  }

  event.preventDefault();

  if (!content.id) {
    return;
  }

  toggleButton.setAttribute("aria-controls", content.id);

  const currentlyExpanded =
    toggleButton.getAttribute("aria-expanded") === "true";

  setAnalysisPanelState(panel, toggleButton, !currentlyExpanded);
}

// ============================================================
// SET ANALYSIS PANEL STATE
// ============================================================

function setAnalysisPanelState(panel, toggleButton, expanded) {
  if (!panel || !toggleButton) {
    return;
  }

  const content = panel.querySelector(".analysis-panel-content");

  if (!content) {
    return;
  }

  toggleButton.setAttribute("aria-expanded", expanded ? "true" : "false");

  panel.classList.toggle("is-collapsed", !expanded);

  content.hidden = !expanded;

  toggleButton.textContent = expanded ? "−" : "+";

  toggleButton.setAttribute(
    "aria-label",
    expanded ? "Collapse panel" : "Expand panel",
  );
}

// ============================================================
// APPLICATION STATUS
// ============================================================

function setApplicationStatus(status) {
  const statusContainer = document.getElementById("applicationStatus");

  const statusText = statusContainer?.querySelector(".application-status-text");

  const statusDot = statusContainer?.querySelector(".application-status-dot");

  if (!statusContainer || !statusText || !statusDot) {
    return;
  }

  if (status === "online") {
    statusText.textContent = "Online";

    statusContainer.setAttribute("aria-label", "Application status: Online");

    statusDot.style.background = "#2e8b57";

    statusDot.style.boxShadow = "0 0 0 2px rgba(46, 139, 87, 0.12)";
  } else {
    statusText.textContent = "Offline";

    statusContainer.setAttribute("aria-label", "Application status: Offline");

    statusDot.style.background = "#c0392b";

    statusDot.style.boxShadow = "0 0 0 2px rgba(192, 57, 43, 0.12)";
  }
}

// ============================================================
// FORM ERROR HELPERS
// ============================================================

function clearFormError() {
  const formError = document.getElementById("formError");

  if (!formError) {
    return;
  }

  formError.textContent = "";

  formError.classList.add("hidden");
}

// ============================================================

function showFormError(message) {
  const formError = document.getElementById("formError");

  if (!formError) {
    return;
  }

  formError.textContent = message || "An error occurred.";

  formError.classList.remove("hidden");
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function cleanString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

// ============================================================

function numberOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

// ============================================================

function getTodayDate() {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(today.getMonth() + 1).padStart(2, "0");

  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================
// END OF app.js
// ============================================================
