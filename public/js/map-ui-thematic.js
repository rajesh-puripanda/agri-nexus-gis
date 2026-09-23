// ============================================================
// public/js/map-ui-thematic.js
// ============================================================
//
// Soil Analysis GIS
//
// Thematic Legend, Filtering, Analysis & Parameter Control
//
// ============================================================

"use strict";

let thematicLegendExpanded = true;

let thematicAnalysisExpanded = true;

// ============================================================
// THEMATIC LEGEND UI
// ============================================================

function buildThematicLegend(
  container,
  parameterLabel,
  filterCategory,
  filterCategoryLabel,
  categories,
  categoryCounts,
  presentationCategories,
  onCategoryClick,
  onShowAll,
) {
  if (!container) {
    return;
  }

  container.innerHTML = "";

  const header = document.createElement("div");
  header.className = "soil-thematic-panel-header";

  const title = document.createElement("div");
  title.className = "soil-thematic-legend-title";
  title.textContent = parameterLabel;

  const headerActions =
    document.createElement("div");

  headerActions.className =
    "soil-thematic-panel-header-actions";

  const moveButton =
    document.createElement("button");

  moveButton.type = "button";
  moveButton.className =
    "analytical-control-move-button";
  moveButton.textContent = "\u2195";
  moveButton.title =
    "Move Map Parameter Legend";
  moveButton.setAttribute(
    "aria-label",
    "Move Map Parameter Legend",
  );

  const toggleButton =
    document.createElement("button");

  toggleButton.type = "button";
  toggleButton.className =
    "soil-thematic-panel-toggle";

  toggleButton.setAttribute(
    "aria-expanded",
    thematicLegendExpanded
      ? "true"
      : "false",
  );

  toggleButton.setAttribute(
    "aria-label",
    thematicLegendExpanded
      ? "Collapse legend and thematic filter"
      : "Expand legend and thematic filter",
  );

  toggleButton.title =
    thematicLegendExpanded
      ? "Collapse legend and thematic filter"
      : "Expand legend and thematic filter";

  toggleButton.textContent =
    thematicLegendExpanded
      ? "\u2212"
      : "+";

  headerActions.appendChild(moveButton);
  headerActions.appendChild(toggleButton);

  header.appendChild(title);
  header.appendChild(headerActions);

  container.appendChild(header);

  if (
    typeof window.enableMovableAnalyticalControl ===
    "function"
  ) {
    window.enableMovableAnalyticalControl(
      container,
      moveButton,
    );
  }

  const content = document.createElement("div");

  content.className =
    "soil-thematic-panel-content";

  content.hidden =
    !thematicLegendExpanded;

  container.appendChild(content);

  toggleButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    thematicLegendExpanded =
      !thematicLegendExpanded;

    if (thematicLegendExpanded) {
      interpolationLegendExpanded = false;

      const interpolationToggle =
        document.querySelector(
          ".soil-interpolation-legend-toggle",
        );

      const interpolationContent =
        document.querySelector(
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

    content.hidden =
      !thematicLegendExpanded;

    toggleButton.setAttribute(
      "aria-expanded",
      thematicLegendExpanded
        ? "true"
        : "false",
    );

    toggleButton.textContent =
      thematicLegendExpanded ? "−" : "+";

    toggleButton.setAttribute(
      "aria-label",
      thematicLegendExpanded
        ? "Collapse legend and thematic filter"
        : "Expand legend and thematic filter",
    );

    toggleButton.title =
      thematicLegendExpanded
        ? "Collapse legend and thematic filter"
        : "Expand legend and thematic filter";
  });

  const subtitle = document.createElement("div");

  subtitle.className =
    "soil-thematic-legend-subtitle";

  subtitle.textContent =
    "Classification from soil analysis • Click a category to filter";

  content.appendChild(subtitle);

  if (filterCategory) {
    const status = document.createElement("div");

    status.className =
      "soil-thematic-filter-status";

    status.textContent =
      `Active filter: ${filterCategoryLabel}`;

    content.appendChild(status);
  }

  categories.forEach((categoryName) => {
    const presentation =
      presentationCategories[categoryName];

    if (!presentation) {
      return;
    }

    const item = document.createElement("button");

    item.type = "button";
    item.className =
      "soil-thematic-legend-item";

    if (filterCategory === categoryName) {
      item.classList.add("active");
    }

    item.setAttribute(
      "aria-pressed",
      filterCategory === categoryName
        ? "true"
        : "false",
    );

    item.title =
      `Show only ${presentation.label} samples`;

    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (
        typeof onCategoryClick ===
        "function"
      ) {
        onCategoryClick(categoryName);
      }
    });

    const symbol = document.createElement("span");

    symbol.className =
      `soil-thematic-legend-symbol ${presentation.className}`;

    symbol.textContent =
      presentation.symbol;

    symbol.setAttribute(
      "aria-hidden",
      "true",
    );

    const label = document.createElement("span");

    label.textContent =
      presentation.label;

    const count = document.createElement("span");

    count.className =
      "soil-thematic-legend-count";

    const countValue =
      categoryCounts[categoryName] || 0;

    count.textContent =
      String(countValue);

    count.title =
      `${countValue} sample(s)`;

    item.appendChild(symbol);
    item.appendChild(label);
    item.appendChild(count);

    content.appendChild(item);
  });

  const showAll =
    document.createElement("button");

  showAll.type = "button";
  showAll.className =
    "soil-thematic-show-all";
  showAll.textContent =
    "Show All Samples";

  showAll.disabled =
    filterCategory === null;

  showAll.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      typeof onShowAll ===
      "function"
    ) {
      onShowAll();
    }
  });

  content.appendChild(showAll);
}

