"use strict";

// ============================================================
// public/js/historical-analysis.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.4.5.3
// Historical Candidate Map/Page Integration
//
// Responsibilities:
//   1. Load current soil sample
//   2. Discover historical spatial candidates
//   3. Display candidate metadata
//   4. Respect backend comparison eligibility
//   5. Request historical comparison
//
// Scientific calculations and eligibility decisions remain
// exclusively backend responsibilities.
// ============================================================

const HISTORICAL_API_BASE="/api/soil-analysis/historical";
const CANDIDATE_API=`${HISTORICAL_API_BASE}/candidates`;
const COMPARISON_API=HISTORICAL_API_BASE;

const COMPARISON_PARAMETERS=[
  {key:"ph",label:"pH"},
  {key:"nitrogen",label:"Nitrogen"},
  {key:"phosphorus",label:"Phosphorus"},
  {key:"potassium",label:"Potassium"},
  {key:"organic_carbon",label:"Organic Carbon"},
  {key:"electrical_conductivity",label:"Electrical Conductivity"},
];

const state={
  sampleId:null,
  parameter:null,
  currentSample:null,
  candidates:[],
  selectedCandidate:null,
};

/* ============================================================
   DOM / STATUS
   ============================================================ */

function getElement(id){
  return document.getElementById(id);
}

function setStatus(message,type="info"){
  const element=getElement("page-status");

  if(!element){
    return;
  }

  element.textContent=message;
  element.dataset.type=type;
}

/* ============================================================
   URL / FETCH
   ============================================================ */

function getSampleIdFromUrl(){
  const value=new URLSearchParams(window.location.search)
    .get("sampleId");

  if(!value){
    return null;
  }

  const sampleId=Number(value);

  return Number.isInteger(sampleId)&&sampleId>0
    ? sampleId
    : null;
}

function getParameterFromUrl(){
  const value=new URLSearchParams(window.location.search)
    .get("parameter");

  if(!value||value==="[object Object]"){
    return null;
  }

  return isValidParameter(value)
    ? value
    : null;
}

async function fetchJson(url,options={}){
  const response=await fetch(url,options);
  let payload=null;

  try{
    payload=await response.json();
  }catch(error){
    throw new Error(
      `Invalid JSON response (${response.status}).`,
    );
  }

  if(!response.ok){
    throw new Error(
      payload?.message||
      payload?.error||
      `Request failed (${response.status}).`,
    );
  }

  return payload;
}

/* ============================================================
   HTML / FORMATTING
   ============================================================ */

