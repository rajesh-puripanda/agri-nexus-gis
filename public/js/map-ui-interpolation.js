// ============================================================
// public/js/map-ui-interpolation.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 8.5.2 / 8.6
// Interpolation Controls, Status, Visibility, Opacity & Legend
//
// ============================================================

"use strict";

let interpolationPanelExpanded = true;
let interpolationLegendExpanded = true;

const DEFAULT_INTERPOLATION_OPACITY_PERCENT = 62;

// ============================================================
// INTERPOLATION CONTROL UI
// ============================================================

function buildInterpolationControl(
  container,
  configuration,
  callbacks = {},
) {
  if (!container) {
    return;
  }

  container.innerHTML = "";
  container.setAttribute(
    "aria-label",
    "Soil interpolation controls",
  );

  const header = document.createElement("div");
  header.className = "soil-interpolation-panel-header";

  const title = document.createElement("div");
  title.className = "soil-interpolation-title";
  title.textContent = "Spatial Interpolation";

  header.appendChild(title);

  // ----------------------------------------------------------
  // Move button
  // ----------------------------------------------------------

  const moveButton = document.createElement("button");

  moveButton.type = "button";
  moveButton.className =
    "analytical-control-move-button";
  moveButton.textContent = "↕";

  moveButton.title =
    "Move Spatial Interpolation panel";

  moveButton.setAttribute(
    "aria-label",
    "Move Spatial Interpolation panel",
  );

  header.appendChild(moveButton);

  // ----------------------------------------------------------
  // Collapse / expand button
  // ----------------------------------------------------------

  const toggleButton = document.createElement("button");

  toggleButton.type = "button";
  toggleButton.className =
    "soil-interpolation-panel-toggle";

  toggleButton.textContent =
    interpolationPanelExpanded ? "−" : "+";

  toggleButton.setAttribute(
    "aria-expanded",
    interpolationPanelExpanded ? "true" : "false",
  );

  toggleButton.setAttribute(
    "aria-label",
    interpolationPanelExpanded
      ? "Collapse interpolation controls"
      : "Expand interpolation controls",
  );

  toggleButton.title =
    interpolationPanelExpanded
      ? "Collapse interpolation controls"
      : "Expand interpolation controls";

  header.appendChild(toggleButton);
  container.appendChild(header);

  // ----------------------------------------------------------
  // Enable panel movement
  // ----------------------------------------------------------

  if (
    typeof window.enableMovableAnalyticalControl ===
    "function"
  ) {
    window.enableMovableAnalyticalControl(
      container,
      moveButton,
    );
  }

  // ----------------------------------------------------------
  // Content
  // ----------------------------------------------------------

  const content = document.createElement("div");

  content.className =
    "soil-interpolation-panel-content";

  content.hidden = !interpolationPanelExpanded;

  container.appendChild(content);

  // ----------------------------------------------------------
  // Collapse / expand
  // ----------------------------------------------------------

  toggleButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    interpolationPanelExpanded =
      !interpolationPanelExpanded;

    content.hidden =
      !interpolationPanelExpanded;

    toggleButton.textContent =
      interpolationPanelExpanded ? "−" : "+";

    toggleButton.setAttribute(
      "aria-expanded",
      interpolationPanelExpanded
        ? "true"
        : "false",
    );

    toggleButton.setAttribute(
      "aria-label",
      interpolationPanelExpanded
        ? "Collapse interpolation controls"
        : "Expand interpolation controls",
    );

    toggleButton.title =
      interpolationPanelExpanded
        ? "Collapse interpolation controls"
        : "Expand interpolation controls";
  });

  // ----------------------------------------------------------
  // Subtitle
  // ----------------------------------------------------------

  const subtitle = document.createElement("div");

  subtitle.className =
    "soil-interpolation-subtitle";

  subtitle.textContent =
    "Configure and generate a continuous soil surface.";

  content.appendChild(subtitle);

  // ----------------------------------------------------------
  // Status
  // ----------------------------------------------------------

  const statusContainer =
    document.createElement("div");

  statusContainer.id =
    "soilInterpolationStatus";

  statusContainer.className =
    "soil-interpolation-status-control status-idle";

  statusContainer.setAttribute(
    "role",
    "status",
  );

  statusContainer.setAttribute(
    "aria-live",
    "polite",
  );

  const statusIndicator =
    document.createElement("span");

  statusIndicator.className =
    "soil-interpolation-status-indicator";

  statusIndicator.setAttribute(
    "aria-hidden",
    "true",
  );

  const statusText =
    document.createElement("span");

  statusText.className =
    "soil-interpolation-status-text";

  statusText.textContent =
    "Interpolation ready.";

  statusContainer.appendChild(
    statusIndicator,
  );

  statusContainer.appendChild(
    statusText,
  );

  content.appendChild(
    statusContainer,
  );

  // ----------------------------------------------------------
  // Parameter
  // ----------------------------------------------------------

  const parameterLabel =
    document.createElement("label");

  parameterLabel.className =
    "soil-interpolation-field-label";

  parameterLabel.htmlFor =
    "soilInterpolationParameter";

  parameterLabel.textContent =
    "Parameter";

  content.appendChild(
    parameterLabel,
  );

  const parameterSelect =
    document.createElement("select");

  parameterSelect.className =
    "soil-interpolation-select";

  parameterSelect.id =
    "soilInterpolationParameter";

  parameterSelect.name =
    "soilInterpolationParameter";

  parameterSelect.setAttribute(
    "aria-label",
    "Interpolation parameter",
  );

  parameterSelect.title =
    "Select the soil property to interpolate across the sample extent";

  content.appendChild(
    parameterSelect,
  );

  // ----------------------------------------------------------
  // Method
  // ----------------------------------------------------------

  const methodLabel =
    document.createElement("label");

  methodLabel.className =
    "soil-interpolation-field-label";

  methodLabel.htmlFor =
    "soilInterpolationMethod";

  methodLabel.textContent =
    "Method";

  content.appendChild(
    methodLabel,
  );

  const methodSelect =
    document.createElement("select");

  methodSelect.className =
    "soil-interpolation-select";

  methodSelect.id =
    "soilInterpolationMethod";

  methodSelect.name =
    "soilInterpolationMethod";

  methodSelect.setAttribute(
    "aria-label",
    "Interpolation method",
  );

  methodSelect.title =
    "Select the spatial interpolation method provided by the backend";

  content.appendChild(
    methodSelect,
  );

  methodSelect.addEventListener(
    "change",
    () => {
      updateInterpolationMethodUI(
        methodSelect.value,
        configuration,
      );
    },
  );

  // ----------------------------------------------------------
  // IDW Power
  // ----------------------------------------------------------

  const powerLabel =
    document.createElement("label");

  powerLabel.className =
    "soil-interpolation-field-label";

  powerLabel.htmlFor =
    "soilInterpolationPower";

  powerLabel.textContent =
    "IDW Power";

  content.appendChild(
    powerLabel,
  );

  const powerInput =
    document.createElement("input");

  powerInput.type = "number";
  powerInput.className =
    "soil-interpolation-input";

  powerInput.id =
    "soilInterpolationPower";

  powerInput.name =
    "soilInterpolationPower";

  powerInput.step = "0.1";
  powerInput.required = true;

  powerInput.value =
    configuration?.defaults?.power ?? 2;

  if (configuration?.limits?.power) {
    powerInput.min =
      configuration.limits.power.min;

    powerInput.max =
      configuration.limits.power.max;
  }

  powerInput.setAttribute(
    "aria-label",
    "IDW power",
  );

  powerInput.title =
    getInterpolationRangeHint(
      "IDW power",
      configuration?.limits?.power,
      configuration?.defaults?.power ?? 2,
    );

  content.appendChild(
    powerInput,
  );

  const powerHint =
    document.createElement("div");

  powerHint.className =
    "soil-interpolation-field-hint";

  powerHint.textContent =
    getInterpolationRangeHint(
      "Power",
      configuration?.limits?.power,
      configuration?.defaults?.power ?? 2,
    );

  content.appendChild(
    powerHint,
  );

  // ----------------------------------------------------------
  // Resolution
  // ----------------------------------------------------------

  const resolutionLabel =
    document.createElement("label");

  resolutionLabel.className =
    "soil-interpolation-field-label";

  resolutionLabel.htmlFor =
    "soilInterpolationResolution";

  resolutionLabel.textContent =
    "Resolution";

  content.appendChild(
    resolutionLabel,
  );

  const resolutionInput =
    document.createElement("input");

  resolutionInput.type = "number";
  resolutionInput.className =
    "soil-interpolation-input";

  resolutionInput.id =
    "soilInterpolationResolution";

  resolutionInput.name =
    "soilInterpolationResolution";

  resolutionInput.step = "1";
  resolutionInput.required = true;

  resolutionInput.value =
    configuration?.defaults?.resolution ?? 50;

  if (configuration?.limits?.resolution) {
    resolutionInput.min =
      configuration.limits.resolution.min;

    resolutionInput.max =
      configuration.limits.resolution.max;
  }

  resolutionInput.setAttribute(
    "aria-label",
    "Interpolation resolution",
  );

  resolutionInput.title =
    getInterpolationRangeHint(
      "Resolution",
      configuration?.limits?.resolution,
      configuration?.defaults?.resolution ?? 50,
    );

  content.appendChild(
    resolutionInput,
  );

  const resolutionHint =
    document.createElement("div");

  resolutionHint.className =
    "soil-interpolation-field-hint";

  resolutionHint.textContent =
    getInterpolationRangeHint(
      "Resolution",
      configuration?.limits?.resolution,
      configuration?.defaults?.resolution ?? 50,
    );

  content.appendChild(
    resolutionHint,
  );

  // ----------------------------------------------------------
  // Opacity
  // ----------------------------------------------------------

  const opacityLabel =
    document.createElement("label");

  opacityLabel.className =
    "soil-interpolation-field-label";

  opacityLabel.htmlFor =
    "soilInterpolationOpacity";

  opacityLabel.textContent =
    "Surface Opacity";

  content.appendChild(
    opacityLabel,
  );

  const opacityRow =
    document.createElement("div");

  opacityRow.className =
    "soil-interpolation-opacity-row";

  const opacityInput =
    document.createElement("input");

  opacityInput.type = "range";
  opacityInput.className =
    "soil-interpolation-opacity";

  opacityInput.id =
    "soilInterpolationOpacity";

  opacityInput.name =
    "soilInterpolationOpacity";

  opacityInput.min = "0";
  opacityInput.max = "100";
  opacityInput.step = "1";

  opacityInput.value =
    String(
      DEFAULT_INTERPOLATION_OPACITY_PERCENT,
    );

  opacityInput.setAttribute(
    "aria-label",
    "Interpolation surface opacity",
  );

  opacityInput.title =
    "Adjust the visual opacity of the interpolation surface";

  const opacityValue =
    document.createElement("span");

  opacityValue.className =
    "soil-interpolation-opacity-value";

  opacityValue.textContent =
    `${DEFAULT_INTERPOLATION_OPACITY_PERCENT}%`;

  opacityValue.setAttribute(
    "aria-label",
    `Interpolation opacity ${DEFAULT_INTERPOLATION_OPACITY_PERCENT} percent`,
  );

  opacityRow.appendChild(
    opacityInput,
  );

  opacityRow.appendChild(
    opacityValue,
  );

  content.appendChild(
    opacityRow,
  );

  const opacityHint =
    document.createElement("div");

  opacityHint.className =
    "soil-interpolation-field-hint";

  opacityHint.textContent =
    "Presentation only • Adjusts the visibility of the generated surface.";

  content.appendChild(
    opacityHint,
  );

  const applyInterpolationOpacity =
    (value) => {
      const numericPercent =
        Number(value);

      if (!Number.isFinite(numericPercent)) {
        return;
      }

      const clampedPercent =
        Math.max(
          0,
          Math.min(
            100,
            numericPercent,
          ),
        );

      const opacity =
        clampedPercent / 100;

      if (
        typeof window.setInterpolationSurfaceOpacity ===
        "function"
      ) {
        const appliedOpacity =
          window.setInterpolationSurfaceOpacity(
            opacity,
          );

        const appliedPercent =
          Math.round(
            appliedOpacity * 100,
          );

        opacityInput.value =
          String(appliedPercent);

        opacityValue.textContent =
          `${appliedPercent}%`;

        opacityValue.setAttribute(
          "aria-label",
          `Interpolation opacity ${appliedPercent} percent`,
        );

        return;
      }

      opacityInput.value =
        String(clampedPercent);

      opacityValue.textContent =
        `${clampedPercent}%`;

      opacityValue.setAttribute(
        "aria-label",
        `Interpolation opacity ${clampedPercent} percent`,
      );
    };

  opacityInput.addEventListener(
    "input",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      applyInterpolationOpacity(
        event.target.value,
      );
    },
  );

  opacityInput.addEventListener(
    "change",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      applyInterpolationOpacity(
        event.target.value,
      );
    },
  );

  // ----------------------------------------------------------
  // Visibility
  // ----------------------------------------------------------

  const visibilityRow =
    document.createElement("label");

  visibilityRow.className =
    "soil-interpolation-visibility";

  const visibilityCheckbox =
    document.createElement("input");

  visibilityCheckbox.type =
    "checkbox";

  visibilityCheckbox.id =
    "soilInterpolationVisibility";

  visibilityCheckbox.name =
    "soilInterpolationVisibility";

  visibilityCheckbox.checked =
    false;

  visibilityCheckbox.disabled =
    true;

  visibilityCheckbox.setAttribute(
    "aria-label",
    "Show interpolation surface",
  );

  visibilityCheckbox.title =
    "Show or hide the most recently generated interpolation surface";

  visibilityCheckbox.addEventListener(
    "change",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (
        typeof window.setInterpolationVisible ===
        "function"
      ) {
        window.setInterpolationVisible(
          event.target.checked,
        );
      }
    },
  );

  const visibilityText =
    document.createElement("span");

  visibilityText.textContent =
    "Show Surface";

  visibilityRow.appendChild(
    visibilityCheckbox,
  );

  visibilityRow.appendChild(
    visibilityText,
  );

  content.appendChild(
    visibilityRow,
  );

  // ----------------------------------------------------------
  // Actions
  // ----------------------------------------------------------

  const actions =
    document.createElement("div");

  actions.className =
    "soil-interpolation-actions";

  const generateButton =
    document.createElement("button");

  generateButton.type = "button";
  generateButton.id =
    "soilInterpolationGenerate";

  generateButton.className =
    "soil-interpolation-generate";

  generateButton.textContent =
    "Generate Surface";

  generateButton.title =
    "Generate a new interpolation surface using the selected settings";

  generateButton.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (
        typeof callbacks.onGenerate ===
        "function"
      ) {
        callbacks.onGenerate();
      }
    },
  );

  const clearButton =
    document.createElement("button");

  clearButton.type = "button";
  clearButton.id =
    "soilInterpolationClear";

  clearButton.className =
    "soil-interpolation-clear";

  clearButton.textContent =
    "Clear Surface";

  clearButton.title =
    "Remove the current interpolation surface";

  clearButton.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (
        typeof callbacks.onClear ===
        "function"
      ) {
        callbacks.onClear();
      }
    },
  );

  actions.appendChild(
    generateButton,
  );

  actions.appendChild(
    clearButton,
  );

  content.appendChild(
    actions,
  );

  // ----------------------------------------------------------
  // Initial configuration
  // ----------------------------------------------------------

  populateInterpolationOptions(
    parameterSelect,
    methodSelect,
    configuration,
  );

  updateInterpolationMethodUI(
    methodSelect.value,
    configuration,
  );

  if (
    typeof window.setInterpolationSurfaceOpacity ===
    "function"
  ) {
    const initialOpacity =
      window.setInterpolationSurfaceOpacity(
        DEFAULT_INTERPOLATION_OPACITY_PERCENT /
          100,
      );

    const initialPercent =
      Math.round(
        initialOpacity * 100,
      );

    opacityInput.value =
      String(initialPercent);

    opacityValue.textContent =
      `${initialPercent}%`;

    opacityValue.setAttribute(
      "aria-label",
      `Interpolation opacity ${initialPercent} percent`,
    );
  }
}

