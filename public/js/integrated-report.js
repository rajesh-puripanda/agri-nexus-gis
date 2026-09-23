"use strict";

// ============================================================
// public/js/integrated-report.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.6  Integrated Analytical GIS Reporting
// Phase 10.6.8  Reporting Presentation / UI Formatting
//
// Responsibilities:
//   1. Read existing frontend analytical state
//   2. Build the integrated-report request
//   3. Call the authoritative backend report API
//   4. Render structured report sections
//   5. Preserve technical report details
//
// Scientific calculations remain backend authoritative.
//
// ============================================================

const INTEGRATED_REPORT_API =
  "/api/reports/integrated-analytical-gis";

let integratedReportResult = null;
let integratedReportRequestInProgress = false;

/* ============================================================
   PUBLIC STATE
   ============================================================ */

function getIntegratedReportResult() {
  return integratedReportResult;
}

function isIntegratedReportRequestInProgress() {
  return integratedReportRequestInProgress;
}

/* ============================================================
   SELECTED SAMPLE
   ============================================================ */

function getIntegratedReportSampleIds() {
  if (
    typeof window.getSelectedSoilSample !== "function"
  ) {
    return [];
  }

  const sample =
    window.getSelectedSoilSample();

  if (!sample) {
    return [];
  }

  const id = Number(sample.id);

  if (!Number.isInteger(id) || id <= 0) {
    return [];
  }

  return [id];
}

/* ============================================================
   THEMATIC PARAMETER
   ============================================================ */

function getIntegratedReportParameter() {
  if (
    typeof window.getThematicMapParameter !==
    "function"
  ) {
    return "standard";
  }

  const parameter =
    window.getThematicMapParameter();

  return parameter || "standard";
}

/* ============================================================
   SPATIAL QUERY
   ============================================================ */

function buildIntegratedReportSpatialQuery() {
  if (
    typeof window.getSpatialQueryState !==
    "function"
  ) {
    return null;
  }

  const state =
    window.getSpatialQueryState();

  if (
    !state ||
    typeof state !== "object"
  ) {
    return null;
  }

  const spatialType =
    state.spatialType || "none";

  const hasParameter =
    typeof state.parameter === "string" &&
    state.parameter.trim() !== "";

  const hasClassification =
    typeof state.classification === "string" &&
    state.classification.trim() !== "";

  const hasSpatialFilter =
    spatialType === "radius"
      ? state.latitude !== "" &&
        state.longitude !== "" &&
        state.radius !== ""
      : spatialType === "bbox"
        ? state.minLatitude !== "" &&
          state.maxLatitude !== "" &&
          state.minLongitude !== "" &&
          state.maxLongitude !== ""
        : false;

  if (
    !hasParameter &&
    !hasClassification &&
    !hasSpatialFilter
  ) {
    return null;
  }

  return {
    ...state,
  };
}

/* ============================================================
   INTERPOLATION
   ============================================================ */

function buildIntegratedReportInterpolation() {
  if (
    typeof window.getInterpolationConfiguration !==
    "function"
  ) {
    return null;
  }

  const configuration =
    window.getInterpolationConfiguration();

  if (
    !configuration ||
    typeof configuration !== "object"
  ) {
    return null;
  }

  const parameterElement =
    document.getElementById(
      "soilInterpolationParameter",
    );

  const methodElement =
    document.getElementById(
      "soilInterpolationMethod",
    );

  const powerElement =
    document.getElementById(
      "soilInterpolationPower",
    );

  const resolutionElement =
    document.getElementById(
      "soilInterpolationResolution",
    );

  const parameter =
    parameterElement?.value ||
    configuration.parameter ||
    "ph";

  const method =
    methodElement?.value ||
    configuration.method ||
    "idw";

  const resolutionValue =
    resolutionElement?.value;

  const resolution =
    resolutionValue === "" ||
    resolutionValue === null ||
    resolutionValue === undefined
      ? 50
      : Number(resolutionValue);

  if (
    !parameter ||
    !method ||
    !Number.isInteger(resolution)
  ) {
    return null;
  }

  const request = {
    parameter,
    method,
    resolution,
  };

  if (method === "idw") {
    const powerValue =
      powerElement?.value;

    const power =
      powerValue === "" ||
      powerValue === null ||
      powerValue === undefined
        ? 2
        : Number(powerValue);

    if (!Number.isFinite(power)) {
      return null;
    }

    request.power = power;
  }

  return request;
}

