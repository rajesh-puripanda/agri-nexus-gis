# AgriNexus GIS

## Master Architecture & Development Guide

**Version:** 1.0 — Foundation Architecture
**Status:** Phase 0 — Architecture & Foundation in Progress
**Concept:** Integrated Agricultural Intelligence through GIS
**Repository:** `agri-nexus-gis`

---

# 1. Purpose of This Document

This document is the **architectural source of truth for AgriNexus GIS**.

It defines:

* Product identity
* Architectural principles
* Major platform domains
* Frontend architecture
* Backend architecture
* Data architecture
* Scientific processing architecture
* API conventions
* Analytical result contracts
* Testing architecture
* Development roadmap
* Migration strategy
* Versioning principles
* Git/checkpoint strategy
* Architecture decisions and changes

All major architectural decisions made during development should be recorded here.

This document is separate from the existing:

`Soil Analysis GIS.md`

The existing Soil Analysis GIS document remains the working documentation for the mature Soil Analysis GIS subsystem.

**Remote-sensing architecture and the broader AgriNexus architecture belong in this document, not in `Soil Analysis GIS.md`.**

---

# 2. Product Identity

## 2.1 Official Product Name

**AgriNexus GIS**

## 2.2 Official Descriptive Name

**AgriNexus GIS — Integrated Agricultural Intelligence through GIS**

## 2.3 Core Concept

**Observation → Analysis → Intelligence**

## 2.4 Architectural Motto

**AgriNexus GIS**

**Observe → Analyze → Understand → Act**

Scientific foundation:

**Data → Science → Spatial Intelligence → Agricultural Intelligence**

## 2.5 Primary Purpose

AgriNexus GIS is an integrated agricultural intelligence platform combining:

* Soil intelligence
* Spatial analysis
* Geospatial interpolation
* Soil fertility assessment
* Historical soil comparison
* Remote sensing
* Vegetation indices
* Water/moisture indices
* Crop-condition monitoring
* Temporal analysis
* Crop intelligence
* Agricultural zoning
* Agricultural risk analysis
* Integrated GIS reporting

The platform evolves from the existing **Soil Analysis GIS** into a broader **Agricultural Intelligence GIS** without compromising the scientific integrity of the existing soil-analysis system.

---

# 3. Architectural Principles

## 3.1 Scientific Authority

Scientific calculations and classifications belong in the backend.

The frontend is responsible for:

* Visualization
* Interaction
* Presentation
* Map rendering
* Legends
* Charts
* Tables
* Controls
* Reports

The browser must never become the scientific authority.

## 3.2 Backend Responsibilities

The backend is responsible for:

* Scientific calculations
* Classification
* Validation
* Normalization
* Spatial analysis
* Interpolation
* Index calculations
* Thresholds
* Statistical calculations
* Historical comparison
* Suitability assessment
* Zoning
* Aggregation
* Reporting
* API contracts

## 3.3 Frontend Responsibilities

The frontend is responsible for:

* Map rendering
* Layer visibility
* Legends
* Controls
* Charts
* Tables
* Popups
* Spatial interaction
* User workflow
* Report presentation

## 3.4 Scientific Processing Flow

All scientific processing should follow:

```text
Input
  │
  ▼
Validation
  │
  ▼
Normalization
  │
  ▼
Scientific Calculation
  │
  ▼
Classification
  │
  ▼
Spatial Processing
  │
  ▼
Analytical Result
  │
  ▼
Visualization / Reporting
```

Every major scientific service should have:

* Explicit input contract
* Explicit output contract
* Validation
* Unit handling
* Error handling
* Test coverage
* Version information where appropriate

---

# 4. Observation → Analysis → Intelligence

AgriNexus distinguishes three levels of information.

## 4.1 Observation

Raw or directly measured information.

Examples:

```text
Soil pH = 6.8
NDVI = 0.72
Soil Nitrogen = 215 kg/ha
```

## 4.2 Analysis

A scientifically derived result.

Examples:

```text
pH classification = Neutral
NDVI classification = Vegetation condition class
```

## 4.3 Intelligence

An agricultural interpretation derived from one or more analyses.

Examples:

```text
Crop suitability
Agricultural risk
Management zone
```

This distinction should be maintained throughout:

* API design
* Services
* Reports
* UI
* Database structures
* Scientific contracts

---

# 5. Major Platform Domains

AgriNexus GIS is organized into major intelligence domains.

```text
AgriNexus GIS
│
├── Soil Intelligence
├── Spatial Intelligence
├── Remote Sensing
├── Spectral Intelligence
├── Temporal Intelligence
├── Crop Intelligence
├── Agricultural Zoning
├── Agricultural Risk
└── Integrated Reporting
```

---

# 6. Domain A — Soil Intelligence

