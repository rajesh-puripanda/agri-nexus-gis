/* ============================================================
   FERTILITY ZONING UI STATE
   Phase 9.5
   ============================================================ */

let fertilityZoningPanelExpanded = true;
let fertilityZoningLegendExpanded = true;

/* ============================================================
   FERTILITY ZONING CONTROL BUILDER
   Phase 9.5
   ============================================================ */

function buildFertilityZoningControl(container, configuration, callbacks = {}) {
  if (!container) {
    return null;
  }

  container.className = "soil-fertility-zoning-control";

  const config = configuration || {};

  const defaultPower = Number.isFinite(Number(config?.defaults?.power))
    ? Number(config.defaults.power)
    : 2;

  const defaultResolution = Number.isFinite(
    Number(config?.defaults?.resolution),
  )
    ? Number(config.defaults.resolution)
    : 50;

  container.innerHTML = `
    <div class="soil-fertility-zoning-panel">

      <div class="soil-fertility-zoning-panel-header">

        <div class="soil-fertility-zoning-title-wrap">
          <div class="soil-fertility-zoning-title">
            Fertility Zoning
          </div>

          <div class="soil-fertility-zoning-subtitle">
            Overall soil fertility surface
          </div>
        </div>

        <div class="soil-fertility-zoning-header-actions">

          <button
            type="button"
            class="analytical-control-move-button"
            title="Move Fertility Zoning panel"
            aria-label="Move Fertility Zoning panel"
          >
            ↕
          </button>

          <button
            type="button"
            id="soilFertilityZoningPanelToggle"
            class="soil-fertility-zoning-panel-toggle"
            aria-expanded="${fertilityZoningPanelExpanded}"
            aria-label="Toggle fertility zoning controls"
          >
            ${fertilityZoningPanelExpanded ? "\u2212" : "+"}
          </button>

        </div>

      </div>

      <div
        id="soilFertilityZoningPanelBody"
        class="soil-fertility-zoning-panel-content"
        ${fertilityZoningPanelExpanded ? "" : 'style="display:none;"'}
      >

        <div class="soil-fertility-zoning-field">

          <label
            for="soilFertilityZoningPower"
            class="soil-fertility-zoning-label"
          >
            IDW Power
          </label>

          <input
            type="number"
            id="soilFertilityZoningPower"
            class="soil-fertility-zoning-input"
            min="0.1"
            max="10"
            step="0.1"
            value="${defaultPower}"
          />

        </div>

        <div class="soil-fertility-zoning-field">

          <label
            for="soilFertilityZoningResolution"
            class="soil-fertility-zoning-label"
          >
            Resolution
          </label>

          <input
            type="number"
            id="soilFertilityZoningResolution"
            class="soil-fertility-zoning-input"
            min="10"
            max="200"
            step="1"
            value="${defaultResolution}"
          />

        </div>

        <div
          id="soilFertilityZoningVisibilityWrap"
          class="soil-fertility-zoning-visibility-wrap disabled"
        >

          <label class="soil-fertility-zoning-checkbox-label">

            <input
              type="checkbox"
              id="soilFertilityZoningVisibility"
              disabled
            />

            <span>
              Show zoning surface
            </span>

          </label>

        </div>

        <div class="soil-fertility-zoning-actions">

          <button
            type="button"
            id="soilFertilityZoningGenerate"
            class="soil-fertility-zoning-button primary"
          >
            Generate Zoning
          </button>

          <button
            type="button"
            id="soilFertilityZoningClear"
            class="soil-fertility-zoning-button secondary"
          >
            Clear Zoning
          </button>

        </div>

        <div
          id="soilFertilityZoningStatus"
          class="soil-fertility-zoning-status"
        >
          <span class="soil-fertility-zoning-status-indicator"></span>
          <span class="soil-fertility-zoning-status-text">
            Ready to generate fertility zoning.
          </span>
        </div>

      </div>

    </div>
  `;

  const moveButton = container.querySelector(
    ".analytical-control-move-button",
  );

  const panelToggle = container.querySelector(
    "#soilFertilityZoningPanelToggle",
  );

  const panelBody = container.querySelector(
    "#soilFertilityZoningPanelBody",
  );

  const generateButton = container.querySelector(
    "#soilFertilityZoningGenerate",
  );

  const clearButton = container.querySelector(
    "#soilFertilityZoningClear",
  );

  const visibilityCheckbox = container.querySelector(
    "#soilFertilityZoningVisibility",
  );

  if (
    moveButton &&
    typeof window.enableMovableAnalyticalControl === "function"
  ) {
    window.enableMovableAnalyticalControl(container, moveButton);
  }

  if (panelToggle) {
    panelToggle.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      fertilityZoningPanelExpanded = !fertilityZoningPanelExpanded;

      panelToggle.setAttribute(
        "aria-expanded",
        String(fertilityZoningPanelExpanded),
      );

      panelToggle.textContent = fertilityZoningPanelExpanded
        ? "\u2212"
        : "+";

      if (panelBody) {
        panelBody.style.display = fertilityZoningPanelExpanded
          ? ""
          : "none";
      }
    });
  }

  if (generateButton) {
    generateButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (typeof callbacks.onGenerate === "function") {
        const powerInput = container.querySelector(
          "#soilFertilityZoningPower",
        );

        const resolutionInput = container.querySelector(
          "#soilFertilityZoningResolution",
        );

        callbacks.onGenerate({
          power: Number(powerInput?.value),
          resolution: Number(resolutionInput?.value),
        });
      }
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (typeof callbacks.onClear === "function") {
        callbacks.onClear();
      }
    });
  }

  if (visibilityCheckbox) {
    visibilityCheckbox.addEventListener("change", function () {
      if (typeof callbacks.onVisibilityChange === "function") {
        callbacks.onVisibilityChange(visibilityCheckbox.checked);
      }
    });
  }

  return container;
}