// ============================================================
// THEMATIC ANALYSIS UI
// ============================================================

function buildThematicAnalysis(
  container,
  stats,
  thematicMapParameter,
  thematicPresentationCategories,
  categories,
  formatStatisticValue,
) {
  if (!container || !stats) {
    return;
  }

  container.innerHTML = "";

  const header = document.createElement("div");
  header.className =
    "soil-thematic-panel-header";

  const title = document.createElement("div");

  title.className =
    "soil-thematic-analysis-title";

  title.textContent =
    "Thematic Analysis";

  header.appendChild(title);

  const headerActions =
    document.createElement("div");

  headerActions.className =
    "soil-thematic-panel-header-actions";

  const moveButton =
    document.createElement("button");

  moveButton.type = "button";
  moveButton.className =
    "analytical-control-move-button";

  moveButton.textContent = "↕";

  moveButton.title =
    "Move Thematic Analysis panel";

  moveButton.setAttribute(
    "aria-label",
    "Move Thematic Analysis panel",
  );

  headerActions.appendChild(moveButton);

  const toggleButton =
    document.createElement("button");

  toggleButton.type = "button";
  toggleButton.className =
    "soil-thematic-panel-toggle";

  toggleButton.setAttribute(
    "aria-expanded",
    thematicAnalysisExpanded
      ? "true"
      : "false",
  );

  toggleButton.setAttribute(
    "aria-label",
    thematicAnalysisExpanded
      ? "Collapse thematic analysis"
      : "Expand thematic analysis",
  );

  toggleButton.title =
    thematicAnalysisExpanded
      ? "Collapse thematic analysis"
      : "Expand thematic analysis";

  toggleButton.textContent =
    thematicAnalysisExpanded
      ? "−"
      : "+";

  headerActions.appendChild(toggleButton);
  header.appendChild(headerActions);
  container.appendChild(header);

  if (
    typeof window.enableMovableAnalyticalControl ===
    "function"
  ) {
    window.enableMovableAnalyticalControl(
      container,
      moveButton,
    );
  }

  const content =
    document.createElement("div");

  content.className =
    "soil-thematic-panel-content";

  content.hidden =
    !thematicAnalysisExpanded;

  container.appendChild(content);

  toggleButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    thematicAnalysisExpanded =
      !thematicAnalysisExpanded;

    content.hidden =
      !thematicAnalysisExpanded;

    toggleButton.setAttribute(
      "aria-expanded",
      thematicAnalysisExpanded
        ? "true"
        : "false",
    );

    toggleButton.textContent =
      thematicAnalysisExpanded
        ? "−"
        : "+";

    toggleButton.setAttribute(
      "aria-label",
      thematicAnalysisExpanded
        ? "Collapse thematic analysis"
        : "Expand thematic analysis",
    );

    toggleButton.title =
      thematicAnalysisExpanded
        ? "Collapse thematic analysis"
        : "Expand thematic analysis";
  });

  const subtitle =
    document.createElement("div");

  subtitle.className =
    "soil-thematic-analysis-subtitle";

  subtitle.textContent =
    stats.parameterLabel;

  content.appendChild(subtitle);

  const filter =
    document.createElement("div");

  filter.className =
    "soil-thematic-analysis-filter";

  filter.textContent =
    stats.filterCategory
      ? `Statistics for ${
          thematicPresentationCategories[
            stats.filterCategory
          ]?.label ||
          stats.filterCategory
        } samples`
      : "Statistics for all samples";

  content.appendChild(filter);

  const addRow = (
    labelText,
    valueText,
  ) => {
    const row =
      document.createElement("div");

    row.className =
      "soil-thematic-analysis-row";

    const label =
      document.createElement("span");

    label.className =
      "soil-thematic-analysis-label";

    label.textContent =
      labelText;

    const value =
      document.createElement("span");

    value.className =
      "soil-thematic-analysis-value";

    value.textContent =
      valueText;

    row.appendChild(label);
    row.appendChild(value);

    content.appendChild(row);
  };

  addRow(
    "Samples",
    String(stats.sampleCount),
  );

  addRow(
    "Measured",
    String(stats.measuredSampleCount),
  );

  addRow(
    "Average",
    formatStatisticValue(
      stats.average,
      thematicMapParameter,
    ),
  );

  addRow(
    "Minimum",
    formatStatisticValue(
      stats.minimum,
      thematicMapParameter,
    ),
  );

  addRow(
    "Maximum",
    formatStatisticValue(
      stats.maximum,
      thematicMapParameter,
    ),
  );

  const distribution =
    document.createElement("div");

  distribution.className =
    "soil-thematic-analysis-section";

  const distributionTitle =
    document.createElement("div");

  distributionTitle.className =
    "soil-thematic-analysis-section-title";

  distributionTitle.textContent =
    "Category Distribution";

  distribution.appendChild(
    distributionTitle,
  );

  if (stats.sampleCount === 0) {
    const empty =
      document.createElement("div");

    empty.className =
      "soil-thematic-analysis-empty";

    empty.textContent =
      "No samples match the current selection.";

    distribution.appendChild(empty);
  } else {
    categories.forEach((category) => {
      const row =
        document.createElement("div");

      row.className =
        "soil-thematic-analysis-category";

      const label =
        document.createElement("span");

      label.textContent =
        thematicPresentationCategories[
          category
        ]?.label || category;

      const count =
        document.createElement("strong");

      count.textContent =
        String(
          stats.categoryCounts[
            category
          ] || 0,
        );

      row.appendChild(label);
      row.appendChild(count);

      distribution.appendChild(row);
    });
  }

  content.appendChild(distribution);

  const note =
    document.createElement("div");

  note.className =
    "soil-thematic-analysis-note";

  note.textContent =
    "Statistics use backend soil-analysis measurements and classifications. IDW interpolation is provided separately as a continuous spatial surface.";

  content.appendChild(note);
}