The existing Soil Analysis GIS becomes the foundation of AgriNexus Soil Intelligence.

## Components

1. Soil sample management
2. Soil parameter analysis
3. Scientific classification
4. Thematic mapping
5. Spatial queries
6. Spatial analysis
7. IDW interpolation
8. Kriging interpolation
9. Fertility zoning
10. Historical comparison
11. Historical context
12. Soil-change analysis
13. Soil analytical reporting

## Initial Parameters

* pH
* Nitrogen
* Phosphorus
* Potassium
* Organic Carbon
* Electrical Conductivity

## Future Parameters

* Sulphur
* Zinc
* Iron
* Manganese
* Copper
* Boron
* Calcium
* Magnesium
* CEC
* Salinity indicators
* Sodicity indicators

Existing mature functionality should be preserved and migrated incrementally rather than rewritten unnecessarily.

---

# 7. Domain B — Remote Sensing Intelligence

Remote sensing is the second major scientific subsystem.

## Spectral Index Framework

AgriNexus should use a common index engine rather than implementing each index as an isolated subsystem.

### Vegetation

* NDVI — Normalized Difference Vegetation Index
* EVI — Enhanced Vegetation Index
* SAVI — Soil Adjusted Vegetation Index
* GNDVI — Green Normalized Difference Vegetation Index
* ARVI — Atmospherically Resistant Vegetation Index

### Water / Moisture

* NDWI — Normalized Difference Water Index
* NDMI — Normalized Difference Moisture Index

### Future Indices

* MSI
* NDRE
* NBR
* NDSI
* LAI-derived products

---

# 8. Spectral Index Architecture

Each spectral index should be represented as a scientific definition.

```text
Index
 │
 ├── Code
 ├── Name
 ├── Description
 ├── Formula
 ├── Required Bands
 ├── Sensor Compatibility
 ├── Valid Range
 ├── Interpretation
 ├── Classification Rules
 └── Visualization Rules
```

Example:

```text
NDVI
 │
 ├── Formula: (NIR - Red) / (NIR + Red)
 ├── Inputs: NIR, Red
 ├── Output: continuous raster/value
 ├── Classification: configurable
 └── Interpretation: vegetation condition
```

The index engine calculates the scientific result.

The visualization layer only presents the result.

---

# 9. Domain C — Agricultural Intelligence

This domain converts soil and remote-sensing information into agricultural information.

## Crop Suitability

Potential inputs:

* Crop requirement profiles
* Soil compatibility
* Moisture conditions
* pH compatibility
* Nutrient suitability
* Salinity constraints
* Vegetation condition
* Historical performance

## Crop Condition

Potential analyses:

* Vegetation health
* Moisture stress
* Water availability
* Temporal change
* Spatial variability

## Agricultural Risk

Potential future indicators:

* Drought stress
* Water stress
* Soil salinity risk
* Nutrient deficiency risk
* Vegetation decline
* Flood/waterlogging indicators

---

# 10. Domain D — Spatial Intelligence

Spatial Intelligence provides reusable GIS capabilities to all domains.

## Core Capabilities

* Point analysis
* Radius queries
* Bounding-box queries
* Polygon queries
* Spatial intersections
* Nearest-feature analysis
* Distance calculations
* Spatial aggregation
* Zonal statistics
* Spatial clustering
* Hotspot analysis
* Buffer analysis
* Temporal-spatial comparison

Spatial functionality should become reusable platform infrastructure rather than being duplicated inside individual scientific modules.

---

# 11. Domain E — Temporal Intelligence

Agriculture is inherently temporal.

AgriNexus treats time as a first-class analytical dimension.

```text
Location
   +
Parameter
   +
Date / Season
   +
Stage
   =
Agricultural Condition
```

Examples of agricultural stages:

* Pre-sowing
* Sowing
* Vegetative growth
* Flowering
* Grain filling
* Harvest
* Post-harvest

Historical soil datasets and satellite observations should progressively use the same temporal framework.

---

# 12. Domain F — Agricultural Zoning

Zoning converts continuous analytical results into meaningful spatial regions.

## Soil

* Fertility zones
* pH zones
* Salinity zones
* Nutrient zones
* Organic-carbon zones

## Vegetation

* Vegetation-health zones
* Crop-condition zones
* Stress zones

## Water

* Moisture zones
* Water-availability zones

## Integrated

* Agricultural suitability zones
* Crop suitability zones
* Agricultural risk zones
* Management zones

---

# 13. Domain G — Integrated Analytical Reporting

Reporting is a platform-level capability.

Reports should synthesize analytical results rather than simply dump API responses.