/* ============================================================
   FERTILITY ZONING
   ============================================================ */

function buildIntegratedReportFertilityZoning() {
  if (
    typeof window.getFertilityZoningConfiguration !==
    "function"
  ) {
    return null;
  }

  const configuration =
    window.getFertilityZoningConfiguration();

  if (
    !configuration ||
    typeof configuration !== "object"
  ) {
    return null;
  }

  const powerElement =
    document.getElementById(
      "soilFertilityZoningPower",
    );

  const resolutionElement =
    document.getElementById(
      "soilFertilityZoningResolution",
    );

  const powerValue =
    powerElement?.value;

  const resolutionValue =
    resolutionElement?.value;

  const power =
    powerValue === "" ||
    powerValue === null ||
    powerValue === undefined
      ? 2
      : Number(powerValue);

  const resolution =
    resolutionValue === "" ||
    resolutionValue === null ||
    resolutionValue === undefined
      ? 50
      : Number(resolutionValue);

  if (
    !Number.isFinite(power) ||
    !Number.isInteger(resolution)
  ) {
    return null;
  }

  return {
    power,
    resolution,
  };
}

/* ============================================================
   HISTORICAL REQUEST
   ============================================================ */

function buildIntegratedReportHistorical(
  sampleIds,
  parameter,
) {
  if (
    !Array.isArray(sampleIds) ||
    sampleIds.length !== 1
  ) {
    return null;
  }

  if (
    !parameter ||
    parameter === "standard"
  ) {
    return null;
  }

  return {
    sampleId: sampleIds[0],
    parameter,
  };
}

/* ============================================================
   REQUEST BUILDER
   ============================================================ */

function buildIntegratedReportRequest() {
  const sampleIds =
    getIntegratedReportSampleIds();

  const parameter =
    getIntegratedReportParameter();

  const request = {
    sampleIds,
    parameter,
  };

  /*
   * Spatial analysis is deliberately not generated here.
   *
   * map.js does not currently expose the last spatial-analysis
   * coordinates as public state. We therefore do not invent
   * coordinates or silently execute another spatial analysis.
   */

  const spatialQuery =
    buildIntegratedReportSpatialQuery();

  if (spatialQuery) {
    request.spatialQuery =
      spatialQuery;
  }

  const interpolation =
    buildIntegratedReportInterpolation();

  if (interpolation) {
    request.interpolation =
      interpolation;
  }

  const fertilityZoning =
    buildIntegratedReportFertilityZoning();

  if (fertilityZoning) {
    request.fertilityZoning =
      fertilityZoning;
  }

  const historical =
    buildIntegratedReportHistorical(
      sampleIds,
      parameter,
    );

  if (historical) {
    request.historical =
      historical;
  }

  return request;
}

/* ============================================================
   STATUS
   ============================================================ */

function getSectionStatus(section) {
  if (
    !section ||
    typeof section !== "object"
  ) {
    return "unavailable";
  }

  return section.status ||
    "unavailable";
}

function getStatusLabel(status) {
  switch (status) {
    case "available":
      return "Available";

    case "unavailable":
      return "Unavailable";

    case "not_requested":
      return "Not requested";

    case "not_applicable":
      return "Not applicable";

    case "error":
      return "Error";

    default:
      return status || "Unknown";
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "available":
      return "integrated-report-badge-available";

    case "not_requested":
      return "integrated-report-badge-not-requested";

    case "not_applicable":
      return "integrated-report-badge-not-applicable";

    case "unavailable":
      return "integrated-report-badge-unavailable";

    case "error":
      return "integrated-report-badge-error";

    case "partial":
      return "integrated-report-badge-partial";

    default:
      return "";
  }
}

/* ============================================================
   VALUE / LABEL FORMATTING
   ============================================================ */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function humanizeKey(key) {
  return String(key ?? "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    );
}

function formatValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "—";
    }

    return escapeHtml(
      Number.isInteger(value)
        ? value
        : Number(value.toFixed(4)),
    );
  }

  if (
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return escapeHtml(value);
  }

  return escapeHtml(
    JSON.stringify(value),
  );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return formatValue(value);
  }

  return escapeHtml(
    new Intl.DateTimeFormat(
      undefined,
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      },
    ).format(date),
  );
}