// ============================================================
// INTERPOLATION RANGE HINT
// ============================================================

function getInterpolationRangeHint(
  label,
  limits,
  defaultValue,
) {
  if (
    limits &&
    Number.isFinite(Number(limits.min)) &&
    Number.isFinite(Number(limits.max))
  ) {
    return `${label}: ${limits.min}–${limits.max} • Default: ${defaultValue}`;
  }

  return `${label} • Default: ${defaultValue}`;
}

// ============================================================
// UPDATE INTERPOLATION METHOD UI
// ============================================================

function updateInterpolationMethodUI(
  methodKey,
  configuration,
) {
  const powerLabel =
    document.querySelector(
      'label[for="soilInterpolationPower"]',
    );

  const powerInput =
    document.getElementById(
      "soilInterpolationPower",
    );

  if (!powerLabel || !powerInput) {
    return;
  }

  const powerHint =
    powerInput.nextElementSibling &&
    powerInput.nextElementSibling.classList.contains(
      "soil-interpolation-field-hint",
    )
      ? powerInput.nextElementSibling
      : null;

  const isIDW =
    methodKey === "idw";

  powerLabel.hidden =
    !isIDW;

  powerInput.hidden =
    !isIDW;

  powerInput.disabled =
    !isIDW;

  if (powerHint) {
    powerHint.hidden =
      !isIDW;
  }

  if (!isIDW) {
    return;
  }

  const defaultPower =
    configuration?.defaults?.power ?? 2;

  const limits =
    configuration?.limits?.power;

  powerInput.min =
    limits?.min ?? 0.5;

  powerInput.max =
    limits?.max ?? 10;

  if (
    powerInput.value === "" ||
    !Number.isFinite(
      Number(powerInput.value),
    )
  ) {
    powerInput.value =
      defaultPower;
  }

  powerInput.title =
    getInterpolationRangeHint(
      "IDW power",
      limits,
      defaultPower,
    );

  if (powerHint) {
    powerHint.textContent =
      getInterpolationRangeHint(
        "Power",
        limits,
        defaultPower,
      );
  }
}