```text
Sample Information
        +
Soil Analysis
        +
Thematic Analysis
        +
Spatial Analysis
        +
Interpolation
        +
Fertility Zoning
        +
Historical Comparison
        +
Remote Sensing
        +
Agricultural Intelligence
        =
Integrated Agricultural Report
```

The existing Phase 10.6 reporting architecture is the initial foundation for this capability.

---

# 14. Data Architecture

AgriNexus uses a layered data model.

## 14.1 Soil Observations

Potential fields:

* Sample ID
* Latitude
* Longitude
* Collection date
* Depth
* Location
* Parameter
* Measurement
* Unit
* Source

## 14.2 Remote Sensing

Potential fields:

* Acquisition date
* Sensor
* Scene
* Band
* Pixel/raster information
* Cloud information
* Processing level
* Spatial extent
* Data source
* Processing metadata

## 14.3 Agricultural Reference Data

Potential datasets:

* Administrative boundaries
* Mandals
* Villages
* Fields
* Crop boundaries
* Land-use classes
* Soil types
* Agro-climatic zones

---

# 15. Common Analytical Result Contract

AgriNexus should progressively standardize analytical responses.

Conceptual structure:

```text
{
    analysisType,
    analysisVersion,
    timestamp,
    inputContext,
    spatialContext,
    parameters,
    results,
    classification,
    statistics,
    metadata
}
```

The exact contract for each scientific domain will be established through controlled implementation phases.

---

# 16. API Architecture

The target API architecture is domain-oriented.

```text
/api/soil/*
/api/spatial/*
/api/interpolation/*
/api/historical/*
/api/fertility/*
/api/remote-sensing/*
/api/indices/*
/api/crops/*
/api/zoning/*
/api/reports/*
```

These routes are architectural targets.

Existing working routes should **not be restructured prematurely**.

New routes should be introduced incrementally, with compatibility preserved where appropriate.

---

# 17. Service Architecture

Recommended long-term organization:

```text
server/
│
├── controllers/
├── routes/
├── services/
│   ├── soil/
│   ├── spatial/
│   ├── interpolation/
│   ├── historical/
│   ├── fertility/
│   ├── remoteSensing/
│   ├── indices/
│   ├── crop/
│   ├── zoning/
│   └── reporting/
│
├── repositories/
├── validators/
├── models/
├── utils/
└── tests/
```

Existing working services do not need to be physically moved immediately.

Architecture should evolve through controlled refactoring.

---

# 18. Frontend Architecture

The frontend is the GIS workspace and presentation layer.

## 18.1 Architectural Structure

```text
AgriNexus GIS Frontend
│
├── GIS Workspace
│   ├── Map
│   ├── Layer Management
│   ├── Spatial Interaction
│   └── Map Controls
│
├── Analytical Workspace
│   ├── Soil Intelligence
│   ├── Spatial Intelligence
│   ├── Interpolation
│   ├── Historical / Temporal
│   ├── Remote Sensing
│   ├── Spectral Indices
│   ├── Crop Intelligence
│   └── Agricultural Zoning
│
├── Reporting Workspace
│   ├── Integrated Reports
│   ├── Tables
│   ├── Charts
│   ├── Statistics
│   └── Export
│
└── Common UI
    ├── Notifications
    ├── Loading / Progress
    ├── Error Handling
    ├── Legends
    └── Metadata / Information
```

## 18.2 Frontend Architectural Rule

The frontend must not independently reproduce scientific calculations.

The intended flow is:

```text
Frontend
   │
   ▼
API
   │
   ▼
Scientific Service
   │
   ▼
Repository / Data Source
```

Never:

```text
Frontend
   │
   ▼
Scientific Formula
```

## 18.3 Existing Frontend Preservation

The existing working Leaflet interface should be preserved during the architectural transition.

The initial Phase 0 work is architectural definition, not a complete UI rewrite.

Existing functionality should be mapped into the target architecture before files are moved or renamed.

---

# 19. UI Redesign Principle

The existing map UI overlap problem should not be solved by continually adding controls to the map.

The eventual AgriNexus workspace should provide a structured layout containing:

* GIS workspace
* Analysis panels
* Layer management
* Contextual legends
* Reporting workspace
* Better navigation
* Analysis history

The major workspace redesign is deliberately a **late-stage activity**.

Target:

**Phase 11 — AgriNexus Workspace**

Until then, working UI functionality should be preserved and improved only where necessary for active scientific development.

---

# 20. Technology Foundation

## Frontend

* HTML
* CSS
* JavaScript
* Leaflet

## Backend

* Node.js
* Express.js

## Database

* MySQL

## Testing

* Node-based automated test suites

## Version Control

* Git
* GitHub

---

# 21. Remote-Sensing Processing Evolution

Remote sensing will be introduced progressively.

## Stage 1

Support externally prepared raster/index data.

## Stage 2