function isPrimitive(value) {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/* ============================================================
   BADGE
   ============================================================ */

function renderStatusBadge(status) {
  const label =
    getStatusLabel(status);

  const className =
    getStatusBadgeClass(status);

  return `
    <span class="integrated-report-badge ${className}">
      ${escapeHtml(label)}
    </span>
  `;
}

/* ============================================================
   DATA ITEM
   ============================================================ */

function renderDataItem(
  label,
  value,
) {
  return `
    <div class="integrated-report-data-item">
      <span class="integrated-report-data-label">
        ${escapeHtml(label)}
      </span>

      <span class="integrated-report-data-value">
        ${formatValue(value)}
      </span>
    </div>
  `;
}

/* ============================================================
   GENERIC OBJECT RENDERER
   ============================================================ */

function renderObjectData(
  data,
  options = {},
) {
  if (
    data === null ||
    data === undefined
  ) {
    return `
      <p class="integrated-report-empty">
        No data returned.
      </p>
    `;
  }

  if (isPrimitive(data)) {
    return `
      <p class="integrated-report-data-value">
        ${formatValue(data)}
      </p>
    `;
  }

  if (Array.isArray(data)) {
    return renderArrayData(
      data,
      options,
    );
  }

  const entries =
    Object.entries(data);

  if (entries.length === 0) {
    return `
      <p class="integrated-report-empty">
        No data returned.
      </p>
    `;
  }

  const items =
    entries
      .map(([key, value]) => {
        if (
          isPrimitive(value)
        ) {
          return renderDataItem(
            humanizeKey(key),
            value,
          );
        }

        return `
          <div class="integrated-report-subsection">
            <h4 class="integrated-report-subsection-title">
              ${escapeHtml(
                humanizeKey(key),
              )}
            </h4>

            ${renderObjectData(
              value,
              options,
            )}
          </div>
        `;
      })
      .join("");

  return `
    <div class="integrated-report-data-grid">
      ${items}
    </div>
  `;
}

/* ============================================================
   ARRAY RENDERER
   ============================================================ */

function renderArrayData(
  data,
  options = {},
) {
  if (!data.length) {
    return `
      <p class="integrated-report-empty">
        No records returned.
      </p>
    `;
  }

  const objects =
    data.every(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item),
    );

  if (!objects) {
    return `
      <ul class="integrated-report-list">
        ${data
          .map(
            (item) => `
              <li>
                ${formatValue(item)}
              </li>
            `,
          )
          .join("")}
      </ul>
    `;
  }

  const columns = Object.keys(data[0]);

  return `
    <div class="integrated-report-table-container">
      <table class="integrated-report-table">
        <thead>
          <tr>
            ${columns
              .map(
                (key) => `
                  <th>
                    ${escapeHtml(
                      humanizeKey(key),
                    )}
                  </th>
                `,
              )
              .join("")}
          </tr>
        </thead>

        <tbody>
          ${data
            .map(
              (row) => `
                <tr>
                  ${columns
                    .map(
                      (key) => `
                        <td>
                          <div class="integrated-report-table-cell-content">
                            ${formatValue(row[key])}
                          </div>
                        </td>
                      `,
                    )
                    .join("")}
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}
/* ============================================================
   SAMPLE SUMMARY
   ============================================================ */

function renderSampleSummary(data) {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return renderObjectData(data);
  }

  const sample =
    data.sample ||
    data.selectedSample ||
    data;

  const sampleCode =
    sample.sample_code ??
    sample.sampleCode ??
    sample.code;

  const sampleDate =
    sample.sample_date ??
    sample.sampleDate ??
    data.sampleDate;

  const latitude =
    sample.latitude ??
    data.latitude;

  const longitude =
    sample.longitude ??
    data.longitude;

  const depthFrom =
    sample.depth_from_cm ??
    sample.depthFromCm ??
    sample.depthFrom;

  const depthTo =
    sample.depth_to_cm ??
    sample.depthToCm ??
    sample.depthTo;

  const texture =
    sample.soil_texture ??
    sample.soilTexture ??
    sample.texture;

  return `
    <div class="integrated-report-summary-grid">

      ${renderDataItem(
        "Sample",
        sampleCode,
      )}

      ${renderDataItem(
        "Sample date",
        sampleDate
          ? formatDate(sampleDate)
          : "—",
      )}

      ${renderDataItem(
        "Location",
        latitude !== undefined &&
        longitude !== undefined
          ? `${latitude}, ${longitude}`
          : "—",
      )}

      ${renderDataItem(
        "Depth",
        depthFrom !== undefined &&
        depthTo !== undefined
          ? `${depthFrom}–${depthTo} cm`
          : "—",
      )}

      ${renderDataItem(
        "Soil texture",
        texture,
      )}

    </div>

    ${renderAdditionalObjectData(
      data,
      [
        "sample",
        "selectedSample",
        "sample_code",
        "sampleCode",
        "sample_date",
        "sampleDate",
        "latitude",
        "longitude",
        "depth_from_cm",
        "depth_to_cm",
        "depthFromCm",
        "depthToCm",
        "texture",
        "soil_texture",
        "soilTexture",
      ],
    )}
  `;
}