function escapeHtml(value){
  return String(value??"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function formatNumber(value,decimals=2){
  const number=Number(value);

  return Number.isFinite(number)
    ? number.toFixed(decimals)
    : "Unavailable";
}

function formatDistance(distance){
  if(
    !distance||
    !Number.isFinite(Number(distance.value))
  ){
    return "Unavailable";
  }

  const value=Number(distance.value);

  if(distance.unit==="m"){
    return value>=1000
      ? `${formatNumber(value/1000,2)} km`
      : `${formatNumber(value,0)} m`;
  }

  return `${formatNumber(
    value,
    2,
  )} ${escapeHtml(distance.unit||"")}`.trim();
}

function formatDepth(depth){
  if(
    !depth||
    !Number.isFinite(Number(depth.fromCm))||
    !Number.isFinite(Number(depth.toCm))
  ){
    return "Unavailable";
  }

  return `${Math.abs(Number(depth.fromCm))}–${Math.abs(
    Number(depth.toCm),
  )} cm`;
}

function formatSiteName(candidate){
  const site=candidate?.site;

  if(!site){
    return "Historical Site";
  }

  const parts=[];

  if(site.mandal){
    parts.push(site.mandal);
  }

  if(site.village){
    parts.push(site.village);
  }

  if(site.siteNo!==null&&site.siteNo!==undefined){
    parts.push(`Site ${site.siteNo}`);
  }

  return parts.length
    ? parts.join(" — ")
    : "Historical Site";
}

function formatDataset(candidate){
  const dataset=candidate?.dataset;

  if(!dataset){
    return "Historical Dataset";
  }

  if(dataset.code&&dataset.name){
    return `${dataset.code} — ${dataset.name}`;
  }

  return dataset.code||
    dataset.name||
    "Historical Dataset";
}

function formatStages(candidate){
  const values=candidate?.stages?.values;

  return Array.isArray(values)&&values.length
    ? values.join(", ")
    : "Unavailable";
}

function formatObservationCount(candidate){
  return Array.isArray(candidate?.observations)
    ? candidate.observations.length
    : 0;
}

function renderParameterOptions(selectedParameter=null){
  return COMPARISON_PARAMETERS.map(
    parameter=>`
      <option
        value="${escapeHtml(parameter.key)}"
        ${parameter.key===selectedParameter?"selected":""}
      >
        ${escapeHtml(parameter.label)}
      </option>
    `,
  ).join("");
}

function isValidParameter(parameter){
  return COMPARISON_PARAMETERS.some(
    item=>item.key===parameter,
  );
}

/* ============================================================
   CURRENT SAMPLE
   ============================================================ */

async function loadCurrentSample(){
  if(!state.sampleId){
    throw new Error("A valid sampleId is required.");
  }

  const payload=await fetchJson(
    `/api/soil-analysis/sample/${state.sampleId}`,
  );

  const sample=
    payload?.sample||
    payload?.data?.sample||
    payload?.data||
    payload;

  if(!sample){
    throw new Error(
      "Current soil sample was not returned.",
    );
  }

  state.currentSample=sample;

  renderCurrentSample(sample);
}

function renderCurrentSample(sample){
  const container=getElement("current-sample");
  const section=getElement("current-sample-section");

  if(!container){
    return;
  }

  if(section){
    section.hidden=false;
  }

  const depth=
    sample.depth||
    (
      sample.depth_from_cm!==undefined||
      sample.depth_to_cm!==undefined
        ? {
            fromCm:sample.depth_from_cm,
            toCm:sample.depth_to_cm,
          }
        : null
    );

  const latitude=Number(sample.latitude);
  const longitude=Number(sample.longitude);

  container.innerHTML=`
    <div class="sample-summary">
      <div>
        <span class="label">Sample</span>
        <strong>${escapeHtml(
          sample.sampleCode||
          sample.sample_code||
          sample.id||
          "Unavailable",
        )}</strong>
      </div>

      <div>
        <span class="label">Location</span>
        <strong>
          ${
            Number.isFinite(latitude)
              ? latitude.toFixed(6)
              : "Unavailable"
          },
          ${
            Number.isFinite(longitude)
              ? longitude.toFixed(6)
              : "Unavailable"
          }
        </strong>
      </div>

      <div>
        <span class="label">Sampling Depth</span>
        <strong>${formatDepth(depth)}</strong>
      </div>

      <div>
        <span class="label">Soil Texture</span>
        <strong>${escapeHtml(
          sample.texture||
          sample.soil_texture||
          sample.soilTexture||
          "Unavailable",
        )}</strong>
      </div>
    </div>
  `;
}

/* ============================================================
   HISTORICAL CANDIDATES
   ============================================================ */

async function loadHistoricalCandidates(){
  if(!state.sampleId){
    throw new Error("A valid sampleId is required.");
  }

  const maxCandidates=
    Number(getElement("max-candidates")?.value)||10;

  setStatus(
    "Searching for historical candidate sites...",
    "loading",
  );

  const url=
    `${CANDIDATE_API}`+
    `?sampleId=${encodeURIComponent(state.sampleId)}`+
    `&maxCandidates=${encodeURIComponent(maxCandidates)}`;

  const payload=await fetchJson(url);

  state.candidates=
    Array.isArray(payload?.candidates)
      ? payload.candidates
      : Array.isArray(payload?.data?.candidates)
        ? payload.data.candidates
        : [];

  renderCandidateSummary(payload);
  renderCandidates();

  setStatus(
    "Historical candidate discovery completed.",
    "success",
  );
}

/* ============================================================
   CANDIDATE SUMMARY
   ============================================================ */

function renderCandidateSummary(payload){
  const container=getElement("candidate-summary");
  const section=getElement("candidate-section");

  if(!container){
    return;
  }

  if(section){
    section.hidden=false;
  }

  const metadata=payload?.metadata||{};

  const candidateCount=
    metadata.candidateCount??state.candidates.length;

  const totalCandidateSites=
    metadata.totalCandidateSites??"Unavailable";

  const totalHistoricalObservations=
    metadata.totalHistoricalObservations??"Unavailable";

  container.innerHTML=`
    <p>
      <strong>${escapeHtml(candidateCount)}</strong>
      candidate(s) returned.
      Historical sites:
      <strong>${escapeHtml(totalCandidateSites)}</strong>.
      Historical observations:
      <strong>${escapeHtml(
        totalHistoricalObservations,
      )}</strong>.
    </p>
  `;
}

/* ============================================================
   CANDIDATE RENDERING
   ============================================================ */

function renderCandidates(){
  const container=getElement("candidate-list");

  if(!container){
    return;
  }

  if(state.candidates.length===0){
    container.innerHTML=`
      <p class="empty-state">
        No historical candidate sites were found.
      </p>
    `;

    return;
  }

  container.innerHTML=state.candidates
    .map(
      (candidate,index)=>
        renderCandidateCard(candidate,index),
    )
    .join("");

  container
    .querySelectorAll("[data-compare-index]")
    .forEach(button=>{
      button.addEventListener("click",()=>{
        const index=
          Number(button.dataset.compareIndex);

        const parameterSelect=
          container.querySelector(
            `[data-parameter-index="${index}"]`,
          );

        const parameter=
          parameterSelect?.value||
          "ph";

        compareCandidate(
          index,
          parameter,
        ).catch(error=>{
          console.error(
            "Historical comparison request failed:",
            error,
          );
        });
      });
    });
}

function renderCandidateCard(candidate,index){
  const comparison=candidate?.comparison||{};
  const depth=candidate?.depth||{};
  const eligible=comparison.eligible===true;

  const eligibilityReason=
    comparison.reason||
    (
      eligible
        ? "Scientific comparison can be requested."
        : "Scientific comparison is not eligible."
    );

  const siteName=formatSiteName(candidate);
  const datasetName=formatDataset(candidate);
  const distance=formatDistance(candidate?.distance);
  const currentDepth=formatDepth(depth?.current);
  const historicalDepth=formatDepth(depth?.historical);
  const stages=formatStages(candidate);
  const observationCount=
    formatObservationCount(candidate);

  return`
    <article class="candidate-card">
      <div class="candidate-header">
        <div>
          <h3>
            ${escapeHtml(siteName)}
            — Historical Sample
          </h3>

          <p class="candidate-dataset">
            ${escapeHtml(datasetName)}
          </p>
        </div>

        <span class="candidate-status ${
          eligible
            ? "eligible"
            : "not-eligible"
        }">
          ${
            eligible
              ? "Comparison eligible"
              : "Not comparison eligible"
          }
        </span>
      </div>

      <div class="candidate-details">
        <div>
          <span class="label">Distance</span>
          <strong>${escapeHtml(distance)}</strong>
        </div>

        <div>
          <span class="label">Current Depth</span>
          <strong>${escapeHtml(currentDepth)}</strong>
        </div>

        <div>
          <span class="label">Historical Depth</span>
          <strong>${escapeHtml(historicalDepth)}</strong>
        </div>

        <div>
          <span class="label">Depth Compatible</span>
          <strong>
            ${
              depth.compatible===true
                ? "Yes"
                : depth.compatible===false
                  ? "No"
                  : "Unavailable"
            }
          </strong>
        </div>

        <div>
          <span class="label">Stage</span>
          <strong>${escapeHtml(stages)}</strong>
        </div>

        <div>
          <span class="label">Observations</span>
          <strong>${escapeHtml(
            observationCount,
          )}</strong>
        </div>
      </div>

      <div class="candidate-footer">
        <p class="${
          eligible
            ? "comparison-note"
            : "comparison-warning"
        }">
          ${escapeHtml(eligibilityReason)}
        </p>

        ${
          eligible
            ? `
              <div class="comparison-controls">
                <label for="comparison-parameter-${index}">
                  Parameter
                </label>

                <select
                  id="comparison-parameter-${index}"
                  data-parameter-index="${index}"
                  class="comparison-parameter"
                >
                  ${renderParameterOptions(
                    state.parameter||"ph",
                  )}
                </select>

                <button
                  type="button"
                  class="compare-button"
                  data-compare-index="${index}"
                >
                  Compare
                </button>
              </div>
            `
            : `
              <button
                type="button"
                class="compare-button"
                disabled
                aria-disabled="true"
              >
                Compare
              </button>
            `
        }
      </div>
    </article>
  `;
}

/* ============================================================
   HISTORICAL COMPARISON
   ============================================================ */

async function compareCandidate(index,parameter="ph"){
  const candidate=state.candidates[index];

  if(!candidate){
    return;
  }

  if(candidate?.comparison?.eligible!==true){
    return;
  }

  const datasetCode=candidate?.dataset?.code;
  const mandal=candidate?.site?.mandal;
  const siteNo=candidate?.site?.siteNo;

  if(!datasetCode){
    setStatus(
      "Historical dataset code is unavailable.",
      "error",
    );
    return;
  }

  if(!mandal){
    setStatus(
      "Historical mandal is unavailable for comparison.",
      "error",
    );
    return;
  }

  if(siteNo===null||siteNo===undefined){
    setStatus(
      "Historical site number is unavailable for comparison.",
      "error",
    );
    return;
  }

  if(!isValidParameter(parameter)){
    setStatus(
      "Unsupported historical comparison parameter.",
      "error",
    );
    return;
  }

  state.selectedCandidate=candidate;
  state.parameter=parameter;

  setStatus(
    "Requesting historical comparison...",
    "loading",
  );

  const params=new URLSearchParams();

  params.set("datasetCode",String(datasetCode));
  params.set("mandal",String(mandal));
  params.set("siteNo",String(siteNo));
  params.set("parameter",String(parameter));

  try{
    const payload=await fetchJson(
      `${COMPARISON_API}?${params.toString()}`,
    );

    renderComparison(payload);

    setStatus(
      "Historical comparison completed.",
      "success",
    );
  }catch(error){
    setStatus(
      error.message||
      "Historical comparison failed.",
      "error",
    );

    console.error(
      "Historical comparison request failed:",
      error,
    );
  }
}

/* ============================================================
   COMPARISON FORMATTING
   ============================================================ */

function formatCollectionPeriod(period){
  if(!period?.start&&!period?.end){
    return "Unavailable";
  }

  const formatDate=value=>{
    if(!value){
      return "Unavailable";
    }

    const date=new Date(value);

    if(Number.isNaN(date.getTime())){
      return "Unavailable";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day:"2-digit",
        month:"short",
        year:"numeric",
      },
    );
  };

  const start=formatDate(period.start);
  const end=formatDate(period.end);

  if(start==="Unavailable"){
    return end;
  }

  if(end==="Unavailable"){
    return start;
  }

  return `${start} – ${end}`;
}