Support band-based index calculation.

## Stage 3

Support raster processing workflows.

## Stage 4

Support temporal satellite analysis.

## Stage 5

Support automated agricultural monitoring.

This staged approach avoids prematurely making AgriNexus dependent on complex satellite-processing infrastructure.

---

# 22. Visualization Architecture

The map is the central GIS workspace.

Analytical layers are treated as scientific products.

Examples:

* Soil samples
* pH
* Nitrogen
* Phosphorus
* Potassium
* Organic Carbon
* EC
* IDW
* Kriging
* Fertility zones
* Historical change
* NDVI
* EVI
* NDWI
* NDMI
* SAVI
* GNDVI
* ARVI
* Crop suitability
* Agricultural risk

The frontend visualizes authoritative backend results.

---

# 23. Scientific Versioning

Software versioning must be distinguished from scientific algorithm versioning.

Example:

```text
AgriNexus GIS
Application Version: 1.0

NDVI Algorithm: 1.0
Kriging Algorithm: 1.0
Soil Classification: 1.0
Fertility Classification: 1.0
```

Changing a scientific threshold or algorithm must not silently alter historical analytical results.

---

# 24. Metadata Strategy

Every major analytical result should retain, where applicable:

* Source
* Date
* Spatial extent
* Parameter
* Units
* Algorithm
* Algorithm version
* Classification version
* Input dataset
* Processing timestamp

This provides scientific traceability.

---

# 25. Testing Architecture

Every scientific module should progressively have multiple testing levels.

```text
Unit Tests
    ↓
Service Tests
    ↓
Controller Tests
    ↓
API Tests
    ↓
Integration Tests
    ↓
Regression Tests
    ↓
Performance Tests
```

Scientific calculations require explicit edge-case testing.

Example for NDVI:

```text
NDVI
 ├── Normal vegetation
 ├── Bare soil
 ├── Water
 ├── Zero denominator
 ├── Invalid band
 ├── Missing data
 └── Boundary values
```

Existing mature test suites must be preserved during migration.

---

# 26. Git Development Strategy

Development proceeds through controlled checkpoints.

```text
Phase completed
      ↓
Tests pass
      ↓
Documentation updated
      ↓
Git checkpoint
      ↓
Tag / milestone where appropriate
      ↓
Next phase
```

The AgriNexus architecture document must be updated at appropriate architectural checkpoints.

The existing project development notes should continue to be maintained alongside implementation.

---

# 27. Definition of Done

A phase is not complete merely because the UI works.

A phase is complete when:

* Backend implemented
* Scientific logic validated
* API contract established
* Tests implemented
* Regression tests pass
* Error cases handled
* Frontend integrated where applicable
* Documentation updated
* Git checkpoint created

---

# 28. Migration Principle

The transition from Soil Analysis GIS to AgriNexus GIS follows:

**Extend first. Refactor second. Rename last.**

```text
Existing Soil Analysis GIS
          │
          ▼
Freeze working functionality
          │
          ▼
Establish AgriNexus architecture
          │
          ▼
Add new domain services
          │
          ▼
Integrate existing soil services
          │
          ▼
Gradually refactor
          │
          ▼
Rename / migrate where justified
```

This protects the substantial scientific and testing work already completed.

---

# 29. Phase 0 — Architecture & Foundation

Phase 0 establishes the architectural foundation before large-scale restructuring.

## 0.1 — AgriNexus Project Identity & Naming

Establish:

* Official product name
* Product terminology
* Domain terminology
* Scientific naming rules
* Naming conventions
* Versioning principles
* Migration principles

**Status: Complete**

## 0.2 — Master Repository Architecture

Establish:

* Repository structure
* Frontend architecture
* Backend architecture
* Domain boundaries
* Shared infrastructure boundaries
* Existing-to-target mapping

**Status: In Progress**

### 0.2 Frontend Principle

The current frontend is preserved while its architectural boundaries are documented.

The final UI redesign is deferred to Phase 11.

## 0.3 — Domain / Module Boundaries

Define:

* Soil Intelligence
* Spatial Intelligence
* Remote Sensing
* Spectral Intelligence
* Temporal Intelligence
* Crop Intelligence
* Agricultural Zoning
* Agricultural Risk
* Reporting

**Status: Planned**

## 0.4 — Data Architecture

Define:

* Soil observation model
* Remote-sensing model
* Raster metadata
* Reference datasets
* Temporal metadata
* Common analytical context

**Status: Planned**

## 0.5 — API Conventions

Define:

* Resource naming
* Request contracts
* Response contracts
* Error contracts
* Versioning
* Validation conventions

**Status: Planned**

## 0.6 — Scientific Result Contracts

Define common analytical result structures and scientific metadata.

**Status: Planned**