/* ============================================================
   THEMATIC ANALYSIS
   ============================================================ */

function renderThematicAnalysis(data) {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return renderObjectData(data);
  }

  const rows = [];

  const candidates =
    data.parameters ||
    data.results ||
    data.classifications ||
    data.analysis ||
    data;

  if (
    Array.isArray(candidates)
  ) {
    return renderArrayData(
      candidates,
    );
  }

  if (
    candidates &&
    typeof candidates === "object"
  ) {
    Object.entries(candidates)
      .forEach(
        ([key, value]) => {
          if (
            key === "metadata" ||
            key === "provenance"
          ) {
            return;
          }

          if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
          ) {
            const parameter =
              value.parameter ||
              value.name ||
              humanizeKey(key);

            const measurement =
              value.value ??
              value.rawValue ??
              value.observedValue;

            const classification =
              value.classification ??
              value.status ??
              value.interpretation;

            rows.push(`
              <tr>
                <td>
                  ${escapeHtml(parameter)}
                </td>

                <td class="integrated-report-value">
                  ${formatValue(measurement)}
                </td>

                <td>
                  ${formatValue(
                    value.unit,
                  )}
                </td>

                <td class="integrated-report-classification">
                  ${formatValue(
                    classification,
                  )}
                </td>
              </tr>
            `);
          }
        },
      );
  }

  if (rows.length) {
    return `
      <div class="integrated-report-table-container">
        <table class="integrated-report-table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Value</th>
              <th>Unit</th>
              <th>Classification</th>
            </tr>
          </thead>

          <tbody>
            ${rows.join("")}
          </tbody>
        </table>
      </div>

      ${renderAdditionalObjectData(
        data,
        [
          "parameters",
          "results",
          "classifications",
          "analysis",
        ],
      )}
    `;
  }

  return renderObjectData(data);
}

/* ============================================================
   ADDITIONAL OBJECT DATA
   ============================================================ */

function renderAdditionalObjectData(
  data,
  excludedKeys = [],
) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return "";
  }

  const excluded =
    new Set(excludedKeys);

  const remaining =
    Object.entries(data)
      .filter(
        ([key]) =>
          !excluded.has(key),
      );

  if (!remaining.length) {
    return "";
  }

  const object = Object.fromEntries(
    remaining,
  );

  return `
    <div class="integrated-report-subsection">
      <h4 class="integrated-report-subsection-title">
        Additional information
      </h4>

      ${renderObjectData(object)}
    </div>
  `;
}

/* ============================================================
   HISTORICAL COMPARISON
   ============================================================ */

function renderHistoricalComparison(data) {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return renderObjectData(data);
  }

  const candidate =
    data.candidate ||
    data.nearestCandidate ||
    data.selectedCandidate;

  const comparison =
    data.comparison ||
    data.historicalComparison;

  const observations =
    data.observations ||
    comparison?.observations;

  const changes =
    data.changes ||
    comparison?.changes;

  const depthCompatibility =
    data.depthCompatibility ||
    data.depth_compatibility;

  let html = "";

  if (candidate) {
    html += `
      <div class="integrated-report-subsection">
        <h4 class="integrated-report-subsection-title">
          Historical candidate
        </h4>

        ${renderObjectData(candidate)}
      </div>
    `;
  }

  if (observations) {
    html += `
      <div class="integrated-report-subsection">
        <h4 class="integrated-report-subsection-title">
          Observations
        </h4>

        ${renderArrayData(
          observations,
        )}
      </div>
    `;
  }

  if (changes) {
    html += `
      <div class="integrated-report-subsection">
        <h4 class="integrated-report-subsection-title">
          Changes
        </h4>

        ${renderArrayData(
          changes,
        )}
      </div>
    `;
  }

  if (depthCompatibility) {
    html += `
      <div class="integrated-report-subsection">
        <h4 class="integrated-report-subsection-title">
          Depth compatibility
        </h4>

        ${renderObjectData(
          depthCompatibility,
        )}
      </div>
    `;
  }

  if (!html) {
    html =
      renderObjectData(data);
  }

  return html;
}

