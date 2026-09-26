// ============================================================
// server/server.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.6 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Historical GIS Context REST API
//
// ============================================================

const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

// ============================================================
// LOAD ENVIRONMENT FIRST
// ============================================================

dotenv.config();

// ============================================================
// DATABASE
// ============================================================

const { testDatabaseConnection } = require("./config/db");

// ============================================================
// ROUTES
// ============================================================

const soilRoutes = require("./routes/soilRoutes");
const soilAnalysisRoutes = require("./routes/soilAnalysisRoutes");
const temporalAnalysisRoutes = require("./routes/temporalAnalysisRoutes");
const interpolationRoutes = require("./routes/interpolationRoutes");
const fertilityZoningRoutes = require("./routes/fertilityZoningRoutes");
const spatialAnalysisRoutes = require("./routes/spatialAnalysisRoutes");
const historicalContextRoutes = require("./routes/historicalContextRoutes");
const historicalComparisonRoutes = require("./routes/historicalComparisonRoutes");
const historicalCandidateRoutes = require("./routes/historicalCandidateRoutes");
const analyticalReportRoutes = require("./routes/analyticalReportRoutes");
const rasterIndexWorkflowRoutes = require("./routes/rasterIndexWorkflowRoutes");
const rasterIndexBatchWorkflowRoutes =
require("./routes/rasterIndexBatchWorkflowRoutes");

// ============================================================
// APPLICATION
// ============================================================

const app = express();
const PORT = Number(process.env.PORT || 3000);

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

// ============================================================
// STATIC FRONTEND
// ============================================================

app.use(express.static(path.join(__dirname, "..", "public")));

// ============================================================
// SOIL SAMPLE API
// ============================================================

app.use("/api/soil-samples", soilRoutes);

// ============================================================
// SOIL ANALYSIS API
// ============================================================

app.use("/api/soil-analysis/spatial", spatialAnalysisRoutes);

app.use(
  "/api/soil-analysis/historical-context",
  historicalContextRoutes,
);

app.use(
  "/api/soil-analysis/historical",
  historicalComparisonRoutes,
);

app.use(
  "/api/soil-analysis/historical/candidates",
  historicalCandidateRoutes,
);

app.use("/api/soil-analysis", soilAnalysisRoutes);
app.use("/api/soil-analysis", temporalAnalysisRoutes);

// ============================================================
// SOIL INTERPOLATION API
// ============================================================

app.use("/api/soil-interpolation", interpolationRoutes);

// ============================================================
// SOIL FERTILITY ZONING API
// ============================================================

app.use(
  "/api/soil-fertility-zoning",
  fertilityZoningRoutes,
);

// ============================================================
// INTEGRATED ANALYTICAL GIS REPORTING API
// ============================================================

app.use(
  "/api/reports",
  analyticalReportRoutes,
);

// ============================================================
// REMOTE SENSING RASTER INDEX WORKFLOW API
// ============================================================

app.use(
  "/api/remote-sensing/raster",
  rasterIndexWorkflowRoutes,
);

app.use(
  "/api/remote-sensing/raster",
  rasterIndexBatchWorkflowRoutes,
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", async (req, res) => {
  res.json({
    success: true,
    application: "AgriNexus GIS",
    status: "running",
  });
});

// ============================================================
// API 404 HANDLER
// ============================================================

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
    path: req.originalUrl,
  });
});

// ============================================================
// START SERVER
// ============================================================

async function startServer() {
  console.log("");
  console.log("========================================");
  console.log(" AGRINEXUS GIS");
  console.log("========================================");

  try {
    console.log("Environment loaded");

    await testDatabaseConnection();

    const server = app.listen(PORT, () => {
      console.log("");
      console.log("ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ GIS Server running on port " + PORT);
      console.log("");
      console.log("Open: http://localhost:" + PORT);
      console.log("");
      console.log("Soil Sample API: /api/soil-samples");
      console.log("Soil Analysis API: /api/soil-analysis");
      console.log(
        "Spatial Analysis API: /api/soil-analysis/spatial",
      );
      console.log(
        "Historical Context API: /api/soil-analysis/historical-context",
      );
      console.log(
        "Historical Comparison API: /api/soil-analysis/historical",
      );
      console.log(
        "Historical Candidate API: /api/soil-analysis/historical/candidates",
      );
      console.log(
        "Soil Interpolation API: /api/soil-interpolation",
      );
      console.log(
        "Soil Fertility Zoning API: /api/soil-fertility-zoning",
      );
      console.log("");
      console.log("========================================");
    });

    console.log(
      "Integrated Analytical GIS Reporting API: /api/reports/integrated-analytical-gis",
    );

    // --------------------------------------------------------
    // Graceful shutdown
    // --------------------------------------------------------

    const shutdown = async (signal) => {
      console.log("");
      console.log(`${signal} received. Shutting down server...`);

      server.close(() => {
        console.log("HTTP server stopped.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("");
    console.error("========================================");
    console.error(" SERVER STARTUP FAILED");
    console.error("========================================");
    console.error(error);
    process.exit(1);
  }
}

// ============================================================
// MODULE EXPORTS
// ============================================================

module.exports = {
  app,
  startServer,
};

// ============================================================
// START
// ============================================================

if (require.main === module) {
  startServer();
}