## 0.7 — Testing Architecture

Define:

* Unit testing
* Service testing
* Controller testing
* API testing
* Integration testing
* Regression testing
* Performance testing

**Status: Planned**

## 0.8 — Git / Checkpoint & Documentation Strategy

Define:

* Architectural checkpoints
* Development checkpoints
* Documentation requirements
* Commit conventions
* Milestones
* Tags

**Status: Planned**

## 0.9 — Soil Analysis GIS → AgriNexus Migration Plan

Map the mature Soil Analysis GIS implementation into the AgriNexus architecture without unnecessary rewrites.

**Status: Planned**

## 0.10 — Freeze Architecture v1.0

Review and freeze the Phase 0 architecture.

**Status: Planned**

---

# 30. Master Development Roadmap

## Phase 0 — Architecture & Foundation

**Status: Current**

Deliverable:

**AgriNexus Architecture v1.0**

---

## Phase 1 — Soil Intelligence Foundation

Migrate/freeze mature Soil Analysis GIS functionality.

Includes:

* Soil samples
* Soil parameters
* Classification
* Thematic maps
* Spatial query
* Spatial analysis
* IDW
* Kriging
* Fertility zoning
* Historical comparison
* Historical context

**Status:** Foundation substantially established

---

## Phase 2 — Integrated Analytical Reporting

Complete and stabilize integrated reporting.

Includes:

* Report aggregation
* Analytical sections
* Status contracts
* Spatial results
* Interpolation results
* Fertility results
* Historical context
* Overall summary

**Goal:** Complete backend-generated soil analytical report.

**Status:** Existing implementation substantially established; stabilization continues as required.

---

## Phase 3 — Remote-Sensing Foundation

Introduce the remote-sensing data model.

Includes:

* Sensor abstraction
* Band abstraction
* Raster metadata
* Acquisition date
* Spatial extent
* Data source
* Processing metadata

**Status:** Planned

---

## Phase 4 — Spectral Index Engine

Implement a reusable index framework.

Initial indices:

1. NDVI
2. EVI
3. NDWI
4. NDMI
5. SAVI
6. GNDVI
7. ARVI

Each index receives:

* Formula
* Band requirements
* Validation
* Calculation service
* Classification framework
* API
* Tests
* Map visualization
* Legend

**Status:** Planned

---

## Phase 5 — Temporal Remote-Sensing Analysis

Add time-series intelligence.

Includes:

* Date comparison
* Seasonal comparison
* Trend analysis
* Change detection
* Index time series
* Crop-stage comparison

**Status:** Planned in master roadmap

Implementation may be developed incrementally as the Remote Sensing and Spectral foundations mature.

---

## Phase 6 — Crop Intelligence

Build crop-specific analytical models.

Includes:

* Crop profiles
* Soil requirements
* pH suitability
* Nutrient suitability
* Moisture suitability
* Salinity constraints
* Vegetation condition
* Integrated crop suitability

**Status:** Planned

---

## Phase 7 — Agricultural Zoning

Combine analytical layers into management zones.

Includes:

* Soil zones
* Vegetation zones
* Moisture zones
* Suitability zones
* Risk zones
* Integrated agricultural zones

**Status:** Planned

---

## Phase 8 — Integrated Agricultural Intelligence

Combine:

```text
Soil
 +
Remote Sensing
 +
Spatial
 +
Temporal
 +
Crop
 +
Zoning
```

into a unified analytical framework.

**Status:** Planned

---

## Phase 9 — Advanced Analytics

Potential capabilities:

* Multivariate analysis
* Correlation analysis
* Cluster analysis
* Hotspot analysis
* Predictive indicators
* Change detection
* Agricultural risk modelling

These should only be introduced after underlying data and scientific contracts are mature.

**Status:** Planned

---

## Phase 10 — Advanced Reporting & Decision Support

Reports evolve from soil reports into agricultural intelligence reports.

Possible sections:

* Executive Summary
* Study Area
* Soil Condition
* Nutrient Status
* Spatial Variability
* Interpolation
* Fertility
* Historical Change
* Vegetation Condition
* Moisture Condition
* Crop Suitability
* Agricultural Risk
* Integrated Findings
* Maps
* Charts
* Statistics
* Metadata

**Status:** Planned

---

## Phase 11 — AgriNexus Workspace

Only after the analytical architecture stabilizes:

* Redesign map workspace
* Eliminate overlapping controls
* Dockable analysis panels
* Contextual legends
* Responsive layouts
* Analysis history
* Better navigation
* Layer management
* Report workspace

**Status:** Planned / final UI stage

---

## Phase 12 — Production Hardening

Includes:

* Performance testing
* Security review
* API validation
* Error handling
* Database optimization
* Large dataset testing
* Raster performance
* Caching
* Logging
* Backup strategy
* Deployment architecture

**Status:** Planned

---

# 31. Strategic Development Order

The overall progression is:

```text
SOIL
  ↓
SPATIAL
  ↓
INTERPOLATION
  ↓
HISTORICAL
  ↓
REPORTING
  ↓
REMOTE SENSING
  ↓
SPECTRAL INDICES
  ↓
TEMPORAL ANALYSIS
  ↓
CROP INTELLIGENCE
  ↓
ZONING
  ↓
INTEGRATED AGRICULTURAL INTELLIGENCE
  ↓
ADVANCED REPORTING
  ↓
FINAL UI WORKSPACE
  ↓
PRODUCTION HARDENING
```

---

# 32. AgriNexus Core Architecture

The final platform consists conceptually of five major layers.

```text
┌───────────────────────────────────────────────────┐
│                 USER EXPERIENCE                   │
│       Map • Dashboard • Analysis • Reports        │
├───────────────────────────────────────────────────┤
│             AGRICULTURAL INTELLIGENCE             │
│ Crop • Fertility • Risk • Suitability • Zoning   │
├───────────────────────────────────────────────────┤
│                 SCIENTIFIC ENGINE                 │
│ Soil • Interpolation • Indices • Statistics      │
├───────────────────────────────────────────────────┤
│                  SPATIAL ENGINE                   │
│ Query • Distance • Geometry • Raster • Zonal     │
├───────────────────────────────────────────────────┤
│                    DATA LAYER                     │
│ Soil • Satellite • Boundaries • Crops • History  │
└───────────────────────────────────────────────────┘
```

---

# 33. Final Architectural Objective

AgriNexus GIS should ultimately answer three levels of questions.

## Level 1 — What is there?

**Observation**

Examples:

* What is the soil pH?
* What is NDVI?
* What is soil nitrogen?
* Where are the samples?

## Level 2 — What is happening?

**Analysis**

Examples:

* Where is fertility low?
* Where is vegetation declining?
* Where is moisture stress occurring?
* How has the soil changed?
* Where are spatial patterns occurring?

## Level 3 — What does it mean agriculturally?

**Intelligence**

Examples:

* Which areas satisfy defined crop suitability criteria?
* Which areas require attention according to defined analytical rules?
* Which zones have similar management characteristics?
* What agricultural risks are indicated?
* How do soil and vegetation conditions interact?

The progression is:

**Observation → Analysis → Intelligence**

---

# 34. Master Roadmap Status

| Phase | Area                                 | Status                               |
| ----- | ------------------------------------ | ------------------------------------ |
| 0     | Architecture & Foundation            | **Current**                          |
| 1     | Soil Intelligence                    | Foundation substantially established |
| 2     | Integrated Reporting                 | In progress / stabilization          |
| 3     | Remote-Sensing Foundation            | Planned                              |
| 4     | Spectral Index Engine                | Planned                              |
| 5     | Temporal RS Analysis                 | Planned in master roadmap            |
| 6     | Crop Intelligence                    | Planned                              |
| 7     | Agricultural Zoning                  | Planned                              |
| 8     | Integrated Agricultural Intelligence | Planned                              |
| 9     | Advanced Analytics                   | Planned                              |
| 10    | Advanced Reporting                   | Planned                              |
| 11    | AgriNexus Workspace                  | Planned / final UI stage             |
| 12    | Production Hardening                 | Planned                              |

---

# 35. Phase 0 Current Status

| Phase | Description                     | Status          |
| ----- | ------------------------------- | --------------- |
| 0.1   | Project Identity & Naming       | **Complete**    |
| 0.2   | Master Repository Architecture  | **In Progress** |
| 0.3   | Domain / Module Boundaries      | Planned         |
| 0.4   | Data Architecture               | Planned         |
| 0.5   | API Conventions                 | Planned         |
| 0.6   | Scientific Result Contracts     | Planned         |
| 0.7   | Testing Architecture            | Planned         |
| 0.8   | Git / Documentation Strategy    | Planned         |
| 0.9   | Soil → AgriNexus Migration Plan | Planned         |
| 0.10  | Freeze Architecture v1.0        | Planned         |

---

# 36. Architecture Change Log

## 2026-09-26

### Initial Architecture Document Created

Established:

* AgriNexus GIS identity
* Integrated Agricultural Intelligence concept
* Observation → Analysis → Intelligence model
* Major platform domains
* Scientific/backend authority principle
* Frontend presentation principle
* Remote-sensing architecture
* Temporal architecture
* Agricultural intelligence roadmap
* Domain-oriented API architecture
* Service architecture
* Scientific versioning
* Testing architecture
* Migration principle
* Phase 0 roadmap