/* ============================================================
   SECTION DATA DISPATCH
   ============================================================ */

function renderSectionData(
  title,
  data,
) {
  switch (title) {
    case "Sample Summary":
      return renderSampleSummary(data);

    case "Thematic Analysis":
      return renderThematicAnalysis(data);

    case "Historical Comparison":
      return renderHistoricalComparison(data);

    default:
      return renderObjectData(data);
  }
}

/* ============================================================
   REPORT SECTION
   ============================================================ */

function renderReportSection(
  title,
  section,
) {
  const status =
    getSectionStatus(section);

  let content = "";

  if (status === "available") {
    content =
      renderSectionData(
        title,
        section.data,
      );
  } else if (status === "error") {
    content = `
      <div class="integrated-report-error">
        ${escapeHtml(
          section.error?.message ||
            "Section processing failed.",
        )}
      </div>
    `;
  } else {
    content = `
      <p class="integrated-report-empty">
        ${escapeHtml(
          getStatusLabel(status),
        )}.
      </p>
    `;
  }

  return `
    <section class="integrated-report-section">

      <div class="integrated-report-section-header">

        <h3 class="integrated-report-section-title">
          ${escapeHtml(title)}
        </h3>

        ${renderStatusBadge(status)}

      </div>

      <div class="integrated-report-section-content">
        ${content}
      </div>

    </section>
  `;
}

/* ============================================================
   TECHNICAL DETAILS
   ============================================================ */

function renderTechnicalDetails(
  report,
) {
  return `
    <details class="integrated-report-details">

      <summary>
        Technical report details
      </summary>

      <pre class="integrated-report-json">${escapeHtml(
        JSON.stringify(
          report,
          null,
          2,
        ),
      )}</pre>

    </details>
  `;
}

/* ============================================================
   REPORT RENDERING
   ============================================================ */

function renderIntegratedReport(
  report,
) {
  const container =
    document.getElementById(
      "integratedAnalyticalReportContainer",
    );

  if (!container) {
    return;
  }

  if (!report) {
    container.innerHTML = `
      <p class="integrated-report-empty">
        No integrated analytical GIS report is available.
      </p>
    `;

    return;
  }

  const sections =
    report.sections || {};

  const reportStatus =
    report.status || "unknown";

  const sampleSummary =
    sections.sampleSummary?.data;

  const thematicParameter =
    report.parameter ||
    getIntegratedReportParameter();

  container.innerHTML = `
    <div class="integrated-report">

      <!-- ================================================
           REPORT HEADER
           ================================================ -->

      <header class="integrated-report-header">

        <div class="integrated-report-header-main">

          <h2 class="integrated-report-title">
            Integrated Analytical GIS Report
          </h2>

          <p class="integrated-report-subtitle">
            ${escapeHtml(
              thematicParameter === "standard"
                ? "Standard analytical view"
                : humanizeKey(
                    thematicParameter,
                  ),
            )}
          </p>

          <div class="integrated-report-meta">

            ${renderDataItem(
              "Contract",
              report.contractVersion,
            )}

            ${renderDataItem(
              "Generated",
              report.generatedAt
                ? formatDate(
                    report.generatedAt,
                  )
                : "—",
            )}

            ${renderDataItem(
              "Parameter",
              thematicParameter,
            )}

          </div>

        </div>

        <div class="integrated-report-header-status">
          ${renderStatusBadge(
            reportStatus,
          )}
        </div>

      </header>

      <!-- ================================================
           REPORT SECTIONS
           ================================================ -->

      <div class="integrated-report-sections">

        ${renderReportSection(
          "Sample Summary",
          sections.sampleSummary,
        )}

        ${renderReportSection(
          "Thematic Analysis",
          sections.thematicAnalysis,
        )}

        ${renderReportSection(
          "Spatial Analysis",
          sections.spatialAnalysis,
        )}

        ${renderReportSection(
          "Spatial Query",
          sections.spatialQuery,
        )}

        ${renderReportSection(
          "Interpolation",
          sections.interpolation,
        )}

        ${renderReportSection(
          "Fertility Zoning",
          sections.fertilityZoning,
        )}

        ${renderReportSection(
          "Historical Comparison",
          sections.historicalComparison,
        )}

        ${renderReportSection(
          "Overall Summary",
          sections.overallSummary,
        )}

      </div>

      <!-- ================================================
           TECHNICAL DETAILS
           ================================================ -->

      ${renderTechnicalDetails(
        report,
      )}

      <div class="integrated-report-footer">
        Scientific classifications, spatial calculations,
        interpolation, zoning, and historical analytical
        results are generated by the authoritative backend
        services.
      </div>

    </div>
  `;
}