/* ============================================================
   UPDATE FERTILITY ZONING CONTROL
   Phase 9.5
   ============================================================ */

function updateFertilityZoningControl(configuration) {
  const container = document.querySelector(
    ".soil-fertility-zoning-control",
  );

  if (!container) {
    return;
  }

  const config = configuration || {};

  const defaultPower = Number.isFinite(Number(config?.defaults?.power))
    ? Number(config.defaults.power)
    : 2;

  const defaultResolution = Number.isFinite(
    Number(config?.defaults?.resolution),
  )
    ? Number(config.defaults.resolution)
    : 50;

  const powerInput = container.querySelector(
    "#soilFertilityZoningPower",
  );

  const resolutionInput = container.querySelector(
    "#soilFertilityZoningResolution",
  );

  if (powerInput) {
    powerInput.value = defaultPower;
  }

  if (resolutionInput) {
    resolutionInput.value = defaultResolution;
  }
}

/* ============================================================
   UPDATE FERTILITY ZONING VISIBILITY CONTROL
   Phase 9.5
   ============================================================ */

function updateFertilityZoningVisibility(visible, hasResult = true) {
  const checkbox = document.querySelector(
    "#soilFertilityZoningVisibility",
  );

  const wrapper = document.querySelector(
    "#soilFertilityZoningVisibilityWrap",
  );

  if (!checkbox) {
    return;
  }

  checkbox.checked = Boolean(visible);
  checkbox.disabled = !hasResult;

  if (wrapper) {
    wrapper.classList.toggle("disabled", !hasResult);
  }
}

/* ============================================================
   FERTILITY ZONING STATUS BUILDER
   Phase 9.5
   ============================================================ */

function buildFertilityZoningStatus(container, status, message) {
  if (!container) {
    return;
  }

  const normalizedStatus = String(status || "idle").toLowerCase();

  container.className =
    "soil-fertility-zoning-status status-" + normalizedStatus;

  container.innerHTML = `
    <span
      class="soil-fertility-zoning-status-indicator"
      aria-hidden="true"
    ></span>

    <span
      class="soil-fertility-zoning-status-text"
    >
      ${escapeHtml(
        message || "Ready to generate fertility zoning.",
      )}
    </span>
  `;
}

/* ============================================================
   FERTILITY ZONING LEGEND BUILDER
   Phase 9.5
   ============================================================ */