### Phase 0.1 Completed

Established:

* Official product name: **AgriNexus GIS**
* Descriptive name: **AgriNexus GIS — Integrated Agricultural Intelligence through GIS**
* Domain terminology
* Scientific naming distinction
* Naming conventions
* Software/scientific version separation
* **Extend first → Refactor second → Rename last** migration principle

### Phase 0.2 Started

Established the frontend architectural principle:

> Preserve the existing working Leaflet frontend while defining its target AgriNexus architecture.

The major UI/workspace redesign remains deferred to **Phase 11**.

---

# 37. Architecture Governance Rules

The following rules apply throughout AgriNexus development.

### Rule 1 — Do not rewrite working scientific functionality without architectural justification.

### Rule 2 — Scientific authority remains in the backend.

### Rule 3 — Frontend calculations must not become an independent scientific authority.

### Rule 4 — Existing working API contracts should not be broken merely for naming consistency.

### Rule 5 — New architecture should be introduced incrementally.

### Rule 6 — Scientific algorithms and classifications must be versioned.

### Rule 7 — Every significant scientific module requires automated tests.

### Rule 8 — Architectural changes must be documented.

### Rule 9 — Completed phases require a Git checkpoint.

### Rule 10 — The final UI redesign is intentionally deferred until the analytical foundations are stable.

### Rule 11 — Existing `Soil Analysis GIS.md` remains the Soil Analysis GIS development document.

### Rule 12 — Remote-sensing and broader AgriNexus architecture are documented in this file.

---

# 38. Current Development Principle

AgriNexus development should follow:

```text
DISCOVER
   ↓
DEFINE
   ↓
CONTRACT
   ↓
IMPLEMENT
   ↓
TEST
   ↓
INTEGRATE
   ↓
REGRESS
   ↓
DOCUMENT
   ↓
CHECKPOINT
```

No major architectural restructuring should be performed merely because a cleaner theoretical structure exists.

The existing scientific implementation is valuable and should be migrated through controlled, testable increments.

---

# 39. Architectural Motto

**AgriNexus GIS**

## Observe → Analyze → Understand → Act

with the scientific foundation:

## Data → Science → Spatial Intelligence → Agricultural Intelligence
# Phase 0.2  Master Repository Architecture

## Phase 0.2 Status

Phase 0.2 establishes the existing repository structure and maps it to the target AgriNexus GIS architecture.

### 0.2.1  Repository Structure Discovery

Confirmed top-level structure:

AgriNexus-GIS/
 data/
 database/
 public/
 server/
 .env
 .gitignore
 package.json
 AGRINEXUS_GIS_ARCHITECTURE.md
 Soil Analysis GIS.md
 Soil Analysis GIS.pdf

### 0.2.2  Frontend Architecture Mapping

The current frontend maps logically to GIS Workspace, Analytical Workspace, Reporting Workspace, Application/Common Layer, and Presentation Layer.

No physical frontend restructuring is performed during Phase 0.2.

### 0.2.3  Backend Architecture Mapping

The existing backend contains routes, controllers, services, scientific engine, repositories, configuration, and tests.

Logical domains include Soil Intelligence, Spatial Intelligence, Spatial Modelling/Interpolation, Historical/Temporal Intelligence, Agricultural Intelligence, Agricultural Zoning, Remote Sensing Intelligence, and Integrated Reporting.

### 0.2.4  Shared Infrastructure Mapping

Root infrastructure: package.json, .env, .gitignore.
Server entry point: server/server.js.
Analytical/reference data: data/historical/.
Database assets: database/schema.sql and database/phase_10_4_historical_import.sql.

### 0.2.5  Existing  Target Architecture

Frontend  API/Application Layer  Domain Services  Scientific Engine  Repositories/Database/Reference Data.

The existing implementation is already compatible with the target AgriNexus GIS architecture across Soil, Spatial, Interpolation, Historical/Temporal, Remote Sensing, Agricultural, Zoning, and Reporting domains.

### 0.2.6  Architecture Decisions

1. No immediate mass repository restructuring.
2. Existing domain implementations remain in their current locations.
3. Frontend workspace boundaries remain logical until the planned final UI/workspace stage.
4. Scientific code remains separated from application services.
5. Remote Sensing is a first-class AgriNexus GIS domain.
6. Reporting remains an independent analytical output domain.
7. data/ and database/ remain separate resources.
8. Existing API and source-file names are preserved until deliberate migration.
9. Package identity is not renamed prematurely.
10. Migration principle: Extend  Refactor  Rename.

### 0.2.7  Scientific Authority Boundary

The backend remains the scientific authority. The frontend is responsible for visualization, interaction, presentation, and workflow. Scientific calculations and authoritative analytical results remain backend responsibilities.