function formatSignedValue(value,decimals=2){
  const number=Number(value);

  if(!Number.isFinite(number)){
    return "Unavailable";
  }

  if(number>0){
    return `+${number.toFixed(decimals)}`;
  }

  return number.toFixed(decimals);
}

function formatSignedPercentage(value){
  const number=Number(value);

  if(!Number.isFinite(number)){
    return "Unavailable";
  }

  if(number>0){
    return `+${number.toFixed(2)}%`;
  }

  return `${number.toFixed(2)}%`;
}

function renderClassificationTransition(transition){
  if(!transition){
    return "Unavailable";
  }

  const from=transition.from||"Unavailable";
  const to=transition.to||"Unavailable";
  const changed=transition.changed===true;

  return `
    <span class="${
      changed
        ? "classification-transition changed"
        : "classification-transition unchanged"
    }">
      ${escapeHtml(from)}
      <span class="change-arrow">→</span>
      ${escapeHtml(to)}
      ${
        changed
          ? `<small>Changed</small>`
          : `<small>Unchanged</small>`
      }
    </span>
  `;
}

/* ============================================================
   COMPARISON RENDERING
   ============================================================ */

function renderComparison(payload){
  const section=getElement("comparison-section");
  const container=getElement("comparison-result");

  if(!section||!container){
    return;
  }

  const comparison=payload?.comparison;

  if(!comparison){
    container.innerHTML=`
      <p class="empty-state">
        No historical comparison result was returned.
      </p>
    `;

    section.hidden=false;
    return;
  }

  const dataset=comparison.dataset||{};
  const site=comparison.site||{};
  const depth=comparison.depth||{};
  const parameter=comparison.parameter||{};

  const observations=
    Array.isArray(comparison.observations)
      ? comparison.observations
      : [];

  const changes=
    Array.isArray(comparison.changes)
      ? comparison.changes
      : [];

  const datasetTitle=
    dataset.name||
    dataset.code||
    "Historical Dataset";

  const siteName=[
    site.mandal,
    site.siteNo!==null&&site.siteNo!==undefined
      ? `Site ${site.siteNo}`
      : null,
  ]
    .filter(Boolean)
    .join(" — ")||
    "Historical Site";

  const depthText=formatDepth({
    fromCm:depth.fromCm,
    toCm:depth.toCm,
  });

  const compatibility=
    depth.compatible===true
      ? `
        <span class="comparison-badge compatible">
          Compatible
        </span>
      `
      : `
        <span class="comparison-badge incompatible">
          Not compatible
        </span>
      `;

  const observationRows=observations.length
    ? observations.map(observation=>`
        <tr>
          <td>
            <strong>${escapeHtml(
              observation.stage||
              "Unavailable",
            )}</strong>
          </td>

          <td>
            ${escapeHtml(
              formatNumber(observation.value,3),
            )}
            ${escapeHtml(parameter.unit||"")}
          </td>

          <td>
            <span class="classification-badge">
              ${escapeHtml(
                observation.classification||
                "Unavailable",
              )}
            </span>
          </td>

          <td>
            ${formatCollectionPeriod(
              observation.collectionPeriod,
            )}
          </td>

          <td>
            ${escapeHtml(
              observation.sourceStatus||
              "Unavailable",
            )}
          </td>
        </tr>
      `).join("")
    : `
        <tr>
          <td colspan="5">
            No historical observations returned.
          </td>
        </tr>
      `;

  const changeRows=changes.length
    ? changes.map(change=>`
        <tr>
          <td>
            <strong>
              ${escapeHtml(
                change.fromStage||
                "Unavailable",
              )}
            </strong>

            <span class="change-arrow">→</span>

            <strong>
              ${escapeHtml(
                change.toStage||
                "Unavailable",
              )}
            </strong>
          </td>

          <td>
            ${formatSignedValue(
              change.absoluteChange,
              2,
            )}
            ${escapeHtml(parameter.unit||"")}
          </td>

          <td>
            ${formatSignedPercentage(
              change.percentageChange,
            )}
          </td>

          <td>
            ${renderClassificationTransition(
              change.classificationTransition,
            )}
          </td>

          <td>
            ${
              change.comparisonEligible===true
                ? `
                  <span class="comparison-badge compatible">
                    Eligible
                  </span>
                `
                : `
                  <span class="comparison-badge incompatible">
                    ${escapeHtml(
                      change.reason||
                      "Not eligible",
                    )}
                  </span>
                `
            }
          </td>
        </tr>
      `).join("")
    : `
        <tr>
          <td colspan="5">
            No stage changes returned.
          </td>
        </tr>
      `;

  container.innerHTML=`
    <div class="comparison-overview">
      <div class="comparison-overview-header">
        <div>
          <p class="comparison-kicker">
            Historical Dataset
          </p>

          <h3>${escapeHtml(datasetTitle)}</h3>

          <p class="comparison-subtitle">
            ${escapeHtml(dataset.code||"")}
            ${
              dataset.publicationYear
                ? ` · ${escapeHtml(
                    dataset.publicationYear,
                  )}`
                : ""
            }
          </p>
        </div>

        ${
          comparison.eligible===true
            ? `
              <span class="comparison-badge compatible">
                Comparison eligible
              </span>
            `
            : `
              <span class="comparison-badge incompatible">
                Not eligible
              </span>
            `
        }
      </div>

      <div class="comparison-meta">
        <div>
          <span class="label">Site</span>
          <strong>${escapeHtml(siteName)}</strong>
        </div>

        <div>
          <span class="label">Location</span>
          <strong>
            ${
              Number.isFinite(Number(site.latitude))
                ? Number(site.latitude).toFixed(6)
                : "Unavailable"
            },
            ${
              Number.isFinite(Number(site.longitude))
                ? Number(site.longitude).toFixed(6)
                : "Unavailable"
            }
          </strong>
        </div>

        <div>
          <span class="label">Depth</span>
          <strong>
            ${escapeHtml(depthText)}
            ${compatibility}
          </strong>
        </div>

        <div>
          <span class="label">Parameter</span>
          <strong>
            ${escapeHtml(
              parameter.label||
              parameter.key||
              "Unavailable",
            )}
          </strong>
        </div>

        <div>
          <span class="label">Unit</span>
          <strong>
            ${escapeHtml(
              parameter.unit||
              "Unavailable",
            )}
          </strong>
        </div>
      </div>
    </div>

    <section class="comparison-subsection">
      <div class="comparison-subsection-header">
        <div>
          <p class="section-kicker">
            Historical Observations
          </p>

          <h3>Observed Values by Stage</h3>
        </div>

        <span class="comparison-count">
          ${escapeHtml(observations.length)}
          observation(s)
        </span>
      </div>

      <div class="comparison-table-wrapper">
        <table class="comparison-table">
          <thead>
            <tr>
              <th>Stage</th>
              <th>Value</th>
              <th>Classification</th>
              <th>Collection Period</th>
              <th>Source</th>
            </tr>
          </thead>

          <tbody>
            ${observationRows}
          </tbody>
        </table>
      </div>
    </section>

    <section class="comparison-subsection">
      <div class="comparison-subsection-header">
        <div>
          <p class="section-kicker">
            Stage Changes
          </p>

          <h3>Historical Change Analysis</h3>
        </div>

        <span class="comparison-count">
          ${escapeHtml(changes.length)}
          transition(s)
        </span>
      </div>

      <div class="comparison-table-wrapper">
        <table class="comparison-table">
          <thead>
            <tr>
              <th>Transition</th>
              <th>Absolute Change</th>
              <th>Percentage Change</th>
              <th>Classification</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            ${changeRows}
          </tbody>
        </table>
      </div>
    </section>

    <section class="comparison-provenance">
      <p>
        <strong>Scientific authority:</strong>
        Backend
      </p>

      <p>
        <strong>Calculation location:</strong>
        ${escapeHtml(
          payload?.metadata?.calculationLocation||
          "Backend",
        )}
      </p>

      <p>
        <strong>Classification location:</strong>
        ${escapeHtml(
          payload?.metadata?.classificationLocation||
          "Backend",
        )}
      </p>

      <p>
        <strong>Source:</strong>
        ${escapeHtml(
          payload?.metadata?.source||
          "Historical database",
        )}
      </p>
    </section>
  `;

  section.hidden=false;

  section.scrollIntoView({
    behavior:"smooth",
    block:"start",
  });
}