// ============================================================
// POPULATE INTERPOLATION OPTIONS
// ============================================================

function populateInterpolationOptions(
  parameterSelect,
  methodSelect,
  configuration,
  selectedParameter = null,
  selectedMethod = null,
) {
  if (
    !parameterSelect ||
    !methodSelect
  ) {
    return;
  }

  parameterSelect.innerHTML = "";
  methodSelect.innerHTML = "";

  const parameters =
    configuration &&
    Array.isArray(
      configuration.parameters,
    )
      ? configuration.parameters
      : [
          {
            key: "ph",
            label: "pH",
            unit: "pH",
          },
          {
            key: "nitrogen",
            label: "Nitrogen",
            unit: "kg/ha",
          },
          {
            key: "phosphorus",
            label: "Phosphorus",
            unit: "kg/ha",
          },
          {
            key: "potassium",
            label: "Potassium",
            unit: "kg/ha",
          },
          {
            key: "organic_carbon",
            label: "Organic Carbon",
            unit: "%",
          },
          {
            key: "electrical_conductivity",
            label: "Electrical Conductivity",
            unit: "dS/m",
          },
        ];

  const methods =
    configuration &&
    Array.isArray(
      configuration.methods,
    )
      ? configuration.methods
      : [
          {
            key: "idw",
            label: "Inverse Distance Weighting",
          },
        ];

  parameters.forEach(
    (parameter) => {
      const option =
        document.createElement(
          "option",
        );

      option.value =
        parameter.key;

      option.textContent =
        parameter.unit
          ? `${parameter.label} (${parameter.unit})`
          : parameter.label;

      parameterSelect.appendChild(
        option,
      );
    },
  );

  methods.forEach(
    (method) => {
      const option =
        document.createElement(
          "option",
        );

      option.value =
        method.key;

      option.textContent =
        method.label;

      methodSelect.appendChild(
        option,
      );
    },
  );

  const configuredDefaultParameter =
    configuration?.defaults?.parameter ||
    configuration?.parameters?.[0]?.key ||
    "ph";

  const configuredDefaultMethod =
    configuration?.defaults?.method ||
    "idw";

  const desiredParameter =
    selectedParameter ||
    configuredDefaultParameter;

  const desiredMethod =
    selectedMethod ||
    configuredDefaultMethod;

  const parameterExists =
    Array.from(
      parameterSelect.options,
    ).some(
      (option) =>
        option.value ===
        desiredParameter,
    );

  const methodExists =
    Array.from(
      methodSelect.options,
    ).some(
      (option) =>
        option.value ===
        desiredMethod,
    );

  parameterSelect.value =
    parameterExists
      ? desiredParameter
      : parameterSelect.options[0]
          ?.value || "";

  methodSelect.value =
    methodExists
      ? desiredMethod
      : methodSelect.options[0]
          ?.value || "";
}