### 0.2.8  Phase 0.2 Completion

0.2.1 Repository Structure Discovery  COMPLETE
0.2.2 Frontend Architecture Mapping  COMPLETE
0.2.3 Backend Architecture Mapping  COMPLETE
0.2.4 Shared Infrastructure Mapping  COMPLETE
0.2.5 Existing  Target Architecture Map  COMPLETE
0.2.6 Architecture Decisions  COMPLETE
0.2.7 Documentation  COMPLETE

Phase 0.2 is ready for final validation and Git checkpoint.

# Phase 0.3  Domain / Module Boundaries

## Phase 0.3 Status

Phase 0.3 defines the logical domain and module boundaries of AgriNexus GIS based on the implemented repository architecture.

### 0.3.1  Domain Boundary Matrix

1. Soil Intelligence
Responsibility: Soil observations, soil analysis, classification, management, and recommendations.
Current implementation: soilController, soilAnalysisController, soilManagementService, soilAnalysisService, soilRecommendationService, and scientific soil classification.

2. Spatial Intelligence
Responsibility: Spatial queries and spatial analytical operations.
Current implementation: spatialQueryController, spatialAnalysisController, spatialQueryService, and spatialAnalysisService.

3. Spatial Modelling
Responsibility: Spatial interpolation, prediction, variogram modelling, kriging, IDW, spline, and related spatial modelling calculations.
Current implementation: interpolationController, interpolationService, and server/services/interpolation/.

4. Historical Intelligence
Responsibility: Historical observations, candidate discovery, comparison, compatibility, and historical analytical context.
Current implementation: historicalCandidate*, historicalComparison*, historicalContext*, and historicalRepository.

5. Temporal Intelligence
Responsibility: Time-dependent observations, temporal composition, temporal analysis workflows, and temporal change analysis.
Current implementation includes temporal workflows under server/services/remoteSensing/temporal and the temporal analysis controller.

6. Remote Sensing Intelligence
Responsibility: Raster-based remote sensing processing, workflows, outputs, validation, and remote-sensing analytical operations.
Current implementation: server/scientific/remoteSensing and server/services/remoteSensing.

7. Spectral Indices
Responsibility: Scientific calculation and definition of vegetation, water, and related spectral indices.
Current implementation: server/scientific/remoteSensing/indices.

8. Agricultural Intelligence
Responsibility: Agricultural interpretation and crop suitability analysis.
Current implementation: cropSuitabilityService.

9. Agricultural Zoning
Responsibility: Spatial agricultural/fertility zoning and zone classification.
Current implementation: fertilityZoningController and fertilityZoningService.

10. Integrated Reporting
Responsibility: Aggregation and presentation of authoritative analytical results from multiple domains.
Current implementation: analyticalReportController, server/services/reports/, and related reporting tests.

11. Scientific Engine
Responsibility: Authoritative scientific calculations, classification algorithms, spatial models, raster processing, indices, and temporal scientific calculations.
Current implementation: server/scientific/ and domain-specific scientific services.

12. Data Layer
Responsibility: Persistence, repositories, database access, and analytical/reference datasets.
Current implementation: server/repositories/, database/, and data/.

### 0.3.2  Domain Boundary Principles

1. Each domain owns its own business/scientific responsibility.
2. A domain may consume authoritative results from another domain through defined service or contract boundaries.
3. A domain must not duplicate another domain's scientific authority.
4. Cross-domain aggregation belongs in higher-level application/reporting workflows.
5. Scientific calculations remain backend responsibilities.
6. Frontend code remains responsible for visualization, interaction, and presentation.
7. Logical domain boundaries do not require immediate physical directory separation.

### 0.3.3  Cross-Domain Dependency Model

Reporting consumes authoritative analytical results from domains such as Soil, Spatial, Interpolation, Historical, Fertility, and Temporal analysis.

Remote Sensing contains related but separately bounded Raster, Spectral Index, and Temporal capabilities.

The intended dependency direction is:

Frontend  API/Application Layer  Domain Services  Scientific Engine  Data Layer

Cross-domain services should consume authoritative outputs rather than independently reproducing scientific calculations.

### 0.3.4  Physical Structure Decision

No domain is physically relocated or renamed during Phase 0.3.

The existing implementation is retained while domain boundaries are formally established. Future physical restructuring, where justified, will follow the architectural migration principle:

Extend  Refactor  Rename

### 0.3.5  Phase 0.3 Completion Criteria

Domain responsibilities identified  COMPLETE
Domain-to-implementation mapping established  COMPLETE
Cross-domain dependency principles established  COMPLETE
Scientific authority boundary preserved  COMPLETE
Physical restructuring deferred  COMPLETE

Phase 0.3 is ready for validation and Git checkpoint.