/* ============================================================
   STATUS
   ============================================================ */

function setIntegratedReportStatus(
  message,
  isError = false,
) {
  const element =
    document.getElementById(
      "integratedAnalyticalReportStatus",
    );

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.classList.toggle(
    "error",
    isError,
  );
}

/* ============================================================
   API
   ============================================================ */

async function generateIntegratedAnalyticalGISReport() {
  if (
    integratedReportRequestInProgress
  ) {
    return null;
  }

  integratedReportRequestInProgress =
    true;

  setIntegratedReportStatus(
    "Generating integrated analytical GIS report...",
  );

  const button =
    document.getElementById(
      "integratedAnalyticalReportGenerate",
    );

  if (button) {
    button.disabled = true;
  }

  const request =
    buildIntegratedReportRequest();

  console.log(
    "Integrated analytical GIS report request:",
    request,
  );

  try {
    const response =
      await fetch(
        INTEGRATED_REPORT_API,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },

          body:
            JSON.stringify(
              request,
            ),
        },
      );

    let payload = null;

    try {
      payload =
        await response.json();
    } catch (parseError) {
      throw new Error(
        `Integrated report API returned an invalid response (${response.status}).`,
      );
    }

    if (!response.ok) {
      throw new Error(
        payload?.message ||
          "Integrated analytical GIS report request failed.",
      );
    }

    if (
      !payload ||
      payload.success !== true ||
      !payload.data
    ) {
      throw new Error(
        payload?.message ||
          "Integrated report API returned no report.",
      );
    }

    integratedReportResult =
      payload.data;

    renderIntegratedReport(
      integratedReportResult,
    );

    setIntegratedReportStatus(
      `Report generated successfully (${integratedReportResult.status}).`,
    );

    return integratedReportResult;
  } catch (error) {
    console.error(
      "Integrated analytical GIS report failed:",
      error,
    );

    integratedReportResult = null;

    renderIntegratedReport(null);

    setIntegratedReportStatus(
      error instanceof Error
        ? error.message
        : String(error),
      true,
    );

    return null;
  } finally {
    integratedReportRequestInProgress =
      false;

    if (button) {
      button.disabled = false;
    }
  }
}

/* ============================================================
   CLEAR
   ============================================================ */

function clearIntegratedAnalyticalGISReport() {
  integratedReportResult =
    null;

  renderIntegratedReport(null);

  setIntegratedReportStatus(
    "No integrated report generated.",
  );

  return true;
}

/* ============================================================
   INITIALIZATION
   ============================================================ */

function initializeIntegratedAnalyticalGISReport() {
  const generateButton =
    document.getElementById(
      "integratedAnalyticalReportGenerate",
    );

  const clearButton =
    document.getElementById(
      "integratedAnalyticalReportClear",
    );

  if (generateButton) {
    generateButton.addEventListener(
      "click",
      () => {
        generateIntegratedAnalyticalGISReport();
      },
    );
  }

  if (clearButton) {
    clearButton.addEventListener(
      "click",
      () => {
        clearIntegratedAnalyticalGISReport();
      },
    );
  }

  console.log(
    "Integrated Analytical GIS Reporting frontend initialized.",
  );
}

/* ============================================================
   GLOBAL API
   ============================================================ */

window.getIntegratedReportResult =
  getIntegratedReportResult;