/* ============================================================
   EVENTS
   ============================================================ */

function initialiseControls(){
  const loadButton=getElement("load-candidates");

  if(loadButton){
    loadButton.addEventListener(
      "click",
      async()=>{
        try{
          await loadHistoricalCandidates();
        }catch(error){
          console.error(error);

          setStatus(
            error.message||
            "Historical candidate discovery failed.",
            "error",
          );
        }
      },
    );
  }

  const closeButton=
    getElement("close-comparison");

  if(closeButton){
    closeButton.addEventListener(
      "click",
      ()=>{
        const section=
          getElement("comparison-section");

        if(section){
          section.hidden=true;
        }
      },
    );
  }
}

function initialiseBackToMap(){
  const link=
    document.getElementById("backToMapLink");

  if(!link){
    return;
  }

  link.addEventListener(
    "click",
    event=>{
      if(window.history.length>1){
        event.preventDefault();
        window.history.back();
      }
    },
  );
}

/* ============================================================
   INITIALIZATION
   ============================================================ */

async function initialisePage(){
  state.sampleId=getSampleIdFromUrl();
  state.parameter=getParameterFromUrl();

  initialiseBackToMap();

  if(!state.sampleId){
    setStatus(
      "No valid sampleId was supplied.",
      "error",
    );
    return;
  }

  initialiseControls();

  try{
    setStatus(
      "Loading current soil sample...",
      "loading",
    );

    await loadCurrentSample();
    await loadHistoricalCandidates();
  }catch(error){
    console.error(
      "Historical analysis initialization failed:",
      error,
    );

    setStatus(
      error.message||
      "Historical analysis could not be loaded.",
      "error",
    );
  }
}

document.addEventListener(
  "DOMContentLoaded",
  initialisePage,
);