// ============================================================
// UPDATE INTERPOLATION CONTROL FROM CONFIG
// ============================================================

function updateInterpolationControl(
  configuration,
) {
  const parameterSelect =
    document.getElementById(
      "soilInterpolationParameter",
    );

  const methodSelect =
    document.getElementById(
      "soilInterpolationMethod",
    );

  const powerInput =
    document.getElementById(
      "soilInterpolationPower",
    );

  const resolutionInput =
    document.getElementById(
      "soilInterpolationResolution",
    );

  const opacityInput =
    document.getElementById(
      "soilInterpolationOpacity",
    );

  const opacityValue =
    document.querySelector(
      ".soil-interpolation-opacity-value",
    );

  const previousParameter =
    parameterSelect
      ? parameterSelect.value
      : null;

  const previousMethod =
    methodSelect
      ? methodSelect.value
      : null;

  if (
    !parameterSelect ||
    !methodSelect
  ) {
    return;
  }

  populateInterpolationOptions(
    parameterSelect,
    methodSelect,
    configuration,
    previousParameter,
    previousMethod,
  );

  updateInterpolationMethodUI(
    methodSelect.value,
    configuration,
  );

  if (powerInput) {
    const existingPower =
      Number(powerInput.value);

    const configuredDefaultPower =
      configuration?.defaults?.power ??
      2;

    const nextPower =
      Number.isFinite(existingPower)
        ? existingPower
        : configuredDefaultPower;

    powerInput.value =
      nextPower;

    if (
      configuration?.limits?.power
    ) {
      powerInput.min =
        configuration.limits.power.min;

      powerInput.max =
        configuration.limits.power.max;
    }

    powerInput.title =
      getInterpolationRangeHint(
        "IDW power",
        configuration?.limits?.power,
        configuredDefaultPower,
      );

    const powerHint =
      powerInput.nextElementSibling;

    if (
      powerHint &&
      powerHint.classList.contains(
        "soil-interpolation-field-hint",
      )
    ) {
      powerHint.textContent =
        getInterpolationRangeHint(
          "Power",
          configuration?.limits?.power,
          configuredDefaultPower,
        );
    }
  }

  if (resolutionInput) {
    const existingResolution =
      Number(
        resolutionInput.value,
      );

    const configuredDefaultResolution =
      configuration?.defaults?.resolution ??
      50;

    const nextResolution =
      Number.isFinite(
        existingResolution,
      )
        ? existingResolution
        : configuredDefaultResolution;

    resolutionInput.value =
      nextResolution;

    if (
      configuration?.limits?.resolution
    ) {
      resolutionInput.min =
        configuration.limits.resolution.min;

      resolutionInput.max =
        configuration.limits.resolution.max;
    }

    resolutionInput.title =
      getInterpolationRangeHint(
        "Resolution",
        configuration?.limits?.resolution,
        configuredDefaultResolution,
      );

    const resolutionHint =
      resolutionInput.nextElementSibling;

    if (
      resolutionHint &&
      resolutionHint.classList.contains(
        "soil-interpolation-field-hint",
      )
    ) {
      resolutionHint.textContent =
        getInterpolationRangeHint(
          "Resolution",
          configuration?.limits?.resolution,
          configuredDefaultResolution,
        );
    }
  }

  if (opacityInput) {
    let currentPercent =
      Number(opacityInput.value);

    if (
      !Number.isFinite(
        currentPercent,
      )
    ) {
      currentPercent =
        DEFAULT_INTERPOLATION_OPACITY_PERCENT;
    }

    currentPercent =
      Math.max(
        0,
        Math.min(
          100,
          currentPercent,
        ),
      );

    opacityInput.value =
      String(currentPercent);

    if (opacityValue) {
      opacityValue.textContent =
        `${currentPercent}%`;

      opacityValue.setAttribute(
        "aria-label",
        `Interpolation opacity ${currentPercent} percent`,
      );
    }

    if (
      typeof window.setInterpolationSurfaceOpacity ===
      "function"
    ) {
      window.setInterpolationSurfaceOpacity(
        currentPercent / 100,
      );
    }
  }
}

