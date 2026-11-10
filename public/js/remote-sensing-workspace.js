"use strict";

/*
============================================================
 AGRINEXUS GIS  REMOTE SENSING INTELLIGENCE RAIL
 Phase 11.9
 Presentation only.
 Scientific definitions remain authoritative in backend.
============================================================
*/

(function () {
  const CATALOG_URL =
    "/api/remote-sensing/indices";

  const RASTER_RENDER_BASE =
    "/api/remote-sensing/raster/render";

  const MAX_RENDER_SIZE = 1200;

  let catalog = [];
  let selectedIndex = null;
  let remoteSensingLayer = null;
  let renderSequence = 0;
  let cropNdviLayer = null;
  let cropNdviLayerVisible = true;
  let cropNdviRenderSequence = 0;
  let cropNdviOpacity = 0.72;
  let cropNdviClassificationLayer = null;
  let cropNdviClassificationLayerVisible = true;
  let cropNdviClassificationRenderSequence = 0;
  let cropNdviClassificationOpacity = 0.72;
  let remoteSensingBusy = false;
  let cropNdviTemporalComparison = null;
  let cropNdviTemporalChangeLayer = null;
  let cropNdviTemporalChangeLayerVisible = true;
  let cropNdviTemporalChangeOpacity = 0.72;
  let cropNdviTemporalChangeRenderSequence = 0;
  const SENTINEL2_OBSERVATION_DISCOVERY_URL =
    "/api/remote-sensing/sentinel2-observations";

  const SENTINEL2_LOCAL_OBSERVATIONS_URL =
    "/api/remote-sensing/sentinel2-local-observations";

  const SENTINEL2_INDEX_PRODUCTION_URL =
    "/api/remote-sensing/sentinel2-index-production-stream";

  const SENTINEL2_INDEX_AVAILABILITY_URL =
    "/api/remote-sensing/availability";

  const SENTINEL2_PROCESSED_DATES_URL =
    "/api/remote-sensing/availability/dates";

  const SENTINEL2_BIOPHYSICAL_AVAILABILITY_URL =
    "/api/remote-sensing/availability/biophysical";

  let sentinel2BiophysicalAvailability = {
    product: null,
    loading: false,
    error: null,
  };

  let sentinel2IndexAvailability = {
    observationDate: null,
    sceneId: null,
    results: [],
    loading: false,
    error: null,
  };

  let sentinel2IndexAvailabilityRequestSequence = 0;
  let sentinel2AvailabilityPromise = null;

  let sentinel2AcquisitionContext = {
    startDate: null,
    endDate: null,
    maxCloudCover: 20,
  };

  let sentinel2ObservationContext = {
    observations: [],
    queriedObservations: [],
    selectedSceneId: null,
    selectedObservationDate: null,
    selectedSpatialCoverage: null,
  };

  function getSentinel2SpatialContext() {
    const map =
      typeof window.getMap === "function"
        ? window.getMap()
        : null;

    if (!map) {
      throw new Error(
        "Map is not available for Sentinel-2 acquisition.",
      );
    }

    const bounds = map.getBounds();

    return {
      bbox: {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      },
    };
  }

  function getSelectedSentinel2SpatialContext() {
    const coverage =
      sentinel2ObservationContext.selectedSpatialCoverage;

    if (!Array.isArray(coverage) || coverage.length !== 4) {
      throw new Error(
        "Selected Sentinel-2 scene does not contain a valid spatial coverage.",
      );
    }

    const [west, south, east, north] =
      coverage.map(Number);

    if (
      !Number.isFinite(west) ||
      !Number.isFinite(south) ||
      !Number.isFinite(east) ||
      !Number.isFinite(north) ||
      west >= east ||
      south >= north
    ) {
      throw new Error(
        "Selected Sentinel-2 scene spatial coverage is invalid.",
      );
    }

    return {
      bbox: {
        west,
        south,
        east,
        north,
      },
    };
  }

  let remoteSensingLayerVisible = true;
  let remoteSensingOpacity = 0.72;

  function getElements() {
    return {
      rail:
        document.getElementById(
          "remoteSensingRail"
        ),

      spectralGrid:
        document.getElementById(
          "remoteSensingSpectralGrid"
        ),

            soilGrid:
        document.getElementById(
          "remoteSensingSoilGrid"
        ),

      biophysicalGrid:
        document.getElementById(
          "remoteSensingBiophysicalGrid"
        ),

      soilEmpty:
        document.getElementById(
          "remoteSensingSoilEmpty"
        ),
      indexAvailability:
        document.getElementById(
          "remoteSensingIndexAvailability"
        ),

      availabilityDate:
        document.getElementById(
          "remoteSensingAvailabilityDate"
        ),

      availableProducts:
        document.getElementById(
          "remoteSensingAvailableProducts"
        ),

      processingProducts:
        document.getElementById(
          "remoteSensingProcessingProducts"
        ),

      availabilityNotice:
        document.getElementById(
          "remoteSensingAvailabilityNotice"
        ),

      processedDatesStatus:
        document.getElementById(
          "remoteSensingProcessedDatesStatus"
        ),

      processedDatesList:
        document.getElementById(
          "remoteSensingProcessedDatesList"
        ),

      status:
        document.getElementById(
          "remoteSensingRailStatus"
        ),

      close:
        document.getElementById(
          "remoteSensingRailClose"
        ),

      layerToggle:
        document.getElementById(
          "remoteSensingLayerToggle"
        ),

      opacity:
        document.getElementById(
          "remoteSensingOpacity"
        ),

      opacityValue:
        document.getElementById(
          "remoteSensingOpacityValue"
        ),

      indexLegend:
        document.getElementById("remoteSensingIndexLegend"),

      indexLegendTitle:
        document.getElementById("remoteSensingIndexLegendTitle"),

      indexLegendMin:
        document.getElementById("remoteSensingIndexLegendMin"),

      indexLegendMax:
        document.getElementById("remoteSensingIndexLegendMax"),

      startDate:
        document.getElementById(
          "remoteSensingStartDate"
        ),

      endDate:
        document.getElementById(
          "remoteSensingEndDate"
        ),

      maxCloudCover:
        document.getElementById(
          "remoteSensingMaxCloudCover"
        ),

      maxCloudCoverValue:
        document.getElementById(
          "remoteSensingMaxCloudCoverValue"
        ),
      findObservations:
        document.getElementById(
          "remoteSensingFindObservations"
        ),

      observationResults:
        document.getElementById(
          "remoteSensingObservationResults"
        ),

      observationRail:
        document.getElementById(
          "remoteSensingObservationRail"
        ),

            queriedObservations:
        document.getElementById(
          "remoteSensingQueriedObservations"
        ),

      queriedObservationRail:
        document.getElementById(
          "remoteSensingQueriedObservationRail"
        ),
observationCount:
        document.getElementById(
          "remoteSensingObservationCount"
        ),

      selectedObservation:
        document.getElementById(
          "remoteSensingSelectedObservation"
        ),

      progress:
        document.getElementById(
          "remoteSensingProgress"
        ),

      progressText:
        document.getElementById(
          "remoteSensingProgressText"
        ),

      progressValue:
        document.getElementById(
          "remoteSensingProgressValue"
        ),

      progressBar:
        document.getElementById(
          "remoteSensingProgressBar"
        ),

      processingLock:
        document.getElementById(
          "applicationProcessingLock"
        ),
    };
  }

  function setApplicationProcessingLock(isLocked) {
    const { processingLock } = getElements();

    if (!processingLock) {
      return;
    }

    processingLock.classList.toggle(
      "is-hidden",
      !isLocked,
    );

    processingLock.setAttribute(
      "aria-hidden",
      isLocked ? "false" : "true",
    );
  }

  function updateApplicationProcessingLockMessage(message) {
    const { processingLock } = getElements();

    if (!processingLock) {
      return;
    }

    const messageElement =
      processingLock.querySelector(
        ".application-processing-lock-message"
      );

    if (messageElement && message) {
      messageElement.textContent = message;
    }
  }

  function updateSentinel2AcquisitionContext() {
    const {
      startDate,
      endDate,
      maxCloudCover,
    } = getElements();

    sentinel2AcquisitionContext.startDate =
      startDate && startDate.value
        ? startDate.value
        : null;

    sentinel2AcquisitionContext.endDate =
      endDate && endDate.value
        ? endDate.value
        : null;

    const cloudValue =
      maxCloudCover && maxCloudCover.value !== ""
        ? Number(maxCloudCover.value)
        : 20;

    sentinel2AcquisitionContext.maxCloudCover =
      Number.isFinite(cloudValue)
        ? Math.max(0, Math.min(100, cloudValue))
        : 20;
  }

  function bindSentinel2AcquisitionControls() {
    const {
      startDate,
      endDate,
      maxCloudCover,
      maxCloudCoverValue,
      findObservations,
    } = getElements();

    [
      startDate,
      endDate,
      maxCloudCover,
    ].forEach((element) => {
      if (element) {
        element.addEventListener(
          "change",
          updateSentinel2AcquisitionContext,
        );
      }
    });

    if (maxCloudCover && maxCloudCoverValue) {
      const updateCloudCoverValue = () => {
        maxCloudCoverValue.textContent =
          maxCloudCover.value || "0";
      };

      maxCloudCover.addEventListener(
        "input",
        updateCloudCoverValue,
      );

      updateCloudCoverValue();
    }

    if (findObservations) {
      findObservations.addEventListener(
        "click",
        () => {
        querySentinel2Observations().catch(
            (error) => {
              updateStatus(
                error && error.message
                  ? error.message
                  : "Unable to discover Sentinel-2 observations.",
              );
            },
          );
        },
      );
    }

    updateSentinel2AcquisitionContext();
  }
    function renderTemporalObservationOptions() {
    const baselineSelect = document.getElementById(
      "cropTemporalBaseline"
    );

    const comparisonSelect = document.getElementById(
      "cropTemporalComparison"
    );

    if (!baselineSelect || !comparisonSelect) {
      return;
    }

    const observations =
      sentinel2ObservationContext.observations
        .filter(
          (observation) =>
            observation.sceneId &&
            observation.acquisitionDate
        )
        .sort(
          (a, b) =>
            String(a.acquisitionDate).localeCompare(
              String(b.acquisitionDate)
            )
        );

    const populate = (select, placeholder) => {
      const previousValue = select.value;

      select.replaceChildren(
        new Option(placeholder, "")
      );

      observations.forEach((observation) => {
        const date = String(
          observation.acquisitionDate
        ).slice(0, 10);

        const option = new Option(
          `${date} — ${observation.sceneId}`,
          observation.sceneId
        );

        option.dataset.observationDate = date;
        select.add(option);
      });

      if (
        previousValue &&
        observations.some(
          (observation) =>
            observation.sceneId === previousValue
        )
      ) {
        select.value = previousValue;
      }
    };

    populate(
      baselineSelect,
      "Select baseline observation"
    );

    populate(
      comparisonSelect,
      "Select comparison observation"
    );

    updateTemporalComparisonOptions();
  }
    function updateTemporalComparisonOptions() {
    const baselineSelect = document.getElementById(
      "cropTemporalBaseline"
    );

    const comparisonSelect = document.getElementById(
      "cropTemporalComparison"
    );

    if (!baselineSelect || !comparisonSelect) {
      return;
    }

    const baselineOption =
      baselineSelect.selectedOptions[0];

    const baselineDate =
      baselineOption?.dataset.observationDate || "";

    Array.from(comparisonSelect.options).forEach(
      (option) => {
        if (!option.value) {
          option.disabled = false;
          return;
        }

        option.disabled =
          option.value === baselineSelect.value ||
          (baselineDate &&
            option.dataset.observationDate <= baselineDate);
      }
    );

    if (
      comparisonSelect.selectedOptions[0]?.disabled
    ) {
      comparisonSelect.value = "";
    }
  }
  function bindCropNdviControls() {
    // Continuous NDVI controls
    const layerToggle = document.getElementById(
      "cropConditionLayerToggle"
    );

    const opacity = document.getElementById(
      "cropConditionOpacity"
    );

    if (layerToggle) {
      layerToggle.addEventListener("change", () => {
        setCropNdviLayerVisibility(layerToggle.checked);
      });
    }

    if (opacity) {
      opacity.addEventListener("input", () => {
        setCropNdviOpacity(Number(opacity.value) / 100);
      });
    }

    // NDVI classification controls
    const classificationToggle = document.getElementById(
      "cropNdviClassificationLayerToggle"
    );

    const classificationOpacity = document.getElementById(
      "cropNdviClassificationOpacity"
    );

    if (classificationToggle) {
      classificationToggle.addEventListener("change", () => {
        setCropNdviClassificationLayerVisibility(
          classificationToggle.checked
        );
      });
    }

    if (classificationOpacity) {
      classificationOpacity.addEventListener("input", () => {
        setCropNdviClassificationOpacity(
          Number(classificationOpacity.value) / 100
        );
      });
    }
        // Temporal NDVI comparison controls
    const temporalBaseline = document.getElementById(
      "cropTemporalBaseline"
    );

    const temporalComparison = document.getElementById(
      "cropTemporalComparison"
    );

    if (temporalBaseline) {
      temporalBaseline.addEventListener("change", () => {
        updateTemporalComparisonOptions();
      });
    }

    if (temporalComparison) {
      temporalComparison.addEventListener("change", () => {
        updateTemporalComparisonOptions();
      });
    }

        const temporalLayerToggle = document.getElementById(
      "cropTemporalLayerToggle"
    );

    const temporalOpacity = document.getElementById(
      "cropTemporalOpacity"
    );

    if (temporalLayerToggle) {
      temporalLayerToggle.addEventListener("change", () => {
        setCropNdviTemporalChangeVisibility(
          temporalLayerToggle.checked
        );
      });
    }

    if (temporalOpacity) {
      temporalOpacity.addEventListener("input", () => {
        setCropNdviTemporalChangeOpacity(
          Number(temporalOpacity.value) / 100
        );
      });
    }  
  }
  function clearSentinel2ObservationSelection() {
    sentinel2ObservationContext.selectedSceneId =
      null;

    sentinel2ObservationContext.selectedObservationDate =
      null;

    sentinel2ObservationContext.selectedSpatialCoverage =
      null;

    const {
      selectedObservation,
    } = getElements();

    if (selectedObservation) {
      selectedObservation.textContent = "";
      selectedObservation.classList.add(
        "is-hidden",
      );
    }
  }
  function renderSentinel2Observations() {
    const {
      observationRail,
      observationCount,
      selectedObservation,
    } = getElements();

    if (!observationRail) {
      return;
    }

    observationRail.innerHTML = "";

    const observations =
    sentinel2ObservationContext.observations;

    if (observationCount) {
      observationCount.textContent =
        String(observations.length);
    }

    if (selectedObservation) {
      selectedObservation.classList.add(
        "is-hidden",
      );
      selectedObservation.textContent = "";
    }

    if (!observations.length) {
      const empty =
        document.createElement("div");

      empty.className =
        "remote-sensing-observation-empty";

      empty.textContent =
        "No Sentinel-2 scenes match the selected observation criteria.";

      observationRail.appendChild(empty);

      return;
    }

    observations.forEach((observation) => {
      const card =
        document.createElement("button");

      card.type = "button";
      card.className =
        "remote-sensing-observation-card";

      if (
        observation.sceneId ===
        sentinel2ObservationContext.selectedSceneId
      ) {
        card.classList.add("is-selected");
      }

      const date =
        document.createElement("span");

      date.className =
        "remote-sensing-observation-date";

      date.textContent =
        observation.acquisitionDate
          ? String(
              observation.acquisitionDate,
            ).slice(0, 10)
          : "Unknown date";

      const satellite =
        document.createElement("span");

      satellite.className =
        "remote-sensing-observation-satellite";

      satellite.textContent =
        observation.satellite ||
        "Sentinel-2";

      const cloud =
        document.createElement("span");

      cloud.className =
        "remote-sensing-observation-cloud";

      cloud.textContent =
        observation.cloudCover === null ||
        observation.cloudCover === undefined
          ? "Cloud: unavailable"
          : `Cloud: ${Number(
              observation.cloudCover,
            ).toFixed(1)}%`;

      const scene =
        document.createElement("span");

      scene.className =
        "remote-sensing-observation-scene";

      scene.textContent =
        observation.sceneId ||
        "Unknown scene";

      card.append(
        date,
        satellite,
        cloud,
        scene,
      );

      card.addEventListener(
        "click",
        () => {
          selectSentinel2Observation(
            observation,
          );
        },
      );

      observationRail.appendChild(card);
    });
  }

  function renderSentinel2QueriedObservations() {
    const {
      queriedObservations,
      queriedObservationRail,
    } = getElements();

    if (!queriedObservationRail) {
      return;
    }

    queriedObservationRail.innerHTML = "";

    const observations =
    sentinel2ObservationContext.queriedObservations;

    if (!observations.length) {
      const empty =
        document.createElement("div");

      empty.className =
        "remote-sensing-observation-empty";

      empty.textContent =
        "No Sentinel-2 scenes match the selected observation criteria.";

      queriedObservationRail.appendChild(empty);
      return;
    }

    observations.forEach((observation) => {
      const card =
        document.createElement("button");

      card.type = "button";
      card.className =
        "remote-sensing-observation-card";

      if (
        observation.sceneId ===
        sentinel2ObservationContext.selectedSceneId
      ) {
        card.classList.add("is-selected");
      }

      const date =
        document.createElement("span");

      date.className =
        "remote-sensing-observation-date";

      date.textContent =
        observation.acquisitionDate
          ? String(
              observation.acquisitionDate,
            ).slice(0, 10)
          : "Unknown date";

      const satellite =
        document.createElement("span");

      satellite.className =
        "remote-sensing-observation-satellite";

      satellite.textContent =
        observation.satellite ||
        "Sentinel-2";

      const cloud =
        document.createElement("span");

      cloud.className =
        "remote-sensing-observation-cloud";

      cloud.textContent =
        observation.cloudCover === null ||
        observation.cloudCover === undefined
          ? "Cloud: unavailable"
          : `Cloud: ${Number(
              observation.cloudCover,
            ).toFixed(1)}%`;

      const scene =
        document.createElement("span");

      scene.className =
        "remote-sensing-observation-scene";

      scene.textContent =
        observation.sceneId ||
        "Unknown scene";

      card.append(
        date,
        satellite,
        cloud,
        scene,
      );

      card.addEventListener(
        "click",
        () => {
          selectSentinel2Observation(
            observation,
          );
        },
      );

      queriedObservationRail.appendChild(card);
    });
  }

  function selectSentinel2Observation(
    observation,
  ) {
    if (
      !observation ||
      !observation.sceneId
    ) {
      return;
    }

    sentinel2ObservationContext.selectedSceneId =
      observation.sceneId;
      sentinel2ObservationContext.selectedObservationDate =
        String(observation.acquisitionDate || "").slice(0, 10);

    // Invalidate previous Crop raster requests and clear both overlays.
    cropNdviRenderSequence++;
    cropNdviClassificationRenderSequence++;

    clearCropNdviLayer();
    clearCropNdviClassificationLayer();

    sentinel2ObservationContext.selectedSpatialCoverage =
      Array.isArray(
        observation.spatialCoverage,
      ) &&
      observation.spatialCoverage.length === 4
        ? observation.spatialCoverage.slice()
        : null;

    renderSentinel2Observations();

    const {
      selectedObservation,
    } = getElements();

    if (selectedObservation) {
      selectedObservation.textContent =
        `Selected scene: ${observation.sceneId}  ${
          observation.acquisitionDate
            ? String(
                observation.acquisitionDate,
              ).slice(0, 10)
            : "date unavailable"
        }`;

      selectedObservation.classList.remove(
        "is-hidden",
      );
    }

    updateStatus(
      `Selected Sentinel-2 scene: ${observation.sceneId}`,
    );

  sentinel2AvailabilityPromise =
    loadSentinel2IndexAvailability(
      observation.acquisitionDate,
      observation.sceneId,
    );

    sentinel2AvailabilityPromise.then(() => {
      const currentSceneId =
        String(
          sentinel2ObservationContext.selectedSceneId || ""
        );

      const currentDate =
        String(
          sentinel2ObservationContext.selectedObservationDate || ""
        ).slice(0, 10);

      const requestedDate =
        String(observation.acquisitionDate || "").slice(0, 10);

      if (
        currentSceneId !== String(observation.sceneId) ||
        currentDate !== requestedDate
      ) {
        return;
      }

      if (
        typeof window.getActiveWorkspace === "function" &&
        window.getActiveWorkspace() === "crop"
      ) {
        return Promise.all([
          renderCropNdviOutput(),
          renderCropNdviClassificationOutput(),
        ]);
      }
    });
    loadSentinel2BiophysicalAvailability(
      observation.acquisitionDate,
      observation.sceneId,
    );

    sentinel2AvailabilityPromise.catch((error) => {
    console.error(
      "Unable to load Sentinel-2 index availability:",
      error,
    );
    });
  }
  async function querySentinel2Observations() {
    updateSentinel2AcquisitionContext();

    if (
      !sentinel2AcquisitionContext.startDate ||
      !sentinel2AcquisitionContext.endDate
    ) {
      throw new Error(
        "Observation start date and end date are required.",
      );
    }

    if (
      sentinel2AcquisitionContext.startDate >
      sentinel2AcquisitionContext.endDate
    ) {
      throw new Error(
        "Observation start date must not be later than end date.",
      );
    }

    const spatialContext =
      getSentinel2SpatialContext();


    const response = await fetch(
      SENTINEL2_OBSERVATION_DISCOVERY_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          temporalContext: {
            startDate:
              sentinel2AcquisitionContext.startDate,
            endDate:
              sentinel2AcquisitionContext.endDate,
          },
          spatialContext,
          acquisitionParameters: {
            maxCloudCover:
              sentinel2AcquisitionContext.maxCloudCover,
          },
        }),
      },
    );

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        payload && payload.error
          ? payload.error
          : "Unable to query Sentinel-2 observations.",
      );
    }

    sentinel2ObservationContext.queriedObservations =
      payload &&
      payload.result &&
      Array.isArray(payload.result.observations)
        ? payload.result.observations
        : [];

    renderSentinel2QueriedObservations();

    const elements = getElements();

    if (elements.queriedObservations) {
      elements.queriedObservations.classList.remove("is-hidden");
    }

    updateStatus(
      `${sentinel2ObservationContext.queriedObservations.length} Sentinel-2 observation(s) found in catalogue.`,
    );

    return sentinel2ObservationContext.queriedObservations;
  }

  async function discoverSentinel2Observations() {
    updateSentinel2AcquisitionContext();
    renderTemporalObservationOptions();
    if (
      sentinel2AcquisitionContext.startDate &&
      sentinel2AcquisitionContext.endDate &&
      sentinel2AcquisitionContext.startDate >
        sentinel2AcquisitionContext.endDate
    ) {
      throw new Error(
        "Observation start date must not be later than end date.",
      );
    }

    const {
      findObservations,
    } = getElements();
    if (findObservations) {
      findObservations.disabled = true;
    }

    updateStatus(
      "Searching Sentinel-2 observations...",
    );

    try {
      const response = await fetch(
        SENTINEL2_LOCAL_OBSERVATIONS_URL,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload && payload.error
            ? payload.error
            : "Unable to discover Sentinel-2 observations.",
        );
      }

      const groupedObservations =
        payload &&
        payload.result &&
        Array.isArray(payload.result.observations)
          ? payload.result.observations
          : [];

      sentinel2ObservationContext.observations =
        groupedObservations.flatMap(
          (observation) =>
            Array.isArray(observation.scenes)
              ? observation.scenes
              : [],
        );  
      renderTemporalObservationOptions();
      const observationDates =
        groupedObservations
          .map(
            (observation) => observation.observationDate,
          )
          .filter(Boolean)
          .sort();

      const {
        startDate,
        endDate,
      } = getElements();

      if (startDate && observationDates.length) {
        startDate.value = observationDates[0];
      }

      if (endDate && observationDates.length) {
        endDate.value =
          observationDates[observationDates.length - 1];
      }

      updateSentinel2AcquisitionContext();

      renderSentinel2Observations();

      const {
        observationResults,
      } = getElements();

      if (observationResults) {
        observationResults.classList.remove(
          "is-hidden",
        );
      }

      updateStatus(
        `${sentinel2ObservationContext.observations.length} Sentinel-2 observation(s) found.`,
      );

      return sentinel2ObservationContext.observations;
    } finally {
      if (findObservations) {
        findObservations.disabled = false;
      }
    }
  }
  function indexIcon(code) {
    const icons = {
      NDVI: "",
      EVI: "",
      SAVI: "",
      GNDVI: "",
      ARVI: "",
      NDWI: "",
      NDMI: "",
    };

    return icons[code] || "";
  }

  function formatObservationDate(dateValue) {
    if (!dateValue) {
      return "Unknown observation date";
    }

    const value = String(dateValue).slice(0, 10);
    const parts = value.split("-");

    if (parts.length !== 3) {
      return value;
    }

    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  function getAvailabilityResult(indexCode) {
    return (
      sentinel2IndexAvailability.results.find(
        (result) =>
          result.indexCode === indexCode
      ) || null
    );
  }

  function isAvailabilityReusableForSelectedObservation(indexCode) {
    const result =
      getAvailabilityResult(indexCode);

    const selectedSceneId =
      String(
        sentinel2ObservationContext.selectedSceneId || ""
      );

    const selectedObservationDate =
      String(
        sentinel2ObservationContext.selectedObservationDate || ""
      ).slice(0, 10);
    return Boolean(
      result &&
      result.status === "AVAILABLE" &&
      selectedSceneId &&
      selectedObservationDate &&
      String(result.sceneId || "") ===
        selectedSceneId &&
      String(result.acquisitionDate || "").slice(0, 10) ===
        selectedObservationDate
    );
  }

  function renderCropNdviAvailability() {
    const container =
      document.getElementById("cropNdviAvailability");

    if (!container) return;

    const selectedSceneId =
      String(sentinel2ObservationContext.selectedSceneId || "");

    const selectedDate =
      String(
        sentinel2ObservationContext.selectedObservationDate || ""
      ).slice(0, 10);

    const showMessage = (message) => {
      const paragraph = document.createElement("p");
      paragraph.className = "analysis-empty-state";
      paragraph.textContent = message;
      container.replaceChildren(paragraph);
    };

    if (!selectedSceneId || !selectedDate) {
      showMessage("Select an observation date to view NDVI evidence.");
      return;
    }

    const stateMatchesSelection =
      sentinel2IndexAvailability.sceneId === selectedSceneId &&
      sentinel2IndexAvailability.observationDate === selectedDate;

    if (!stateMatchesSelection) {
      showMessage("Waiting for NDVI availability...");
      return;
    }

    if (sentinel2IndexAvailability.loading) {
      showMessage("Checking NDVI availability...");
      return;
    }

    if (sentinel2IndexAvailability.error) {
      showMessage("Unable to check NDVI availability. Please try again.");
      return;
    }

    const result = getAvailabilityResult("NDVI");

    const isAvailable =
      result?.status === "AVAILABLE";

    const continuousAvailable =
      result?.availability?.continuous === true;

    const classificationAvailable =
      result?.availability?.classification === true;

    const heading = document.createElement("h5");
    heading.textContent = "NDVI";

    const status = document.createElement("p");
    status.textContent = isAvailable ? "Status: Available" : "Status: Process";

    const date = document.createElement("p");
    date.textContent = `Observation date: ${selectedDate}`;

    const continuous = document.createElement("p");
    continuous.textContent =
      `Continuous raster: ${continuousAvailable ? "Available" : "Not available"}`;

    const classification = document.createElement("p");
    classification.textContent =
      `Classification raster: ${classificationAvailable ? "Available" : "Not available"}`;

    container.replaceChildren(
      heading,
      status,
      date,
      continuous,
      classification
    );
  }

  function renderIndexAvailability() {
    const {
      indexAvailability,
      availabilityDate,
      availableProducts,
      processingProducts,
      availabilityNotice,
    } = getElements();

    if (!indexAvailability) {
      return;
    }

    if (
      !sentinel2IndexAvailability.observationDate
    ) {
      indexAvailability.classList.add(
        "is-hidden"
      );

      return;
    }

    indexAvailability.classList.remove(
      "is-hidden"
    );

    const date =
      sentinel2IndexAvailability.observationDate;

    if (availabilityDate) {
      availabilityDate.textContent =
        `Observation Date: ${formatObservationDate(date)}`;
    }

    if (sentinel2IndexAvailability.error) {
      if (availableProducts) {
        availableProducts.textContent =
          "Availability could not be verified.";
      }

      if (processingProducts) {
        processingProducts.textContent =
          sentinel2IndexAvailability.error;
      }

      if (availabilityNotice) {
        availabilityNotice.classList.remove("is-hidden");
      }

      return;
    }

    const available = [];
    const processing = [];

    catalog.forEach((index) => {
      const isAvailable =
        isAvailabilityReusableForSelectedObservation(
          index.code
        );

      if (isAvailable) {
        available.push(index);
      } else {
        processing.push(index);
      }
    });

    if (availableProducts) {
      availableProducts.innerHTML =
        available.length > 0
          ? `
            <strong>Available locally</strong>
            <div class="remote-sensing-availability-list">
              ${available
                .map(
                  (index) =>
                    `<span> ${index.code}</span>`
                )
                .join("")}
            </div>
          `
          : `
            <strong>No products available locally</strong>
          `;
    }

    if (processingProducts) {
      processingProducts.innerHTML =
        processing.length > 0
          ? `
            <strong>Requires processing</strong>
            <div class="remote-sensing-availability-list">
              ${processing
                .map(
                  (index) =>
                    `<span> ${index.code}</span>`
                )
                .join("")}
            </div>
          `
          : "";
    }

    if (availabilityNotice) {
      availabilityNotice.classList.remove(
        "is-hidden"
      );
    }
  }

  async function loadSentinel2IndexAvailability(
    observationDate,
    sceneId = null
  ) {
    const requestSequence =
      ++sentinel2IndexAvailabilityRequestSequence;

    const requestedDate =
      String(observationDate || "").slice(0, 10);

    const requestedSceneId =
      String(sceneId || "");

    if (!requestedDate) {
      sentinel2IndexAvailability = {
        observationDate: null,
        sceneId: null,
        results: [],
        loading: false,
        error: null,
      };

      renderIndexAvailability();
      renderCatalog();
      renderCropNdviAvailability();

      return;
    }

    sentinel2IndexAvailability = {
      observationDate: requestedDate,
      sceneId: requestedSceneId,
      results: [],
      loading: true,
      error: null,
    };

    renderIndexAvailability();
    renderCatalog();
    renderCropNdviAvailability();

    try {
      const url =
        `${SENTINEL2_INDEX_AVAILABILITY_URL}` +
        `?observationDate=${encodeURIComponent(
          requestedDate
        )}&sceneId=${encodeURIComponent(
          requestedSceneId
        )}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Availability request failed: ${response.status}`
        );
      }

      const payload = await response.json();

      if (
        !payload ||
        payload.success !== true ||
        !Array.isArray(payload.results)
      ) {
        throw new Error(
          "Invalid index availability response."
        );
      }

      if (
        requestSequence !==
        sentinel2IndexAvailabilityRequestSequence
      ) {
        return;
      }

      sentinel2IndexAvailability.results =
        payload.results;

    } catch (error) {
      if (
        requestSequence !==
        sentinel2IndexAvailabilityRequestSequence
      ) {
        return;
      }

      console.error(
        "Sentinel-2 index availability failed:",
        error
      );

      sentinel2IndexAvailability.results = [];
      sentinel2IndexAvailability.error =
        error instanceof Error
          ? error.message
          : "Unknown availability error.";

    } finally {
      if (
        requestSequence ===
        sentinel2IndexAvailabilityRequestSequence
      ) {
        sentinel2IndexAvailability.loading = false;

        renderIndexAvailability();
        renderCatalog();
        renderCropNdviAvailability();
      }
    }
  }

  async function loadSentinel2BiophysicalAvailability(
    observationDate,
    sceneId = null
  ) {
    sentinel2BiophysicalAvailability = {
      product: null,
      loading: Boolean(observationDate),
      error: null,
    };

    if (!observationDate) {
      renderBiophysicalAvailability();
      return;
    }

    try {
      const params = new URLSearchParams({
        observationDate: String(observationDate).slice(0, 10),
        productCode: "LAI",
      });

      if (sceneId) {
        params.set("sceneId", sceneId);
      }

      const response = await fetch(
        `${SENTINEL2_BIOPHYSICAL_AVAILABILITY_URL}?${params}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(
          `LAI availability request failed: ${response.status}`
        );
      }

      const payload = await response.json();

      if (!payload || payload.success !== true) {
        throw new Error("Invalid LAI availability response.");
      }

      sentinel2BiophysicalAvailability.product =
        payload.result || null;
    } catch (error) {
      console.error("Sentinel-2 LAI availability failed:", error);

      sentinel2BiophysicalAvailability.error =
        error instanceof Error
          ? error.message
          : "Unknown LAI availability error.";
    } finally {
      sentinel2BiophysicalAvailability.loading = false;
      renderBiophysicalAvailability();
    }
  }
  function renderBiophysicalAvailability() {
  const container = document.getElementById(
    "remoteSensingBiophysicalProducts"
  );

  if (!container) {
    return;
  }

  const state = sentinel2BiophysicalAvailability;

  if (state.loading) {
    container.textContent = "Checking biophysical products�";
    return;
  }

  if (state.error) {
    container.textContent = "LAI availability could not be verified.";
    return;
  }

  const product = state.product;

  if (product?.status === "AVAILABLE") {
    container.innerHTML = `
      <strong>Biophysical products � Available locally</strong>
      <div class="remote-sensing-availability-list">
        <span>LAI</span>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <strong>Biophysical products � LAI unavailable locally</strong>
  `;
}
  function renderCatalog() {
        const {
      spectralGrid,
      soilGrid,
      soilEmpty,
      biophysicalGrid,
    } = getElements();

    if (!spectralGrid || !soilGrid) {
      return;
    }

    spectralGrid.innerHTML = "";
    soilGrid.innerHTML = "";

    if (biophysicalGrid) {
      biophysicalGrid.innerHTML = "";
    }

    const spectralIndexes =
      catalog.filter(
        (index) =>
          index.category === "spectral"
      );

    const soilFocusedIndexes =
      catalog.filter(
        (index) =>
          index.category === "soil-focused"
      );

    function createIndexCard(index) {
      const button =
        document.createElement("button");

      button.type = "button";

      button.className =
        "remote-sensing-index-card";

      /*
      ----------------------------------------------------------
      Index selection is locked while an index workflow
      is running.
      ----------------------------------------------------------
      */

      button.disabled =
        remoteSensingBusy;

      if (
        selectedIndex &&
        selectedIndex.code === index.code
      ) {
        button.classList.add(
          "is-active"
        );
      }

      button.dataset.indexCode =
        index.code;

      const isAvailable =
        isAvailabilityReusableForSelectedObservation(
          index.code
        );

      button.classList.toggle(
        "is-available",
        Boolean(isAvailable)
      );

      button.classList.toggle(
        "requires-processing",
        !isAvailable
      );

      const availabilityLabel =
        isAvailable
          ? "Available"
          : "Process";

      button.title =
        index.description ||
        index.name;

      button.setAttribute(
        "aria-label",
        `${index.code} spectral index`
      );

      button.innerHTML = `
        <span
          class="remote-sensing-index-icon"
          aria-hidden="true"
        >
          ${indexIcon(index.code)}
        </span>

        <span class="remote-sensing-index-code">
          ${index.code}
        </span>

        <span class="remote-sensing-index-name">
          ${index.name}
        </span>

        <span
          class="remote-sensing-index-availability"
          aria-label="${isAvailable ? "Available locally" : "Requires processing"}"
        >
          ${availabilityLabel}
        </span>
      `;

      button.addEventListener(
        "click",
        () =>
          selectRemoteSensingIndex(
            index
          )
      );

      return button;
    }

    spectralIndexes.forEach(
      (index) => {
        spectralGrid.appendChild(
          createIndexCard(index)
        );
      }
    );

    soilFocusedIndexes.forEach(
      (index) => {
        soilGrid.appendChild(
          createIndexCard(index)
        );
      }
    );

        if (biophysicalGrid) {
      const laiAvailable =
        sentinel2BiophysicalAvailability.product?.status ===
        "AVAILABLE";

      const laiCard = document.createElement("button");
      laiCard.type = "button";
      laiCard.className = "remote-sensing-index-card";
      laiCard.dataset.indexCode = "LAI";
      laiCard.disabled = remoteSensingBusy || !laiAvailable;
      laiCard.classList.toggle("is-available", laiAvailable);
      laiCard.classList.toggle("requires-processing", !laiAvailable);
      laiCard.title =
        "Leaf Area Index � provisional, uncalibrated NDVI-based model";

      laiCard.innerHTML = `
        <span class="remote-sensing-index-icon" aria-hidden="true">??</span>
        <span class="remote-sensing-index-code">LAI</span>
        <span class="remote-sensing-index-name">Leaf Area Index</span>
        <span class="remote-sensing-index-availability">
          ${laiAvailable ? "Available" : "Unavailable"}
        </span>
      `;

      laiCard.addEventListener("click", () => {
        selectBiophysicalProduct({
          code: "LAI",
          name: "Leaf Area Index",
          category: "biophysical",
          description: laiCard.title,
        });
      });

      biophysicalGrid.appendChild(laiCard);
    }

    if (soilEmpty) {
      soilEmpty.classList.toggle(
        "is-hidden",
        soilFocusedIndexes.length > 0
      );
    }
  }

  function updateStatus(message) {
    const { status } =
      getElements();

    if (status) {
      status.textContent =
        message;
    }
  }

  function setRemoteSensingBusy(
    isBusy
  ) {
    remoteSensingBusy =
      Boolean(isBusy);

    renderCatalog();
  }

  function updateRemoteSensingLayerControls(
    enabled
  ) {
    const {
      layerToggle,
      opacity
    } = getElements();

    if (layerToggle) {
      layerToggle.disabled =
        !enabled;

      layerToggle.checked =
        remoteSensingLayerVisible;
    }

    if (opacity) {
      opacity.disabled =
        !enabled;

      opacity.value =
        Math.round(
          remoteSensingOpacity *
            100
        );
    }

    updateRemoteSensingOpacityLabel();
  }

  function updateRemoteSensingOpacityLabel() {
    const { opacityValue } =
      getElements();

    if (opacityValue) {
      opacityValue.textContent =
        `${Math.round(
          remoteSensingOpacity *
            100
        )}%`;
    }
  }
  function setCropNdviLayerVisibility(visible) {
    cropNdviLayerVisible = Boolean(visible);

    const map =
      typeof window.getMap === "function"
        ? window.getMap()
        : null;

    if (!map || !cropNdviLayer) return;

    if (
      cropNdviLayerVisible &&
      !map.hasLayer(cropNdviLayer)
    ) {
      cropNdviLayer.addTo(map);
    }

    if (
      !cropNdviLayerVisible &&
      map.hasLayer(cropNdviLayer)
    ) {
      map.removeLayer(cropNdviLayer);
    }
  }

  function setCropNdviOpacity(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) return;

    cropNdviOpacity = Math.max(
      0,
      Math.min(1, numericValue)
    );

    if (cropNdviLayer) {
      cropNdviLayer.setOpacity(cropNdviOpacity);
    }

    updateCropNdviOpacityLabel();
  }
  function setCropNdviClassificationLayerVisibility(visible) {
    cropNdviClassificationLayerVisible = Boolean(visible);

    const map =
      typeof window.getMap === "function"
        ? window.getMap()
        : null;

    if (!map || !cropNdviClassificationLayer) return;

    if (
      cropNdviClassificationLayerVisible &&
      !map.hasLayer(cropNdviClassificationLayer)
    ) {
      cropNdviClassificationLayer.addTo(map);
    }

    if (
      !cropNdviClassificationLayerVisible &&
      map.hasLayer(cropNdviClassificationLayer)
    ) {
      map.removeLayer(cropNdviClassificationLayer);
    }
  }

  function setCropNdviClassificationOpacity(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) return;

    cropNdviClassificationOpacity = Math.max(
      0,
      Math.min(1, numericValue)
    );

    if (cropNdviClassificationLayer) {
      cropNdviClassificationLayer.setOpacity(
        cropNdviClassificationOpacity
      );
    }

    const opacityValue = document.getElementById(
      "cropNdviClassificationOpacityValue"
    );

    if (opacityValue) {
      opacityValue.textContent =
        `${Math.round(cropNdviClassificationOpacity * 100)}%`;
    }
  }
  function updateCropNdviOpacityLabel() {
    const opacityValue =
      document.getElementById("cropConditionOpacityValue");

    if (opacityValue) {
      opacityValue.textContent =
        `${Math.round(cropNdviOpacity * 100)}%`;
    }
  }
  function setRemoteSensingLayerVisibility(
    visible
  ) {
    remoteSensingLayerVisible =
      Boolean(visible);

    const map =
      typeof window.getMap ===
      "function"
        ? window.getMap()
        : null;

    if (
      !map ||
      !remoteSensingLayer
    ) {
      return;
    }

    if (
      remoteSensingLayerVisible &&
      !map.hasLayer(
        remoteSensingLayer
      )
    ) {
      remoteSensingLayer.addTo(
        map
      );
    }

    if (
      !remoteSensingLayerVisible &&
      map.hasLayer(
        remoteSensingLayer
      )
    ) {
      map.removeLayer(
        remoteSensingLayer
      );
    }
  }

  function setRemoteSensingOpacity(
    value
  ) {
    const numericValue =
      Number(value);

    if (
      !Number.isFinite(
        numericValue
      )
    ) {
      return;
    }

    remoteSensingOpacity =
      Math.max(
        0,
        Math.min(
          1,
          numericValue
        )
      );

    if (
      remoteSensingLayer
    ) {
      remoteSensingLayer.setOpacity(
        remoteSensingOpacity
      );
    }

    updateRemoteSensingOpacityLabel();
  }

  function updateRemoteSensingProgress(
    percent,
    message
  ) {
    const {
      progress,
      progressText,
      progressValue,
      progressBar
    } = getElements();

    const safePercent =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(percent)
        )
      );

    if (progress) {
      progress.classList.remove(
        "is-hidden"
      );

      progress.setAttribute(
        "aria-valuenow",
        String(safePercent)
      );
    }

    if (
      progressText &&
      message
    ) {
      progressText.textContent =
        message;
    }

    if (progressValue) {
      progressValue.textContent =
        `${safePercent}%`;
    }

    if (progressBar) {
      progressBar.style.width =
        `${safePercent}%`;
    }
  }

  function resetRemoteSensingProgress(
    message = "Loading raster..."
  ) {
    updateRemoteSensingProgress(
      0,
      message
    );
  }

  function completeRemoteSensingProgress(
    message = "Raster loaded."
  ) {
    updateRemoteSensingProgress(
      100,
      message
    );
  }

  function hideRemoteSensingProgress() {
    const { progress } =
      getElements();

    if (progress) {
      progress.classList.add(
        "is-hidden"
      );
    }
  }

  function clearRemoteSensingLayer() {
    if (
      !remoteSensingLayer
    ) {
      return;
    }

    const map =
      typeof window.getMap ===
      "function"
        ? window.getMap()
        : null;

    if (
      map &&
      map.hasLayer(
        remoteSensingLayer
      )
    ) {
      map.removeLayer(
        remoteSensingLayer
      );
    }

    remoteSensingLayer = null;

    updateRemoteSensingLayerControls(
      false
    );
  }
    function updateCropConditionLayerControls() {
    const controls = document.getElementById(
      "cropConditionLayerControls"
    );

    if (controls) {
      controls.hidden = !(
        cropNdviLayer ||
        cropNdviClassificationLayer
      );

      controls.classList.remove("is-hidden");
    }
  }

  function clearCropNdviLayer() {
    const map =
      typeof window.getMap === "function"
        ? window.getMap()
        : null;

    if (
      map &&
      cropNdviLayer &&
      map.hasLayer(cropNdviLayer)
    ) {
      map.removeLayer(cropNdviLayer);
    }

    cropNdviLayer = null;

    updateCropConditionLayerControls();
  }

    function clearCropNdviTemporalChangeLayer() {
    const map =
      typeof window.getMap === "function"
        ? window.getMap()
        : null;

    if (
      map &&
      cropNdviTemporalChangeLayer &&
      map.hasLayer(cropNdviTemporalChangeLayer)
    ) {
      map.removeLayer(cropNdviTemporalChangeLayer);
    }

    cropNdviTemporalChangeLayer = null;
  }

  function setCropNdviTemporalChangeVisibility(isVisible) {
    cropNdviTemporalChangeLayerVisible = Boolean(isVisible);

    const map =
      typeof window.getMap === "function"
        ? window.getMap()
        : null;

    if (!map || !cropNdviTemporalChangeLayer) return;

    if (cropNdviTemporalChangeLayerVisible) {
      cropNdviTemporalChangeLayer.addTo(map);
    } else if (map.hasLayer(cropNdviTemporalChangeLayer)) {
      map.removeLayer(cropNdviTemporalChangeLayer);
    }
  }

  function setCropNdviTemporalChangeOpacity(opacity) {
    const value = Number(opacity);

    cropNdviTemporalChangeOpacity = Math.max(
      0,
      Math.min(1, Number.isFinite(value) ? value : 0.72)
    );

    cropNdviTemporalChangeLayer?.setOpacity(
      cropNdviTemporalChangeOpacity
    );

    const label = document.getElementById(
      "cropTemporalOpacityValue"
    );

    if (label) {
      label.textContent =
        `${Math.round(cropNdviTemporalChangeOpacity * 100)}%`;
    }
  }

  function clearCropNdviClassificationLayer() {
    const map =
      typeof window.getMap === "function"
        ? window.getMap()
        : null;

    if (
      map &&
      cropNdviClassificationLayer &&
      map.hasLayer(cropNdviClassificationLayer)
    ) {
      map.removeLayer(cropNdviClassificationLayer);
    }

    cropNdviClassificationLayer = null;

    updateCropConditionLayerControls();
  }
  function selectRemoteSensingIndex(index) {
    if (remoteSensingBusy) {
      return;
    }

    selectedIndex = index;
    renderCatalog();

    updateStatus(
      `${index.code}  ${index.name} selected.`
    );

    loadRemoteSensingMap(index);
  }

  async function selectBiophysicalProduct(product) {
    if (remoteSensingBusy || !product?.code) return;

    const sceneId = sentinel2ObservationContext.selectedSceneId;
    const observationDate =
      sentinel2ObservationContext.selectedObservationDate;
    const availability =
      sentinel2BiophysicalAvailability.product;

    if (!sceneId || !observationDate) {
      updateStatus("Select a Sentinel-2 observation first.");
      return;
    }

    if (
      availability?.status !== "AVAILABLE" ||
      availability.productCode !== product.code ||
      availability.sceneId !== sceneId
    ) {
      updateStatus("LAI is unavailable for the selected observation.");
      return;
    }

    const sequence = ++renderSequence;
    setRemoteSensingBusy(true);
    clearRemoteSensingLayer();
    updateRemoteSensingLayerControls(false);

    try {
      const index = {
        code: product.code,
        name: product.name,
        description: product.description,
        category: "biophysical",
      };

      await renderRasterOutput(index, "index", sequence);
    } catch (error) {
      console.error("LAI raster loading failed:", error);

      if (sequence === renderSequence) {
        updateStatus(`LAI raster unavailable: ${error.message}`);
        hideRemoteSensingProgress();
      }
    } finally {
      setRemoteSensingBusy(false);
      setApplicationProcessingLock(false);
    }
  }
  function getRasterUrl(
    indexCode,
    type
  ) {
    const base =
      `${RASTER_RENDER_BASE}/` +
      `${encodeURIComponent(indexCode)}/` +
      `${encodeURIComponent(type)}`;

    const sceneId =
      sentinel2ObservationContext.selectedSceneId;

    const observationDate =
      String(
        sentinel2ObservationContext.selectedObservationDate || ""
      ).slice(0, 10);

    if (sceneId && /^\d{4}-\d{2}-\d{2}$/.test(observationDate)) {
      const query = new URLSearchParams({
        sceneId: String(sceneId),
        observationDate
      });

      return `${base}?${query.toString()}`;
    }

    return base;
  }
  function getUtmZoneFromEpsg(
    epsgCode
  ) {
    if (
      !Number.isInteger(
        epsgCode
      ) ||
      epsgCode < 32601 ||
      epsgCode > 32660
    ) {
      return null;
    }

    return epsgCode - 32600;
  }

  function utmToLatLng(
    easting,
    northing,
    zone
  ) {
    const a = 6378137.0;

    const eccSquared =
      0.00669438;

    const eccPrimeSquared =
      eccSquared /
      (1 - eccSquared);

    const k0 =
      0.9996;

    const x =
      easting -
      500000.0;

    const y =
      northing;

    const m =
      y / k0;

    const mu =
      m /
      (
        a *
        (
          1 -
          eccSquared / 4 -
          3 *
            eccSquared *
            eccSquared /
            64 -
          5 *
            Math.pow(
              eccSquared,
              3
            ) /
            256
        )
      );

    const e1 =
      (
        1 -
        Math.sqrt(
          1 -
          eccSquared
        )
      ) /
      (
        1 +
        Math.sqrt(
          1 -
          eccSquared
        )
      );

    const j1 =
      3 * e1 / 2 -
      27 *
        Math.pow(
          e1,
          3
        ) /
        32;

    const j2 =
      21 *
        e1 *
        e1 /
        16 -
      55 *
        Math.pow(
          e1,
          4
        ) /
        32;

    const j3 =
      151 *
        Math.pow(
          e1,
          3
        ) /
        96;

    const j4 =
      1097 *
        Math.pow(
          e1,
          4
        ) /
        512;

    const fp =
      mu +
      j1 *
        Math.sin(
          2 * mu
        ) +
      j2 *
        Math.sin(
          4 * mu
        ) +
      j3 *
        Math.sin(
          6 * mu
        ) +
      j4 *
        Math.sin(
          8 * mu
        );

    const sinFp =
      Math.sin(fp);

    const cosFp =
      Math.cos(fp);

    const tanFp =
      Math.tan(fp);

    const c1 =
      eccPrimeSquared *
      cosFp *
      cosFp;

    const t1 =
      tanFp * tanFp;

    const r1 =
      a *
      (
        1 -
        eccSquared
      ) /
      Math.pow(
        1 -
          eccSquared *
          sinFp *
          sinFp,
        1.5
      );

    const n1 =
      a /
      Math.sqrt(
        1 -
          eccSquared *
          sinFp *
          sinFp
      );

    const d =
      x /
      (n1 * k0);

    const latitude =
      fp -
      (
        n1 *
        tanFp /
        r1
      ) *
      (
        Math.pow(
          d,
          2
        ) /
          2 -
        (
          5 +
          3 * t1 +
          10 * c1 -
          4 * c1 * c1 -
          9 *
            eccPrimeSquared
        ) *
          Math.pow(
            d,
            4
          ) /
          24 +
        (
          61 +
          90 * t1 +
          298 * c1 +
          45 * t1 * t1 -
          252 *
            eccPrimeSquared -
          3 * c1 * c1
        ) *
          Math.pow(
            d,
            6
          ) /
          720
      );

    const longitude =
      (
        (zone - 1) * 6 -
        180 +
        3
      ) *
        (Math.PI / 180) +
      (
        d -
        (
          1 +
          2 * t1 +
          c1
        ) *
          Math.pow(
            d,
            3
          ) /
          6 +
        (
          5 -
          2 * c1 +
          28 * t1 -
          3 * c1 * c1 +
          8 *
            eccPrimeSquared +
          24 * t1 * t1
        ) *
          Math.pow(
            d,
            5
          ) /
          120
      ) /
        cosFp;

    return {
      lat:
        latitude *
        180 /
        Math.PI,

      lng:
        longitude *
        180 /
        Math.PI
    };
  }

  function getLatLngBoundsFromGeoTIFF(
    image
  ) {
    const boundingBox =
      image.getBoundingBox();

    if (
      !Array.isArray(
        boundingBox
      ) ||
      boundingBox.length < 4
    ) {
      throw new Error(
        "GeoTIFF spatial bounding box is unavailable."
      );
    }

    const geoKeys =
      typeof image.getGeoKeys ===
      "function"
        ? image.getGeoKeys()
        : {};

    const epsgCode =
      Number(
        geoKeys.ProjectedCSTypeGeoKey
      );

    if (epsgCode === 3857) {
      const crs = L.CRS.EPSG3857;
      const southWest = crs.unproject(
        L.point(boundingBox[0], boundingBox[1])
      );
      const northEast = crs.unproject(
        L.point(boundingBox[2], boundingBox[3])
      );

      return L.latLngBounds(
        southWest,
        northEast
      );
    }
    const zone =
      getUtmZoneFromEpsg(
        epsgCode
      );

    if (!zone) {
      throw new Error(
        `Unsupported raster CRS: EPSG:${epsgCode}`
      );
    }

    const min =
      utmToLatLng(
        boundingBox[0],
        boundingBox[1],
        zone
      );

    const max =
      utmToLatLng(
        boundingBox[2],
        boundingBox[3],
        zone
      );

    return L.latLngBounds(
      [min.lat, min.lng],
      [max.lat, max.lng]
    );
  }

  function createRasterCanvas(
    values,
    width,
    height,
    isClassification,
    indexCode,
    displayContext = {}
  ) {
    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      width;

    canvas.height =
      height;

    const context =
      canvas.getContext(
        "2d"
      );

    if (!context) {
      throw new Error(
        "Unable to create raster canvas."
      );
    }

    const imageData =
      context.createImageData(
        width,
        height
      );

    let min = Infinity;
    let max = -Infinity;
    let dataMin = Infinity;
    let dataMax = -Infinity;

    if (!isClassification) {
      for (
        let i = 0;
        i < values.length;
        i++
      ) {
        const value =
          Number(values[i]);

        if (Number.isFinite(value) && value !== -9999) {
          dataMin = Math.min(dataMin, value);
          dataMax = Math.max(dataMax, value);
          min =
            Math.min(
              min,
              value
            );

          max =
            Math.max(
              max,
              value
            );
        }
      }

        if (indexCode === "BARE_SOIL_FREQUENCY") {
          min = 0;
          max = 100;
        } else if (indexCode === "SSMI") {
          min = -1;
          max = 1;
        } else if (
          !Number.isFinite(min) ||
          !Number.isFinite(max) ||
          min === max
        ) {
          min = -1;
          max = 1;
        }

        if (["NDRE", "SSMI"].includes(indexCode)) {
          min = -1;
          max = 1;
        } else if (
          !Number.isFinite(min) ||
          !Number.isFinite(max) ||
          min === max
        ) {
          min = -1;
          max = 1;
        }
    }

    for (
      let i = 0;
      i < values.length;
      i++
    ) {
      const value =
        Number(values[i]);

      const offset =
        i * 4;

      if (
        !Number.isFinite(value) ||
        value === -9999 ||
        (isClassification && value === 0)
      ) {
        imageData.data[
          offset + 3
        ] = 0;

        continue;
      }

      let normalized;

      if (isClassification) {
        normalized =
          Math.max(
            0,
            Math.min(
              1,
              value / 5
            )
          );
      } else {
        normalized =
          (
            value - min
          ) /
          (
            max - min
          );

        normalized =
          Math.max(
            0,
            Math.min(
              1,
              normalized
            )
          );
      }

            let red;
      let green;
      let blue;

      const classificationColors =
        displayContext.classificationColors;

      if (
        isClassification &&
        Array.isArray(classificationColors)
      ) {
        const classColor =
          classificationColors[Math.round(value) - 1];

        if (
          !Number.isInteger(value) ||
          !Array.isArray(classColor) ||
          classColor.length !== 3
        ) {
          imageData.data[offset + 3] = 0;
          continue;
        }

        [red, green, blue] = classColor;
            } else if (displayContext.diverging) {
        const range = Math.max(
          Math.abs(displayContext.min ?? 0),
          Math.abs(displayContext.max ?? 0)
        );

        const ratio = range > 0
          ? Math.max(-1, Math.min(1, value / range))
          : 0;

        const neutral = [230, 230, 230];
        const negative = [190, 35, 45];
        const positive = [30, 150, 75];

        const target = ratio < 0 ? negative : positive;
        const intensity = Math.abs(ratio);

        [red, green, blue] = neutral.map(
          (channel, index) =>
            Math.round(
              channel +
              (target[index] - channel) * intensity
            )
        );
      } else {
        red = Math.round(255 * normalized);

        green = Math.round(
          255 * (
            1 - Math.abs(normalized - 0.5) * 2
          )
        );

        blue = Math.round(255 * (1 - normalized));
      }

      imageData.data[
        offset
      ] = red;

      imageData.data[
        offset + 1
      ] = green;

      imageData.data[
        offset + 2
      ] = blue;

      imageData.data[
        offset + 3
      ] = 190;
    }

    context.putImageData(imageData, 0, 0);
    if (!isClassification && !displayContext.diverging) {
      const remoteElements = getElements();

      const indexLegend =
        displayContext.indexLegend ||
        remoteElements.indexLegend;

      const indexLegendMin =
        displayContext.indexLegendMin ||
        remoteElements.indexLegendMin;

      const indexLegendMax =
        displayContext.indexLegendMax ||
        remoteElements.indexLegendMax;

      const indexLegendTitle =
        displayContext.indexLegendTitle ||
        remoteElements.indexLegendTitle;
      const formatValue = value =>
        Number.isFinite(value) ? value.toFixed(3) : "";

      if (indexLegendMin) indexLegendMin.textContent = `Min: ${formatValue(dataMin)}`;
      if (indexLegendMax) indexLegendMax.textContent = `Max: ${formatValue(dataMax)}`;
      if (indexLegendTitle) {
        indexLegendTitle.textContent =
          displayContext.legendTitle || `${indexCode} value`;
      }
      indexLegend?.classList.remove("is-hidden");
    }
    return canvas;
  }

  async function renderRasterOutput(
      index,
      type,
      sequence,
      sourceUrl = null,
      displayContext = {}
    ) {
    if (
      typeof GeoTIFF ===
      "undefined"
    ) {
      throw new Error(
        "GeoTIFF library is unavailable."
      );
    }

    const map =
      typeof window.getMap ===
      "function"
        ? window.getMap()
        : null;

    if (!map) {
      throw new Error(
        "Map is not initialized."
      );
    }

    const url =
      sourceUrl ||
      getRasterUrl(
        index.code,
        type
      );

    resetRemoteSensingProgress(
        `${index.code}: Loading raster...`
    );

    updateStatus(
        `${index.code} ${index.name}: Loading raster...`
    );

    const response =
      await fetch(
        url,
        {
          headers: {
            Accept:
              "image/tiff",
          },
        }
      );

    if (!response.ok) {
      throw new Error(
        `Raster request failed: ${response.status}`
      );
    }

    if (!response.body) {
      throw new Error(
        "Raster response streaming is unavailable."
      );
    }

    const contentLength =
      Number(
        response.headers.get(
          "content-length"
        )
      );

    const reader =
      response.body.getReader();

    let arrayBuffer;

    if (
      Number.isFinite(
        contentLength
      ) &&
      contentLength > 0
    ) {
      const buffer =
        new Uint8Array(
          contentLength
        );

      let offset = 0;

      while (true) {
        const {
          done,
          value
        } =
          await reader.read();

        if (done) {
          break;
        }

        if (
          sequence !==
          renderSequence
        ) {
          reader.cancel();
          return;
        }

        buffer.set(
          value,
          offset
        );

        offset +=
          value.length;

        updateRemoteSensingProgress(
          (
            offset /
            contentLength
          ) *
            100,
          `${index.code}: Loading raster...`
        );
      }

      arrayBuffer =
        buffer.buffer;
    } else {
      const chunks = [];
      let received = 0;

      while (true) {
        const {
          done,
          value
        } =
          await reader.read();

        if (done) {
          break;
        }

        if (
          sequence !==
          renderSequence
        ) {
          reader.cancel();
          return;
        }

        chunks.push(
          value
        );

        received +=
          value.length;
      }

      const buffer =
        new Uint8Array(
          received
        );

      let offset = 0;

      for (
        const chunk of chunks
      ) {
        buffer.set(
          chunk,
          offset
        );

        offset +=
          chunk.length;
      }

      arrayBuffer =
        buffer.buffer;
    }

    if (
      sequence !==
      renderSequence
    ) {
      return;
    }

    const tiff =
      await GeoTIFF.fromArrayBuffer(
        arrayBuffer
      );

    const image =
      await tiff.getImage();

    const imageWidth =
      image.getWidth();

    const imageHeight =
      image.getHeight();

    const scale =
      Math.min(
        1,
        MAX_RENDER_SIZE /
          Math.max(
            imageWidth,
            imageHeight
          )
      );

    const renderWidth =
      Math.max(
        1,
        Math.round(
          imageWidth *
          scale
        )
      );

    const renderHeight =
      Math.max(
        1,
        Math.round(
          imageHeight *
          scale
        )
      );

    console.time(`${index.code} readRasters`);
    const raster =
      await image.readRasters({
        samples: [0],
        width: renderWidth,
        height: renderHeight,
        resampleMethod: "nearest",
        interleave: true,
      });
    console.timeEnd(`${index.code} readRasters`);

    if (
      sequence !==
      renderSequence
    ) {
      return;
    }

    console.time(`${index.code} createRasterCanvas`);
    const canvas = createRasterCanvas(
      raster,
      renderWidth,
      renderHeight,
      type === "classification",
      index.code,
      displayContext
    );
    console.timeEnd(`${index.code} createRasterCanvas`);

    console.time(`${index.code} toDataURL`);
    const imageUrl = canvas.toDataURL("image/png");
    console.timeEnd(`${index.code} toDataURL`);

    const bounds =
      getLatLngBoundsFromGeoTIFF(
        image
      );

    clearRemoteSensingLayer();

    remoteSensingLayer =
      L.imageOverlay(
        imageUrl,
        bounds,
        {
          opacity:
            remoteSensingOpacity,

          interactive:
            false,

          crossOrigin:
            false,

          className:
            "remote-sensing-raster-layer",
        }
      );

    if (
      remoteSensingLayerVisible
    ) {
      remoteSensingLayer.addTo(
        map
      );
    }

    updateRemoteSensingLayerControls(
      true
    );

    completeRemoteSensingProgress(
      displayContext.progressMessage ||
      `${index.code}: Raster loaded.`
    );

    map.fitBounds(
      bounds,
      {
        padding: [
          20,
          20
        ],

        maxZoom: 13,
      }
    );

    updateStatus(
      displayContext.statusMessage ||
      `${index.code} ${index.name} ${type} layer loaded.`
    );
  }
    async function renderCropNdviOutput() {
    const sequence = ++cropNdviRenderSequence;

    const selectedSceneId =
      String(
        sentinel2ObservationContext.selectedSceneId || ""
      );

    const selectedDate =
      String(
        sentinel2ObservationContext.selectedObservationDate || ""
      ).slice(0, 10);

    const cropRail =
      document.getElementById("cropIntelligenceRail");

    if (
      typeof window.getActiveWorkspace !== "function" ||
      window.getActiveWorkspace() !== "crop" ||
      !cropRail ||
      cropRail.classList.contains("is-hidden")
    ) {
      return;
    }

    const result = getAvailabilityResult("NDVI");

    const availabilityMatches =
      result &&
      result.status === "AVAILABLE" &&
      String(result.sceneId || "") === selectedSceneId &&
      String(result.acquisitionDate || "").slice(0, 10) === selectedDate &&
      result.availability?.continuous === true;

    if (
      !selectedSceneId ||
      !selectedDate ||
      !availabilityMatches
    ) {
      clearCropNdviLayer();
      return;
    }

    if (typeof GeoTIFF === "undefined") {
      clearCropNdviLayer();
      console.error("GeoTIFF library is unavailable for Crop NDVI.");
      return;
    }

    const map =
      typeof window.getMap === "function"
        ? window.getMap()
        : null;

    if (!map) {
      clearCropNdviLayer();
      console.error("Map is not initialized for Crop NDVI.");
      return;
    }

    try {
      const url = getRasterUrl("NDVI", "index");

      const response = await fetch(url, {
        headers: {
          Accept: "image/tiff",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Crop NDVI raster request failed: ${response.status}`
        );
      }

      if (!response.body) {
        throw new Error(
          "Crop NDVI raster streaming is unavailable."
        );
      }

      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (sequence !== cropNdviRenderSequence) {
          await reader.cancel();
          return;
        }

        chunks.push(value);
        received += value.length;
      }

      if (sequence !== cropNdviRenderSequence) return;

      const buffer = new Uint8Array(received);
      let offset = 0;

      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }

      const tiff =
        await GeoTIFF.fromArrayBuffer(buffer.buffer);

      if (sequence !== cropNdviRenderSequence) return;

      const image = await tiff.getImage();

      const imageWidth = image.getWidth();
      const imageHeight = image.getHeight();

      const scale = Math.min(
        1,
        MAX_RENDER_SIZE /
          Math.max(imageWidth, imageHeight)
      );

      const renderWidth = Math.max(
        1,
        Math.round(imageWidth * scale)
      );

      const renderHeight = Math.max(
        1,
        Math.round(imageHeight * scale)
      );

      const raster = await image.readRasters({
        samples: [0],
        width: renderWidth,
        height: renderHeight,
        resampleMethod: "nearest",
        interleave: true,
      });

      if (sequence !== cropNdviRenderSequence) return;

      const canvas = createRasterCanvas(
        raster,
        renderWidth,
        renderHeight,
        false,
        "NDVI",
        {
          legendTitle: "Crop NDVI",
          indexLegend: document.getElementById(
            "cropConditionIndexLegend"
          ),
          indexLegendTitle: document.getElementById(
            "cropConditionIndexLegendTitle"
          ),
          indexLegendMin: document.getElementById(
            "cropConditionIndexLegendMin"
          ),
          indexLegendMax: document.getElementById(
            "cropConditionIndexLegendMax"
          ),
        }
      );

      const imageUrl = canvas.toDataURL("image/png");

      const bounds = getLatLngBoundsFromGeoTIFF(image);

      if (sequence !== cropNdviRenderSequence) return;

      clearCropNdviLayer();

      cropNdviLayer = L.imageOverlay(
        imageUrl,
        bounds,
        {
          opacity: cropNdviOpacity,
          interactive: false,
          crossOrigin: false,
          className: "crop-ndvi-raster-layer",
        }
      );

      if (cropNdviLayerVisible) {
        cropNdviLayer.addTo(map);
      }

      const controls =
        document.getElementById("cropConditionLayerControls");

      if (controls) {
        controls.hidden = false;
      }

      const layerToggle =
        document.getElementById("cropConditionLayerToggle");

      if (layerToggle) {
        layerToggle.checked = cropNdviLayerVisible;
      }

      const opacity =
        document.getElementById("cropConditionOpacity");

      if (opacity) {
        opacity.value = String(
          Math.round(cropNdviOpacity * 100)
        );
      }

      const opacityValue =
        document.getElementById("cropConditionOpacityValue");

      if (opacityValue) {
        opacityValue.textContent =
          `${Math.round(cropNdviOpacity * 100)}%`;
      }

      map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 13,
      });

    } catch (error) {
      if (sequence !== cropNdviRenderSequence) return;

      clearCropNdviLayer();

      console.error(
        "Crop NDVI raster loading failed:",
        error
      );
    }
  }
  async function renderCropNdviClassificationOutput() {
    const sequence = ++cropNdviClassificationRenderSequence;

    const selectedSceneId = String(
      sentinel2ObservationContext.selectedSceneId || ""
    );

    const selectedDate = String(
      sentinel2ObservationContext.selectedObservationDate || ""
    ).slice(0, 10);

    const cropRail = document.getElementById("cropIntelligenceRail");

    const isCropActive = () =>
      typeof window.getActiveWorkspace === "function" &&
      window.getActiveWorkspace() === "crop" &&
      cropRail &&
      !cropRail.classList.contains("is-hidden");

    if (!isCropActive()) return;

    const result = getAvailabilityResult("NDVI");

    const availabilityMatches =
      result &&
      result.status === "AVAILABLE" &&
      String(result.sceneId || "") === selectedSceneId &&
      String(result.acquisitionDate || "").slice(0, 10) === selectedDate &&
      result.availability?.classification === true;

    if (!selectedSceneId || !selectedDate || !availabilityMatches) {
      clearCropNdviClassificationLayer();
      return;
    }

    if (typeof GeoTIFF === "undefined") {
      clearCropNdviClassificationLayer();
      console.error("GeoTIFF library is unavailable for NDVI classification.");
      return;
    }

    const map =
      typeof window.getMap === "function"
        ? window.getMap()
        : null;

    if (!map) {
      clearCropNdviClassificationLayer();
      console.error("Map is not initialized for NDVI classification.");
      return;
    }

    try {
      const response = await fetch(
        getRasterUrl("NDVI", "classification"),
        { headers: { Accept: "image/tiff" } }
      );

      if (!response.ok || !response.body) {
        throw new Error(
          `NDVI classification request failed: ${response.status}`
        );
      }

      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (sequence !== cropNdviClassificationRenderSequence) {
          await reader.cancel();
          return;
        }

        chunks.push(value);
        received += value.length;
      }

      if (sequence !== cropNdviClassificationRenderSequence) return;

      const buffer = new Uint8Array(received);
      let offset = 0;

      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }

      const tiff = await GeoTIFF.fromArrayBuffer(buffer.buffer);
      const image = await tiff.getImage();

      const imageWidth = image.getWidth();
      const imageHeight = image.getHeight();

      const scale = Math.min(
        1,
        MAX_RENDER_SIZE / Math.max(imageWidth, imageHeight)
      );

      const renderWidth = Math.max(1, Math.round(imageWidth * scale));
      const renderHeight = Math.max(1, Math.round(imageHeight * scale));

      const raster = await image.readRasters({
        samples: [0],
        width: renderWidth,
        height: renderHeight,
        resampleMethod: "nearest",
        interleave: true,
      });

      if (
        sequence !== cropNdviClassificationRenderSequence ||
        !isCropActive() ||
        selectedSceneId !== sentinel2ObservationContext.selectedSceneId ||
        selectedDate !== String(
          sentinel2ObservationContext.selectedObservationDate || ""
        ).slice(0, 10)
      ) {
        return;
      }

      const canvas = createRasterCanvas(
        raster,
        renderWidth,
        renderHeight,
        true,
        "NDVI",
        {
          classificationColors: [
            [215, 48, 39],
            [252, 141, 89],
            [254, 224, 139],
            [145, 207, 96],
            [26, 152, 80],
          ],
        }
      );

      const imageUrl = canvas.toDataURL("image/png");
      const bounds = getLatLngBoundsFromGeoTIFF(image);

      if (sequence !== cropNdviClassificationRenderSequence) return;

      clearCropNdviClassificationLayer();

      cropNdviClassificationLayer = L.imageOverlay(
        imageUrl,
        bounds,
        {
          opacity: cropNdviClassificationOpacity,
          interactive: false,
          crossOrigin: false,
          className: "crop-ndvi-classification-layer",
        }
      );

      if (cropNdviClassificationLayerVisible) {
        cropNdviClassificationLayer.addTo(map);
      }

      updateCropConditionLayerControls();

      const toggle = document.getElementById(
        "cropNdviClassificationLayerToggle"
      );

      if (toggle) {
        toggle.checked = cropNdviClassificationLayerVisible;
      }

      const opacity = document.getElementById(
        "cropNdviClassificationOpacity"
      );

      if (opacity) {
        opacity.value = String(
          Math.round(cropNdviClassificationOpacity * 100)
        );
      }

      const opacityValue = document.getElementById(
        "cropNdviClassificationOpacityValue"
      );

      if (opacityValue) {
        opacityValue.textContent =
          `${Math.round(cropNdviClassificationOpacity * 100)}%`;
      }

      map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 13,
      });

    } catch (error) {
      if (sequence !== cropNdviClassificationRenderSequence) return;

      clearCropNdviClassificationLayer();

      console.error(
        "Crop NDVI classification loading failed:",
        error
      );
    }
  }
  async function loadRemoteSensingMap(
    index
  ) {
    /*
    ----------------------------------------------------------
     Single-flight protection.

     Once the workflow starts, all spectral-index buttons
     remain disabled until the workflow reaches completion
     or fails.
    ----------------------------------------------------------
    */

    if (remoteSensingBusy) {
      return;
    }

    if (!sentinel2ObservationContext.selectedSceneId) {
      updateStatus(
        "Select a Sentinel-2 observation before choosing an index."
      );
      return;
    }

    const sequence =
      ++renderSequence;

    setRemoteSensingBusy(
      true
    );

    clearRemoteSensingLayer();

    if (
      !index ||
      !index.code
    ) {
      setRemoteSensingBusy(
        false
      );

      return;
    }

    updateRemoteSensingLayerControls(
      false
    );

    try {
      await ensureRasterIndex(
        index,
        sequence
      );

      if (
        sequence !==
        renderSequence
      ) {
        return;
      }

      await renderRasterOutput(
        index,
        "index",
        sequence
      );
    } catch (error) {
      console.error(
        "Remote Sensing raster loading failed:",
        error
      );

      if (
        sequence ===
        renderSequence
      ) {
        updateStatus(
          `${index.code}: raster unavailable  ${error && error.message ? error.message : "Unknown error."}`
        );

        hideRemoteSensingProgress();
      }
    } finally {
      /*
      --------------------------------------------------------
       The workflow lock is released only after the complete
       workflow has finished or failed.

       Successful workflow reaches 100% before this executes.
      --------------------------------------------------------
      */

      setRemoteSensingBusy(
        false
      );

      setApplicationProcessingLock(
        false
      );
    }
  }

  async function loadRemoteSensingCatalog() {
    updateStatus(
      "Loading remote sensing indices..."
    );

    try {
      const response =
        await fetch(
          CATALOG_URL,
          {
            headers: {
              Accept:
                "application/json",
            },
          }
        );

      if (!response.ok) {
        throw new Error(
          `Catalog request failed: ${response.status}`
        );
      }

      const payload =
        await response.json();

      if (
        !payload ||
        payload.success !==
          true ||
        !Array.isArray(
          payload.indices
        )
      ) {
        throw new Error(
          "Invalid remote sensing catalog response."
        );
      }

      catalog =
        payload.indices;

      renderCatalog();

      updateStatus(
        `${catalog.length} remote sensing indices available.`
      );

      return catalog;
    } catch (error) {
      console.error(
        "Remote Sensing catalog loading failed:",
        error
      );

      updateStatus(
        "Unable to load remote sensing indices."
      );

      return [];
    }
  }

  async function consumeSentinel2ProductionStream(
    response,
    onProgress,
  ) {
    if (!response.body) {
      throw new Error(
        "Sentinel-2 production stream is not available.",
      );
    }

    const reader =
      response.body.getReader();

    const decoder =
      new TextDecoder();

    let buffer = "";
    let resultPayload = null;

    const processEvent = (
      eventText,
    ) => {
      let eventName = "message";
      let data = "";

      for (
        const line of eventText.split(
          /\r?\n/,
        )
      ) {
        if (
          line.startsWith(
            "event: ",
          )
        ) {
          eventName =
            line.slice(7);
        } else if (
          line.startsWith(
            "data: ",
          )
        ) {
          data += line.slice(6);
        }
      }

      if (!data) {
        return;
      }

      const payload =
        JSON.parse(data.replace(/^\uFEFF/, ""));

      if (
        eventName ===
        "progress"
      ) {
        if (
          typeof onProgress ===
          "function"
        ) {
          onProgress(payload);
        }

        return;
      }

      if (
        eventName ===
        "result"
      ) {
        resultPayload =
          payload;

        return;
      }

      if (
        eventName ===
        "error"
      ) {
        throw new Error(
          payload.error ||
            "Sentinel-2 index production failed.",
        );
      }
    };

    while (true) {
      const {
        done,
        value,
      } =
        await reader.read();

      buffer +=
        decoder.decode(
          value ||
            new Uint8Array(),
          {
            stream: !done,
          },
        );

      const events =
        buffer.split(
          /\r?\n\r?\n/,
        );

      buffer =
        events.pop() || "";

      for (
        const eventText of events
      ) {
        processEvent(
          eventText,
        );
      }

      if (done) {
        break;
      }
    }

    if (buffer.trim()) {
      processEvent(buffer);
    }

    if (!resultPayload) {
      throw new Error(
        "Sentinel-2 production stream ended without a result.",
      );
    }

    return resultPayload;
  }
  async function ensureRasterIndex(
    index,
    sequence,
  ) {
    if (!index || !index.code) {
      return;
    }

    const indexCode =
      String(index.code)
        .trim()
        .toUpperCase();

    if (
      !sentinel2AcquisitionContext.startDate ||
      !sentinel2AcquisitionContext.endDate
    ) {
      throw new Error(
        "Sentinel-2 acquisition start and end dates are required.",
      );
    }

    if (
      !sentinel2ObservationContext.selectedSceneId
    ) {
      throw new Error(
        "Select a Sentinel-2 observation before producing an index.",
      );
    }

    const selectedSceneId =
      sentinel2ObservationContext.selectedSceneId;

    const selectedObservationDate =
      sentinel2ObservationContext.selectedObservationDate;

    await loadSentinel2IndexAvailability(
      selectedObservationDate,
      selectedSceneId
    );

    await loadSentinel2BiophysicalAvailability(
      selectedObservationDate,
      selectedSceneId
    );

    if (sequence !== renderSequence) {
      return;
    }

    const availability =
      getAvailabilityResult(indexCode);

    const reusableRaster =
      availability &&
      availability.status === "AVAILABLE" &&
      String(availability.sceneId || "") ===
        String(selectedSceneId) &&
      String(
        availability.acquisitionDate || ""
      ).slice(0, 10) ===
        selectedObservationDate;

    if (reusableRaster) {
      updateStatus(
        `${indexCode}: existing raster available for ${formatObservationDate(
          selectedObservationDate
        )}. Using local output.`,
      );

      updateRemoteSensingProgress(
        100,
        `${indexCode}: Existing local raster found. Loading...`,
      );

      return;
    }

    updateStatus(
      `${indexCode}: local raster unavailable. Starting processing...`,
    );

    resetRemoteSensingProgress(
      `Building ${indexCode}...`,
    );

    updateRemoteSensingProgress(
      null,
      `${indexCode}: Preparing Sentinel-2 imagery...`,
    );

    setApplicationProcessingLock(true);

    updateApplicationProcessingLockMessage(
      `Processing ${indexCode} production indices. Please wait...`,
    );


    const response = await fetch(
      SENTINEL2_INDEX_PRODUCTION_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Accept:
            "text/event-stream",
        },
        body: JSON.stringify({
          contractVersion: "1.0",
          sourceId: "sentinel2",
          temporalContext: {
            startDate:
              sentinel2AcquisitionContext.startDate,
            endDate:
              sentinel2AcquisitionContext.endDate,
          },
          spatialContext:
            getSelectedSentinel2SpatialContext(),
          acquisitionParameters: {
            maxCloudCover:
              sentinel2AcquisitionContext.maxCloudCover,
            sceneId:
              sentinel2ObservationContext.selectedSceneId,
          },
          outputDirectory:
            "./data/remote-sensing/acquisitions",
          analyticalOutputDirectory:
            "./data/remote-sensing/outputs",
            productionDirectory:
            "./data/remote-sensing/production",
          indexCode,
          targetResolution: ["NDRE", "SSMI"].includes(indexCode) ? 20 : 10,
          outputNoData: -9999,
          parameters: {},
        }),
      },
    );

    if (sequence !== renderSequence) {
      return;
    }

    if (!response.ok) {
      let message =
        `${indexCode} build request failed: ${response.status}`;

      try {
        const payload =
          await response.json();

        if (
          payload &&
          typeof payload.message ===
            "string"
        ) {
          message =
            payload.message;
        }

        if (
          payload &&
          typeof payload.error ===
            "string"
        ) {
          message =
            payload.error;
        }
      } catch {
        // Preserve HTTP status message.
      }

      throw new Error(message);
    }

    const streamPayload =
      await consumeSentinel2ProductionStream(
        response,
        (progress) => {
          if (
            sequence !== renderSequence
          ) {
            return;
          }

          const message =
            progress &&
            typeof progress.message ===
              "string"
              ? progress.message
              : `Processing ${indexCode}...`;

          updateRemoteSensingProgress(
            progress &&
            Number.isFinite(
              Number(progress.percent)
            )
              ? Number(progress.percent)
              : null,
            `${indexCode}: ${message}`,
          );

          updateStatus(
            `${indexCode}: ${message}`,
          );
        },
      );

    if (sequence !== renderSequence) {
      return;
    }

    const payload =
      streamPayload;

    if (
      !payload ||
      payload.success !== true ||
      !payload.result
    ) {
      throw new Error(
        `${indexCode} build did not return a valid production result.`,
      );
    }

    updateRemoteSensingProgress(
      null,
      `${indexCode} built. Loading ${indexCode}...`,
    );
  }
  function openRemoteSensingTool() {
    const {
      rail,
      observationResults,
    } = getElements();

    if (!rail) {
      return false;
    }

    rail.classList.remove(
      "is-hidden"
    );

    if (observationResults) {
      observationResults.classList.remove(
        "is-hidden"
      );
    }

    loadRemoteSensingCatalog();

    discoverSentinel2Observations().catch((error) => {
      console.error(
        "Unable to automatically discover Sentinel-2 observations:",
        error,
      );
    });

    return true;
  }

  function closeRemoteSensingTool() {
    const {
      rail,
      observationResults,
    } = getElements();

    if (!rail) {
      return false;
    }

    rail.classList.add(
      "is-hidden"
    );

    if (observationResults) {
      observationResults.classList.add(
        "is-hidden"
      );
    }

    hideRemoteSensingProgress();

    return true;
  }

  function openCropIntelligenceTool() {
    const { observationResults } = getElements();

    if (observationResults) {
      observationResults.classList.remove("is-hidden");
    }
      discoverSentinel2Observations()
        .then(() => {
          const selectedSceneId =
            sentinel2ObservationContext.selectedSceneId;

          const selectedDate =
            String(
              sentinel2ObservationContext.selectedObservationDate || ""
            ).slice(0, 10);

          const availabilityMatches =
            sentinel2IndexAvailability.sceneId === selectedSceneId &&
            String(
              sentinel2IndexAvailability.observationDate || ""
            ).slice(0, 10) === selectedDate &&
            !sentinel2IndexAvailability.loading;

          if (
            selectedSceneId &&
            selectedDate &&
            availabilityMatches &&
            typeof window.getActiveWorkspace === "function" &&
            window.getActiveWorkspace() === "crop"
          ) {
            updateRemoteSensingProgress(
              65,
              "Loading Crop Condition raster layers..."
            );
            Promise.all([
              renderCropNdviOutput(),
              renderCropNdviClassificationOutput(),
            ]);
          }
        })
        .catch((error) => {
          console.error(
            "Unable to discover Sentinel-2 observations for Crop Intelligence:",
            error,
          );
        });
    return true;
  }

  function renderSentinel2ProcessedDates(results, biophysicalProducts = []) {
    const { processedDatesStatus: status, processedDatesList: list } =
      getElements();

    list.replaceChildren();

    if (
      (!Array.isArray(results) || results.length === 0) &&
      (!Array.isArray(biophysicalProducts) || biophysicalProducts.length === 0)
    ) {
      status.textContent = "No verified processed products were found.";
      return;
    }

    status.textContent = "Verified products are ready for the dates shown below.";

    const available = [];
    const unavailable = [];

    results.forEach((item) => {
      const dates = Array.isArray(item.dates) ? item.dates : [];
      (dates.length ? available : unavailable).push({ item, dates });
    });

    function formatDate(value) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (!match) return value;

      return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      ).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }

    function createRows(items, className = "") {
      const column = document.createElement("div");
      column.className = `remote-sensing-processed-column ${className}`.trim();

      items.forEach(({ item, dates }) => {
        const row = document.createElement("div");
        const title = document.createElement("strong");
        const values = document.createElement("div");

        row.className = "remote-sensing-processed-date-item";
        title.textContent = item.indexName || item.indexCode || "Unknown index";
        values.className = "remote-sensing-processed-date-values";
        values.textContent = dates.length
          ? dates.map(formatDate).join(", ")
          : "No verified processed dates";

        row.append(title, values);
        column.appendChild(row);
      });

      return column;
    }

    list.appendChild(createRows(available, "verified-products-column"));

    if (unavailable.length) {
      list.appendChild(
        createRows(unavailable, "unavailable-products-column")
      );
    }

    if (Array.isArray(biophysicalProducts) && biophysicalProducts.length) {
      const section = document.createElement("section");
      const heading = document.createElement("h4");
      const column = document.createElement("div");

      section.className = "remote-sensing-biophysical-products";
      heading.textContent = "Biophysical Products";
      column.className = "remote-sensing-processed-column";

      biophysicalProducts.forEach((product) => {
        const row = document.createElement("div");
        const title = document.createElement("strong");
        const values = document.createElement("div");
        const dates = Array.isArray(product.dates) ? product.dates : [];

        row.className = "remote-sensing-processed-date-item";
        title.textContent =
          `${product.productName || product.productCode} (${product.productCode})`;
        values.className = "remote-sensing-processed-date-values";
        values.textContent = dates.length
          ? dates.map(formatDate).join(", ")
          : "No verified processed dates";

        row.append(title, values);
        column.appendChild(row);
      });

      section.append(heading, column);
      list.appendChild(section);
    }
  }

  async function loadSentinel2ProcessedDates() {
    const elements = getElements();

    if (!elements.processedDatesStatus ||
        !elements.processedDatesList) {
      return;
    }

    elements.processedDatesStatus.textContent =
      "Loading processed dates...";

    try {
      const response = await fetch(
        SENTINEL2_PROCESSED_DATES_URL,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error(
          `Processed-dates request failed (${response.status}).`
        );
      }

      const payload = await response.json();

      if (payload.success !== true ||
          !Array.isArray(payload.results)) {
        throw new Error("Unexpected processed-dates response.");
      }

      renderSentinel2ProcessedDates(
      payload.results,
      payload.biophysicalProducts || []
    );
    } catch (error) {
      console.error(
        "Unable to load previously processed dates:",
        error
      );

      elements.processedDatesStatus.textContent =
        "Processed dates could not be loaded. Please refresh to try again.";
      elements.processedDatesList.replaceChildren();
    }
  }

  async function loadSoilVegetationClassification() {
    const button = document.getElementById(
      "remoteSensingSoilVegetationButton"
    );
    const sceneId =
      sentinel2ObservationContext &&
      sentinel2ObservationContext.selectedSceneId;

    if (!sceneId) {
      updateStatus("Select a Sentinel-2 observation first.");
      return;
    }

    const map =
      typeof window.getMap === "function"
        ? window.getMap()
        : null;

    if (!map || typeof GeoTIFF === "undefined") {
      updateStatus("The map or GeoTIFF reader is unavailable.");
      return;
    }

    const sequence = ++renderSequence;

    if (button) {
      button.disabled = true;
      button.textContent = "Loading classification...";
    }

    updateStatus("Loading soil and vegetation classification...");

    try {
      const url =
        "/api/remote-sensing/raster/analysis/soil-vegetation/" +
        encodeURIComponent(sceneId);

      const response = await fetch(url, {
        headers: { Accept: "image/tiff" }
      });

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "No classification raster exists for this scene."
            : `Raster request failed (${response.status}).`
        );
      }

      const buffer = await response.arrayBuffer();
      if (sequence !== renderSequence) return;

      const tiff = await GeoTIFF.fromArrayBuffer(buffer);
      const image = await tiff.getImage();
      const width = image.getWidth();
      const height = image.getHeight();

      const scale = Math.min(
        1,
        MAX_RENDER_SIZE / Math.max(width, height)
      );
      const renderWidth = Math.max(1, Math.round(width * scale));
      const renderHeight = Math.max(1, Math.round(height * scale));

      const values = await image.readRasters({
        samples: [0],
        width: renderWidth,
        height: renderHeight,
        resampleMethod: "nearest",
        interleave: true
      });

      if (sequence !== renderSequence) return;

      const canvas = document.createElement("canvas");
      canvas.width = renderWidth;
      canvas.height = renderHeight;

      const context = canvas.getContext("2d");
      const pixels = context.createImageData(renderWidth, renderHeight);

      for (let i = 0; i < values.length; i++) {
        const offset = i * 4;
        const value = Number(values[i]);

        // Class 0 is NoData; keep it fully transparent.
        if (!Number.isFinite(value) || value === 0) {
          pixels.data[offset + 3] = 0;
          continue;
        }

        let color;
        if (value === 1) {
          color = [46, 139, 87];       // Vegetation dominant
        } else if (value === 2) {
          color = [190, 145, 91];      // Bare soil dominant
        } else if (value === 3) {
          color = [222, 145, 65];      // Mixed/other evidence
        } else {
          pixels.data[offset + 3] = 0;
          continue;
        }

        pixels.data[offset] = color[0];
        pixels.data[offset + 1] = color[1];
        pixels.data[offset + 2] = color[2];
        pixels.data[offset + 3] = 190;
      }

      context.putImageData(pixels, 0, 0);

      const bounds = getLatLngBoundsFromGeoTIFF(image);
      if (sequence !== renderSequence) return;

      clearRemoteSensingLayer();

      remoteSensingLayer = L.imageOverlay(
        canvas.toDataURL("image/png"),
        bounds,
        {
          opacity: remoteSensingOpacity,
          interactive: false,
          className: "remote-sensing-raster-layer"
        }
      );

      if (remoteSensingLayerVisible) {
        remoteSensingLayer.addTo(map);
      }

      updateRemoteSensingLayerControls(true);
      map.fitBounds(bounds, { maxZoom: 13 });
      updateStatus(
        "Soil & vegetation classification loaded. Provisional  uncalibrated."
      );
    } catch (error) {
      if (sequence === renderSequence) {
        console.error("Classification load failed:", error);
        updateStatus(error.message || "Unable to load classification.");
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Show Soil & Vegetation Classification";
      }
    }
  }

  async function loadBareSoilFrequency() {
    const button = document.getElementById(
      "remoteSensingBareSoilFrequencyButton"
    );

    const map =
      typeof window.getMap === "function"
        ? window.getMap()
        : null;

    if (!map || typeof GeoTIFF === "undefined") {
      updateStatus("The map or GeoTIFF reader is unavailable.");
      return;
    }

    const sequence = ++renderSequence;

    if (button) {
      button.disabled = true;
      button.textContent = "Loading Bare Soil Frequency...";
    }

    try {
      await renderRasterOutput(
        {
          code: "BARE_SOIL_FREQUENCY",
          name: "Bare Soil Frequency (8-28 Sep 2026)"
        },
        "index",
        sequence,
        "/api/remote-sensing/raster/analysis/bare-soil-frequency"
      );
    } catch (error) {
      console.error("Bare Soil Frequency loading failed:", error);

      if (sequence === renderSequence) {
        updateStatus(
          error.message || "Failed to load Bare Soil Frequency."
        );
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Show Bare Soil Frequency";
      }
    }
  }

  async function generateCropInterpretation() {
    const button = document.getElementById("generateCropInterpretation");
    const content = document.getElementById("cropInterpretationOutput");
    const sceneId = sentinel2ObservationContext.selectedSceneId;
    const observationDate = sentinel2ObservationContext.selectedObservationDate;
    const indexCode = "NDVI";

    if (!sceneId || !observationDate || !indexCode) {
      if (content) content.textContent =
        "Select a Sentinel-2 observation and spectral index first.";
      return;
    }

    button.disabled = true;
    setRemoteSensingBusy(true);
    setApplicationProcessingLock(true);
    updateApplicationProcessingLockMessage(
      "Generating Crop Condition Evidence..."
    );
    resetRemoteSensingProgress(
      "Generating Crop Condition Evidence..."
    );
    if (content) content.textContent = "Generating interpretation";

    try {
      const response = await fetch("/api/remote-sensing/crop-interpretation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observationDate, sceneId, indexCode })
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Interpretation request failed.");
      }

      updateRemoteSensingProgress(
        55,
        "Crop Condition Evidence generated. Preparing raster layers..."
      );

      const interpretation = result.interpretation;
      content.replaceChildren();

      const heading = document.createElement("h4");
      heading.textContent = "Crop Condition Evidence";
      content.appendChild(heading);

      const status = document.createElement("p");
      status.textContent =
        `Status: ${interpretation.overallInterpretation.interpretationStatus}`;
      content.appendChild(status);

      const summary = document.createElement("p");
      summary.textContent = interpretation.overallInterpretation.summary;
      content.appendChild(summary);

      for (const item of interpretation.indexInterpretations || []) {
        const evidence = document.createElement("p");
        evidence.textContent = item.evidenceSummary.replace(/-?\d+\.\d{6,}/g, value => Number(value).toFixed(4));
        content.appendChild(evidence);
      }

      const note = document.createElement("p");
      note.textContent =
        "Evidence only - this is not a crop diagnosis. Crop-specific calibration is required.";
      content.appendChild(note);
      // Render NDVI through the independent Crop layer.
        try {
          if (
            sceneId !== sentinel2ObservationContext.selectedSceneId ||
            observationDate !== sentinel2ObservationContext.selectedObservationDate ||
            typeof window.getActiveWorkspace !== "function" ||
            window.getActiveWorkspace() !== "crop"
          ) {
            throw new Error(
              "The selected observation changed or Crop Intelligence is no longer active."
            );
          }

          updateRemoteSensingProgress(
            65,
            "Loading Crop Condition raster layers..."
          );

          await Promise.all([
            renderCropNdviOutput(),
            renderCropNdviClassificationOutput(),
          ]);

        } catch (rasterError) {
          const rasterNotice = document.createElement("p");
          rasterNotice.textContent =
            `Evidence interpretation generated, but the Crop raster could not be displayed: ${rasterError.message}`;
          content.appendChild(rasterNotice);
        }
    } catch (error) {
      if (content) content.textContent =
        error.message || "Unable to generate interpretation.";
    } finally {
      button.disabled = false;
      setRemoteSensingBusy(false);
      setApplicationProcessingLock(false);
      hideRemoteSensingProgress();
    }
  }
  
  async function renderCropNdviTemporalChange(product) {
    const sequence = ++cropNdviTemporalChangeRenderSequence;

    if (typeof GeoTIFF === "undefined") {
      throw new Error("GeoTIFF library is unavailable.");
    }

    const map =
      typeof window.getMap === "function"
        ? window.getMap()
        : null;

    if (!map) {
      throw new Error("Map is not initialized.");
    }

    if (!product?.comparisonId) {
      throw new Error("Temporal comparison ID is missing.");
    }

    updateRemoteSensingProgress(
      55,
      "Temporal comparison generated. Preparing raster..."
    );

    const url =
      `/api/remote-sensing/crop-condition/comparisons/` +
      `${encodeURIComponent(product.comparisonId)}/raster`;

    updateRemoteSensingProgress(
      65,
      "Downloading temporal NDVI change raster..."
    );

    const response = await fetch(url, {
      headers: { Accept: "image/tiff" },
    });

    if (!response.ok) {
      throw new Error(
        `Temporal NDVI raster request failed: ${response.status}`
      );
    }

    if (!response.body) {
      throw new Error("Temporal raster streaming is unavailable.");
    }

    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    const total = Number(response.headers.get("Content-Length")) || 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (sequence !== cropNdviTemporalChangeRenderSequence) {
        await reader.cancel();
        return;
      }

      chunks.push(value);
      received += value.length;

      if (total > 0) {
        const percent = 65 + Math.round(
          (received / total) * 20
        );

        updateRemoteSensingProgress(
          Math.min(85, percent),
          "Downloading temporal NDVI change raster..."
        );
      }
    }

    if (sequence !== cropNdviTemporalChangeRenderSequence) return;

    const buffer = new Uint8Array(received);
    let offset = 0;

    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    updateRemoteSensingProgress(
      88,
      "Decoding temporal NDVI change raster..."
    );

    const tiff = await GeoTIFF.fromArrayBuffer(buffer.buffer);
    if (sequence !== cropNdviTemporalChangeRenderSequence) return;

    const image = await tiff.getImage();
    const imageWidth = image.getWidth();
    const imageHeight = image.getHeight();

    const scale = Math.min(
      1,
      MAX_RENDER_SIZE / Math.max(imageWidth, imageHeight)
    );

    const renderWidth = Math.max(
      1,
      Math.round(imageWidth * scale)
    );

    const renderHeight = Math.max(
      1,
      Math.round(imageHeight * scale)
    );

    const raster = await image.readRasters({
      samples: [0],
      width: renderWidth,
      height: renderHeight,
      resampleMethod: "nearest",
      interleave: true,
    });

    if (sequence !== cropNdviTemporalChangeRenderSequence) return;

    const statistics = product.statistics || {};
    const min = Number(statistics.min);
    const max = Number(statistics.max);

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new Error("Temporal raster statistics are unavailable.");
    }

    const range = Math.max(Math.abs(min), Math.abs(max));

    const canvas = createRasterCanvas(
      raster,
      renderWidth,
      renderHeight,
      false,
      "NDVI_TEMPORAL_CHANGE",
      {
        diverging: true,
        min: -range,
        max: range,
      }
    );

    const bounds = getLatLngBoundsFromGeoTIFF(image);
    const imageUrl = canvas.toDataURL("image/png");

    if (sequence !== cropNdviTemporalChangeRenderSequence) return;

    clearCropNdviTemporalChangeLayer();

    cropNdviTemporalChangeLayer = L.imageOverlay(
      imageUrl,
      bounds,
      {
        opacity: cropNdviTemporalChangeOpacity,
        interactive: false,
        crossOrigin: false,
        className: "crop-ndvi-temporal-change-layer",
      }
    );

    if (cropNdviTemporalChangeLayerVisible) {
      cropNdviTemporalChangeLayer.addTo(map);
    }

    const controls = document.getElementById(
      "cropTemporalLayerControls"
    );

    if (controls) controls.hidden = false;

    const toggle = document.getElementById(
      "cropTemporalLayerToggle"
    );

    if (toggle) {
      toggle.checked = cropNdviTemporalChangeLayerVisible;
    }

    const opacity = document.getElementById(
      "cropTemporalOpacity"
    );

    if (opacity) {
      opacity.value = String(
        Math.round(cropNdviTemporalChangeOpacity * 100)
      );
    }

    setCropNdviTemporalChangeOpacity(
      cropNdviTemporalChangeOpacity
    );

    const legendMin = document.getElementById(
      "cropTemporalLegendMin"
    );

    const legendMax = document.getElementById(
      "cropTemporalLegendMax"
    );

    if (legendMin) legendMin.textContent = (-range).toFixed(3);
    if (legendMax) legendMax.textContent = range.toFixed(3);

    map.fitBounds(bounds, {
      padding: [20, 20],
      maxZoom: 13,
    });
  }

  async function generateTemporalCropComparison() {
    const button = document.getElementById(
      "generateCropTemporalComparison"
    );
    const content = document.getElementById(
      "cropTemporalComparisonOutput"
    );
    const baselineSelect = document.getElementById(
      "cropTemporalBaseline"
    );
    const comparisonSelect = document.getElementById(
      "cropTemporalComparison"
    );

    const baselineSceneId = baselineSelect?.value;
    const comparisonSceneId = comparisonSelect?.value;

    const baselineDate =
      baselineSelect?.selectedOptions[0]?.dataset.observationDate;

    const comparisonDate =
      comparisonSelect?.selectedOptions[0]?.dataset.observationDate;

    if (
      !baselineSceneId ||
      !comparisonSceneId ||
      !baselineDate ||
      !comparisonDate ||
      baselineDate >= comparisonDate
    ) {
      if (content) {
        content.textContent =
          "Select two distinct observations in chronological order.";
      }
      return;
    }

    const comparisonAlreadyLoaded =
      cropNdviTemporalComparison?.baselineSceneId === baselineSceneId &&
      cropNdviTemporalComparison?.comparisonSceneId === comparisonSceneId &&
      cropNdviTemporalComparison?.comparisonId &&
      Boolean(cropNdviTemporalChangeLayer);

    if (comparisonAlreadyLoaded) {
      if (content) {
        content.textContent =
          "This temporal NDVI comparison is already loaded.";
      }

      completeRemoteSensingProgress(
        "Existing temporal NDVI comparison is already loaded."
      );
      return;
    }

    button.disabled = true;
    setRemoteSensingBusy(true);
    setApplicationProcessingLock(true);
    updateApplicationProcessingLockMessage(
      "Checking for existing temporal NDVI evidence..."
    );

    resetRemoteSensingProgress(
      "Checking saved temporal NDVI evidence..."
    );

    if (content) {
      content.textContent =
        "Checking whether this temporal comparison already exists...";
    }

    try {
      const response = await fetch(
        "/api/remote-sensing/crop-interpretation/temporal",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            indexCode: "NDVI",
            observations: [
              {
                observationDate: baselineDate,
                sceneId: baselineSceneId,
              },
              {
                observationDate: comparisonDate,
                sceneId: comparisonSceneId,
              },
            ],
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
          "Temporal NDVI comparison request failed."
        );
      }

      const product =
        result.cropConditionProducts?.temporalChange;

      if (!product?.comparisonId) {
        throw new Error(
          "The temporal comparison response contains no comparison ID."
        );
      }
      product.baselineSceneId = baselineSceneId;
      product.comparisonSceneId = comparisonSceneId;

      if (content) {
        content.replaceChildren();

        const heading = document.createElement("h4");
        heading.textContent = "Temporal NDVI Change Evidence";
        content.appendChild(heading);

        const dates = document.createElement("p");
        dates.textContent =
          `Baseline: ${baselineDate} | Comparison: ${comparisonDate}`;
        content.appendChild(dates);
        const cacheStatus = document.createElement("p");
        cacheStatus.textContent =
          product.cacheStatus === "reused"
            ? "Existing temporal NDVI evidence found. Reusing saved raster and evidence."
            : "New temporal NDVI evidence generated and saved.";
        content.appendChild(cacheStatus);

        const method = document.createElement("p");
        method.textContent =
          `Method: ${product.method} | Calibration: ${product.calibrationStatus}`;
        content.appendChild(method);

        const statistics = product.statistics || {};
        const summary = document.createElement("p");
        summary.textContent =
          `Valid coverage: ${Number(statistics.validCoveragePercent).toFixed(2)}% | ` +
          `Minimum: ${Number(statistics.min).toFixed(4)} | ` +
          `Maximum: ${Number(statistics.max).toFixed(4)} | ` +
          `Mean: ${Number(statistics.mean).toFixed(4)}`;
        content.appendChild(summary);

        const note = document.createElement("p");
        note.textContent =
          "Positive values indicate an increase in NDVI; negative values indicate a decrease. Evidence only — not a calibrated crop diagnosis.";
        content.appendChild(note);
      }

      const comparisonAlreadyLoaded =
      cropNdviTemporalComparison?.comparisonId ===
        product.comparisonId &&
      Boolean(cropNdviTemporalChangeLayer);

    cropNdviTemporalComparison = product;

    if (!comparisonAlreadyLoaded) {
      await renderCropNdviTemporalChange(product);
    }

      completeRemoteSensingProgress(
        product.cacheStatus === "reused"
          ? "Existing temporal NDVI evidence loaded."
          : "New temporal NDVI evidence generated and loaded."
      );

    } catch (error) {
      if (content) {
        content.textContent =
          error.message ||
          "Unable to generate temporal NDVI comparison.";
      }
    } finally {
      button.disabled = false;
      setRemoteSensingBusy(false);
      setApplicationProcessingLock(false);
      hideRemoteSensingProgress();
    }
  }
  function initializeRemoteSensingTool() {
    const cropInterpretationButton = document.getElementById(
      "generateCropInterpretation"
    );
    if (cropInterpretationButton) {
      cropInterpretationButton.addEventListener(
        "click",
        generateCropInterpretation
      );
    }
    const {
      close,
      layerToggle,
      opacity
    } = getElements();

    const bareSoilFrequencyButton = document.getElementById(
      "remoteSensingBareSoilFrequencyButton"
    );

    if (bareSoilFrequencyButton) {
      bareSoilFrequencyButton.addEventListener(
        "click",
        loadBareSoilFrequency
      );
    }

    const classificationButton = document.getElementById(
      "remoteSensingSoilVegetationButton"
    );
    if (classificationButton) {
      classificationButton.addEventListener(
        "click",
        loadSoilVegetationClassification
      );
    }
    const classificationTab = document.getElementById(
      "remoteSensingClassificationTab"
    );
    const frequencyTab = document.getElementById(
      "remoteSensingFrequencyTab"
    );
    const classificationPanel = document.getElementById(
      "remoteSensingClassificationPanel"
    );
    const frequencyPanel = document.getElementById(
      "remoteSensingFrequencyPanel"
    );
        const temporalComparisonButton = document.getElementById(
      "generateCropTemporalComparison"
    );

    if (temporalComparisonButton) {
      temporalComparisonButton.addEventListener(
        "click",
        generateTemporalCropComparison
      );
    }    

    function selectAnalysisTab(showFrequency) {
      if (
        !classificationTab ||
        !frequencyTab ||
        !classificationPanel ||
        !frequencyPanel
      ) return;

      classificationPanel.hidden = showFrequency;
      frequencyPanel.hidden = !showFrequency;

      classificationTab.classList.toggle("is-active", !showFrequency);
      frequencyTab.classList.toggle("is-active", showFrequency);

      classificationTab.setAttribute("aria-selected", String(!showFrequency));
      frequencyTab.setAttribute("aria-selected", String(showFrequency));
    }

    classificationTab?.addEventListener(
      "click",
      () => selectAnalysisTab(false)
    );
    frequencyTab?.addEventListener(
      "click",
      () => selectAnalysisTab(true)
    );

    selectAnalysisTab(false);
    if (close) {
      close.addEventListener(
        "click",
        closeRemoteSensingTool
      );
    }

    if (layerToggle) {
      layerToggle.addEventListener(
        "change",
        () => {
          setRemoteSensingLayerVisibility(
            layerToggle.checked
          );
        }
      );
    }

    if (opacity) {
      opacity.addEventListener(
        "input",
        () => {
          setRemoteSensingOpacity(
            Number(
              opacity.value
            ) / 100
          );
        }
      );
    }

    updateRemoteSensingLayerControls(
      false
    );

    hideRemoteSensingProgress();
    bindSentinel2AcquisitionControls();
    bindCropNdviControls();
    loadSentinel2ProcessedDates();
  }

  window.openRemoteSensingTool =
    openRemoteSensingTool;

  window.closeRemoteSensingTool =
    closeRemoteSensingTool;

  window.loadRemoteSensingCatalog =
    loadRemoteSensingCatalog;

  window.selectRemoteSensingIndex =
    selectRemoteSensingIndex;

  window.loadRemoteSensingMap =
    loadRemoteSensingMap;

  window.openCropIntelligenceTool =
    openCropIntelligenceTool;

  window.initializeRemoteSensingTool =
    initializeRemoteSensingTool;
})();