// ============================================================
// THEMATIC MAP PARAMETER CONTROL UI
// ============================================================

function buildThematicMapParameterControl(
  container,
  parameters,
  selectedParameter,
  onParameterChange,
) {
  if (!container) {
    return;
  }

  container.innerHTML = "";

  container.setAttribute(
    "aria-label",
    "Thematic map controls",
  );

  const header =
    document.createElement("div");

  header.className =
    "soil-map-control-header";

  const title =
    document.createElement("label");

  title.className =
    "soil-map-control-title";

  title.textContent =
    "Map Parameter";

  title.htmlFor =
    "soilMapParameter";

  const moveButton =
    document.createElement("button");

  moveButton.type = "button";
  moveButton.className =
    "analytical-control-move-button";
  moveButton.textContent = "\u2195";
  moveButton.title =
    "Move Map Parameter panel";
  moveButton.setAttribute(
    "aria-label",
    "Move Map Parameter panel",
  );

  header.appendChild(title);
  header.appendChild(moveButton);

  const select =
    document.createElement("select");

  select.className =
    "soil-map-parameter-select";

  select.id =
    "soilMapParameter";

  select.name =
    "soilMapParameter";

  select.title =
    "Select thematic map parameter";

  select.setAttribute(
    "aria-label",
    "Select thematic map parameter",
  );

  parameters.forEach((parameter) => {
    const option =
      document.createElement("option");

    option.value =
      parameter.value;

    option.textContent =
      parameter.label;

    select.appendChild(option);
  });

  select.value =
    selectedParameter;

  select.addEventListener("change", (event) => {
    if (
      typeof onParameterChange ===
      "function"
    ) {
      onParameterChange(
        event.target.value,
      );
    }
  });

  container.appendChild(header);
  container.appendChild(select);

  if (
    typeof window.enableMovableAnalyticalControl ===
    "function"
  ) {
    window.enableMovableAnalyticalControl(
      container,
      moveButton,
    );
  }
}

console.log(
  "map-ui-thematic.js loaded successfully.",
);