// ============================================================
// INTERPOLATION VISIBILITY UI
// ============================================================

function updateInterpolationVisibility(
  visible,
) {
  const checkbox =
    document.getElementById(
      "soilInterpolationVisibility",
    );

  if (!checkbox) {
    return;
  }

  const hasSurface =
    typeof window.getInterpolationResult ===
      "function" &&
    Boolean(
      window.getInterpolationResult(),
    );

  checkbox.checked =
    Boolean(visible);

  checkbox.disabled =
    !hasSurface;

  const label =
    checkbox.closest(
      ".soil-interpolation-visibility",
    );

  if (label) {
    label.classList.toggle(
      "is-disabled",
      checkbox.disabled,
    );
  }
}

// ============================================================
// INTERPOLATION STATUS UI
// ============================================================

function buildInterpolationStatus(
  container,
  status,
  message,
) {
  if (!container) {
    return;
  }

  container.innerHTML = "";

  const indicator =
    document.createElement(
      "span",
    );

  indicator.className =
    "soil-interpolation-status-indicator";

  indicator.setAttribute(
    "aria-hidden",
    "true",
  );

  const text =
    document.createElement(
      "span",
    );

  text.className =
    "soil-interpolation-status-text";

  text.textContent =
    message ||
    "Interpolation ready.";

  container.className =
    "soil-interpolation-status-control";

  container.classList.remove(
    "status-idle",
    "status-loading",
    "status-success",
    "status-error",
  );

  container.classList.add(
    `status-${status || "idle"}`,
  );

  container.setAttribute(
    "role",
    "status",
  );

  container.setAttribute(
    "aria-live",
    "polite",
  );

  container.appendChild(
    indicator,
  );

  container.appendChild(
    text,
  );
}