function buildFertilityZoningLegend(container, data) {
  if (!container) {
    return;
  }

  const counts = getFertilityZoningLegendCounts(data);

  const zones = [
    {
      key: "low",
      label: "Low",
      className: "low",
    },
    {
      key: "moderate_good",
      label: "Moderate / Good",
      className: "moderate-good",
    },
    {
      key: "high",
      label: "High",
      className: "high",
    },
    {
      key: "unavailable",
      label: "Unavailable",
      className: "unavailable",
    },
  ];

  container.classList.add("soil-fertility-zoning-legend");

  container.innerHTML = `
    <div class="soil-fertility-zoning-legend-panel">

      <div
  class="soil-fertility-zoning-legend-header"
>
  <div>
    <div
      class="soil-fertility-zoning-legend-title"
    >
      Soil Fertility Zones
    </div>

    <div
      class="soil-fertility-zoning-legend-subtitle"
    >
      Overall fertility classification
    </div>
  </div>

  <div
    class="soil-fertility-zoning-legend-header-actions"
  >
      <button
        type="button"
        class="analytical-control-move-button"
        title="Move Soil Fertility Zones legend"
        aria-label="Move Soil Fertility Zones legend"
      >
        &#8597;
      </button>

      <button
        type="button"
        id="soilFertilityZoningLegendToggle"
        class="soil-fertility-zoning-legend-toggle"
        aria-expanded="${fertilityZoningLegendExpanded}"
        aria-label="Toggle fertility zoning legend"
      >
        ${fertilityZoningLegendExpanded ? "\u2212" : "+"}
      </button>
      </div>
    </div>

      <div
        id="soilFertilityZoningLegendBody"
        class="soil-fertility-zoning-legend-body"
        ${fertilityZoningLegendExpanded ? "" : 'style="display:none;"'}
      >

        ${zones
          .map(function (zone) {
            return `
              <div class="soil-fertility-zoning-legend-item">

                <span
                  class="soil-fertility-zoning-legend-swatch ${zone.className}"
                  aria-hidden="true"
                ></span>

                <span
                  class="soil-fertility-zoning-legend-label"
                >
                  ${zone.label}
                </span>

                <span
                  class="soil-fertility-zoning-legend-count"
                  data-zone="${zone.key}"
                >
                  ${counts[zone.key] || 0}
                </span>

              </div>
            `;
          })
          .join("")}

        <div class="soil-fertility-zoning-legend-note">
          Classification is based on the backend
          overall soil fertility assessment.
        </div>

      </div>

    </div>
  `;

  const toggle = container.querySelector(
    "#soilFertilityZoningLegendToggle",
  );
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
  const body = container.querySelector(
    "#soilFertilityZoningLegendBody",
  );

  if (toggle) {
    toggle.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      fertilityZoningLegendExpanded =
        !fertilityZoningLegendExpanded;

      if (fertilityZoningLegendExpanded) {
        thematicLegendExpanded = false;

        const thematicToggle = document.querySelector(
          ".soil-thematic-panel-toggle",
        );

        const thematicContent = document.querySelector(
          ".soil-thematic-panel-content",
        );

        if (thematicToggle) {
          thematicToggle.setAttribute("aria-expanded", "false");
          thematicToggle.textContent = "+";
        }

        if (thematicContent) {
          thematicContent.hidden = true;
        }

        interpolationLegendExpanded = false;

        const interpolationToggle = document.querySelector(
          ".soil-interpolation-legend-toggle",
        );

        const interpolationContent = document.querySelector(
          ".soil-interpolation-legend-content",
        );

        if (interpolationToggle) {
          interpolationToggle.setAttribute(
            "aria-expanded",
            "false",
          );

          interpolationToggle.setAttribute(
            "aria-label",
            "Expand interpolation legend",
          );

          interpolationToggle.title =
            "Expand interpolation legend";

          interpolationToggle.textContent = "+";
        }

        if (interpolationContent) {
          interpolationContent.hidden = true;
        }
      }

      toggle.setAttribute(
        "aria-expanded",
        String(fertilityZoningLegendExpanded),
      );

      toggle.textContent = fertilityZoningLegendExpanded
        ? "\u2212"
        : "+";

      if (body) {
        body.style.display = fertilityZoningLegendExpanded
          ? ""
          : "none";
      }
    });
  }
}

/* ============================================================
   ADD FERTILITY ZONING LEGEND ITEM
   Phase 9.5
   ============================================================ */

function addFertilityZoningLegendItem(
  container,
  label,
  className,
  count,
) {
  if (!container) {
    return;
  }

  const item = document.createElement("div");

  item.className =
    "soil-fertility-zoning-legend-item";

  item.innerHTML = `
    <span
      class="soil-fertility-zoning-legend-swatch ${escapeHtml(
        className || "",
      )}"
      aria-hidden="true"
    ></span>

    <span
      class="soil-fertility-zoning-legend-label"
    >
      ${escapeHtml(label || "")}
    </span>

    <span
      class="soil-fertility-zoning-legend-count"
    >
      ${
        Number.isFinite(Number(count))
          ? Number(count)
          : 0
      }
    </span>
  `;

  container.appendChild(item);
}

/* ============================================================
   FERTILITY ZONING LEGEND COUNTS
   Phase 9.5
   ============================================================ */

function getFertilityZoningLegendCounts(data) {
  const counts = {
    low: 0,
    moderate_good: 0,
    high: 0,
    unavailable: 0,
  };

  if (!data) {
    return counts;
  }

  const statistics =
    data.statistics || data.stats || null;

  if (
    statistics &&
    statistics.classCounts &&
    typeof statistics.classCounts === "object"
  ) {
    Object.entries(statistics.classCounts).forEach(
      ([classification, count]) => {
        const numericCount = Number(count);

        if (!Number.isFinite(numericCount)) {
          return;
        }

        const key =
          normalizeFertilityZoneClass(classification);

        counts[key] += numericCount;
      },
    );

    return counts;
  }

  const cells =
    data.grid && Array.isArray(data.grid.cells)
      ? data.grid.cells
      : [];

  cells.forEach((cell) => {
    if (!cell) {
      return;
    }

    const classification =
      cell.classification ??
      cell.zone ??
      cell.fertilityClass ??
      cell.fertility_class;

    const key =
      normalizeFertilityZoneClass(classification);

    counts[key] += 1;
  });

  return counts;
}

/* ============================================================
   EXPORTS
   ============================================================ */

window.buildFertilityZoningControl = buildFertilityZoningControl;

window.updateFertilityZoningControl = updateFertilityZoningControl;

window.updateFertilityZoningVisibility = updateFertilityZoningVisibility;

window.buildFertilityZoningStatus = buildFertilityZoningStatus;

window.buildFertilityZoningLegend = buildFertilityZoningLegend;