window.isIntegratedReportRequestInProgress =
  isIntegratedReportRequestInProgress;

window.buildIntegratedReportRequest =
  buildIntegratedReportRequest;

window.generateIntegratedAnalyticalGISReport =
  generateIntegratedAnalyticalGISReport;

window.clearIntegratedAnalyticalGISReport =
  clearIntegratedAnalyticalGISReport;

window.renderIntegratedReport =
  renderIntegratedReport;

window.initializeIntegratedAnalyticalGISReport =
  initializeIntegratedAnalyticalGISReport;

/* ============================================================
   AUTOMATIC INITIALIZATION
   ============================================================ */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeIntegratedAnalyticalGISReport,
    { once: true },
  );
} else {
  initializeIntegratedAnalyticalGISReport();
}


/* ============================================================
   Phase 10.6.8  Interactive Report Column Resizing
   ============================================================ */

(function initializeIntegratedReportColumnResizing() {
  "use strict";

  const MIN_COLUMN_WIDTH = 100;
  const MAX_COLUMN_WIDTH = 400;

  let activeResize = null;

  function getReportTables() {
    return document.querySelectorAll(
      "#integratedAnalyticalReportContainer .integrated-report-table",
    );
  }

  function addResizeHandles() {
    getReportTables().forEach((table) => {
      const headerRow = table.querySelector("thead tr");

      if (!headerRow) {
        return;
      }

      const headers = headerRow.querySelectorAll("th");

      headers.forEach((header) => {
        if (
          header.querySelector(
            ".integrated-report-column-resize-handle",
          )
        ) {
          return;
        }

        const handle = document.createElement("span");

        handle.className =
          "integrated-report-column-resize-handle";

        handle.setAttribute(
          "aria-hidden",
          "true",
        );

        handle.addEventListener(
          "mousedown",
          startColumnResize,
        );

        header.appendChild(handle);
      });
    });
  }

  function startColumnResize(event) {
    event.preventDefault();
    event.stopPropagation();

    const handle = event.currentTarget;
    const header = handle.closest("th");
    const table = header?.closest(
      ".integrated-report-table",
    );

    if (!header || !table) {
      return;
    }

    const startX = event.clientX;
    const startWidth = header.getBoundingClientRect().width;

    activeResize = {
      table,
      header,
      startX,
      startWidth,
      handle,
    };

    handle.classList.add("is-resizing");

    document.body.classList.add(
      "integrated-report-column-resizing",
    );

    document.addEventListener(
      "mousemove",
      resizeColumn,
    );

    document.addEventListener(
      "mouseup",
      stopColumnResize,
      { once: true },
    );
  }

  function resizeColumn(event) {
    if (!activeResize) {
      return;
    }

    const delta =
      event.clientX - activeResize.startX;

    const newWidth = Math.min(
      MAX_COLUMN_WIDTH,
      Math.max(
        MIN_COLUMN_WIDTH,
        activeResize.startWidth + delta,
      ),
    );

    const headerIndex =
      Array.from(
        activeResize.header.parentElement.children,
      ).indexOf(activeResize.header);

    const rows =
      activeResize.table.querySelectorAll(
        "tr",
      );

    rows.forEach((row) => {
      const cell = row.children[headerIndex];

      if (!cell) {
        return;
      }

      cell.style.width = `${newWidth}px`;
      cell.style.minWidth = `${newWidth}px`;
      cell.style.maxWidth = `${newWidth}px`;
    });
  }

  function stopColumnResize() {
    if (!activeResize) {
      return;
    }

    activeResize.handle.classList.remove(
      "is-resizing",
    );

    document.body.classList.remove(
      "integrated-report-column-resizing",
    );

    document.removeEventListener(
      "mousemove",
      resizeColumn,
    );

    activeResize = null;
  }

  /*
   * Report tables are generated dynamically after the API
   * response arrives. Observe the report container so that
   * newly rendered tables automatically receive resize handles.
   */

  function observeReportContainer() {
    const container =
      document.getElementById(
        "integratedAnalyticalReportContainer",
      );

    if (!container) {
      return;
    }

    addResizeHandles();

    const observer =
      new MutationObserver(() => {
        addResizeHandles();
      });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      observeReportContainer,
      { once: true },
    );
  } else {
    observeReportContainer();
  }
})();
