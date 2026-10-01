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
      available: true,
      mapTool: true,
    },

    crop: {
      label: "Crop",
      available: true,
      mapTool: true,
    },

    trends: {
      label: "Trends",
      available: true,
      mapTool: true,
    },

    risk: {
      label: "Risk",
      available: true,
      mapTool: true,
    },
  };

  let activeWorkspace = "map";

  function getWorkspaceElements() {
    return {
      shell: document.querySelector(".agri-workspace"),
      map: document.querySelector(".agri-map-workspace"),
      context: document.querySelector(".agri-context-workspace"),
      contextHeader: document.querySelector(".agri-context-header"),
      analysis: document.querySelector(".analysis-workspace"),
      analyzeContent: document.querySelector(
        ".workspace-analyze-content"
      ),
      reportContent: document.querySelector(
        ".workspace-report-content"
      ),
      navigation: document.querySelector(
        ".agri-workspace-nav"
      ),
    };
  }

  function setActiveNavigationItem(workspace) {
    const navigation = document.querySelector(
      ".agri-workspace-nav"
    );

    if (!navigation) {
      return;
    }

    navigation
      .querySelectorAll(
        "button.agri-workspace-nav-item"
      )
      .forEach((item) => {
        const isActive =
          item.dataset.workspace === workspace;

        item.classList.toggle(
          "active",
          isActive
        );

        item.setAttribute(
          "aria-current",
          isActive ? "page" : "false"
        );
      });
  }

  function showWorkspace(workspace) {
    const definition =
      WORKSPACES[workspace];

    if (
      !definition ||
      !definition.available
    ) {
      console.warn(
        `Workspace "${workspace}" is not available in the current AgriNexus build.`
      );

      return false;
    }

    /*
     * Map-tool workspaces remain on the primary
     * GIS map. Their domain-specific controls are
     * handled by their own presentation modules.
     */
    if (definition.mapTool) {
      const mapResult =
        showWorkspace("map");

      if (!mapResult) {
        return false;
      }

      const elements =
        getWorkspaceElements();

      if (
        !elements.context ||
        !elements.contextHeader
      ) {
        console.error(
          "Context workspace is missing."
        );

        return false;
      }

      /*
       * Map-tool workspaces own the right rail.
       * Hide the normal context presentation and
       * expose only the active domain tool.
       */
      elements.context.classList.remove(
        "workspace-hidden"
      );

      elements.contextHeader.classList.add(
        "workspace-hidden"
      );

      const analysisPanels =
        elements.context.querySelectorAll(
          ".analysis-panel"
        );

      analysisPanels.forEach(
        (panel) => {
          panel.classList.add(
            "workspace-hidden"
          );
        }
      );

      const intelligencePanels =
        elements.context.querySelectorAll(
          ".agri-intelligence-panel"
        );

      intelligencePanels.forEach(
        (panel) => {
          panel.classList.add(
            "is-hidden"
          );
        }
      );

      activeWorkspace =
        workspace;

      setActiveNavigationItem(
        workspace
      );

      document.body.dataset.activeWorkspace =
        workspace;

      if (
        workspace === "remote" &&
        typeof window.openRemoteSensingTool ===
          "function"
      ) {
        window.openRemoteSensingTool();
      }

      return true;
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

    const elements =
      getWorkspaceElements();

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

    const isMap =
      workspace === "map";

    const isAnalyze =
      workspace === "analyze";

    const isReport =
      workspace === "report";

    elements.contextHeader.classList.remove(
      "workspace-hidden"
    );

    const intelligencePanels =
      elements.context.querySelectorAll(
        ".agri-intelligence-panel"
      );

    intelligencePanels.forEach(
      (panel) => {
        panel.classList.add(
          "is-hidden"
        );
      }
    );

    const analysisPanels =
      elements.context.querySelectorAll(
        ".analysis-panel"
      );

    analysisPanels.forEach(
      (panel) => {
        panel.classList.remove(
          "workspace-hidden"
        );
      }
    );

    elements.map.classList.remove(
      "workspace-hidden"
    );

    elements.context.classList.toggle(
      "workspace-hidden",
      !isMap &&
        !isAnalyze &&
        !isReport
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

    activeWorkspace =
      workspace;

    setActiveNavigationItem(
      workspace
    );

    document.body.dataset.activeWorkspace =
      workspace;

    return true;
  }

  function handleNavigationClick(event) {
    const button =
      event.target.closest(
        ".agri-workspace-nav-item"
      );

    if (!button) {
      return;
    }

    const workspace =
      button.dataset.workspace;

    if (
      workspace ===
      "historical-report"
    ) {
      event.preventDefault();

      const selectedSample =
        typeof window.getSelectedSoilSample ===
        "function"
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

      if (
        !historicalWorkspace ||
        !historicalFrame
      ) {
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
        encodeURIComponent(
          String(sampleId)
        );

      historicalFrame.src =
        historicalUrl;

      historicalWorkspace.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      return;
    }

    if (
      !workspace ||
      !WORKSPACES[workspace]
    ) {
      return;
    }

    showWorkspace(
      workspace
    );
  }

  function initializeWorkspaceNavigation() {
    const navigation =
      document.querySelector(
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

  window.showAgriNexusWorkspace =
    showWorkspace;
})();
