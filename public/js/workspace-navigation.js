/* ============================================================
   AGRINEXUS GIS  WORKSPACE NAVIGATION
   Phase 11.5.3
   Controls workspace-level navigation only.
   Does not own scientific analysis or panel behavior.
   ============================================================ */

(function () {
  "use strict";

  const WORKSPACES = {
    map: {
      label: "Map",
      available: true,
    },

    analyze: {
      label: "Analyze",
      available: true,
    },

    report: {
      label: "Report",
      available: true,
    },

    remote: {
      label: "Remote",
      available: false,
    },

    crop: {
      label: "Crop",
      available: false,
    },

    trends: {
      label: "Trends",
      available: false,
    },

    risk: {
      label: "Risk",
      available: false,
    },
  };

  let activeWorkspace = "map";

  function getWorkspaceElements() {
    return {
      shell: document.querySelector(".agri-workspace"),
      map: document.querySelector(".agri-map-workspace"),
      context: document.querySelector(".agri-context-workspace"),
      analysis: document.querySelector(".analysis-workspace"),
      analyzeContent: document.querySelector(".workspace-analyze-content"),
      reportContent: document.querySelector(".workspace-report-content"),
      navigation: document.querySelector(".agri-workspace-nav"),
    };
  }

  function setActiveNavigationItem(workspace) {
    const navigation = document.querySelector(".agri-workspace-nav");

    if (!navigation) {
      return;
    }

    navigation
      .querySelectorAll("button.agri-workspace-nav-item")
      .forEach((item) => {
        const isActive = item.dataset.workspace === workspace;

        item.classList.toggle("active", isActive);
        item.setAttribute(
          "aria-current",
          isActive ? "page" : "false"
        );
      });
  }

  function showWorkspace(workspace) {
    const definition = WORKSPACES[workspace];

    if (!definition || !definition.available) {
      console.warn(
        `Workspace "${workspace}" is not available in the current AgriNexus build.`
      );
      return false;
    }

    const historicalWorkspace =
      document.getElementById(
        "historicalReportWorkspace"
      );

    if (historicalWorkspace) {
      historicalWorkspace.classList.add(
        "is-hidden"
      );
    }
    const elements = getWorkspaceElements();

    if (
      !elements.map ||
      !elements.analysis ||
      !elements.context ||
      !elements.analyzeContent ||
      !elements.reportContent
    ) {
      console.error(
        "Required AgriNexus workspace elements are missing."
      );
      return false;
    }

    const isMap = workspace === "map";
    const isAnalyze = workspace === "analyze";
    const isReport = workspace === "report";

    elements.map.classList.toggle(
      "workspace-hidden",
      false
    );

    elements.context.classList.toggle(
      "workspace-hidden",
      !isMap && !isAnalyze && !isReport
    );

    elements.analysis.classList.toggle(
      "workspace-hidden",
      isMap
    );

    elements.analyzeContent.classList.toggle(
      "workspace-hidden",
      !isAnalyze
    );

    elements.reportContent.classList.toggle(
      "workspace-hidden",
      !isReport
    );

    if (isReport) {
      elements.analysis.classList.add(
        "workspace-report-focus"
      );
    } else {
      elements.analysis.classList.remove(
        "workspace-report-focus"
      );
    }

    activeWorkspace = workspace;

    setActiveNavigationItem(workspace);

    document.body.dataset.activeWorkspace = workspace;

    return true;
  }

  function handleNavigationClick(event) {
    const button = event.target.closest(
      ".agri-workspace-nav-item"
    );

    if (!button) {
      return;
    }

    const workspace = button.dataset.workspace;
    if (workspace === "historical-report") {
      event.preventDefault();

      const selectedSample =
        typeof window.getSelectedSoilSample === "function"
          ? window.getSelectedSoilSample()
          : null;

      const sampleId =
        selectedSample?.id ??
        selectedSample?.sampleId ??
        null;

      if (!sampleId) {
        console.warn(
          "Historical Report requires a selected soil sample."
        );

        return;
      }

      if (
        typeof window.saveAgriNexusWorkspaceState ===
        "function"
      ) {
        window.saveAgriNexusWorkspaceState();
      }

      const historicalWorkspace =
        document.getElementById(
          "historicalReportWorkspace"
        );

      const historicalFrame =
        document.getElementById(
          "historicalReportFrame"
        );

      if (!historicalWorkspace || !historicalFrame) {
        console.error(
          "Historical Report workspace elements are missing."
        );

        return;
      }

      historicalWorkspace.classList.remove(
        "is-hidden"
      );

      const historicalUrl =
        "/historical-analysis.html?sampleId=" +
        encodeURIComponent(String(sampleId));

      historicalFrame.src = historicalUrl;

      historicalWorkspace.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      return;
    }

    if (!workspace || !WORKSPACES[workspace]) {
      return;
    }

    showWorkspace(workspace);
  }

  function initializeWorkspaceNavigation() {
    const navigation = document.querySelector(
      ".agri-workspace-nav"
    );

    if (!navigation) {
      console.error(
        "AgriNexus workspace navigation was not found."
      );
      return false;
    }

    navigation.addEventListener(
      "click",
      handleNavigationClick
    );

    navigation
      .querySelectorAll("button.agri-workspace-nav-item")
      .forEach((button) => {
        const workspace = button.dataset.workspace;
        const definition = WORKSPACES[workspace];

        if (!definition || !definition.available) {
          button.classList.add("is-reserved");
          button.setAttribute(
            "aria-disabled",
            "true"
          );
          button.title =
            `${definition?.label || workspace} workspace reserved for a later phase`;
        }
      });

    showWorkspace("map");

    console.log(
      "Workspace navigation initialized.",
      Object.keys(WORKSPACES)
    );

    return true;
  }

  function getActiveWorkspace() {
    return activeWorkspace;
  }

  window.initializeWorkspaceNavigation =
    initializeWorkspaceNavigation;

  window.getActiveWorkspace =
    getActiveWorkspace;
})();