// ============================================================
// INTERPOLATION SUCCESS MESSAGE
// ============================================================

function updateInterpolationSuccessMessage(
  message,
) {
  const container =
    document.getElementById(
      "soilInterpolationStatus",
    );

  if (!container) {
    return;
  }

  buildInterpolationStatus(
    container,
    "success",
    message ||
      "Interpolation surface generated successfully.",
  );
}

// ============================================================
// INTERPOLATION LEGEND
// ============================================================

function buildInterpolationLegend(
  container,
  data,
) {
  if (
    !container ||
    !data ||
    !data.statistics
  ) {
    return;
  }

  container.innerHTML = "";

  container.classList.add(
    "soil-interpolation-legend-control",
  );

  container.style.pointerEvents =
    "auto";

  const configuration =
    data.configuration || {};

  const parameter =
    configuration.parameter || {};

  const method =
    configuration.method || {};

  const settings =
    configuration.settings || {};

  const statistics =
    data.statistics || {};

  const grid =
    data.grid || {};

  const parameterLabel =
    parameter.label ||
    "Parameter";

  const parameterUnit =
    parameter.unit || "";

  const methodLabel =
    method.label ||
    "Interpolation";

  const power =
    settings.power !== undefined &&
    settings.power !== null
      ? settings.power
      : "—";

  const resolution =
    settings.resolution !== undefined &&
    settings.resolution !== null
      ? settings.resolution
      : "—";

  const header =
    document.createElement(
      "div",
    );

  header.className =
    "soil-interpolation-legend-header";

  const title =
    document.createElement(
      "div",
    );

  title.className =
    "soil-interpolation-legend-title";

  title.textContent =
    "Interpolation Legend";

    const headerActions =
    document.createElement("div");

  headerActions.className =
    "soil-interpolation-legend-header-actions";

  const moveButton =
    document.createElement("button");

  moveButton.type = "button";
  moveButton.className =
    "analytical-control-move-button";
  moveButton.textContent = "\u2195";
  moveButton.title =
    "Move Interpolation Legend";
  moveButton.setAttribute(
    "aria-label",
    "Move Interpolation Legend",
  );

  const toggleButton =
    document.createElement("button");

  toggleButton.type = "button";
  toggleButton.style.pointerEvents =
    "auto";
  toggleButton.style.cursor =
    "pointer";

  toggleButton.className =
    "soil-interpolation-legend-toggle";

  toggleButton.textContent =
    interpolationLegendExpanded
      ? "\u2212"
      : "+";

  toggleButton.setAttribute(
    "aria-expanded",
    interpolationLegendExpanded
      ? "true"
      : "false",
  );

  toggleButton.setAttribute(
    "aria-label",
    interpolationLegendExpanded
      ? "Collapse interpolation legend"
      : "Expand interpolation legend",
  );

  headerActions.appendChild(moveButton);
  headerActions.appendChild(toggleButton);

  header.appendChild(title);
  header.appendChild(headerActions);

    if (
    typeof window.enableMovableAnalyticalControl ===
    "function"
  ) {
    window.enableMovableAnalyticalControl(
      container,
      moveButton,
    );
  }

  toggleButton.type = "button";
  toggleButton.style.pointerEvents =
    "auto";
  toggleButton.style.cursor =
    "pointer";

  toggleButton.className =
    "soil-interpolation-legend-toggle";

  toggleButton.textContent =
    interpolationLegendExpanded
      ? "−"
      : "+";

  toggleButton.setAttribute(
    "aria-expanded",
    interpolationLegendExpanded
      ? "true"
      : "false",
  );

  toggleButton.setAttribute(
    "aria-label",
    interpolationLegendExpanded
      ? "Collapse interpolation legend"
      : "Expand interpolation legend",
  );

  toggleButton.title =
    interpolationLegendExpanded
      ? "Collapse interpolation legend"
      : "Expand interpolation legend";

  header.appendChild(
    title,
  );

  header.appendChild(
    toggleButton,
  );

  container.appendChild(
    header,
  );

  const content =
    document.createElement(
      "div",
    );

  content.className =
    "soil-interpolation-legend-content";

  content.hidden =
    !interpolationLegendExpanded;

  const subtitle =
    document.createElement(
      "div",
    );

  subtitle.className =
    "soil-interpolation-legend-subtitle";

  const parameterDisplay =
    parameterUnit
      ? `${parameterLabel} (${parameterUnit})`
      : parameterLabel;

  subtitle.textContent =
    `${parameterDisplay} • ${methodLabel}`;

  content.appendChild(
    subtitle,
  );

  const settingsSummary =
    document.createElement(
      "div",
    );

  settingsSummary.className =
    "soil-interpolation-legend-settings";

  const methodKey =
    method.key || "";

  settingsSummary.textContent =
    methodKey === "idw"
      ? `Power ${power} • Grid ${resolution} × ${resolution}`
      : `Grid ${resolution} × ${resolution}`;

  content.appendChild(
    settingsSummary,
  );

  const gradient =
    document.createElement(
      "div",
    );

  gradient.className =
    "soil-interpolation-gradient";

  gradient.style.background =
    "linear-gradient(to right, " +
    "hsl(240, 75%, 48%), " +
    "hsl(180, 75%, 48%), " +
    "hsl(120, 75%, 48%), " +
    "hsl(60, 75%, 48%), " +
    "hsl(0, 75%, 48%))";

  gradient.setAttribute(
    "aria-label",
    `Continuous ${parameterLabel} interpolation scale`,
  );

  gradient.title =
    "Continuous visualization scale from lower to higher interpolated values";

  content.appendChild(
    gradient,
  );

  const scale =
    document.createElement(
      "div",
    );

  scale.className =
    "soil-interpolation-gradient-scale";

  const minimumLabel =
    document.createElement(
      "span",
    );

  minimumLabel.textContent =
    formatInterpolationValue(
      statistics.minimum,
      parameterUnit,
    );

  minimumLabel.title =
    "Minimum interpolated value";

  const maximumLabel =
    document.createElement(
      "span",
    );

  maximumLabel.textContent =
    formatInterpolationValue(
      statistics.maximum,
      parameterUnit,
    );

  maximumLabel.title =
    "Maximum interpolated value";

  scale.appendChild(
    minimumLabel,
  );

  scale.appendChild(
    maximumLabel,
  );

  content.appendChild(
    scale,
  );

  const statisticsContainer =
    document.createElement(
      "div",
    );

  statisticsContainer.className =
    "soil-interpolation-statistics";

  addInterpolationLegendStat(
    statisticsContainer,
    "Minimum",
    formatInterpolationValue(
      statistics.minimum,
      parameterUnit,
    ),
  );

  addInterpolationLegendStat(
    statisticsContainer,
    "Maximum",
    formatInterpolationValue(
      statistics.maximum,
      parameterUnit,
    ),
  );

  addInterpolationLegendStat(
    statisticsContainer,
    "Average",
    formatInterpolationValue(
      statistics.average,
      parameterUnit,
    ),
  );

  addInterpolationLegendStat(
    statisticsContainer,
    "Valid Cells",
    Number.isFinite(
      Number(
        statistics.validCellCount,
      ),
    )
      ? Number(
          statistics.validCellCount,
        ).toLocaleString()
      : "—",
  );

  const sourcePoints =
    Array.isArray(
      data.sourcePoints,
    )
      ? data.sourcePoints
      : [];

  addInterpolationLegendStat(
    statisticsContainer,
    "Source Samples",
    sourcePoints.length > 0
      ? sourcePoints.length.toLocaleString()
      : "—",
  );

  let gridCellCount = null;

  if (
    Number.isFinite(
      Number(grid.cellCount),
    )
  ) {
    gridCellCount =
      Number(grid.cellCount);
  } else if (
    Number.isFinite(
      Number(grid.rows),
    ) &&
    Number.isFinite(
      Number(grid.columns),
    )
  ) {
    gridCellCount =
      Number(grid.rows) *
      Number(grid.columns);
  }

  addInterpolationLegendStat(
    statisticsContainer,
    "Grid Cells",
    gridCellCount !== null
      ? gridCellCount.toLocaleString()
      : "—",
  );

  content.appendChild(
    statisticsContainer,
  );

  const surfaceInfo =
    document.createElement(
      "div",
    );

  surfaceInfo.className =
    "soil-interpolation-legend-info";

  const rows =
    Number.isFinite(
      Number(grid.rows),
    )
      ? Number(grid.rows)
      : null;

  const columns =
    Number.isFinite(
      Number(grid.columns),
    )
      ? Number(grid.columns)
      : null;

  if (
    rows !== null &&
    columns !== null
  ) {
    surfaceInfo.textContent =
      `Surface: ${rows} × ${columns} grid • ` +
      `${
        gridCellCount !== null
          ? gridCellCount.toLocaleString()
          : "—"
      } cells`;
  } else {
    surfaceInfo.textContent =
      "Surface generated from the backend interpolation grid.";
  }

  content.appendChild(
    surfaceInfo,
  );

  const note =
    document.createElement(
      "div",
    );

  note.className =
    "soil-interpolation-legend-note";

  note.textContent =
    "Continuous visualization scale based on interpolated surface values. No scientific classification thresholds are encoded.";

  content.appendChild(
    note,
  );

  container.appendChild(
    content,
  );

  // ----------------------------------------------------------
  // Legend toggle
  // ----------------------------------------------------------

  toggleButton.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      interpolationLegendExpanded =
        !interpolationLegendExpanded;

      if (
        interpolationLegendExpanded
      ) {
        thematicLegendExpanded =
          false;

        const thematicToggle =
          document.querySelector(
            ".soil-thematic-panel-toggle",
          );

        const thematicContent =
          document.querySelector(
            ".soil-thematic-panel-content",
          );

        if (thematicToggle) {
          thematicToggle.setAttribute(
            "aria-expanded",
            "false",
          );

          thematicToggle.setAttribute(
            "aria-label",
            "Expand legend and thematic filter",
          );

          thematicToggle.title =
            "Expand legend and thematic filter";

          thematicToggle.textContent =
            "+";
        }

        if (thematicContent) {
          thematicContent.hidden =
            true;
        }
      }

      content.hidden =
        !interpolationLegendExpanded;

      toggleButton.textContent =
        interpolationLegendExpanded
          ? "−"
          : "+";

      toggleButton.setAttribute(
        "aria-expanded",
        interpolationLegendExpanded
          ? "true"
          : "false",
      );

      toggleButton.setAttribute(
        "aria-label",
        interpolationLegendExpanded
          ? "Collapse interpolation legend"
          : "Expand interpolation legend",
      );

      toggleButton.title =
        interpolationLegendExpanded
          ? "Collapse interpolation legend"
          : "Expand interpolation legend";
    },
  );

  if (
    typeof L !== "undefined" &&
    L.DomEvent
  ) {
    L.DomEvent.disableClickPropagation(
      toggleButton,
    );

    L.DomEvent.disableScrollPropagation(
      toggleButton,
    );
  }
}

// ============================================================
// INTERPOLATION LEGEND STAT ROW
// ============================================================

function addInterpolationLegendStat(
  container,
  labelText,
  valueText,
) {
  if (!container) {
    return;
  }

  const row =
    document.createElement(
      "div",
    );

  row.className =
    "soil-interpolation-stat-row";

  const label =
    document.createElement(
      "span",
    );

  label.textContent =
    labelText;

  const value =
    document.createElement(
      "strong",
    );

  value.textContent =
    valueText;

  row.appendChild(
    label,
  );

  row.appendChild(
    value,
  );

  container.appendChild(
    row,
  );
}

// ============================================================
// FORMAT INTERPOLATION VALUE
// ============================================================

function formatInterpolationValue(
  value,
  unit,
) {
  const numeric =
    Number(value);

  if (!Number.isFinite(numeric)) {
    return "—";
  }

  const formatted =
    numeric.toFixed(3);

  return unit
    ? `${formatted} ${unit}`
    : formatted;
}

console.log(
  "map-ui-interpolation.js loaded successfully.",
);