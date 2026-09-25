# Soil Analysis GIS

## Phased Development & Soil Analysis Standards Document

**Project:** Soil Analysis GIS

**Purpose:** Soil sample collection, laboratory-value storage, soil analysis, recommendations, crop suitability assessment, soil management, and GIS visualization

**Document Type:** Development Roadmap & Technical Reference

**Current Phase:** Phase 7.3 â€” Thematic Map & Legend

**Status:** Phase 7.3 completed and frozen; ready for Phase 7.4

---

# 1. Project Objective

The Soil Analysis GIS application combines:

- Geographically referenced soil samples
- Laboratory soil-test results
- Standardized Indian soil interpretation rules
- Automated soil classification
- Overall soil-fertility assessment
- Soil recommendations
- Crop suitability assessment
- Soil management guidance
- REST APIs
- Leaflet/GIS visualization
- Soil-analysis dashboard
- Thematic soil visualization

The application must keep:

> **Soil-analysis logic separate from GIS visualization.**

The scientific interpretation layer must remain independently testable and authoritative.

The GIS interface consumes analysis results. It must not independently redefine scientific classification rules.

---

# 2. Development Philosophy

The mandatory architectural principle is:

> **Scientific interpretation first â†’ tested analysis engine â†’ API â†’ dashboard/map visualization**

The GIS interface must never determine or contain the scientific classification rules.

The architecture is:

```text
Soil Sample Database
        â”‚
        â–¼
Soil Analysis Service
        â”‚
        â”œâ”€â”€ pH Classification
        â”œâ”€â”€ Nitrogen Classification
        â”œâ”€â”€ Phosphorus Classification
        â”œâ”€â”€ Potassium Classification
        â”œâ”€â”€ Organic Carbon Classification
        â”œâ”€â”€ EC Classification
        â””â”€â”€ Overall Fertility Assessment
        â”‚
        â–¼
Soil Analysis API
        â”‚
        â”œâ”€â”€ Recommendation Services
        â”œâ”€â”€ Crop Suitability
        â””â”€â”€ Soil Management
        â”‚
        â–¼
Dashboard / Leaflet Map
        â”‚
        â”œâ”€â”€ Sample Visualization
        â”œâ”€â”€ Thematic Maps
        â”œâ”€â”€ Classification Symbology
        â””â”€â”€ Thematic Legends

        3. Development Phases
Phase 1 â€” Project Foundation
Objective

Establish the basic Soil Analysis GIS application structure.

Components
Node.js / Express server
MySQL database
Environment configuration
Public web application
Basic API structure
Leaflet integration
Deliverables
Working Express server
Database connection
Application startup
Basic web page
Leaflet map framework
Status

COMPLETED

4. Phase 2 â€” Soil Sample Repository
Objective

Create persistent storage and APIs for geographically referenced soil samples.

Repository
soil_samples

The repository stores information including:

Sample ID
Sample code
Latitude
Longitude
Sampling depth
pH
Available Nitrogen
Available Phosphorus
Available Potassium
Organic Carbon
Electrical Conductivity
Laboratory values
Sample metadata
Deliverables
Soil sample database table
Repository
Controller
REST API
Sample retrieval
Sample creation/testing
Status

COMPLETED

The application currently contains multiple soil samples available for analysis and GIS testing.

5. Phase 3 â€” GIS Map
Objective

Display geographically referenced soil samples on a Leaflet map.

Components
Leaflet map
Sample markers
Sample popup
API-based sample loading
Geographic coordinates
Laboratory-value display
Design Rule

The GIS visualization displays stored sample information.

It does not independently calculate scientific classifications.

Status

COMPLETED

The map successfully:

Initializes Leaflet
Loads soil samples from the API
Creates geographic markers
Displays sample information
Supports marker selection
Supports sample labels
Fits the map to the available samples
6. Phase 4 â€” Soil Analysis

Phase 4 introduced the scientific interpretation layer.

6.1 Phase 4.1 â€” Soil Analysis Engine
Objective

Create a centralized, testable service responsible for interpreting soil-test measurements.

Main Service
server/services/soilAnalysisService.js
Functions

The analysis service provides classification and overall assessment functionality for:

classifyPH()

classifyNitrogen()

classifyPhosphorus()

classifyPotassium()

classifyOrganicCarbon()

classifyEC()

assessOverallFertility()

analyzeSample()
Status

COMPLETED

The analysis engine is implemented and is consumed by the analysis API.

7. Soil Analysis Standard

The baseline interpretation standard selected for this application is:

Government of India Soil Health Card / Soil Testing Manual baseline

The application records the measurement units associated with each parameter.

Thresholds are centralized and are not embedded in the GIS presentation layer.

Where interpretation depends on analytical method or extraction procedure, that dependency must be documented.

8. pH Classification
Unit

pH units

pH	Classification
< 6.5	Acidic
6.5â€“7.5	Neutral
> 7.5	Alkaline
Implementation
pH < 6.5        â†’ Acidic
6.5 â‰¤ pH â‰¤ 7.5 â†’ Neutral
pH > 7.5        â†’ Alkaline

pH is a soil-reaction indicator and is not treated as a nutrient quantity.

9. Available Nitrogen Classification
Unit

kg/ha

Available N	Classification
< 280	Low
280â€“560	Medium
> 560	High
Implementation
N < 280       â†’ Low
280 â‰¤ N â‰¤ 560 â†’ Medium
N > 560       â†’ High
10. Available Phosphorus Classification
Unit

kg/ha

Available P	Classification
< 10	Low
10â€“25	Medium
> 25â€“50	High
> 50	Very High
Implementation
P < 10       â†’ Low
10 â‰¤ P â‰¤ 25  â†’ Medium
25 < P â‰¤ 50  â†’ High
P > 50       â†’ Very High

The four-category classification is retained.

11. Available Potassium Classification
Unit

kg/ha

Available K	Classification
< 120	Low
120â€“280	Medium
> 280â€“600	High
> 600	Very High
Implementation
K < 120        â†’ Low
120 â‰¤ K â‰¤ 280  â†’ Medium
280 < K â‰¤ 600  â†’ High
K > 600        â†’ Very High
12. Organic Carbon Classification
Unit

%

Organic Carbon	Classification
< 0.50%	Low
0.50â€“0.75%	Medium
> 0.75%	High
Implementation
OC < 0.50        â†’ Low
0.50 â‰¤ OC â‰¤ 0.75 â†’ Medium
OC > 0.75        â†’ High
13. Electrical Conductivity Classification
Unit

dS/m

EC	Classification
0â€“0.4	Non-saline
> 0.4â€“0.8	Very slightly saline
> 0.8â€“1.6	Moderately saline
> 1.6	Strongly saline
Important Note

EC interpretation depends on the soil-extract / soil-water measurement method.

The analytical convention used by the laboratory must therefore be recorded or documented.

EC is primarily a salinity indicator, not a nutrient-fertility score.

14. Overall Fertility Assessment

The application uses a transparent rule-based assessment.

It does not use an arbitrary numerical average such as:

Low = 1
Medium = 2
High = 3

unless a scientifically justified scoring system is introduced later.

Initial Rules
Low Fertility

If one or more major fertility parameters are classified Low:

N = Low

OR

P = Low

OR

K = Low

OR

Organic Carbon = Low

then:

Overall Fertility = Low
Moderate / Good Fertility

If no major nutrient/organic-carbon parameter is Low and the results are predominantly Medium/High:

Overall Fertility = Moderate / Good
High Fertility

If N, P, K and Organic Carbon are predominantly High/Very High:

Overall Fertility = High
EC

EC is reported independently as:

Non-saline
Very slightly saline
Moderately saline
Strongly saline

EC does not automatically increase or decrease the nutrient-fertility category.

15. Configuration Architecture

Thresholds are centralized rather than scattered throughout individual functions.

Recommended structure:

soilAnalysisService.js

â”‚
â”œâ”€â”€ SOIL_STANDARDS
â”‚   â”œâ”€â”€ pH
â”‚   â”œâ”€â”€ nitrogen
â”‚   â”œâ”€â”€ phosphorus
â”‚   â”œâ”€â”€ potassium
â”‚   â”œâ”€â”€ organicCarbon
â”‚   â””â”€â”€ EC
â”‚
â”œâ”€â”€ classifyPH()
â”œâ”€â”€ classifyNitrogen()
â”œâ”€â”€ classifyPhosphorus()
â”œâ”€â”€ classifyPotassium()
â”œâ”€â”€ classifyOrganicCarbon()
â”œâ”€â”€ classifyEC()
â”œâ”€â”€ assessOverallFertility()
â””â”€â”€ analyzeSample()

This allows the scientific standard to be changed later without rewriting the application.

16. Analysis Result Structure

The analysis API returns structured analysis information containing:

Measured value
Unit where applicable
Classification
Overall fertility
EC/salinity interpretation

Representative structure:

{
  "sampleId": 1,
  "sampleCode": "S-001",
  "analysis": {
    "pH": {
      "value": 6.8,
      "classification": "Neutral"
    },
    "nitrogen": {
      "value": 285,
      "unit": "kg/ha",
      "classification": "Medium"
    },
    "phosphorus": {
      "value": 18,
      "unit": "kg/ha",
      "classification": "Medium"
    },
    "potassium": {
      "value": 240,
      "unit": "kg/ha",
      "classification": "Medium"
    },
    "organicCarbon": {
      "value": 0.72,
      "unit": "%",
      "classification": "Medium"
    },
    "electricalConductivity": {
      "value": 0.35,
      "unit": "dS/m",
      "classification": "Non-saline"
    },
    "overallFertility": "Moderate / Good"
  }
}

The exact API structure is implementation-controlled but must preserve the separation between measurements and classifications.

17. Phase 4.1 Testing

Testing was treated as a mandatory part of the analysis engine.

Testing includes:

Normal values
Low
Medium
High
Very High
Boundary values

pH:

6.49
6.50
7.50
7.51

Nitrogen:

279
280
560
561

Phosphorus:

9
10
25
50
51

Potassium:

119
120
280
600
601

Organic Carbon:

0.49
0.50
0.75
0.76

EC:

0.39
0.40
0.80
1.60
1.61
Invalid input

The service also considers:

null
undefined
non-numeric values
negative values where invalid
missing measurements
Status

COMPLETED

18. Phase 4.1 API

The soil-analysis API provides sample analysis through:

GET /api/soil-analysis/sample/:id
Processing
Request
   â”‚
   â–¼
Sample ID
   â”‚
   â–¼
soil_samples repository
   â”‚
   â–¼
soilAnalysisService
   â”‚
   â”œâ”€â”€ pH
   â”œâ”€â”€ N
   â”œâ”€â”€ P
   â”œâ”€â”€ K
   â”œâ”€â”€ OC
   â””â”€â”€ EC
   â”‚
   â–¼
Overall assessment
   â”‚
   â–¼
JSON response

The API does not duplicate classification logic.

Status

COMPLETED

19. Existing Sample Validation

The actual database samples are used for validation.

For the established sample S-001:

pH             = 6.80
N              = 285 kg/ha
P              = 18 kg/ha
K              = 240 kg/ha
Organic Carbon = 0.72 %
EC              = 0.35 dS/m

Expected classifications:

pH             â†’ Neutral
N              â†’ Medium
P              â†’ Medium
K              â†’ Medium
Organic Carbon â†’ Medium
EC              â†’ Non-saline

Additional database samples are also available and are processed through the same analysis engine.

Status

COMPLETED

20. Phase 4.2 â€” Soil Analysis Dashboard
Objective

Present soil-analysis results in a usable dashboard.

Functionality
Overall soil-fertility status
pH classification
N classification
P classification
K classification
Organic Carbon classification
EC/salinity status
Laboratory values
Interpretation labels
Visual indicators

The dashboard consumes analysis results.

It does not contain scientific threshold logic.

Status

COMPLETED

21. Phase 4.3 â€” GIS Analysis Visualization
Objective

Connect the soil-analysis engine to the GIS visualization layer.

The GIS visualization consumes analysis results rather than reimplementing scientific rules.

Analysis information can be represented as:

Sample S-001

pH: Neutral
N: Medium
P: Medium
K: Medium
OC: Medium
EC: Non-saline

Overall:
Moderate / Good
Status

COMPLETED

22. Soil Recommendation Services

The project subsequently introduced dedicated soil recommendation functionality.

Services
server/services/soilRecommendationService.js
server/services/cropSuitabilityService.js
server/services/soilManagementService.js

These services are separated from the core soil-analysis classification engine.

The separation is intentional:

Measurement
    â†“
Classification
    â†“
Soil Interpretation
    â†“
Recommendation
    â†“
Crop Suitability
    â†“
Soil Management
Design Principle

Recommendations must consume analyzed soil information and must not redefine the underlying laboratory classification thresholds.

Status

IMPLEMENTED

23. Phase 7 â€” Thematic GIS Visualization

Phase 7 extends the GIS layer from simple sample display to parameter-specific thematic visualization.

Thematic visualization is presentation logic.

The scientific classifications remain authoritative in the backend analysis results.

24. Phase 7.1 â€” Thematic Parameter Selection
Objective

Allow the user to select a soil parameter for thematic visualization.

Supported parameters:

Standard Sample View
pH
Nitrogen
Phosphorus
Potassium
Organic Carbon
Electrical Conductivity

The map parameter selector is implemented in:

public/js/map.js
Status

COMPLETED

25. Phase 7.2 â€” Thematic Marker Symbology
Objective

Represent backend soil classifications using thematic map symbols.

The GIS layer receives complete soil-analysis reports from the application.

The backend classification remains authoritative.

The map does not calculate:

Low
Medium
High
Very High
Acidic
Neutral
Alkaline
Saline

Instead, it converts the received classification into a presentation category.

Presentation categories
High
Medium
Low
Warning
Neutral
Unavailable

The thematic marker system supports parameter-specific interpretation.

For example:

pH

Acidic    â†’ Warning
Neutral   â†’ Neutral
Alkaline  â†’ Warning

For nutrient parameters:

High     â†’ High
Medium   â†’ Medium
Low      â†’ Low

Unavailable analysis data is represented separately.

Status

COMPLETED

26. Phase 7.3 â€” Thematic Legend & Presentation
Objective

Provide a clear visual legend corresponding to the selected thematic parameter.

The legend is dynamically updated when the selected parameter changes.

Supported thematic parameters:

Standard Sample View
pH
Nitrogen
Phosphorus
Potassium
Organic Carbon
Electrical Conductivity

The legend reflects the interpretation categories applicable to the selected parameter.

Additional functionality

Phase 7.3 includes:

Dynamic thematic legend
Parameter-specific legend categories
Thematic marker symbols
Sample labels
Label visibility toggle
Standard marker restoration
Preservation of marker popups
Preservation of existing sample-selection functionality
Thematic data synchronization with soil-analysis reports
Current runtime validation

The application has successfully demonstrated:

10 soil samples loaded
10 soil samples rendered
10 complete analysis reports loaded
10 reports transferred to map.js

Thematic rendering has been verified for:

Standard Sample View
pH
Nitrogen
Phosphorus
Potassium
Organic Carbon
Electrical Conductivity
Status

COMPLETED AND FROZEN

27. Phase 7 Frozen Baseline

Phase 7.3 is now a frozen baseline.

The following functionality must not be changed casually in later phases:

Leaflet map initialization
        â†“
Sample loading
        â†“
Sample markers
        â†“
Analysis report loading
        â†“
Thematic parameter selection
        â†“
Backend-authoritative classification
        â†“
Thematic marker symbology
        â†“
Thematic legend
        â†“
Sample labels

Future development must build on this baseline.

If a later phase requires modification to frozen Phase 7.3 functionality, the change must be deliberate and documented.

28. Current Frontend Thematic Architecture

The primary thematic map implementation is:

public/js/map.js

The map maintains thematic state including:

Selected thematic parameter

Thematic analysis reports

Sample markers

Sample labels

Thematic legend

The application sends complete analysis reports to the map.

The map then applies presentation logic.

Conceptually:

Soil Analysis API
       â”‚
       â–¼
Complete Analysis Reports
       â”‚
       â–¼
app.js
       â”‚
       â–¼
map.js
       â”‚
       â”œâ”€â”€ Selected Parameter
       â”‚
       â”œâ”€â”€ Backend Classification
       â”‚
       â”œâ”€â”€ Marker Symbology
       â”‚
       â”œâ”€â”€ Legend
       â”‚
       â””â”€â”€ Sample Labels

This preserves the separation between:

Scientific Logic
        â‰ 
Presentation Logic
29. Scientific Governance

The application maintains a clear distinction between:

Measurement

What the laboratory reports.

Example:

N = 285 kg/ha
Classification

What the selected standard says about the measurement.

Example:

N = Medium
Interpretation

What the classification means.

Example:

Available nitrogen is in the Medium category.
Recommendation

What action may be appropriate.

Example:

Apply an appropriate nitrogen-management program.

These are different layers and must not be conflated.

30. Change-Control Rule for Thresholds

If a threshold is changed in the future, record:

Previous threshold
New threshold
Source/standard
Reason for change
Effective application version
Unit and analytical method
Impact on existing classifications

This is particularly important if the application becomes a production agricultural decision-support system.

31. Future Development

Potential future functionality includes:

Advanced crop-specific recommendations
Nutrient deficiency recommendations
Fertilizer recommendations
Crop suitability refinement
Soil amendment recommendations
Spatial interpolation
Soil fertility zoning
Historical sample comparison
Time-series soil monitoring
Sampling-density analysis
Laboratory quality-control information
State-specific interpretation standards
Crop-specific critical limits
Spatial filtering
Advanced thematic analysis
Map-based analytical queries
Reporting/export functionality

These features must build on the stable soil-analysis foundation.

32. Phase 7.4 â€” Next Development Phase

Phase 7.4 will be defined and implemented only after the Phase 7.3 baseline has been frozen.

The implementation must preserve:

Existing sample rendering
Existing sample popups
Existing analysis API integration
Backend-authoritative classifications
Thematic parameter selection
Thematic symbology
Thematic legend
Sample labels

Any new functionality must be added incrementally without unnecessarily rewriting stable Phase 7.3 functionality.

33. Current Project Position
Phase 1
Foundation
        â”‚
        â–¼
        COMPLETE

Phase 2
Soil Sample Repository
        â”‚
        â–¼
        COMPLETE

Phase 3
GIS Map Foundation
        â”‚
        â–¼
        COMPLETE

Phase 4
Soil Analysis
        â”‚
        â”œâ”€â”€ Phase 4.1 Analysis Engine
        â”‚       COMPLETE
        â”‚
        â”œâ”€â”€ Phase 4.2 Dashboard
        â”‚       COMPLETE
        â”‚
        â””â”€â”€ Phase 4.3 GIS Analysis Visualization
                COMPLETE
        â”‚
        â–¼
Phase 5 / 6
Analysis Services & Dashboard Enhancements
        â”‚
        â–¼
        COMPLETE
        â”‚
        â–¼
Phase 7
Thematic GIS Visualization
        â”‚
        â”œâ”€â”€ Phase 7.1 Parameter Selection
        â”‚       COMPLETE
        â”‚
        â”œâ”€â”€ Phase 7.2 Marker Symbology
        â”‚       COMPLETE
        â”‚
        â””â”€â”€ Phase 7.3 Thematic Legend & Presentation
                COMPLETE
                FROZEN
        â”‚
        â–¼
Phase 7.4
NEXT
        â”‚
        â–¼
Advanced GIS / Soil Analysis Functionality
34. Golden Rule for Future Development

Never change the dashboard or map merely to accommodate an untested soil-analysis result.

The correct sequence remains:

Scientific Standard
       â†“
Threshold Configuration
       â†“
Analysis Function
       â†“
Unit Test
       â†“
Analysis API
       â†“
Database Sample Validation
       â†“
Dashboard
       â†“
GIS Visualization
       â†“
Thematic Presentation

The GIS layer may transform authoritative classifications into visual symbols, but it must never become the source of scientific classification.

35. Project Baseline

As of the completion and freeze of Phase 7.3, the Soil Analysis GIS application has a functioning end-to-end pipeline:

Soil Sample
     â†“
MySQL Repository
     â†“
REST API
     â†“
Soil Analysis Engine
     â†“
Classification
     â†“
Overall Soil Assessment
     â†“
Recommendation / Suitability / Management Services
     â†“
Frontend
     â†“
Leaflet GIS
     â†“
Thematic Visualization
     â†“
Thematic Legend

The project is therefore ready to proceed to the next controlled development phase.

36. Document Status

Document: Soil Analysis GIS â€” Phased Development & Soil Analysis Standards Document

Current Phase: Phase 7.3

Phase 7.3 Status: COMPLETED AND FROZEN

Next Phase: Phase 7.4

Development Principle:

Scientific interpretation first â†’ tested analysis â†’ API â†’ dashboard â†’ GIS â†’ thematic visualization

This document is the current baseline reference for the Soil Analysis GIS project.


### One important point

I deliberately **did not mark Phase 7.4 as completed or define detailed functionality for it**. That keeps the document synchronized with the actual state of the project rather than getting ahead of the implementation.

The next step should be to **replace the contents of the existing `Soil Analysis GIS.md` with this version**, commit that documentation update to Git, and then start Phase 7.4 from the frozen 7.3 baseline.
```

1. Phase 7.5 scope

I propose five components.

7.5.1 Thematic Summary

When a thematic parameter is selected, display a compact summary such as:

Nitrogen

Category Samples
High 2
Medium 6
Low 2
Total 10

And potentially:

Minimum
Maximum
Average
Number of samples

This gives the user an immediate statistical overview.

7.5.2 Spatial Distribution Analysis

The map should identify the spatial distribution of the selected parameter.

For example:

Nitrogen: 6 Medium, 2 High, 2 Low

The user can visually see whether Low or High samples are concentrated in a particular part of the surveyed area.

We should not call this a statistically proven spatial cluster unless we actually implement a statistical clustering method.

So the initial implementation will be visual/spatial distribution analysis, not advanced geostatistics.

7.5.3 Selected Category Statistics

When the user clicks:

Medium

the map already filters the six Medium samples.

Phase 7.5 can additionally show:

Nitrogen â€” Medium

Samples: 6
Minimum: ...
Maximum: ...
Average: ...

This is a natural extension of the Phase 7.4 filtering functionality.

7.5.4 Map Statistics Panel

We can introduce a small GIS analysis panel, for example:

SOIL THEMATIC ANALYSIS

Parameter
Nitrogen

Samples
10

Average
...

Range
... â€“ ...

Distribution
High 2
Medium 6
Low 2

The panel should update dynamically when the thematic parameter changes.

If a category filter is active, the panel can optionally switch to:

FILTERED VIEW

Category
Medium

Samples
6

Average
...
7.5.5 No Interpolation Yet

This is important.

I recommend not introducing:

IDW interpolation
Kriging
raster generation
heatmaps
contour maps
soil fertility surfaces

in 7.5.

Those require additional scientific decisions regarding:

sampling density
spatial distribution
interpolation method
distance weighting
variogram assumptions
minimum sample requirements
validation

They deserve their own carefully designed phase later.

2. Architecture

The architecture should remain:

                    DATABASE
                       â”‚
                       â–¼
                Soil Measurements
                       â”‚
                       â–¼
              Backend Soil Analysis
                       â”‚
             Classification + Values
                       â”‚
                       â–¼
                 REST API
                       â”‚
                       â–¼
                Frontend / GIS
                       â”‚
          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
          â–¼                         â–¼
    Thematic Markers          Analysis Panel
          â”‚                         â”‚
          â–¼                         â–¼
       Leaflet              Statistics / Summary

The critical rule remains:

The frontend does not calculate scientific soil classifications.

It consumes the backend's measurement/classification data and presents it spatially.

3. Backend vs Frontend responsibilities
   Backend

Backend remains responsible for:

measured values
units
classifications
scientific thresholds
soil analysis
validation
future statistical calculations where appropriate
Frontend

Frontend handles:

marker presentation
filtering
counts
displaying statistics
map interaction
analysis-panel presentation

This keeps our architecture clean.

4. Proposed new frontend state

We can introduce something along these lines:

let thematicAnalysisStats = null;

and derive the display statistics from the existing thematicMapReports.

We should reuse the existing analysis data, rather than making another API call for every map interaction.

5. User interaction

The intended workflow becomes:

Step 1

User selects:

Nitrogen

Step 2

Map changes to nitrogen thematic symbology.

Step 3

Legend shows:

High 2
Medium 6
Low 2
Unavailable 0
Step 4

Analysis panel shows:

Nitrogen Analysis

Samples: 10
Average: ...
Minimum: ...
Maximum: ...

High: 2
Medium: 6
Low: 2
Step 5

User clicks Medium.

Map shows only the six Medium samples.

Panel changes to:

Nitrogen â€” Medium

Samples: 6
Average: ...
Minimum: ...
Maximum: ...
Step 6

User clicks Show All Samples.

Map and statistics return to the complete dataset.

And, importantly, Labels ON/OFF continues to remain independent, exactly as we fixed in 7.4.

6. Parameters covered

Phase 7.5 should work consistently for:

pH
Nitrogen
Phosphorus
Potassium
Organic Carbon
Electrical Conductivity

However, the interpretation of the statistics must respect the parameter.

For example:

pH

Minimum: 5.9
Maximum: 8.1
Average: 6.9

while classification remains:

Acidic
Neutral
Alkaline

For EC:

Non-saline
Very slightly saline
Moderately saline
Strongly saline

The statistical values are measurements; the categories remain backend classifications.

7. What we should NOT change

We should preserve everything that is already working:

Phase 7.3
thematic parameter selector
marker symbology
legend
category counts
sample labels
standard map view
Phase 7.4
category filtering
Show All Samples
inspection popup
active category indication
label ON/OFF behavior
existing map interactions

Phase 7.5 should build on these, not replace them.

8. Testing plan

Before committing Phase 7.5, we'll test each parameter.

Functional
Select pH
Select N
Select P
Select K
Select OC
Select EC
Confirm statistics change correctly
Filtering
Click High
Click Medium
Click Low
Confirm statistics correspond to visible samples
Show All Samples
Confirm statistics return to complete dataset
Labels

Test both:

Labels ON â†’ filter â†’ labels remain ON
Labels OFF â†’ filter â†’ labels remain OFF
Standard view

Return to:

Standard Sample View

and confirm the existing map behavior remains unchanged.

Regression

Confirm:

popups
sample labels
marker clicks
map fitting
thematic legend
category counts

all continue working.

9. Git checkpoint

We currently have:

e3f6a35 Complete Phase 7.4 thematic map interaction

So our development sequence becomes:

e3f6a35
â”‚
â–¼
Phase 7.5 development
â”‚
â”œâ”€â”€ implementation
â”œâ”€â”€ testing
â”œâ”€â”€ bug fixes
â””â”€â”€ regression testing
â”‚
â–¼
Phase 7.5 Git commit

That gives us a clean rollback point if necessary.

Phase 7.5 definition

I would formally record it as:

Phase 7.5 â€” Thematic Spatial Analysis & Statistical Summary
Extend the thematic GIS from category visualization and filtering into spatially contextualized statistical analysis of soil parameters. Provide parameter-level and filtered-category summaries using existing backend measurements and classifications, while preserving the separation between scientific analysis and GIS presentation. No interpolation or geostatistical surface generation is included in this phase.

That is the phase I recommend we implement next.

---

Iâ€™ve confirmed the current project baseline and the existing Phase 7.5 work. The Phase 7.5 implementation is already documented in the current map.js baseline, including thematic spatial statistics and the principle that classification remains backend-driven.

For Phase 7.6, I propose recording this as a new roadmap item:

Phase 7.6 â€” Collapsible Analysis Panels & UI Refinement

Objective:
Improve the usability and visual organization of the Soil Analysis GIS interface by converting the major analysis sections into collapsible ribbon/panel components.

Panels included:

Legend
Thematic Analysis
Soil Analysis Dashboard
Selected Soil Sample
Soil Analysis
Soil Interpretation & Recommendations
Management Observations
Crop Suitability
Soil Management Plan

Design principles:

Compact ribbon/header with expand/collapse indicator.
User can independently expand or collapse each panel.
Existing content and functionality remain unchanged.
No changes to soil classification standards.
No changes to backend analysis services.
No changes to thematic calculations or GIS filtering.
No scientific calculations are moved into the frontend.
Leaflet controls must retain their existing event-propagation protection.
The change is strictly UI presentation and interaction refinement.

Initial presentation state:

Legend â€” Expanded
Thematic Analysis â€” Expanded
Soil Analysis Dashboard â€” Expanded
Selected Soil Sample â€” Expanded
Soil Analysis â€” Expanded
Soil Interpretation & Recommendations â€” Collapsed
Management Observations â€” Collapsed
Crop Suitability â€” Collapsed
Soil Management Plan â€” Collapsed

This is consistent with the existing architecture: app.js handles dashboard, selected sample, analysis and recommendation presentation, while map.js handles Leaflet/map presentation and interaction.

Phase 7.5 remains frozen. Phase 7.6 is an additive UI refinement on top of that baseline.

I have not yet mutated the archived plan, because the Library search did not surface the actual authoritative roadmap document itselfâ€”only related project files and pasted source material. I don't want to accidentally modify the wrong artifact.

If you have the archived roadmap as a Library file, tell me its exact filename (just the filename, not the contents), and I can update that specific archive entry.

Another change, the gis.js has the style in it. Why cant we move it out so map.js will become light.

Yes â€” that is a good architectural change, and Phase 7.6 is the right time to do it.

If map.js currently contains a large initializeMapControlStyles() function with all the CSS for legends, thematic controls, markers, panels, etc., then map.js is carrying presentation styling that does not belong in the map logic layer.

Proposed cleanup

We should move the styling out of map.js into a dedicated stylesheet:

public/
â”œâ”€â”€ css/
â”‚ â””â”€â”€ gis.css
â””â”€â”€ js/
â”œâ”€â”€ map.js
â””â”€â”€ app.js

Then the responsibilities become:

File Responsibility
map.js Leaflet map, markers, thematic map, legends, spatial interaction
app.js Application/UI logic and API interaction
gis.css All GIS/map/control/panel styling
index.html Page structure and stylesheet/script loading
What we would remove from map.js

The entire:

function initializeMapControlStyles() {
...
}

and its injected CSS such as:

const style = document.createElement("style");
style.textContent = `
.soil-thematic-legend {
...
}

    .soil-thematic-marker {
        ...
    }

    ...

`;
document.head.appendChild(style);

would move to:

public/css/gis.css

This includes the styles we recently added for:

.soil-thematic-legend
.soil-thematic-legend-item
.soil-thematic-legend-symbol
.thematic-high
.thematic-medium
.thematic-low
.thematic-warning
.thematic-neutral
.thematic-unavailable
.soil-thematic-marker
.soil-thematic-control
.soil-thematic-control-select
and the new collapsible panel/ribbon styles for Phase 7.6.
One important point

We should not blindly move every CSS rule into gis.css.

Leaflet itself should continue to come from its normal Leaflet stylesheet. Our gis.css should contain only our application's GIS-specific presentation styles.

The resulting map.js becomes much cleaner:

// ============================================================
// public/js/map.js
// ============================================================
//
// Soil Analysis GIS
//
// Leaflet map management.
//
// Responsibilities:
// - Map initialization
// - Base layers
// - Soil markers
// - Sample selection
// - Thematic symbology
// - Thematic legend
// - Thematic filtering
// - Spatial/statistical presentation
//
// Styling is maintained in:
// public/css/gis.css
//
// ============================================================

And instead of JavaScript creating CSS, map.js simply creates elements/classes:

container.className = "soil-thematic-legend";
symbol.className =
`soil-thematic-legend-symbol ${definition.cssClass}`;

The CSS determines how they look.

This also fits Phase 7.6 very well

I would actually make two UI refinements together:

Phase 7.6 â€” Collapsible Analysis Panels & UI Refinement

Move GIS-specific CSS from map.js â†’ public/css/gis.css
Remove initializeMapControlStyles() from map.js
Add collapsible/ribbon panel styling to gis.css
Convert the nine analysis sections into collapsible panels
Keep all existing functionality unchanged
Keep backend scientific classification untouched
Keep thematic calculations/filtering untouched
Keep Leaflet event-propagation protection intact

This gives us a much better separation:

                 Soil Analysis GIS
                        â”‚
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚               â”‚                â”‚
      app.js          map.js           gis.css
        â”‚               â”‚                â”‚

Application GIS/Leaflet Presentation
logic logic styling
â”‚ â”‚ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
â”‚
Backend APIs
â”‚
Scientific Analysis

I recommend we do this before implementing the collapsible panels. It will prevent us from adding another large block of UI CSS into map.js.

And importantly, Phase 7.5 remains frozen. This is purely Phase 7.6 cleanup/refinement.
Next: Phase 7.6

We can now safely proceed with the planned:

Phase 7.6 â€” Collapsible Analysis Panels & UI Refinement

including:

Collapsible analysis/statistical panels
UI layout refinement
Moving GIS-specific CSS out of map.js
Creating public/css/gis.css
Removing the corresponding runtime CSS injection from map.js
Preserving all existing Phase 7.5 functionality
Testing after each change
Git checkpoint once Phase 7.6 is verified

And importantly, we will start from this known-good 3,120-line map.js, rather than replacing it with a reconstructed version.

We're back on solid ground. ðŸ‘

can we separate the javascript and html from the map.js?

Yes â€” and I strongly recommend doing it now, before we add more Phase 7.6 UI functionality.

The current map.js has become large because it contains three different responsibilities:

map.js
â”‚
â”œâ”€â”€ GIS / Leaflet JavaScript
â”‚ â”œâ”€â”€ Map initialization
â”‚ â”œâ”€â”€ Sample markers
â”‚ â”œâ”€â”€ Thematic symbology
â”‚ â”œâ”€â”€ Filtering
â”‚ â”œâ”€â”€ Statistics
â”‚ â””â”€â”€ Map interactions
â”‚
â”œâ”€â”€ HTML generation
â”‚ â”œâ”€â”€ Popups
â”‚ â”œâ”€â”€ Legends
â”‚ â”œâ”€â”€ Analysis panel
â”‚ â””â”€â”€ Inspection content
â”‚
â””â”€â”€ CSS
â””â”€â”€ Runtime-injected styles

That's why the file has grown to 3,148 lines.

I suggest this structure
public/
â”‚
â”œâ”€â”€ js/
â”‚ â”œâ”€â”€ app.js
â”‚ â”œâ”€â”€ map.js
â”‚ â”œâ”€â”€ map-ui.js
â”‚ â””â”€â”€ map-popups.js
â”‚
â”œâ”€â”€ css/
â”‚ â”œâ”€â”€ style.css
â”‚ â””â”€â”€ gis.css
â”‚
â””â”€â”€ index.html

But I would not split everything at once.

Phase 7.6A â€” Separate HTML/UI from GIS logic

Keep map.js responsible for GIS functionality:

map.js
â”‚
â”œâ”€â”€ Leaflet map
â”œâ”€â”€ markers
â”œâ”€â”€ thematic maps
â”œâ”€â”€ thematic classification presentation
â”œâ”€â”€ filtering
â”œâ”€â”€ statistics
â”œâ”€â”€ sample state
â””â”€â”€ public GIS APIs

Move HTML generation into:

map-ui.js
â”‚
â”œâ”€â”€ thematic control HTML
â”œâ”€â”€ thematic legend HTML
â”œâ”€â”€ analysis panel HTML
â”œâ”€â”€ sample popup HTML
â”œâ”€â”€ sample inspection HTML
â””â”€â”€ sample labels

So instead of map.js doing:

const html = `    <div class="soil-thematic-analysis-control">
        ...
    </div>`;

we have something like:

const html = buildThematicAnalysisControl(...);

with the HTML-producing function living in map-ui.js.

Phase 7.6B â€” Separate CSS

Then:

public/css/gis.css

contains all GIS-specific styling:

gis.css
â”‚
â”œâ”€â”€ thematic controls
â”œâ”€â”€ thematic legend
â”œâ”€â”€ thematic markers
â”œâ”€â”€ analysis panel
â”œâ”€â”€ sample popup
â”œâ”€â”€ sample labels
â””â”€â”€ map UI

This also eliminates the problem we encountered earlier where /css/gis.css was being requested but wasn't correctly available.

Result

The architecture becomes much cleaner:

                 Soil Analysis GIS
                        â”‚
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚               â”‚                â”‚
      app.js          map.js          map-ui.js
        â”‚               â”‚                â”‚

Application GIS / Leaflet HTML/UI
logic logic generation
â”‚ â”‚ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
â”‚
gis.css
â”‚
Presentation

And importantly, the backend remains untouched.

One important rule

I would not split the current map.js by manually copying large sections and hoping nothing breaks.

We now have a known-good baseline:

3a90635
Complete Phase 7.5 thematic spatial analysis

So we'll refactor from that exact version, preserving every existing public function and API.

I'd do it in this order:

7.6.1 â€” Extract HTML/UI builders â†’ map-ui.js
7.6.2 â€” Extract CSS â†’ gis.css
7.6.3 â€” Add collapsible panels
7.6.4 â€” Test all existing Phase 7.5 functionality
7.6.5 â€” Git commit

That gives us a much more maintainable project without risking the functionality we've just verified.

Phase â€” Collapsible Analysis Panels & UI Refinement

I suggest we treat this as the next focused UI phase, without changing any soil-science logic, thematic classification, map behaviour, or backend services.

Phase objectives

We will work in this order:

Collapsible Analysis Panels
Make the Thematic Analysis panel collapsible.
Preserve its existing statistics and filtering behaviour.
Add clear expand/collapse state.
Keep the panel usable on smaller screens.
UI Refinement
Improve spacing and visual hierarchy.
Refine panel headers and controls.
Improve consistency between:
Map Parameter
Thematic Legend
Thematic Analysis
Sample information
Avoid unnecessary redesign.
Interaction refinement
Keyboard accessibility.
Proper ARIA state for collapsed/expanded panels.
Ensure collapse/expand does not interfere with Leaflet map interaction.
Responsive behaviour
Desktop first.
Check behaviour at smaller browser widths.
Ensure panels don't unnecessarily obscure the map.
Regression testing
Standard map view.
All thematic parameters.
Category filtering.
Show All Samples.
Sample selection.
Complete soil-analysis report.
Thematic statistics.
Panel collapse/expand.
Important architectural boundary

We will not move any scientific logic into the UI.

The architecture remains:

Backend
â†“
Soil analysis
â†“
Scientific classification
â†“
Frontend / GIS
â†“
Presentation + interaction

So this phase is strictly presentation and usability refinement.

Step 1 â€” Inspect the current Phase 7.6.6 UI

Before changing anything, let's establish the exact current state of:

public/
â”œâ”€â”€ index.html
â”œâ”€â”€ css/
â”‚ â”œâ”€â”€ style.css
â”‚ â””â”€â”€ gis.css
â””â”€â”€ js/
â”œâ”€â”€ app.js
â”œâ”€â”€ map.js
â””â”€â”€ map-ui.js

We already know the current thematic analysis builder is in map-ui.js and the Leaflet control lifecycle remains in map.js.

Let's start with the existing Thematic Analysis panel only.

Please paste the current initializeThematicAnalysisControl() function from public/js/map.js and the surrounding .soil-thematic-analysis-\* CSS from public/css/gis.css.

We will make only Step 1 changes, test them, and then move to the next refinement.

Good. Iâ€™ve inspected the archived project code.

Checkpoint 1 â€” Current UI structure

The current application already has these distinct analysis areas:

Selected Soil Sample
selectedSampleContainer
Displays the selected sample card and laboratory information.
Soil Interpretation / Recommendations
soilRecommendationTableBody
Shows fertility, limiting nutrients, soil reaction and salinity.
Management Observations
managementObservationsContainer
Displays backend-generated management observations.
Crop Suitability
cropSuitabilityContainer
Contains suitability scores, factors and crop-specific details.
Soil Management
soilManagementContainer
Loaded from the existing recommendation API.
Thematic Analysis
Existing Leaflet analysis control.
It currently displays samples, measured values, average, minimum, maximum and category distribution.
Important observation

The existing system is already logically separated. Therefore, we should not rebuild the analysis UI.

For this phase, I recommend:

Collapsible Analysis Panels
â”‚
â”œâ”€â”€ Selected Soil Sample
â”œâ”€â”€ Soil Interpretation
â”œâ”€â”€ Management Observations
â”œâ”€â”€ Crop Suitability
â””â”€â”€ Soil Management

while the Thematic Analysis Leaflet control remains a separate map control.

The next step is to inspect the actual index.html layout and existing CSS for these containers, then we can introduce one common collapsible-panel structure without disturbing the existing rendering functions.

Checkpoint 1 complete.

Excellent. Checkpoint 2 â€” UI structure inspection is complete.

The existing rendering code confirms that the analysis content is dynamically populated into dedicated containers, so we can add collapsibility around the containers without changing the backend, API calls, or scientific logic. The current application already uses separate containers for recommendations, observations, crop suitability, and soil management.

Proposed UI pattern

Each major dashboard panel will become:

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Soil Interpretation [âˆ’] â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ â”‚
â”‚ existing content â”‚
â”‚ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

When collapsed:

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Soil Interpretation [+] â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
Design rules for this phase
Use a button, not a clickable <div>.
Keyboard accessible.
aria-expanded will reflect the state.
aria-controls will identify the content.
No scientific logic changes.
No API changes.
No changes to map.js unless genuinely required.
Existing dynamically generated content remains untouched.
Thematic Analysis remains a separate Leaflet map control.
Initially, I recommend Selected Soil Sample expanded and the longer recommendation panels collapsed to reduce dashboard height.
Panels to make collapsible
Panel Initial state
Selected Soil Sample Expanded
Soil Interpretation Collapsed
Management Observations Collapsed
Crop Suitability Collapsed
Soil Management Collapsed

This is the safest implementation because the existing containers can remain exactly where they are while the panel headers become the new UI layer.

Checkpoint 2 complete.

Next we should implement Checkpoint 3: the common collapsible-panel CSS + HTML structure in index.html, then test before touching JavaScript.

---

Yes. We should use this list as the current roadmap sequence, rather than assuming the old Phase numbers.

From the work already completed in this project, the first several items have already been substantially implemented:

Roadmap item Current status
Advanced crop-specific recommendations âœ… Implemented through crop suitability/recommendation work
Nutrient deficiency recommendations âœ… Implemented in soil interpretation/recommendation work
Fertilizer recommendations âœ… Implemented
Crop suitability refinement âœ… Implemented
Soil amendment recommendations âœ… Implemented through soil management recommendations
Spatial interpolation â³ Next major item
Soil fertility zoning â³ Pending
Historical sample comparison â³ Pending
Time-series soil monitoring â³ Pending
Sampling-density analysis â³ Pending
Laboratory quality-control information â³ Pending
State-specific interpretation standards â³ Pending
Crop-specific critical limits â³ Pending
Spatial filtering â³ Pending
Advanced thematic analysis â³ Pending
Map-based analytical queries â³ Pending
Reporting/export functionality â³ Pending

So, yes â€” we should move to Spatial Interpolation next.

But there is an important architectural point

Our previous roadmap explicitly deferred interpolation because it requires scientific decisions around:

sampling density
spatial distribution
interpolation method
distance weighting
variogram assumptions
minimum sample requirements
validation

Therefore, I would not simply add an IDW button and generate a surface.

Proposed next phase: Spatial Interpolation

We should first establish the scientific and technical foundation:

Database / Backend

Soil Samples
â†“
Validated measurements
â†“
Parameter selection
â†“
Spatial suitability checks
â†“
Interpolation method
â†“
Interpolated spatial surface
â†“
REST API

Frontend / GIS

Parameter
â†“
Interpolation control
â†“
Leaflet map
â†“
Interpolated surface
â†“
Legend
â†“
Sample locations overlay

The backend should remain responsible for the scientific calculation. Leaflet should only display the resulting spatial surface.

First implementation decision

I recommend that we start with IDW (Inverse Distance Weighting) as the initial interpolation method rather than jumping directly into Kriging.

We can subsequently introduce other methods as separate, scientifically justified work.

Before modifying anything, I suggest we make this the next formal checkpoint:

Next Phase â€” Spatial Interpolation Foundation & IDW

We will define:

minimum sample requirements,
parameter eligibility,
handling of insufficient/invalid spatial data,
IDW calculation in the backend,
API response structure,
Leaflet visualization,
legend and transparency controls,
validation against the original sample points.

And importantly, we will not modify the working Phase 7.6.1 baseline until the implementation is ready and tested.

We can now begin the Spatial Interpolation phase.

Absolutely. Based on the roadmap you provided, Spatial Interpolation should be our next major development phase.

Since the previous phases established the soil-sample repository, backend analysis/recommendations, Leaflet visualization, thematic mapping, legends, filtering, and dashboard UI, we should build interpolation on top of the current working Phase 7.7 baseline rather than disturbing the existing functionality.

Proposed next phase: Spatial Interpolation

I recommend structuring it as Phase 8 â€” Spatial Interpolation & Continuous Soil-Surface Analysis.

The phase can cover:

Interpolation parameter selection
pH
Nitrogen
Phosphorus
Potassium
Organic Carbon
Electrical Conductivity
Interpolation method
Start with IDW (Inverse Distance Weighting)
Keep the architecture extensible for future Kriging or other methods
Interpolation processing
Use the existing georeferenced soil samples
Generate a continuous spatial surface
Respect the spatial extent of the available samples
Handle insufficient/invalid samples safely
Map visualization
Display the interpolated surface over the Leaflet map
Apply an appropriate continuous color gradient
Allow the user to switch between:
Sample markers
Thematic markers
Interpolated surface
Interpolation controls
Parameter
Method
Search radius / neighborhood
Power parameter for IDW
Grid resolution
Opacity
Show/hide interpolation
Legend
Dynamically generated from the interpolated parameter
Clearly distinguish it from the existing categorical thematic legend
Backend architecture
Keep scientific/spatial calculations in the backend
Keep Leaflet responsible primarily for presentation
Return structured interpolation data to the frontend
Validation
No interpolation when there are too few samples
Handle missing coordinates
Handle missing parameter values
Prevent interpolation outside the valid sample extent
Verify that existing sample/thematic-map functionality remains unaffected
Recommended implementation sequence

I would not implement all of this at once. We should proceed incrementally:

Phase 8.1 â€” Interpolation architecture & backend foundation
â†’ Define API, data structures, validation and IDW engine.

Phase 8.2 â€” IDW interpolation engine
â†’ Generate the interpolation grid from soil samples.

Phase 8.3 â€” Interpolation API
â†’ Expose interpolation results through REST API.

Phase 8.4 â€” Leaflet interpolation layer
â†’ Render the continuous interpolated surface.

Phase 8.5 â€” Interpolation controls & UI
â†’ Parameter/method/resolution/opacity controls.

Phase 8.6 â€” Dynamic interpolation legend
â†’ Integrate with the existing thematic legend system.

Phase 8.7 â€” Validation & refinement
â†’ Edge cases, performance, visual accuracy, regression testing.

Then we can move to:

Phase 9 â€” Soil Fertility Zoning

followed by historical comparison, time-series monitoring, sampling-density analysis, QC information, standards, spatial filtering, advanced analysis, analytical queries, and reporting/export.

Important architectural point

For this project, I recommend not starting with a heavy GIS library or jumping directly to Kriging.

IDW is a very good first interpolation method because it is:

understandable
deterministic
relatively lightweight
suitable for a first operational soil-surface analysis
easy to validate against the known sample points
easy to visualize in Leaflet

Later we can add other methods behind the same interpolation interface without redesigning the UI.

So the next concrete step is Phase 8.1 â€” Interpolation Architecture & Backend Foundation.

Before modifying anything, I would like to work from your current Phase 7.7 project files, especially the current app.js, map.js, map-ui.js, relevant CSS/HTML, soil-sample controller/routes, and database/schema files. If those aren't attached in this conversation, upload the current project files so I can align Phase 8.1 precisely with the code you have now.

IDW calculation

Our first method will be Inverse Distance Weighting.

For a grid location \(x\):

$$ \hat{Z}(x) = \frac{\sum*{i=1}^{n} \frac{Z_i}{d_i^p}} {\sum*{i=1}^{n} \frac{1}{d_i^p}} $$

where:

\(Z_i\) = measured soil value
\(d_i\) = distance from grid location to sample
\(p\) = IDW power
\(\hat{Z}(x)\) = interpolated value

We'll initially use:

Method: IDW
Power: 2
Resolution: configurable

But the implementation should allow us to add other interpolation methods later.

One important scientific safeguard

We should not interpolate across the entire world/map viewport.

The initial interpolation surface should be constrained to the sample extent:

        Sample A              Sample B
             â—----------------â—
             |                |
             |   IDW AREA     |
             |                |
             â—----------------â—
        Sample C              Sample D

This prevents the map from displaying scientifically misleading predictions far outside the sampled area.

Later, when we implement sampling-density analysis and potentially administrative/field boundaries, we can make this considerably more sophisticated.
Excellent â€” Phase 8.1 is working correctly.

Your test confirms all three important pieces:

Server starts successfully.
MySQL connection succeeds.
GET /api/soil-interpolation/config works.
POST /api/soil-interpolation works.
10 usable soil samples were detected.
The pH values are being correctly extracted.
The interpolation extent is being prepared.
The API is ready for the actual interpolation engine.

The limits : @{power=; resolution=} display is just PowerShell's abbreviated formatting of nested objects; it does not indicate that the values are missing.

Phase 8.1 status
Phase 8.1 â€” Interpolation Architecture & Backend Foundation
âœ… COMPLETE

We can now move to Phase 8.2 â€” IDW Interpolation Engine.

In Phase 8.2, we will replace the current "status": "ready" preparation response with the actual Inverse Distance Weighting calculation, while keeping the same API endpoint:

POST /api/soil-interpolation

The engine will:

Retrieve the 10 soil samples.
Select the requested parameter.
Build a grid constrained to the sample extent.
Calculate IDW using the requested power.
Handle the important zero-distance case correctly â€” a grid cell exactly at a sample location receives that sample's measured value.
Return the interpolated grid to the frontend.
Include metadata such as parameter, unit, method, power, resolution, extent, minimum, maximum, and valid-cell count.
Keep all scientific calculations in the backend.

No frontend changes yet. Once the numerical API is verified, Phase 8.4 will connect the result to Leaflet.

We should proceed with Phase 8.2 now, using your existing 10 samples as the validation dataset.

---

Phase 8.3 â€” Definition Step

The phase will be structured as:

Objective â€” what capability Phase 8.3 adds.
Functional requirements â€” exact user-visible behavior.
GIS requirements â€” map layers, controls, legends, interaction.
Scientific boundary â€” what remains strictly backend-controlled.
Frontend/backend interfaces â€” existing APIs to preserve and any new APIs required.
Files expected to change â€” so we don't accidentally modify unrelated functionality.
Acceptance criteria â€” how we'll test the phase.
Git checkpoint â€” commit only after everything passes.

Weâ€™ll treat Phase 8.2 as frozen and build incrementally on top of it.

Next, Iâ€™ll establish the Phase 8.3 specification from the roadmap context before we touch the code.

Great. Iâ€™ve retrieved the roadmap context, and there is an important correction to our earlier discussion.

Phase 8.3 â€” Interpolation API

The roadmap identifies Phase 8.3 as the Interpolation API phase.

The intended sequence was:

Phase 8.1 â€” IDW interpolation engine/backend foundation
Phase 8.2 â€” IDW interpolation frontend integration + UI refinement
Phase 8.3 â€” Interpolation API
Subsequent phases can then build on a stable API layer rather than coupling the UI directly to interpolation internals.
Phase 8.3 objective

Create a clean, stable REST API that exposes the interpolation results generated by the backend.

The key architectural rule remains:

The backend performs the interpolation and scientific computation. The API exposes the results. The frontend/GIS consumes and visualizes those results.

What we should preserve

Phase 8.3 must not disturb the working Phase 8.2 functionality:

10 existing soil samples
thematic parameter selection
thematic marker classification
thematic legend
IDW interpolation rendering
interpolation legend
interpolation status/control
map-based sample entry
soil-analysis reports
dashboard statistics
compact soil-sample modal
existing backend scientific classification logic
Phase 8.3 acceptance criteria

Before committing the phase, we should be able to verify:

Interpolation configuration remains available through the API.
An interpolation request can be submitted through the REST API.
The API returns a consistent structured response.
The response contains the interpolation metadata/results required by the GIS frontend.
Invalid requests receive appropriate API errors.
Existing Phase 8.2 map behavior continues to work unchanged.
No scientific classification logic is moved into the frontend.
The API can be tested independently of the Leaflet UI.
Existing endpoints remain backward-compatible unless the roadmap explicitly requires otherwise.
Development approach

We should not start modifying map.js, map-ui.js, or the CSS just because we're entering 8.3.

First we'll inspect the existing Phase 8.1/8.2 backend interpolation implementation and determine exactly what API layer already exists and what is still missing.

Next step: inspect the existing backend interpolation files. We should do that before writing any Phase 8.3 code.

---

Phase 8.3
515e783 â€” Interpolation REST API

The Phase 8.3 implementation has also been functionally verified:

IDW interpolation succeeds
API reports phase: 8.3
six soil parameters are exposed
IDW power limits are exposed
resolution limits are exposed
50 Ã— 50 grid generates 2,500 cells
invalid parameters return HTTP 400
frontend successfully retrieves the interpolation configuration
Next

We are ready to proceed to Phase 8.4.

Before changing any code, I recommend we first establish exactly what Phase 8.4 should accomplish from the roadmap, so we don't accidentally expand the scope or modify the frozen 8.3 baseline.

---

Roadmap position
Phase Status
8.2 â€” IDW interpolation engine âœ…
8.3 â€” Interpolation API âœ…
8.4 â€” Leaflet interpolation layer âœ…
8.5 â€” Interpolation controls & UI â–¶ï¸ Next
8.6 â€” Dynamic interpolation legend â³
8.7 â€” Validation & refinement â³
9 â€” Soil Fertility Zoning â³

We can now safely proceed from the frozen Phase 8.4 baseline (cad8b41) to Phase 8.5 â€” Interpolation Controls & UI.

Great. Weâ€™re ready to start Phase 8.5 â€” Interpolation Controls & UI.

For this phase, weâ€™ll build on the clean cad8b41 baseline and focus on:

Interpolation parameter selector
pH
Nitrogen
Phosphorus
Potassium
Organic Carbon
Electrical Conductivity
Interpolation method
IDW (currently the backend-supported method)
IDW power control
Backend limits: 0.5â€“10
Default: 2
Grid resolution control
Backend limits: 10â€“200
Default: 50
Surface opacity control
Adjustable frontend presentation property.
Generate / update interpolation action
Use the existing /api/soil-interpolation API.
No scientific calculations duplicated in the frontend.
Clear interpolation action
Remove the surface cleanly without affecting sample markers or thematic symbology.
Keep Phase 8.6 separate
We will not redesign the dynamic interpolation legend yet.

Before modifying anything, I want to inspect the current Phase 8.4 map-ui.js because the existing interpolation controls are already present and we should refine that implementation rather than create a second control system.

Please send me the complete current:

public/js/map-ui.js

Once I have it, I'll review the existing Phase 8.4 UI and give you the complete updated file, preserving everything that already works.

---

Excellent. Phase 8.5 is now successfully committed and pushed to GitHub. âœ…

Git checkpoint
Commit: 9154f16
Message: Phase 8.5 - Interpolation controls and opacity support
Files committed:
public/js/map.js
public/js/map-ui.js
Push: Successful â†’ origin/master
Working tree: Clean
Branch: master is up to date with origin/master
Phase 8.5 â€” FROZEN âœ…

The following are now safely checkpointed:

Spatial interpolation controls
Parameter selection
IDW method selection
Power control
Resolution control
Generate/Clear Surface
Show/Hide interpolation surface
Live interpolation opacity control
Continuous interpolation surface rendering
Existing thematic marker symbology
Separate interpolation and marker legends
Existing dashboard and soil-analysis functionality

We can now move forward from this clean baseline to Phase 8.6 â€” Dynamic Interpolation Legend.

Great. Phase 8.5 is frozen at 9154f16.

We'll proceed to Phase 8.6 â€” Dynamic Interpolation Legend next.

The goal will be to make the interpolation legend dynamically reflect the currently selected interpolation parameter and the actual generated surface statistics, while keeping all scientific calculations in the backend and presentation logic in the GIS frontend.

We'll proceed carefully from the clean Phase 8.5 checkpoint.

Absolutely. Phase 8.6 â€” Dynamic Interpolation Legend is the next step.

We have a good starting point: the current legend already displays the selected parameter, method, power, resolution, minimum, maximum, average, and valid-cell count. So for 8.6, we should refine and complete the dynamic legend rather than rebuild it.

Phase 8.6 objective

The interpolation legend should automatically reflect the currently generated interpolation surface, including:

Parameter
pH
Nitrogen
Phosphorus
Potassium
Organic Carbon
Electrical Conductivity
Unit-aware values
pH
kg/ha
%
dS/m
Dynamic value range
Actual backend minimum
Actual backend maximum
Actual backend average
Interpolation settings
Method
IDW power
Grid resolution
Surface information
Valid interpolated cells
Grid dimensions
Potentially source sample count, if the API result provides it
Dynamic gradient scale
The displayed scale should correspond to the actual generated surface.
No fixed scientific fertility thresholds should be introduced.
Legend lifecycle
New surface â†’ legend updates.
Different parameter â†’ legend updates.
Different power/resolution â†’ legend updates.
Clear surface â†’ legend disappears.
Hide surface â†’ legend disappears.
Show surface again â†’ correct legend returns.
Separation from thematic legend
Interpolation legend remains topright.
Thematic legend remains bottomright.
One important observation

Your current architecture already does most of this correctly:

Backend IDW result
â†“
interpolationResult
â†“
updateInterpolationLegend(data)
â†“
buildInterpolationLegend(container, data)
â†“
Dynamic legend

So I don't want to make unnecessary changes to map.js.

The main Phase 8.6 work should therefore be in map-ui.js, with only a small map.js adjustment if testing shows the legend lifecycle needs it.

Proposed Phase 8.6 checkpoint

After implementation we'll test:

pH
â†“
Generate Surface
â†“
Legend shows pH + actual statistics

Nitrogen
â†“
Generate Surface
â†“
Legend automatically changes to Nitrogen

Change IDW power
â†“
Generate Surface
â†“
Legend reflects new power

Change resolution
â†“
Generate Surface
â†“
Legend reflects new grid

Clear Surface
â†“
Legend disappears

Show Surface
â†“
Correct legend returns

And importantly, we will not modify the backend scientific interpolation engine.

Next step

Since we already have the exact current map.js and map-ui.js, I'll proceed by preparing the complete replacement public/js/map-ui.js for Phase 8.6, preserving all existing Phase 8.5 functionality.

After you replace that file, we'll run the application and inspect the browser console/UI before touching map.js or committing anything.

he interpolation subsystem from Phases 8.2â€“8.7 is now a stable baseline.

Next: Phase 9 â€” Soil Fertility Zoning

This is the next major subsystem:

Soil samples â†’ scientifically classified soil parameters â†’ fertility classification â†’ spatial fertility zones â†’ Leaflet visualization

And we'll preserve the project's core architecture:

Scientific classification stays in the backend. GIS stays responsible for spatial presentation.

I recommend we do not start coding immediately. First, we'll establish the Phase 9 design and acceptance criteria against the frozen Phase 8.7 baseline, then implement it one controlled step at a time.

When you're ready, we'll begin with Phase 9.1 â€” Soil Fertility Zoning Design & Data Model.

Absolutely. We should work out Phase 9 completely before touching code, just as we did with Phase 8.

Phase 9 â€” Soil Fertility Zoning

Phase 8 established a continuous interpolation subsystem. Phase 9 should build the decision-support layer above it.

The key architectural distinction should remain:

Interpolation estimates continuous soil-property values.
Fertility zoning converts scientifically classified soil conditions into spatial management zones.

9.1 What Phase 9 should produce

The final GIS should be able to show something like:

                    SOIL SAMPLES
                         â”‚
                         â–¼
              Backend soil analysis
                         â”‚
          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
          â–¼                             â–¼

Parameter classes Overall fertility
pH / N / P / K / OC / EC classification
â”‚ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
â–¼
Spatial zoning engine
â”‚
â–¼
Fertility Zone Grid
â”‚
â–¼
Leaflet GIS layer
â”‚
â–¼
Fertility Zoning Legend

The important point is that Phase 9 should not simply color the existing IDW raster differently.

Instead, it should create a scientifically meaningful fertility classification surface.

9.2 Proposed Phase 9 architecture

I recommend splitting Phase 9 into the following phases.

Phase 9.1 â€” Zoning Design & Data Model

Define:

what a fertility zone means
classification hierarchy
required inputs
zone calculation rules
grid structure
API contract
frontend responsibilities
acceptance criteria

No code initially.

Phase 9.2 â€” Backend Fertility Zoning Engine

Create a backend service responsible for:

obtaining soil analysis information
applying authoritative fertility rules
generating the zoning grid
assigning each grid cell a fertility class
calculating zone statistics
returning the complete zoning result

The backend remains the scientific authority.

Phase 9.3 â€” Fertility Zoning REST API

Expose the engine through something like:

/api/soil-fertility-zoning

Potential endpoints:

GET /config
POST /

The API should provide:

zoning configuration
supported classification scheme
grid resolution
zone definitions
statistics
grid cells
source sample information
Phase 9.4 â€” Leaflet Fertility Zone Layer

Frontend GIS will:

receive the zoning grid
render the zones
overlay them on the map
preserve sample markers
preserve existing interpolation functionality
support visibility toggling

Again:

Frontend does not calculate fertility.

Phase 9.5 â€” Zoning Controls & UI

Add controls for:

fertility zoning on/off
resolution
zoning method/scheme
opacity
regenerate
clear

Potentially:

Soil Fertility Zoning
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Status Ready

Classification
[ Overall Fertility â–¼ ]

Resolution
[ 50 Ã— 50 ]

Opacity
[â”€â”€â”€â”€â”€â”€â—â”€â”€â”€â”€] 60%

[ Generate Zones ]

[ Hide Zones ]
Phase 9.6 â€” Dynamic Fertility Legend

Similar to Phase 8.6, but this time the legend represents classes, not a continuous numerical gradient.

For example:

SOIL FERTILITY ZONING

Overall Fertility

â–ˆâ–ˆâ–ˆâ–ˆ Very Low
â–ˆâ–ˆâ–ˆâ–ˆ Low
â–ˆâ–ˆâ–ˆâ–ˆ Moderate
â–ˆâ–ˆâ–ˆâ–ˆ High
â–ˆâ–ˆâ–ˆâ–ˆ Very High

The exact classes must come from the authoritative backend standard.

Phase 9.7 â€” Validation & Refinement

Test:

different sample counts
missing values
mixed fertility conditions
uniform fertility
edge cases
resolution
zone boundaries
map alignment
marker visibility
legend behavior
repeated regeneration
source-sample changes
regression against Phase 8

Then freeze Phase 9.

9.3 The most important design decision

Before we implement anything, we need to decide what exactly constitutes a fertility zone.

I recommend not defining fertility from a simple average of pH, N, P, K, OC and EC.

For example, this would be scientifically weak:

pH score + N score + P score + K score + OC score + EC score
â†“
average
â†“
fertility zone

Instead, we should preserve the individual scientifically classified parameters and derive an overall fertility class from them using an explicit backend rule.

Conceptually:

pH classification
â”‚
N classification
â”‚
P classification
â”‚
K classification â”€â”€â”€â–º Overall Fertility Rule â”€â”€â”€â–º Zone
â”‚
OC classification
â”‚
EC classification

This makes the zoning system:

explainable
auditable
deterministic
reproducible
consistent with the existing soil-analysis engine.
9.4 A particularly important issue: interpolation vs zoning

We need to be careful here.

Phase 8 gives us:

continuous estimated value

For example:

pH
5.2 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ 6.1 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ 7.4

Phase 9 should produce:

classified fertility condition

For example:

Low fertility
Low fertility
Moderate fertility
High fertility

Therefore:

Phase 8

measured samples â†’ IDW â†’ continuous estimated values

Phase 9

spatial soil conditions â†’ scientifically classified fertility zones

That distinction should be explicit in the architecture and documentation.

9.5 Proposed zoning grid

We should probably reuse the spatial structure established in Phase 8.

For example:

Grid
50 Ã— 50

â”Œâ”€â”€â”€â”¬â”€â”€â”€â”¬â”€â”€â”€â”¬â”€â”€â”€â”¬â”€â”€â”€â”
â”‚ H â”‚ H â”‚ M â”‚ M â”‚ L â”‚
â”œâ”€â”€â”€â”¼â”€â”€â”€â”¼â”€â”€â”€â”¼â”€â”€â”€â”¼â”€â”€â”€â”¤
â”‚ H â”‚ H â”‚ M â”‚ L â”‚ L â”‚
â”œâ”€â”€â”€â”¼â”€â”€â”€â”¼â”€â”€â”€â”¼â”€â”€â”€â”¼â”€â”€â”€â”¤
â”‚ H â”‚ M â”‚ M â”‚ L â”‚ L â”‚
â”œâ”€â”€â”€â”¼â”€â”€â”€â”¼â”€â”€â”€â”¼â”€â”€â”€â”¼â”€â”€â”€â”¤
â”‚ M â”‚ M â”‚ L â”‚ L â”‚ L â”‚
â””â”€â”€â”€â”´â”€â”€â”€â”´â”€â”€â”€â”´â”€â”€â”€â”´â”€â”€â”€â”˜

Each cell could contain something like:

{
row: 12,
column: 24,
latitude: ...,
longitude: ...,
fertilityClass: "Moderate"
}

But the precise structure should be finalized in 9.1 before implementation.

9.6 What should happen when data is missing?

This is another critical design decision.

Suppose a sample has:

pH âœ“
Nitrogen âœ“
Phosphorus âœ“
Potassium âœ“
OC âœ—
EC âœ“

We should not silently assume OC is normal.

Likewise, we shouldn't manufacture a fertility class from incomplete data without documenting the rule.

Possible output:

Insufficient Data

This would be preferable to inventing a fertility classification.

The zoning system should therefore distinguish:

Very Low
Low
Moderate
High
Very High
Insufficient Data

if the final scientific rule supports those classes.

9.7 What I recommend for the first implementation

I would structure Phase 9 around Overall Soil Fertility, rather than immediately creating six independent zoning systems.

So the first zoning product would be:

Overall Soil Fertility Zone

Later we could potentially add:

Nitrogen fertility zones
Phosphorus fertility zones
Potassium fertility zones
pH suitability zones
salinity zones
organic-carbon zones

But those should be separate analytical products rather than mixing everything into the first implementation.

9.8 Phase 9 success criteria

Before calling Phase 9 complete, we should be able to demonstrate:

Scientific
Backend determines fertility classification.
Classification rules are explicit.
Missing data is handled explicitly.
No fertility thresholds are invented in frontend code.
Spatial
Zones cover the intended sample extent.
Grid orientation is correct.
Grid resolution is consistent.
Zone boundaries align with the underlying spatial model.
GIS
Fertility zones render correctly.
Sample markers remain visible.
Existing thematic maps remain functional.
Existing IDW interpolation remains functional.
Zone opacity works independently.
UI
Fertility zoning has its own controls.
Fertility legend is separate from:
marker legend
interpolation legend
Legend updates dynamically.
Hide/show does not unnecessarily regenerate data.
Regression
Existing Phase 8 functionality remains intact.
Existing sample creation remains intact.
Existing analysis reports remain intact.
Existing interpolation remains intact.
9.9 Proposed Phase 9 roadmap

I suggest we freeze the following plan:

Phase Work Status
9.1 Zoning Design & Data Model ðŸ”œ Next
9.2 Backend Fertility Zoning Engine Planned
9.3 Fertility Zoning REST API Planned
9.4 Leaflet Fertility Zone Layer Planned
9.5 Zoning Controls & UI Planned
9.6 Dynamic Fertility Legend Planned
9.7 Validation & Refinement Planned

And the current frozen baseline is:

Phase 8.2 IDW Engine âœ… Frozen
Phase 8.3 Interpolation API âœ… Frozen
Phase 8.4 Leaflet Interpolation Layer âœ… Verified
Phase 8.5 Interpolation Controls âœ… Frozen
Phase 8.6 Dynamic Interpolation Legend âœ… Frozen
Phase 8.7 Validation & Refinement âœ… Frozen
Phase 9 Soil Fertility Zoning ðŸ”œ
My recommendation for the next discussion

Before writing any Phase 9 code, let's work through 9.1 in detail, specifically these four decisions:

What is the authoritative Overall Fertility classification rule?
How should pH, N, P, K, OC and EC classifications combine?
How should incomplete/missing soil measurements affect a zone?
Should zoning be based directly on interpolated continuous values, or should we construct a separate zoning algorithm from classified sample conditions?

Those decisions determine the scientific validity of the entire Phase 9 subsystem, so I would settle them before creating fertilityZoningService.js.

---

Absolutely. Weâ€™ll proceed one controlled step at a time, just as with the previous phases.

For Phase 9.5 â€” Zoning Controls & UI, the architecture should be:

Phase 9.3 Backend API
â†“
Phase 9.4 Leaflet fertility-zone layer
â†“
Phase 9.5 Zoning Controls & UI â† CURRENT
â†“
Phase 9.6 Dynamic Fertility Legend
â†“
Phase 9.7 Validation & Refinement
What Phase 9.5 will add

We will add a dedicated Soil Fertility Zoning Leaflet control that allows the user to:

Generate the overall fertility zoning surface
Set IDW Power
Set Grid Resolution
Generate / regenerate the zoning
Show/hide the zoning layer
Clear the zoning layer
See generation status
Prevent duplicate generation requests while one is running

The control will use the existing Phase 9.3 API and the Phase 9.4 functions. No scientific classification or thresholds will be added to the UI.

We will also preserve:

Existing Map Parameter control
Thematic marker controls
Interpolation controls
Interpolation opacity
Interpolation legend
Sample labels
Direct map sample entry
Existing Leaflet control positioning

And importantly, Phase 9.6's fertility legend will not be implemented yet.

Files expected to change

For 9.5, the likely changes are:

public/js/map-ui.js â† UI/HTML generation
public/js/map.js â† control state + event handling
public/css/gis.css â† zoning-control presentation

We should not touch app.js.

Before I give you replacement code, I want to work from your actual current Phase 9.4 files, rather than risk overwriting any of the UI refinements you already made.

Please provide the current:

public/js/map-ui.js
public/css/gis.css

You can upload both together:

Upload a file

Once I have them, I'll make the Phase 9.5 changes against those exact versions, and we'll test the control before making the Git checkpoint.

---

Based on the completed map.js, the natural next step is Phase 9.5 â€” Zoning Controls & UI, building on the Phase 9.4 fertility-zoning backend/layer implementation while preserving the existing Phase 8.5 interpolation UI.

Phase 9.5 focus

We should add the frontend controls and presentation layer for:

Overall Soil Fertility Zoning
Generate zoning
Clear zoning
Show / hide zoning
Zoning legend
Zoning status
Power / resolution controls
Proper separation from the existing interpolation and thematic controls
Consistent Leaflet control positioning
No scientific classification logic in the frontend

Importantly, I would not modify the existing fertility classification logic in map.js. Your current implementation correctly treats the backend as authoritative.

Before I start changing anything, send me the current map-ui.js and gis.css files (complete files, in parts if necessary). Those are the files we need to integrate Phase 9.5 cleanly without breaking the existing interpolation/thematic UI.

Excellent. We have the complete map.js + map-ui.js + gis.css Phase 9.4 baseline.

Phase 9.5 â€” Zoning Controls & UI

We can now proceed with the frontend UI layer for Overall Soil Fertility Zoning.

What we will add

1. Fertility Zoning control

Generate Zoning
Clear Zoning
Power
Resolution
Show/Hide Zoning
Status indicator
Collapsible panel

2. Fertility Zoning legend

Low
Moderate / Good
High
Unavailable
Cell counts
Clear separation from:
Thematic legend
Interpolation legend

3. UI state handling

Generate button disabled while processing
Clear button
Visibility checkbox enabled only after a zoning result exists
Status states:
Idle
Loading
Success
Error

4. Presentation only
   The frontend will not calculate fertility classes.

The backend remains authoritative for:

N + P + K + Organic Carbon â†’ Overall Fertility Class

The frontend will only display the backend's returned zoning classes.

Planned Leaflet positioning

To preserve the separation we already established:

UI Position
Thematic Map Control Top-left
Interpolation Control Top-left
Fertility Zoning Control Top-left
Sample Labels Top-right
Interpolation Legend Top-right
Thematic Legend Bottom-right
Fertility Zoning Legend Bottom-right
Thematic Analysis Bottom-left

We'll also add explicit spacing/z-index rules so the fertility zoning legend does not get merged into or overlap the interpolation/thematic legends.

Files to update

For Phase 9.5, the main changes will be:

public/js/map-ui.js
public/css/gis.css
public/js/map.js â€” only the UI integration hooks, since the Phase 9.4 zoning engine is already present.

We should not touch the backend zoning service/API unless testing reveals an actual API issue.

Implementation order

I recommend:

Step 9.5.1 â€” map-ui.js

Add zoning control builder
Add zoning status UI
Add zoning visibility UI
Add zoning legend builder

Step 9.5.2 â€” gis.css

Style zoning panel
Style zoning buttons/inputs
Style status
Style legend
Add control/legend separation rules
Add responsive behavior

Step 9.5.3 â€” map.js

Initialize zoning control
Connect Generate/Clear callbacks
Connect visibility checkbox
Connect zoning legend
Connect status updates
Preserve existing Phase 9.4 zoning logic

Step 9.5.4 â€” Browser validation

Generate zoning
Verify grid
Verify four-class presentation
Toggle visibility
Clear zoning
Test interpolation + zoning together
Test thematic legend + zoning legend together
Test collapsed/expanded controls

Let's start with Step 9.5.1: public/js/map-ui.js.

---

Phase 9.6 status
Item Status
Dynamic fertility legend âœ…
Backend classification remains authoritative âœ…
Dynamic class counts âœ…
Low / Moderate-Good / High / Unavailable âœ…
Legend collapse/expand âœ…
Clear removes legend âœ…
Regeneration rebuilds legend âœ…
Counts update after parameter changes âœ…
No JavaScript errors âœ…
Git checkpoint âœ… 2db8521
Next: Phase 9.7 â€” Validation & Refinement

We should not immediately modify code. Phase 9.7 should first be a structured validation pass over the complete fertility-zoning workflow:

Generate zoning with default settings.
Verify surface rendering.
Verify legend classes and counts.
Change IDW power and regenerate.
Confirm counts change appropriately.
Collapse/expand legend.
Clear zoning.
Confirm surface, legend, and status are cleared.
Regenerate after Clear.
Verify existing thematic/interpolation functionality remains unaffected.
Check browser console for errors.
Only then make targeted refinements if something actually fails.

This keeps the 9.7 validation phase separate from the completed 9.6 implementation and preserves our clean checkpoint.

---

Where we are now

Your project has reached:

Phase 9.2 â€” Fertility Zoning Engine âœ…
Phase 9.3 â€” Fertility Zoning REST API âœ…
Phase 9.4 â€” Fertility Zoning Leaflet Layer âœ…
Phase 9.5 â€” Zoning Controls & UI âœ…
Phase 9.6 â€” Dynamic Fertility Legend âœ…
Phase 9.7 â€” Validation & Refinement âœ…

The important architectural principle remains:

Backend = scientific analysis and classification
GIS frontend = visualization, interaction, and presentation

We should preserve that.

What I recommend next

Rather than jumping directly into another feature, I recommend we start Phase 10 â€” Analytical Integration & Map Refinement.

The purpose of Phase 10 should be to take the three major spatial-analysis capabilities we now have:

                    SOIL SAMPLES
                         â”‚
             â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
             â†“           â†“           â†“
         THEMATIC     IDW          FERTILITY
          ANALYSIS INTERPOLATION     ZONING
             â”‚           â”‚           â”‚
             â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                         â†“
                  UNIFIED GIS VIEW

and make them behave as a coherent analytical GIS rather than as three independently implemented features.

Proposed Phase 10 sequence

I suggest:

Phase 10.1 â€” Analytical Layer State Management

Define clearly how the map manages:

thematic markers
interpolation surface
fertility zoning surface
visibility
clearing
regeneration
active analytical mode

No scientific logic changes.

Phase 10.2 â€” Analytical Layer Interaction

Ensure that activating/deactivating analytical layers behaves predictably.

For example:

Generate interpolation â†’ interpolation appears.
Generate fertility zoning â†’ zoning appears.
Clear one â†’ only that layer disappears.
Existing sample markers remain intact.
Thematic analysis remains available.
No layer accidentally removes another layer.

Phase 10.3 â€” Unified Legend & Status Behavior

Bring the presentation behavior of:

Thematic Legend
Interpolation Legend
Fertility Zoning Legend

into a consistent UI pattern.

This is presentation only; backend classifications remain untouched.

Phase 10.4 â€” Analytical Controls Refinement

Review:

Generate
Clear
Visibility
Power
Resolution
Opacity
Collapse/expand

for consistency and predictable interaction.

Phase 10.5 â€” Regression & Performance Validation

Test the complete system with the current 9 samples:

Samples
â†“
Thematic Analysis
â†“
Interpolation
â†“
Fertility Zoning
â†“
Clear / regenerate / change parameters
â†“
All layers remain stable

Only after this passes would we freeze Phase 10.

But we should NOT start coding Phase 10 yet

There is one thing I want to do first.

We have just completed a fairly large analytical feature set. Before adding another feature, we should inspect the current project structure and current map.js architecture so that Phase 10 is based on the actual codeâ€”not assumptions from older phases.

---

I want to adjust our Phase 10 plan slightly

After looking at the actual Git history, I don't think we should immediately introduce a broad "Analytical Integration" feature.

Your application has just completed the entire fertility-zoning stack:

9.2 Backend engine
â†“
9.3 REST API
â†“
9.4 Leaflet layer
â†“
9.5 Controls & UI
â†“
9.6 Dynamic legend
â†“
9.7 Validation

That is a complete vertical feature.

The safest next development step is therefore:

Phase 10 â€” Analytical GIS Integration

But we'll build it incrementally.

Phase 10.1 â€” Analytical Layer State & Visibility

Goal: establish a clean, predictable state model for the three analytical presentations.

                  Soil Samples
                       â”‚
          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
          â†“            â†“            â†“
      Thematic      IDW Surface   Fertility
       Markers                    Zoning
          â”‚            â”‚            â”‚
          â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â†“
                 Leaflet Map

10.1 will specifically address
Thematic layer state
active parameter
marker visibility
thematic legend state
Interpolation state
generated/not generated
visible/hidden
opacity
interpolation legend
Fertility zoning state
generated/not generated
visible/hidden
zoning legend
current result
Clear operations
clearing interpolation must not affect fertility zoning
clearing fertility zoning must not affect interpolation
clearing analytical presentation must not remove soil samples
Regeneration
new analytical results replace the previous result cleanly
legends always correspond to the latest result
What we will NOT do

We will not:

change backend soil classification
change IDW mathematics
change fertility-zone classification
add new scientific calculations
redesign the UI
rewrite map.js
introduce unnecessary abstractions

This is an important distinction: 10.1 is an architectural refinement, not a new scientific feature.

---

Phase 10.1 should therefore change

I don't recommend adding another state-management layer.

Instead, Phase 10.1 should become an Analytical Layer Independence Validation & Refinement phase.

The key question is:

Can all three analytical presentations coexist and be independently controlled without one operation accidentally affecting another?

That's a much more valuable test of the current architecture.

Phase 10.1 validation matrix

We need to verify these combinations:

Operation Soil Samples Thematic Interpolation Fertility
Generate Interpolation Remain Remain ON Unchanged
Clear Interpolation Remain Remain OFF Remains
Generate Fertility Remain Remain Remains ON
Clear Fertility Remain Remain Remains OFF
Change thematic parameter Remain Updates Remains Remains
Refresh Map Reload Preserved/updated Verify Verify
Clear + regenerate Remain Remain Correct Correct

This is where we'll potentially find a real Phase 10 issue.

Phase 10.1 â€” Validation Matrix

We can now proceed to the actual UI validation.

Your application currently has:

Soil Samples
â”‚
â”œâ”€â”€ Thematic markers
â”‚
â”œâ”€â”€ Interpolation surface
â”‚
â””â”€â”€ Fertility zoning surface

We'll deliberately test them together.

Test 1 â€” Interpolation independence
Generate Fertility Zoning.
Confirm fertility surface + legend.
Generate Interpolation.
Confirm interpolation surface + legend.
Confirm fertility surface still remains.

Then:

Clear Interpolation.
Confirm interpolation disappears.
Confirm interpolation legend disappears.
Confirm fertility zoning remains.
Test 2 â€” Fertility independence

Starting with fertility available:

Generate interpolation again.
Confirm both surfaces are present.
Clear Fertility Zoning.
Confirm fertility surface disappears.
Confirm fertility legend disappears.
Confirm interpolation remains.
Test 3 â€” Thematic independence

With an analytical surface visible:

Change thematic parameter from Standard Sample View to pH.
Confirm sample marker symbology changes.
Confirm interpolation/fertility surface remains.
Change to another parameter, e.g. Nitrogen.
Confirm the analytical surfaces remain unaffected.
Test 4 â€” Source-data refresh

This is the most important one.

With interpolation and/or fertility zoning generated:

Click Refresh Map.
Confirm the 9 samples reload.
Confirm old interpolation is removed.
Confirm old fertility zoning is removed.
Confirm their legends disappear.
Confirm the application does not display stale analytical results.
Confirm the status tells you to regenerate the affected analysis.

This behavior is expected based on the code we just inspected.

Test 5 â€” Regeneration

After Refresh:

Generate interpolation.
Generate fertility zoning.
Confirm both return correctly.
Confirm their legends correspond to the new results.

---

Yes. This is the agreed Phase 10 roadmap, and we should follow it exactly.

Your definition makes an important distinction: Phase 10.1 is not an analytical/scientific feature phase. It is the state-and-presentation architecture needed before we add further analytical GIS capabilities.

Phase 10.1 status

Based on the work and testing completed so far:

Requirement Status
Thematic layer state âœ…
Active parameter âœ…
Marker visibility âœ…
Thematic legend state âœ…
Interpolation generated/not generated âœ…
Interpolation visible/hidden âœ…
Interpolation opacity âœ…
Interpolation legend âœ…
Fertility generated/not generated âœ…
Fertility visible/hidden âœ…
Fertility legend âœ…
Current analytical results âœ…
Independent interpolation clear âœ…
Independent fertility clear âœ…
Analytical clear preserves samples âœ…
Regeneration replaces previous result âœ…
Legends correspond to latest result âœ…
UI remains operational âœ…
No backend scientific changes âœ…
No IDW mathematics changes âœ…
No fertility classification changes âœ…

The combined testing already demonstrated the critical independence behavior:

                    Soil Samples
                         â”‚
             â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
             â–¼           â–¼           â–¼
         Thematic      IDW        Fertility
         Markers     Surface       Zoning
             â”‚           â”‚           â”‚
             â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                         â–¼
                    Leaflet Map

And, importantly:

Clear IDW
â†“
Fertility remains

Clear Fertility
â†“
IDW remains

Clear analytical presentation
â†“
Soil samples remain
Therefore, let's freeze 10.1

I would not make any more changes to Phase 10.1 merely to perfect the legend appearance.

The remaining UI behavior can be treated as a presentation refinement and deferred. We don't want to consume development time or introduce risk into the now-working analytical layer architecture.

Now we move to Phase 10 â€” Analysis

However, I want to make one thing explicit:

We should not invent a Phase 10.2 specification yet.

The next step should be to determine what you mean by the Analysis Part of Phase 10 and map it against what the project already has.

The distinction should be:

PHASE 10.1
Analytical Layer State & Visibility
â”‚
â”‚ â† completed/frozen
â–¼
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
PHASE 10 â€” ANALYTICAL GIS INTEGRATION
â”‚
â–¼
Next analytical capability

And we continue to preserve your core architectural principle:

Backend = scientific authority
GIS = spatial presentation and interaction

So before writing any new code, we should inspect the existing analysis backend and identify what is already available versus what Phase 10 still needs.

Next step

Send me the current Analysis-related backend code (or the relevant files).

I will first produce an Analysis Baseline Audit with only:

Existing analytical calculations
Existing analytical endpoints
Existing soil parameters
Existing statistical analysis
Existing fertility analysis
Existing spatial analysis
What is already complete
What is missing
What should become the next incremental Phase 10.x

No code changes until that audit is complete.

---

Phase 10 â€” Analysis Baseline

The existing backend already has a well-separated analytical pipeline:

                         SOIL SAMPLE
                             â”‚
                             â–¼
                 soilAnalysisService
                             â”‚
             â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
             â–¼               â–¼               â–¼
        Classifications   Overall         Raw Values
                         Fertility
             â”‚               â”‚
             â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜
                     â–¼
            soilRecommendationService
                     â”‚
       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
       â–¼             â–¼              â–¼
    Nutrients    Soil Reaction   Salinity
       â”‚             â”‚              â”‚
       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                     â–¼
            soilManagementService
                     â”‚
                     â–¼
              Management Plan
                     â”‚
                     â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                     â–¼                  â–¼
          cropSuitabilityService   Management
                     â”‚
                     â–¼
              Crop Ranking
                     â”‚
                     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                                  â–¼
                       soilAnalysisReportService
                                  â”‚
                                  â–¼
                         COMPLETE REPORT

And spatially:

                       SOIL SAMPLES
                            â”‚
              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
              â–¼                           â–¼
     interpolationService       fertilityZoningService
              â”‚                           â”‚
              â–¼                           â–¼
         IDW Surface                N / P / K / OC
              â”‚                     interpolation
              â”‚                           â”‚
              â”‚                    classification
              â”‚                           â”‚
              â”‚                    overall fertility
              â–¼                           â–¼
       Analytical Surface             Zones

1. soilAnalysisService â€” Scientific Authority

This remains the single source of truth for laboratory classification.

It owns:

pH classification
N classification
P classification
K classification
Organic Carbon classification
EC/salinity classification
overall fertility classification

No Phase 10 work should duplicate these rules.

2. soilRecommendationService â€” Interpretation

This consumes the scientific classifications and determines:

limiting nutrients
nutrient status
soil reaction interpretation
salinity interpretation
management observations

Again, this should remain the interpretation authority.

3. soilManagementService â€” Management Guidance

This consumes the interpretation and produces general management guidance.

It does not calculate science.

Its existing output is already suitable for reporting and future GIS presentation.

4. cropSuitabilityService â€” Decision Support

This is an important distinction.

Crop suitability is not soil fertility classification.

It independently evaluates three suitability factors:

Soil Texture 40%
Soil Reaction 30%
Salinity 30%

It then produces:

0â€“34 Unsuitable
35â€“49 Marginal
50â€“64 Moderately Suitable
65â€“79 Suitable
80â€“100 Highly Suitable

It also reports:

positive factors
limiting factors
management considerations
fertility context
data completeness
assessment confidence
crop ranking

This is a good separation because fertility is contextual information rather than a component of the crop suitability score.

Particularly important

The service deliberately treats missing suitability information as unknown, not unsuitable.

For example:

Texture available 40%
pH unavailable 0%
EC available 30%

Completeness 70%
Confidence Moderate

The missing pH does not automatically reduce the score.

That is an intentional design decision and should be preserved.

Phase 10 Architectural Conclusion

We now have enough information to establish an important principle:

Phase 10 should integrate existing analytical outputs spatially; it should not create another soil-analysis engine.

The system already knows how to analyze an individual sample.

The system already knows how to interpolate spatial laboratory values.

The system already knows how to generate fertility zones.

What is still missing is the analytical interpretation layer that connects those spatial results to the existing soil-analysis/report architecture in a controlled GIS manner.

Proposed Phase 10.2 â€” Spatial Analytical Interpretation

I recommend that the next phase be:

Phase 10.2 â€” Spatial Analytical Interpretation
Goal

Provide a backend-authoritative spatial analytical result that allows the GIS to answer:

â€œWhat does this location on the soil map mean analytically?â€

This should build on the existing:

soil analysis service
recommendation service
crop suitability service
management service
interpolation service
fertility zoning service

rather than replacing them.

10.2 Proposed architecture
MAP LOCATION
â”‚
â–¼
Spatial Analytical Query
â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â–¼ â–¼ â–¼
IDW analytical Fertility Sample context
values zone
â”‚ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
â–¼
Spatial Interpretation Layer
â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â–¼ â–¼ â–¼
Classification Fertility Crop suitability
/ soil status context context
â”‚ â”‚ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
â–¼
Analytical Result
â”‚
â–¼
GIS / Report

The key word here is interpretation.

It should not recalculate the science.

What Phase 10.2 should establish
A. Spatial analytical query

Given a map location, the backend should be able to determine the applicable analytical information.

Conceptually:

latitude
longitude
â”‚
â–¼
spatial analytical result

The result could eventually contain:

Location
â”‚
â”œâ”€â”€ Nitrogen
â”‚ â”œâ”€â”€ interpolated value
â”‚ â””â”€â”€ classification
â”‚
â”œâ”€â”€ Phosphorus
â”‚ â”œâ”€â”€ interpolated value
â”‚ â””â”€â”€ classification
â”‚
â”œâ”€â”€ Potassium
â”‚ â”œâ”€â”€ interpolated value
â”‚ â””â”€â”€ classification
â”‚
â”œâ”€â”€ Organic Carbon
â”‚ â”œâ”€â”€ interpolated value
â”‚ â””â”€â”€ classification
â”‚
â”œâ”€â”€ Overall Fertility
â”‚
â”œâ”€â”€ Soil Texture
â”‚
â”œâ”€â”€ Soil Reaction
â”‚
â”œâ”€â”€ Salinity
â”‚
â””â”€â”€ Analytical metadata

But only values that are actually supported by the existing spatial engines should be returned.

B. Preserve the interpolation â†’ classification sequence

This is critical.

For N/P/K/OC:

sample values
â†“
IDW interpolation
â†“
continuous value
â†“
existing classifier
â†“
classification

Never:

sample classifications
â†“
interpolate categories

The existing fertility zoning architecture already follows the correct approach, so 10.2 should reuse that principle.

C. Overall fertility must remain authoritative

The spatial result should use the existing:

assessOverallFertility()

rather than creating a new Phase 10 fertility formula.

Therefore:

N classification
P classification
K classification
OC classification
â”‚
â–¼
assessOverallFertility()
â”‚
â–¼
Overall Fertility
D. Crop suitability should remain separate

This is another important architectural boundary.

We should not turn:

fertility zone

into:

crop suitability zone

because the crop suitability engine uses:

Texture
Soil Reaction
Salinity

with its own weighted model.

Therefore Phase 10.2 should preserve:

                    Soil Analysis
                         â”‚
            â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
            â–¼                         â–¼
     Fertility assessment       Crop suitability
            â”‚                         â”‚
       N/P/K/OC                  Texture/pH/EC

These are related but different analytical products.

E. Confidence / data completeness

The existing crop suitability service already establishes an excellent pattern:

Analytical result +
Data completeness +
Assessment confidence

Phase 10.2 should follow the same philosophy where applicable.

The GIS should not imply that:

â€œNo dataâ€ = â€œpoor soil.â€

Instead:

Unavailable

should remain distinct from:

Low

This is particularly important for spatial interpolation where individual laboratory parameters may be missing.

What Phase 10.2 should NOT do

I recommend explicitly freezing these boundaries:

âŒ No new soil thresholds
âŒ No new fertility formula
âŒ No new IDW mathematics
âŒ No crop-specific fertilizer rates
âŒ No irrigation scheduling
âŒ No yield prediction
âŒ No frontend scientific calculations
âŒ No interpolation of categorical labels
âŒ No replacement of existing services
âŒ No UI redesign
âŒ No large map.js rewrite
Proposed Phase 10.2 implementation sequence

I would implement it incrementally in this order:

10.2.1 â€” Define spatial analytical result contract

First establish exactly what a spatial analytical query returns.

No UI changes.

10.2.2 â€” Backend spatial interpretation service

Create the smallest service necessary to combine existing spatial analytical outputs.

No new scientific rules.

10.2.3 â€” Spatial analytical API endpoint

Expose the result through the existing Express API architecture.

10.2.4 â€” Backend validation

Test:

valid coordinate
outside analytical extent
missing parameter
incomplete samples
fertility zone
classification consistency
regeneration behavior
10.2.5 â€” GIS integration

Only after the backend contract is verified should map.js consume it.

Phase 10 roadmap now

I would therefore freeze the roadmap as:

Phase 10 â€” Analytical GIS Integration
â”‚
â”œâ”€â”€ 10.1 â€” Analytical Layer State & Visibility
â”‚ âœ“ Completed / validated
â”‚
â”œâ”€â”€ 10.2 â€” Spatial Analytical Interpretation
â”‚ â†’ Next
â”‚
â”œâ”€â”€ 10.3 â€” Spatial Soil Analysis
â”‚ â†’ Later
â”‚
â”œâ”€â”€ 10.4 â€” Spatial Crop Suitability
â”‚ â†’ Later
â”‚
â””â”€â”€ 10.5 â€” Integrated Analytical GIS Reporting
â†’ Later

I am intentionally not defining 10.3â€“10.5 in implementation detail yet. We should first complete 10.2 and see exactly what capabilities the existing backend gives us.

Current status

No code changes are required from the two services you just supplied.

The backend analysis architecture is sufficiently understood now. The next step should be to agree on the 10.2 specification before touching code, exactly following your incremental workflow.

If you approve this Phase 10.2 direction, we can proceed to the 10.2.1 spatial analytical result contract firstâ€”without changing the existing UI or scientific services.

---

Excellent. interpolationService.js confirms the architectural point we needed.

The existing IDW engine already exposes calculateIDWValue() publicly, so we do not need to duplicate the IDW mathematics for Phase 10.2.

More importantly, it confirms that the spatial analytical result needs to distinguish between interpolated properties and sample-derived properties.

Phase 10.2.1 â€” Final Spatial Analytical Result Contract

I recommend we freeze the contract as follows.

1. Spatial query

The future endpoint will conceptually accept:

GET /api/soil-analysis/spatial?latitude=<lat>&longitude=<lng>

The requested location becomes the analytical target.

2. Spatial analytical result

The result should have this structure:

{
success: true,

phase: "10.2",

location: {
latitude: 17.71234,
longitude: 83.30125
},

spatialContext: {
withinSampleExtent: true,

    nearestSample: {
      id: 1,
      sample_code: "S-001",
      latitude: 17.71234,
      longitude: 83.30125,
      distance: ...
    }

},

interpolatedAnalysis: {
nitrogen: {
value: ...,
unit: "kg/ha",
classification: "Medium"
},

    phosphorus: {
      value: ...,
      unit: "kg/ha",
      classification: "High"
    },

    potassium: {
      value: ...,
      unit: "kg/ha",
      classification: "Medium"
    },

    organicCarbon: {
      value: ...,
      unit: "%",
      classification: "Medium"
    },

    overallFertility: "Moderate / Good"

},

sampleContext: {
soilTexture: "...",
soilReaction: "...",
salinity: "..."
},

metadata: {
interpolationMethod: "idw",
power: 2,
...
}
}

But there is an important refinement.

3. We should NOT interpolate soil texture

The current interpolationService supports continuous numerical parameters:

pH
Nitrogen
Phosphorus
Potassium
Organic Carbon
Electrical Conductivity

So:

N â†’ IDW â†’ value â†’ classification
P â†’ IDW â†’ value â†’ classification
K â†’ IDW â†’ value â†’ classification
OC â†’ IDW â†’ value â†’ classification

is scientifically appropriate.

But:

Sandy
Clay
Loamy
...

cannot be passed through the numerical IDW engine.

Therefore soil texture must remain sample context, rather than being fabricated as a spatially interpolated property.

4. pH and EC need special treatment

The existing interpolation service can interpolate pH and EC.

That means a future spatial analytical result can legitimately contain:

Interpolated pH
â†“
classifyPH()
â†“
Acidic / Neutral / Alkaline

and:

Interpolated EC
â†“
classifyEC()
â†“
Non-saline / Very slightly saline /
Moderately saline / Strongly saline

However, these should remain separate from the fertility calculation.

So the analytical model becomes:

                    Spatial IDW
                       â”‚
       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
       â–¼               â–¼                â–¼

N / P / K / OC pH EC
â”‚ â”‚ â”‚
â–¼ â–¼ â–¼
classification classification classification
â”‚
â–¼
overallFertility

That preserves the existing scientific architecture exactly.

5. Overall fertility

For N/P/K/OC, the process remains:

Interpolated continuous values
â†“
existing classifiers
â†“
N/P/K/OC classifications
â†“
soilAnalysisService.assessOverallFertility()
â†“
Overall Fertility

No Phase 10 fertility formula.

This is particularly important because the existing fertilityZoningService already establishes this exact principle.

6. Nearest sample context

The existing interpolation engine has another important characteristic:

calculateIDWValue()

can return the measured value directly when the target location coincides with a sample.

That gives us a clean distinction:

At a sampled location
Spatial query
â†“
exact sample location
â†“
measured laboratory value
Between samples
Spatial query
â†“
IDW
â†“
estimated continuous value

The result should therefore eventually expose enough metadata for the GIS/report to understand that distinction.

I recommend adding a field such as:

sourceType: "sample" | "interpolated"

for each spatial numerical result.

This is important for analytical transparency.

7. Fertility zoning relationship

Phase 10.2 should not replace the existing fertility zoning grid.

We now have two legitimate spatial analytical products:

                    SOIL SAMPLES
                         â”‚
          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
          â–¼                             â–¼
    Spatial Point                  Fertility Zoning
      Analysis                         Surface
          â”‚                             â”‚
          â–¼                             â–¼

"What is here?" "What zone is here?"
Point analysis

Answers:

What are the estimated soil properties at this exact map location?

Fertility zoning

Answers:

Which overall fertility zone does this area belong to?

They complement each other.

8. Data availability must remain explicit

The spatial result must distinguish:

Low

from:

Unavailable

For example:

organicCarbon: {
value: null,
unit: "%",
classification: "Unavailable"
}

should never become:

organicCarbon: {
value: 0,
classification: "Low"
}

Likewise, if insufficient N/P/K/OC information exists to determine overall fertility, the result should remain:

Unavailable

using the existing assessOverallFertility() behavior.

9. Phase 10.2.1 is now frozen

So our agreed contract is:

Phase 10.2
â”‚
â”œâ”€â”€ 10.2.1 Spatial Analytical Result Contract
â”‚ âœ“ Defined
â”‚
â”œâ”€â”€ 10.2.2 Spatial Analytical Interpretation Service
â”‚ â†’ Next
â”‚
â”œâ”€â”€ 10.2.3 Spatial Analytical REST API
â”‚
â”œâ”€â”€ 10.2.4 Backend Validation
â”‚
â””â”€â”€ 10.2.5 GIS Integration
Existing services remain untouched
soilAnalysisService.js âœ“ Frozen
soilRecommendationService.js âœ“ Frozen
soilManagementService.js âœ“ Frozen
cropSuitabilityService.js âœ“ Frozen
interpolationService.js âœ“ Frozen
fertilityZoningService.js âœ“ Frozen

That is exactly the kind of incremental architecture we want.

Next step: Phase 10.2.2

The first actual code change should be a small new backend service responsible for assembling the spatial analytical result.

It should reuse:

soilRepository
interpolationService
soilAnalysisService
existing spatial/fertility logic where appropriate

and contain no new scientific thresholds or IDW mathematics.

Before creating it, I recommend we inspect the existing interpolation controller and route, because 10.2.3 must fit the current Express routing pattern rather than introduce a parallel API architecture.

So the next file to provide is:

server/controllers/interpolationController.js

and the relevant route file, likely something such as:

server/routes/...

We won't modify anything yet.

---

Perfect. Phase 10.2 is now cleanly checkpointed.

Confirmed commit
94a07bf Phase 10.2 - Spatial Analytical Interpretation

Git history is now:

94a07bf Phase 10.2 - Spatial Analytical Interpretation
2db8521 Phase 9.6 - Dynamic Fertility Legend
b31c3e7 Phase 9.6 - UI layout correction
89d5f25 Phase 9.5 - Zoning Controls & UI

The working tree contains only the three previously existing frontend modifications:

public/css/gis.css
public/js/map-ui.js
public/js/map.js

They remain unstaged and untouched, exactly as intended.

Phase 10.2 status
Phase Status
10.2.1 Result Contract âœ… Complete
10.2.2 Interpretation Service âœ… Complete
10.2.3 REST API âœ… Complete
10.2.4 Backend Validation âœ… Passed
10.2.5 GIS Integration âž¡ï¸ Next
Next: Phase 10.2.5 â€” GIS Integration

Now we can connect the spatial analytical API to the Leaflet map.

The intended interaction should be:

User clicks map
â†“
latitude / longitude
â†“
GET /api/soil-analysis/spatial
â†“
Backend spatial analysis
â†“
Analytical result
â†“
Map presentation
â†“
Location interpretation

We'll keep this strictly frontend presentation:

no scientific thresholds in map.js
no fertility calculations in frontend
no duplicate IDW calculation
no changes to the backend services we just froze
preserve existing thematic markers
preserve IDW surface
preserve fertility zoning
analytical query remains independent of those layers

And because we already have substantial existing changes in map.js, map-ui.js, and gis.css, we'll inspect the current frontend implementation first and make the smallest possible integration changes rather than rewriting anything.

---

Correct. That is the more precise Phase 10.2 roadmap, and we should follow it in that order.

Phase 10.2 â€” Spatial Analytical Interpretation
Sub-phase Status Action
10.2.1 Spatial Analytical Result Contract âœ… Defined Leave unchanged
10.2.2 Spatial Analytical Interpretation Service âž¡ï¸ Next Implement now
10.2.3 Spatial Analytical REST API Later After 10.2.2
10.2.4 Backend Validation Later Validate the service/API
10.2.5 GIS Integration Later Connect to frontend
What we should do now

We should not modify map.js, map-ui.js, or gis.css yet.

The next work belongs in the backend interpretation service.

The intended architecture should be:

                    Phase 10.2
                        â”‚
                        â–¼
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚ 10.2.1 Result Contract       â”‚
        â”‚        âœ… Defined             â”‚
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚
                       â–¼
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚ 10.2.2 Interpretation        â”‚
        â”‚        Service               â”‚
        â”‚        â† NEXT                â”‚
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚
                       â–¼
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚ 10.2.3 REST API              â”‚
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚
                       â–¼
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚ 10.2.4 Backend Validation    â”‚
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚
                       â–¼
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚ 10.2.5 GIS Integration       â”‚
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

This is important because your current console already shows a successful 10.2 spatial analytical result being returned:

Spatial analytical result received successfully.
{
success: true,
phase: '10.2',
location: ...,
spatialContext: ...,
interpolatedAnalysis: ...
}

We therefore shouldn't start changing the frontend based on that result. First we need to make the interpretation layer authoritative and testable on the backend.

Before writing 10.2.2

I want to inspect the existing backend structure so we don't create a duplicate service or violate the architecture already established in your project.

Please provide the current backend project files/code for the 10.2.1 contract and existing spatial-analysis implementation. If uploading files is unavailable, paste the relevant backend files hereâ€”especially:

the existing 10.2 spatial analytical result contract
the current spatial-analysis/service file
the current controller/route, if one already exists
any existing soil parameter interpretation/classification utilities

We will then implement only Phase 10.2.2 â€” Spatial Analytical Interpretation Service, commit it as its own checkpoint, test it, and only then proceed to 10.2.3.

Agreed. We are now at:

Phase 10.2.5 â€” GIS Integration âž¡ï¸ Next

The backend side is complete and validated:

Sub-phase Status
10.2.1 Result Contract âœ… Complete
10.2.2 Interpretation Service âœ… Complete
10.2.3 REST API âœ… Complete
10.2.4 Backend Validation âœ… Passed
10.2.5 GIS Integration âž¡ï¸ Next

For 10.2.5, we should now connect the authoritative 10.2 spatial analytical result to the existing Leaflet GIS without disturbing the working Phase 8/9 interpolation, fertility zoning, thematic mapping, or Phase 10.1 analytical-layer state.

Before changing code, I need the current versions of the relevant frontend/backend files so I can integrate against the implementation you actually have rather than guessing paths or APIs.

Please upload the project files (or a ZIP of the project). At minimum, the most useful files are:

public/js/map.js
public/js/map-ui.js
the current 10.2 spatial-analysis/REST API frontend integration file, if separate
the backend route/controller for 10.2
the 10.2 interpretation service
the 10.2 result-contract file
relevant gis.css if the analytical result needs new presentation UI
Upload a file

Important: I will first inspect the existing implementation and define exactly what 10.2.5 needs to add. I won't rewrite the working map code blindly.

The intended 10.2.5 flow is:

Map click/location â†’ 10.2 REST API â†’ authoritative analytical result â†’ GIS interpretation display â†’ map/popup/analytical panel

while preserving the existing:

sample markers â†’ thematic parameters â†’ IDW interpolation â†’ fertility zoning â†’ analytical layer state/visibility.

---

The next logical phase is Phase 10.3 â€” Spatial Filtering & Analytical Queries.

This follows naturally from the Phase 10.2 spatial-inspection foundation we just froze.

Recommended roadmap
Phase Capability Status
10.1 Spatial analysis foundation âœ…
10.2 Spatial analytical inspection âœ…
10.3 Spatial filtering & analytical queries âž¡ï¸ Next
10.4 Historical sample comparison â³
10.5 Time-series soil monitoring â³
10.6 Sampling-density analysis â³
10.7 Advanced thematic analysis â³
10.8 Laboratory QC information â³
10.9 State-specific interpretation standards â³
10.10 Crop-specific critical limits â³
10.11 Reporting / export â³
What Phase 10.3 should add

The important distinction is:

Phase 10.2 asks:

"What does the soil look like at this location?"

Phase 10.3 asks:

"Where are the locations that satisfy this analytical condition?"

For example:

Show samples where pH < 6.5
Show samples with Low Nitrogen
Show locations with High Potassium
Show areas where EC â‰¥ 1.6 dS/m
Filter samples by soil texture
Find samples within a specified distance of a location
Combine criteria such as:
pH acidic AND nitrogen low
EC saline AND organic carbon low
Clear/reset spatial filters
Most importantly

We should not put scientific classification logic into the frontend.

The architecture should remain:

User defines analytical condition
â†“
Frontend sends query/filter parameters
â†“
Backend spatial-analysis service
â†“
Authoritative soil classification
â†“
Spatial filtering/query
â†“
Structured result
â†“
Frontend presentation

That preserves the architectural principle we've established through Phases 8â€“10.

I recommend one preparatory step

Before writing Phase 10.3 code, let's inspect the current roadmap/documentation and existing spatial-analysis service so we don't accidentally duplicate functionality or change the established contracts.

Then we can define:

Phase 10.3 â€” Spatial Filtering & Analytical Queries v1

with:

backend API contract,
query/filter model,
service implementation,
tests,
frontend controls,
map visualization,
UI/UX validation,
documentation,
Git checkpoint.

This is the cleanest next step after the successful 8f88a13 checkpoint.

---

Absolutely. I checked the saved project roadmap and the current map.js architecture before starting, as we agreed. There is one important correction to make first.

Phase numbering clarification

The original saved Phase 10 roadmap defines:

10.1 â€” Analytical Layer Independence
10.2 â€” Analytical Layer Interaction
10.3 â€” Unified Legend & Status Behavior
10.4 â€” Analytical Controls Refinement
10.5 â€” Regression & Performance Validation

So my previous suggestion that 10.3 = Spatial Filtering & Analytical Queries was a roadmap-numbering mistake.

However, Spatial Filtering is explicitly one of the project's future capabilities, alongside advanced thematic analysis and map-based analytical queries.

Since you have explicitly chosen to bring that capability forward, I recommend we do it deliberately rather than silently renumbering the existing roadmap:

Phase 10.3 â€” Spatial Filtering & Analytical Queries v1
Roadmap deviation: advanced analytical capability introduced ahead of the originally planned unified legend/status refinement.

That gives us a clean record of the decision.

Phase 10.3 â€” Spatial Filtering & Analytical Queries v1
Goal

Turn the existing analytical data into queryable GIS information.

We already have two different kinds of filtering:

The existing thematic category filter operates on displayed markers.
Phase 10.2.5 performs analysis at an arbitrary geographic coordinate.

Phase 10.3 should introduce a more general analytical query layer without replacing either one.

Proposed architecture
SOIL SAMPLE DATA
â”‚
â–¼
BACKEND ANALYSIS
â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ â”‚
CLASSIFICATIONS MEASUREMENTS
â”‚ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
â–¼
SPATIAL QUERY ENGINE
â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ â”‚ â”‚
ATTRIBUTE LOCATION COMBINED
FILTER FILTER QUERY
â”‚ â”‚ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
â–¼
QUERY RESULT
â”‚
â–¼
MAP / UI

The key architectural rule remains unchanged:

Frontend chooses what to ask; backend determines the analytical result.

The project documentation explicitly requires scientific interpretation to remain separate from GIS visualization.

v1 scope

I recommend keeping the first version deliberately small.

1. Attribute filtering

Support backend-authoritative classifications such as:

pH
Acidic
Neutral
Alkaline

Nitrogen
Low
Medium
High

Phosphorus
Low
Medium
High
Very High

Potassium
Low
Medium
High
Very High

Organic Carbon
Low
Medium
High

EC
Non-saline
Very slightly saline
Moderately saline
Strongly saline

Overall Fertility
Low
Moderate / Good
High

The existing frontend already receives backend classifications and uses them for presentation; it must not recreate those thresholds.

2. Spatial filtering

Initially:

within sample extent
within radius of a coordinate
nearest sample
optionally bounding-box filtering

For example:

Find samples within 2 km of clicked location 3. Combined conditions

Eventually v1 should support something like:

Nitrogen = Low
AND
pH = Acidic

or:

EC = Strongly saline
AND
Organic Carbon = Low

But we should define the query contract carefully before implementing arbitrary Boolean expressions.

What I do NOT recommend for v1

Let's explicitly avoid:

âŒ drawing arbitrary polygons
âŒ complex Boolean query builders
âŒ SQL generated directly from frontend input
âŒ frontend classification calculations
âŒ modifying IDW mathematics
âŒ modifying fertility-zone mathematics
âŒ replacing the existing thematic filter
âŒ replacing Phase 10.2.5 coordinate inspection
âŒ rewriting map.js

The existing thematic filter is already a useful presentation-level capability.

Phase 10.3 should build above it, not duplicate it.

Proposed v1 API

I recommend a dedicated endpoint rather than overloading the Phase 10.2 spatial endpoint.

Something conceptually like:

GET /api/soil-analysis/query

with parameters such as:

parameter
classification
latitude
longitude
radius

For example:

/api/soil-analysis/query?parameter=nitrogen&classification=low

or:

/api/soil-analysis/query?latitude=17.74&longitude=83.31&radius=2000

The exact contract should be finalized before writing the service.

Result contract

A result should probably look conceptually like:

{
success: true,
phase: "10.3",
query: {
...
},
result: {
count: 3,
samples: [...]
},
metadata: {
classificationLocation: "backend",
filteringLocation: "backend",
generatedAt: "..."
}
}

This gives us provenance and keeps Phase 10.3 consistent with the metadata discipline established in Phase 10.2.

Implementation sequence

I recommend we do not start coding yet.

We'll proceed in this order:

10.3.1 â€” Query model

Define exactly:

supported parameters
supported classifications
spatial operators
radius units
bounding-box semantics
AND/OR behavior
empty-result behavior
invalid-query behavior
10.3.2 â€” Backend service

Create a dedicated spatial-query service, probably building on the existing soil repository and analysis service.

10.3.3 â€” API

Add controller + route.

10.3.4 â€” Tests

Test:

valid classification
invalid classification
no matches
multiple matches
radius filtering
invalid coordinates
invalid radius
combined filters
backend classification authority
10.3.5 â€” Frontend

Only after the backend contract is stable:

Query controls
â†“
API
â†“
Results
â†“
Map presentation
10.3.6 â€” UI validation

Verify that spatial querying doesn't disturb:

sample markers
thematic filtering
interpolation
fertility zoning
Phase 10.2.5 inspection
Add Soil Sample mode
One architectural point I particularly like here

We already have the foundation for this.

Thematic filtering currently does:

Backend classification
â†“
map.js
â†“
marker.thematicCategory
â†“
presentation filter

Phase 10.3 can extend that concept into:

Backend classification
â†“
Spatial Query Service
â†“
Matching sample IDs
â†“
Frontend map presentation

That is a natural evolution rather than a second, competing analytical system.

Therefore, our immediate next task

Phase 10.3.1 â€” Define the Spatial Query Model and API Contract.

## Before touching map.js, map-ui.js, CSS, or the database, we'll lock down the backend query semantics. This is the safest approach and preserves the project's core rule that scientific logic remains authoritative on the backend.

Good. We'll proceed with Phase 10.3.1 â€” Spatial Query Model & API Contract first.

The objective is to define the contract completely before touching implementation:

Attribute filters
parameter
backend classification
overall fertility
Spatial filters
radius around a coordinate
bounding box
sample extent
Combined filters
AND semantics initially
clear validation rules
Query validation
valid parameter names
valid classifications
coordinate ranges
radius limits and units
empty-result behavior
Stable response structure
query definition
matching samples
count
spatial metadata
backend classification provenance
Test matrix
positive cases
invalid queries
boundary cases
zero matches
combined conditions

Once that contract is locked, we'll implement the backend service and API without changing the existing Phase 10.2.5 functionality.

## Phase 10.3.1 is therefore the design/contract checkpoint before coding.

Absolutely. Letâ€™s move into Phase 10.3.1 â€” Spatial Query Model & API Contract.

The key principle for this phase is: freeze the contract before writing the service/controller code. This prevents the frontend and backend from drifting later.

Phase 10.3.1 â€” Spatial Query Model & API Contract

1. Purpose

Phase 10.3 will introduce a backend-driven analytical query mechanism that can answer questions such as:

Which samples have Acidic pH?
Which samples have Low Nitrogen?
Which samples have Strongly saline EC?
Which samples are within 2 km of a specified location?
Which samples have Low Nitrogen AND Acidic pH?
Which samples have High Potassium AND Low Organic Carbon?

The query engine will operate on measured soil samples and their authoritative backend classifications.

It will not calculate classifications in the frontend.

2. API endpoint

For v1, I recommend:

GET /api/soil-analysis/query

This keeps the feature conceptually separate from:

/api/soil-interpolation

and from the existing spatial inspection endpoint.

The three responsibilities remain distinct:

/api/soil-analysis/query
â†“
Analytical filtering

/api/soil-interpolation
â†“
IDW interpolation

/spatial-analysis endpoint
â†“
Point-based analytical inspection 3. Query parameters
Attribute filtering
Parameter Meaning
parameter Soil parameter being queried
classification Backend classification to match

Supported parameter values:

ph
nitrogen
phosphorus
potassium
organic_carbon
electrical_conductivity
overall_fertility

For consistency with the backend, I recommend using the canonical database/backend parameter names, rather than the camelCase presentation names used by map-ui.js.

4. Classification values

The API should accept only classifications that actually belong to the selected parameter.

pH
acidic
neutral
alkaline
Nitrogen
low
medium
high
Phosphorus
low
medium
high
very_high
Potassium
low
medium
high
very_high
Organic Carbon
low
medium
high
Electrical Conductivity
non_saline
very_slightly_saline
moderately_saline
strongly_saline
Overall fertility
low
moderate_good
high
unavailable

Important: these are API identifiers. The UI can later display human-friendly labels such as Very High or Moderate / Good.

5. Spatial filtering

For v1 we support two explicit spatial operators.

Radius

Parameters:

latitude
longitude
radius

Example:

/api/soil-analysis/query?latitude=17.74&longitude=83.31&radius=2000
Radius unit

I recommend that v1 use meters only.

So:

radius=500

means:

500 meters

and:

radius=2000

means:

2 km

This deliberately avoids an unnecessary unit=km|m parameter in v1.

The backend will use the same geodesic/Haversine approach already established for Phase 10.2.5.

6. Bounding box

The second spatial operator will be:

minLatitude
maxLatitude
minLongitude
maxLongitude

Example:

/api/soil-analysis/query?minLatitude=17.70&maxLatitude=17.75&minLongitude=83.28&maxLongitude=83.34

A sample matches when:

minLatitude <= latitude <= maxLatitude

and

minLongitude <= longitude <= maxLongitude

So the bounding box is inclusive on all four boundaries.

7. Sample extent

We should also support the existing authoritative sample extent concept.

However, I recommend not exposing a separate extent=true query parameter in v1.

Instead:

the backend already knows the sample extent;
radius and bounding-box queries can optionally be constrained by it internally;
the response reports the sample extent as metadata.

This avoids creating an unnecessary third spatial operator.

8. Combining conditions

For v1:

AND semantics only

Every supplied condition must match.

For example:

parameter=nitrogen
classification=low
latitude=17.74
longitude=83.31
radius=2000

means:

Find samples classified as Low Nitrogen that are within 2,000 meters of the specified coordinate.

Likewise, future multi-parameter filtering should mean:

Nitrogen = Low
AND
pH = Acidic

We will not implement arbitrary Boolean expressions such as:

(Nitrogen = Low OR Phosphorus = Low)
AND
pH = Acidic

in v1.

That belongs to a future query-builder phase.

9. Multi-parameter filtering

There is an important contract decision here.

Rather than allowing:

parameter=nitrogen,pH
classification=low,acidic

I recommend a structured repeated parameter syntax later, such as:

parameter=nitrogen
classification=low

parameter=ph
classification=acidic

But standard GET query parsing becomes awkward for repeated paired conditions.

Therefore, for 10.3.1, I recommend we initially support one attribute condition per request, while designing the service internally so multiple conditions can be added cleanly.

This gives us:

v1.0
one analytical condition

- zero or one spatial condition

Examples:

Nitrogen = Low

or:

Nitrogen = Low

- within 2 km

Then we can extend the contract to:

v1.1
Nitrogen = Low
AND
pH = Acidic

without redesigning the underlying query engine.

This is safer than prematurely creating a complex query language.

10. Valid combinations

The API should enforce combinations such as:

Valid
parameter=nitrogen
classification=low
parameter=ph
classification=acidic
parameter=electrical_conductivity
classification=strongly_saline
parameter=nitrogen
classification=low
latitude=17.74
longitude=83.31
radius=2000
Invalid
parameter=nitrogen
classification=acidic

because Acidic belongs to pH, not Nitrogen.

Likewise:

parameter=ph
classification=very_high

must be rejected.

This validation belongs in the backend, not the frontend.

11. Radius validation

For v1:

radius > 0

and we should establish a maximum radius.

I recommend:

MAX_RADIUS_METERS = 100000

Therefore:

0 < radius <= 100000

Maximum:

100 km

This protects the API against accidentally querying an enormous geographical area.

12. Coordinate validation

Use the same rules already established in Phase 10.2.5:

latitude: -90 <= latitude <= 90
longitude: -180 <= longitude <= 180

For radius queries:

latitude + longitude

must either both be present or both absent.

So this is invalid:

latitude=17.74&radius=2000

because longitude is missing.

13. Spatial operator exclusivity

For v1, radius and bounding box should not be supplied simultaneously.

Therefore:

Valid
latitude
longitude
radius
Valid
minLatitude
maxLatitude
minLongitude
maxLongitude
Invalid
latitude
longitude
radius
minLatitude
maxLatitude
minLongitude
maxLongitude

This keeps the query semantics deterministic.

14. No-filter query

I recommend not allowing an unrestricted query:

GET /api/soil-analysis/query

with no conditions.

That could eventually become a database-wide data extraction endpoint.

At least one analytical or spatial condition should be supplied.

So:

/api/soil-analysis/query

â†’ validation error.

15. Empty result behavior

An empty result is not an API failure.

For example:

Nitrogen = Low

may legitimately return zero samples.

The response should therefore be:

{
success: true,
phase: "10.3",
query: {
...
},
result: {
count: 0,
samples: []
},
metadata: {
...
}
}

This distinction is important:

HTTP 200
success: true
count: 0

means:

Query succeeded; nothing matched.

Whereas:

HTTP 400
success: false

means:

Query itself was invalid.

16. Proposed response contract

I recommend freezing this general structure:

{
success: true,
phase: "10.3",

query: {
attribute: {
parameter: "nitrogen",
classification: "low"
},

    spatial: {
      type: "radius",
      latitude: 17.74,
      longitude: 83.31,
      radius: 2000,
      radiusUnit: "m"
    }

},

result: {
count: 3,

    samples: [
      {
        id: 1,
        sample_code: "S-001",
        latitude: 17.71234,
        longitude: 83.30125,

        analysis: {
          nitrogen: {
            value: 245.5,
            unit: "kg/ha",
            classification: "Low"
          }
        }
      }
    ]

},

spatialMetadata: {
sampleExtent: {
minLatitude: null,
maxLatitude: null,
minLongitude: null,
maxLongitude: null
}
},

metadata: {
classificationLocation: "backend",
filteringLocation: "backend",
generatedAt: "..."
}
} 17. Why return the measurement too?

The query is based on classification, but returning the underlying measurement is useful.

For example:

Nitrogen
Value: 245.50 kg/ha
Classification: Low

This allows the eventual map/query UI to display meaningful analytical information without recalculating anything.

The backend remains authoritative:

measurement
â†“
backend classification
â†“
filter
â†“
response 18. Error contract

Validation failures should have a stable structure:

{
success: false,
phase: "10.3",
message: "Invalid spatial analysis query.",
errors: [
"Invalid classification 'acidic' for parameter 'nitrogen'."
]
}

For multiple validation failures:

{
success: false,
phase: "10.3",
message: "Invalid spatial analysis query.",
errors: [
"Latitude must be between -90 and 90.",
"Longitude is required when latitude is provided.",
"Radius must be greater than 0."
]
}

This matches the defensive error handling pattern already used by querySpatialAnalysis().

19. Backend authority

This phase must preserve the project's scientific governance.

The flow will be:

Database measurements
â†“
soilAnalysisService
â†“
Authoritative classification
â†“
Spatial query service
â†“
Filter
â†“
API response
â†“
Frontend presentation

The frontend must never contain logic such as:

if (nitrogen < 280) ...

or:

if (ph < 6.5) ...

Those remain exclusively in soilAnalysisService.js.

20. Phase 10.3.1 contract â€” frozen scope

So I recommend we freeze 10.3.1 with this scope:

Capability v1
Attribute filtering âœ…
Backend classifications âœ…
Radius filtering âœ…
Bounding-box filtering âœ…
AND semantics âœ… Design-ready
Multi-attribute query â³ Next extension
Haversine distance âœ…
Radius in meters âœ…
Maximum radius âœ… 100 km
Empty result âœ…
Stable error response âœ…
Backend classification âœ…
Frontend classification âŒ
Arbitrary polygons âŒ
OR expressions âŒ
Nested Boolean expressions âŒ
Direct SQL from frontend âŒ
IDW modification âŒ
Fertility-zone modification âŒ
Phase 10.2.5 replacement âŒ
Recommended next step

Phase 10.3.2 â€” Backend Spatial Query Service

There we can implement the contract as a dedicated spatialQueryService.js, keeping the existing spatialAnalysisService.js, interpolationService.js, and soilAnalysisService.js responsibilities intact.

---

Phase 10.3.3 â€” COMPLETE

We now have a stable baseline covering:

âœ… Spatial query REST endpoint
âœ… Attribute classification filtering
âœ… Overall fertility filtering
âœ… Radius filtering
âœ… Bounding-box filtering
âœ… Radius + attribute AND semantics
âœ… Haversine distance calculation
âœ… Backend-authoritative classification
âœ… Zero-result queries
âœ… Spatial-only queries
âœ… Sample extent metadata
âœ… Stable validation/error responses
âœ… Controller
âœ… Route integration
âœ… Real database validation
âœ… Live API validation
âœ… Git checkpoint and remote push

---

Absolutely. We have a clean baseline at 91b1536, so let's continue systematically.

The original roadmap had Phase 10.4 â€” Analytical Controls Refinement after the Phase 10.3 spatial-query work. However, before changing any code, I want to align the next step with the actual current frontend architecture (map.js, map-ui.js, and the existing thematic/interpolation/zoning controls) rather than guessing at the next implementation.

I suggest we begin with a Phase 10.4 design/review pass, then make the smallest required code changes and test them before another checkpoint.

Proposed Phase 10.4 focus

Analytical Controls Refinement

Integrate the new /api/soil-analysis/query capability into the GIS UI.
Provide controlled attribute/classification filtering.
Provide radius and bounding-box spatial filtering where appropriate.
Keep backend classification authoritative.
Keep existing thematic filtering, interpolation, zoning, and Phase 10.2.5 point inspection independent.
Ensure query results can be represented on the map without disrupting existing sample markers.
Define clear reset/clear behavior.
Avoid duplicating scientific thresholds in frontend code.
Preserve the existing UI architecture rather than creating a second analytical system.
Add regression tests before committing.

## Important: I don't want to start editing map.js or map-ui.js yet. The next correct step is to inspect their current post-10.3.3 versions and identify the exact integration points.

Now that Phase 10.4 is complete and clean, I recommend we move to Phase 10.5 â€” Regression & Performance Validation before adding another major feature.

This is important because we have changed several layers of the application recently: thematic mapping, interpolation, fertility zoning, spatial inspection, and spatial queries.

Phase 10.5 â€” Regression & Performance Validation

I suggest we do this in five controlled steps:

Backend regression
Existing soil-analysis APIs
Classification services
Crop suitability
Interpolation
Fertility zoning
Spatial analysis
Spatial query API
Frontend regression
Map initialization
Sample markers
Thematic parameter switching
Interpolation
Fertility zoning
Add Soil Sample
Spatial Analytical Inspection
Spatial Query controls/results
Layer interaction validation
Thematic layer + interpolation
Thematic layer + zoning
Query results + thematic layer
Query results + interpolation
Query results + zoning
Switching parameters without stale layers/results
Edge-case validation
Zero matching samples
Missing lab values
Invalid classification
Invalid radius
Empty spatial filter
Boundary coordinates
No spatial filter
Repeated Execute/Clear/Focus operations
Performance sanity check
API response times
Map rendering with current sample count
Repeated thematic switching
Repeated spatial queries
Layer cleanup / possible memory leaks
Browser console errors/warnings
One thing I recommend not doing yet

I would not start Phase 11 feature development immediately.

First establish a clean, tested baseline:

Phase 10.2.5 âœ… Spatial Analytical Inspection
Phase 10.3 âœ… Spatial Filtering & Analytical Queries v1
Phase 10.4 âœ… Spatial Query Controls & Result Layer
Phase 10.5 â³ Regression & Performance Validation

Once 10.5 passes, we can make an informed decision about the next analytical capability rather than accumulating more UI/layer interactions on top of an unvalidated baseline.

First step

## Let's start with Phase 10.5.1 â€” Automated Backend Regression.

What I recommend next

Because Phase 10 introduced substantial spatial functionality but currently has no dedicated automated tests, Phase 10.5 should add a focused regression suite rather than immediately moving to the next feature.

I suggest this sequence:

Phase 10.5.1 â€” Existing regression

Complete: 117/117 passed. âœ…

Phase 10.5.2 â€” Spatial Analysis Service Tests

Test the existing spatialAnalysisService.js:

nearest sample
Haversine distance
sample extent
IDW analytical result
classification provenance
missing/invalid coordinates
no-sample conditions
Phase 10.5.3 â€” Spatial Query Service Tests

Test spatialQueryService.js:

pH/N/P/K/OC/EC classifications
overall fertility
radius filtering
bounding-box filtering
radius + attribute AND behavior
bbox + attribute AND behavior
zero results
invalid classification
invalid radius
unrestricted-query rejection
missing/invalid coordinates
response structure
Phase 10.5.4 â€” Controller/API Tests

Test:

GET /api/soil-analysis/query

including HTTP status and response contracts.

Phase 10.5.5 â€” Browser Regression

Then manually validate the complete map stack.

One important design decision

I recommend not testing spatial-query.js through Node yet.

It is browser/Leaflet UI code. Its proper regression is through the browser, because it depends on:

window
document
Leaflet
map instance
DOM controls
layers
events

## Trying to force that into the current Node test framework would add unnecessary complexity.

Yes â€” that numbering is the better interpretation. 10.3 is the next phase, and the work we've just completed should be treated as the validation/checkpoint for the already-built 10.3 implementation.

Phase 10 roadmap
Phase Area Status
10.1 Spatial analysis foundation âœ… Complete
10.2 Spatial analytical inspection âœ… Complete
10.3 Spatial filtering & analytical queries âž¡ï¸ Next
10.4 Historical sample comparison â³
10.5 Time-series soil monitoring â³
10.6 Sampling-density analysis â³
10.7 Advanced thematic analysis â³
10.8 Laboratory QC information â³
10.9 State-specific interpretation standards â³
10.10 Crop-specific critical limits â³
10.11 Reporting / export â³

There is one important distinction from our recent work:

The spatialQueryService.js and its 86-test suite already constitute substantial Phase 10.3 implementation. The commit c4f5053 is therefore a clean baseline for continuing Phase 10.3, not necessarily the end of the entire phase.

What Phase 10.3 should accomplish

The goal should be to allow a user to ask the GIS questions such as:

Attribute filtering: show samples where nitrogen is Low.
Classification filtering: show samples where phosphorus is Very High.
Overall fertility filtering: show High-fertility samples.
Radius queries: show samples within X metres/kilometres of a location.
Bounding-box queries: show samples within the current map area.
Combined queries: e.g. High nitrogen AND within a radius.
Return the authoritative backend classification, not a frontend-derived classification.
Return enough metadata for the map to visualize and explain the result.

We already have the core backend machinery for these.

I suggest we divide Phase 10.3 properly

Rather than immediately changing code, let's establish a formal Phase 10.3 implementation map:

10.3.1 â€” Query contract
Define exactly what the frontend may request and what the API returns.

10.3.2 â€” Spatial Query Service
Already implemented and validated â€” our current spatialQueryService.js.

10.3.3 â€” REST API integration
Verify the Express route/controller and request/response behavior.

10.3.4 â€” Query UI
Add the user-facing controls to the GIS interface.

10.3.5 â€” Map integration
Display matching samples, update visibility/state, and integrate with existing thematic/interpolation layers.

10.3.6 â€” Query result interpretation
Show result count, active filters, spatial extent, and authoritative classifications without duplicating backend scientific logic.

10.3.7 â€” Regression / performance validation
Our current 86-test Phase 10.3 service suite becomes part of this validation, with additional API/UI tests as appropriate.

One thing I want to verify before we touch map.js

Because map.js is already ~4,930 lines and contains the Phase 10.2.5 integration, we should first inspect the current Phase 10.3 route/controller and the relevant query-related portions of map.js rather than adding another parallel implementation.

So let's start with Phase 10.3.1: establish the existing implementation and gap analysis.

Please send the current contents of:

server/services/spatialQueryService.js

and, if you already have it, the route/controller file that exposes the spatial query API.

Since we've just checkpointed the repository, this is a safe point to inspect everything before making changes.

---

Current position

Phase 10.3 â€” Spatial Filtering & Analytical Queries

The backend is essentially complete and validated:

spatialQueryService.js â€” âœ…
spatialQueryController.js â€” âœ…
soilAnalysisRoutes.js â€” âœ…
86/86 backend regression tests â€” âœ…
spatial-query.js â€” substantially complete
map.js integration â€” substantially complete
index.html â€” integration correct
gis.css â€” integration correct

There is also a clean Git checkpoint already in place.

Therefore, I recommend we start here:
Phase 10.3.6 â€” Query Result Interpretation & Presentation

This is the next logical development step.

The query itself already works. What remains is to make the returned analytical results more scientifically useful and coherent to the user.

We should review the existing result presentation and then strengthen it without changing the backend contract unnecessarily.

Step 1 â€” Correct the Phase numbering first

There is a systematic documentation/labeling error:

spatial-query.js and gis.css currently say Phase 10.4, but they belong to Phase 10.3.

We should correct:

Phase 10.4

to:

Phase 10.3

in the appropriate comments/status/error paths.

This is a cleanup only, not a functional redesign.

Then Phase 10.3.6

We should verify that a query result clearly communicates:

What was queried
Parameter
Classification
What spatial condition was used
Radius
Bounding box
None where applicable
How many samples matched
Result count
Which samples matched
Sample code
Coordinates
Relevant analytical values
How the result relates to the selected classification
Example: Nitrogen â†’ High
Example: pH â†’ Acidic
Example: Overall Fertility â†’ High
Distance information, when a radius query is used.
Backend authority
The frontend displays the backend classification.
It must not recalculate the scientific classification.
Empty-result handling
A valid query returning zero samples should be presented as a valid analytical result, not as an error.
After that: Phase 10.3.7

Once 10.3.6 is satisfactory:

Regression + performance validation

We should test the complete flow:

Spatial Query UI
â†“
GET /api/soil-analysis/query
â†“
Controller
â†“
spatialQueryService
â†“
soilAnalysisService
â†“
Database
â†“
Backend result
â†“
spatial-query.js
â†“
Independent result layer
â†“
Leaflet map

We should specifically test:

parameter/classification queries
radius queries
bounding-box queries
empty results
invalid inputs
maximum radius
result-layer clearing
repeated queries
stale request protection
coexistence with thematic mapping
coexistence with interpolation
coexistence with fertility zoning
coexistence with Phase 10.2.5 map inspection
map resizing
control collapse/expand
result focusing
clearing results
normal soil markers remaining independent
Then Git checkpoint

Only after 10.3.6 + 10.3.7 pass:

Phase 10.3 â€” Spatial Filtering & Analytical Queries
âœ… CLOSED

We make the next clean Git checkpoint.

Then Phase 10.4

Only after 10.3 is formally closed do we move to:

Phase 10.4 â€” Historical Sample Comparison

Not before.

And importantly, Phase 10.5 remains Time-series Soil Monitoring, as you clarified earlier.

Recommended sequence from this point
CURRENT
â”‚
â–¼
10.3.6 Query Result Interpretation
â”‚
â–¼
10.3.7 Regression & Performance Validation
â”‚
â–¼
Git Checkpoint
â”‚
â–¼
PHASE 10.3 CLOSED
â”‚
â–¼
10.4 Historical Sample Comparison
â”‚
â–¼
10.5 Time-series Soil Monitoring
â”‚
â–¼
10.6 Sampling-density Analysis
â”‚
â–¼
10.7 Advanced Thematic Analysis
â”‚
â–¼
...
So I would start now with the Phase 10.3.6 review, not with another file review.

## We already know the relevant implementation in spatial-query.js, map.js, index.html, gis.css, and the backend. The next task is to define exactly what, if anything, needs to change in the query-result interpretation/presentation, make only those controlled changes, test them, and then close Phase 10.3.

Before we declare Phase 10.3 complete, we should perform one complete end-to-end validation of 10.3. We already have strong backend unit/regression coverage, but the final validation should confirm that the UI â†’ API â†’ backend â†’ result layer works together.

I suggest this order:

Phase 10.3 final validation

10.3.1â€“10.3.5 â€” Already implemented and individually validated

Query contract
Backend spatial filtering
REST API
Query controls
Map/result-layer integration

10.3.6 â€” Validate

Result interpretation
Result popup
Result count
Classification display
Radius/distance presentation
Empty results
Overall fertility
Backend-authoritative classification

10.3.7 â€” Full integration regression

Attribute queries
Radius queries
Bounding-box queries
Invalid queries
Zero-result queries
Repeated queries
Clear/focus
Interaction with thematic mapping
Interaction with interpolation
Interaction with fertility zoning
Interaction with Phase 10.2.5 spatial inspection
Normal sample markers remain independent
No stale-result race conditions
One important cleanup

Before that validation, we should also correct the stale â€œPhase 10.4â€ references in spatial-query.js and gis.css to â€œPhase 10.3.â€

Then we can run the full validation and, only if everything passes, formally mark:

Phase 10.3 â€” Spatial Filtering & Analytical Queries â€” COMPLETE

After that, we create the Git checkpoint and move to Phase 10.4 â€” Historical Sample Comparison.

## So yes â€” let's do the complete 10.3 validation. We have enough information from the files you've already supplied to proceed; there is no need for you to resend them.

Phase 10.4 â€” Historical Sample Comparison

This is the next roadmap phase after closing the spatial-query work.

Objective

Allow the GIS to compare soil observations from different sampling dates/periods at the same or comparable locations.

The architecture should remain:

Historical Soil Data
â†“
Repository / Data Access
â†“
Historical Comparison Service
â†“
REST API
â†“
Frontend Comparison UI
â†“
Map / Charts / Interpretation
Scientific rule

The backend must remain authoritative for:

parameter values
classifications
change calculations
units
comparison status
interpretation

The frontend should only present those results.

Proposed Phase 10.4 sequence
Step Component Status
10.4.1 Historical comparison data contract â³
10.4.2 Historical comparison service â³
10.4.3 REST API â³
10.4.4 Backend validation/tests â³
10.4.5 Map/UI integration â³
10.4.6 Comparison result interpretation â³
10.4.7 Full regression validation â³
First task: 10.4.1

Before writing code, we should establish the historical comparison result contract.

For example, conceptually:

Current Observation +
Historical Observation
â†“
Parameter comparison
â†“
Absolute change
â†“
Percentage change where meaningful
â†“
Classification comparison
â†“
Backend interpretation

We should not assume the database schema or invent historical fields. The first thing to establish is what historical/sample-date information is actually available in the current project.

Once that contract is established, we can build the service around the existing data model rather than forcing a new schema prematurely.

## So our immediate starting point is: Phase 10.4.1 â€” Historical Comparison Data Contract.

7. How this connects to the existing architecture

The resulting architecture becomes:

                    MySQL
                      â”‚
          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
          â”‚                       â”‚

soil_samples historical_datasets
â”‚ â”‚
â”‚ historical_samples
â”‚ â”‚
â”‚ historical_observations
â”‚ â”‚
â–¼ â–¼
Current Analysis Historical Analysis
Services Services
â”‚ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
â–¼
REST API
â”‚
â–¼
Leaflet GIS

This preserves our core project rule:

## Historical data becomes a separate analytical domain, not a modification of the current soil-sample domain.

Yes â€” we are done with the Regression & Performance Validation work that was intended for the implemented Phase 10.3 functionality. âœ…

There was a roadmap-numbering confusion earlier, so let me state the project status precisely.

Current Phase 10 status
Roadmap phase Status
10.1 Spatial Analytical Layer State & Visibility âœ… Complete
10.2 Spatial Analytical Inspection / Interpretation âœ… Complete
10.3 Spatial Filtering & Analytical Queries âœ… Complete
10.3 regression validation âœ… Complete â€” 86/86 spatial-query tests + 93/93 spatial-analysis tests
10.4 Historical Sample Comparison â–¶ï¸ Now starting
10.5 Time-series Soil Monitoring â³ Future
10.6 Sampling-density Analysis â³ Future
10.7 Advanced Thematic Analysis â³ Future
10.8 Laboratory QC Information â³ Future
10.9 State-specific Interpretation Standards â³ Future
10.10 Crop-specific Critical Limits â³ Future
10.11 Reporting / Export â³ Future
One correction to our earlier wording

The commit:

c4f5053 test: complete Phase 10.5 regression validation

was misnamed.

It does not mean that roadmap Phase 10.5 â€” Time-series Soil Monitoring is complete.

It represents the regression-validation checkpoint for the already implemented Phase 10.3 spatial-query functionality.

So we should not mark roadmap 10.5 as completed.

And the historical data is now ready

We have also completed the prerequisite data acquisition/import for 10.4:

H1 82
H2 analytical 57
Excluded 3

---

Historical analytical 139
Observations 139

The H2 structure is especially useful:

19 retained sites
â†“
Before sowing
â†“
During growth
â†“
After harvesting

That gives us a solid foundation for 10.4 Historical Sample Comparison, while 10.5 Time-series Soil Monitoring remains a future phase.

So, yes: Regression & Performance Validation for the current implemented functionality is done. We should now formally move to Phase 10.4.1.

OK. Let's work out on Phase 10.4.1 â€” Historical Comparison Data Contract & Comparison Service

Absolutely. Phase 10.4.1 should be designed carefully before we write any frontend code. This phase establishes the scientific/backend contract that every later historical-comparison feature will depend on.

Given the historical data we have already imported, I recommend that we make same-site temporal comparison the first-class comparison model.

Phase 10.4.1 â€” Historical Comparison Data Contract & Comparison Service

1. Objective

The purpose of Phase 10.4.1 is to create a backend service that can answer:

â€œHow did a soil parameter at the same historical sampling site change between two or more observations?â€

For the current H2 dataset, the strongest use case is:

Before sowing
â†“
During growth
â†“
After harvesting

at the same mandal + site number.

For example:

Paderu â€” Site 1

Before sowing pH = X
During growth pH = Y
After harvesting pH = Z

The service should calculate:

Absolute change
Percentage change
Classification at each observation
Comparison eligibility

The frontend should merely display these results.

2. What Phase 10.4.1 should NOT do

We should keep the scope disciplined.

It should NOT yet implement:
map visualization
charts
timeline UI
frontend comparison controls
interpolation
spatial comparison
trend prediction
statistical significance testing
crop-specific interpretation
time-series monitoring

Those belong to later phases.

The service should establish the authoritative historical comparison layer.

3. Fundamental comparison model

I recommend this hierarchy:

Dataset
â†“
Site
â†“
Observation
â†“
Parameter
â†“
Comparison

More concretely:

H2
â””â”€â”€ Paderu
â””â”€â”€ Site 1
â”œâ”€â”€ Before sowing
â”œâ”€â”€ During growth
â””â”€â”€ After harvesting

This is much more scientifically defensible than comparing arbitrary samples merely because they are geographically close.

4. Site identity

This is important.

For H2, the site identity is:

mandal + site_no

For example:

Paderu + Site 1
Paderu + Site 2
...
Narsipatnam + Site 1
...

Therefore:

siteKey = `${mandal}:${site_no}`

conceptually identifies the historical monitoring location.

We should not use the database historical_samples.id as the site identity because each stage has a different sample record.

For example:

H2-PADERU-01-BEFORE
H2-PADERU-01-DURING
H2-PADERU-01-AFTER

are three observations belonging to one site.

5. Observation identity

Each historical sample remains an individual observation.

The logical structure is:

Dataset
datasetCode
datasetName
publicationYear

Site
mandal
siteNo
latitude
longitude

Observation
sampleCode
stage
collectionPeriod
depth
parameter values

This allows us to preserve the original observations rather than transforming them into a single "time-series row."

6. Supported parameters

Phase 10.4.1 should use the same analytical vocabulary already established by the project.

ph
nitrogen
phosphorus
potassium
organic_carbon
electrical_conductivity

Potentially:

overall_fertility

but I recommend not treating overall fertility as a directly stored historical measurement.

It should be calculated by the existing authoritative soilAnalysisService.

That preserves our permanent rule:

Scientific classification is performed by the backend and never duplicated in the frontend.

7. Comparison input contract

The service should accept something conceptually like:

{
datasetCode: "H2",
mandal: "Paderu",
siteNo: 1,
parameter: "ph"
}

For a stage-to-stage comparison:

{
datasetCode: "H2",
mandal: "Paderu",
siteNo: 1,
parameter: "ph",
fromStage: "Before sowing",
toStage: "During growth"
}

And potentially:

{
datasetCode: "H2",
mandal: "Paderu",
siteNo: 1,
parameter: "ph",
stages: [
"Before sowing",
"During growth",
"After harvesting"
]
}
Recommendation

For the service itself, I prefer supporting the multi-stage form.

Then a two-stage comparison is simply:

Before â†’ During

while a complete historical sequence can be:

Before â†’ During â†’ After

This gives us a cleaner foundation for Phase 10.5 later.

8. Comparison result contract

This is the most important part of 10.4.1.

I recommend a response structure approximately like this:

{
success: true,

phase: "10.4",

comparison: {
dataset: {
code: "H2",
name: "Visakhapatnam Kharif Rice Soil Fertility Dataset",
publicationYear: 2020
},

    site: {
      mandal: "Paderu",
      siteNo: 1,
      latitude: 17.xxxxx,
      longitude: 83.xxxxx
    },

    parameter: {
      key: "ph",
      label: "pH",
      unit: "pH"
    },

    observations: [
      {
        stage: "Before sowing",
        value: 6.20,
        classification: "Acidic"
      },
      {
        stage: "During growth",
        value: 6.50,
        classification: "Neutral"
      },
      {
        stage: "After harvesting",
        value: 6.80,
        classification: "Neutral"
      }
    ],

    changes: [
      {
        fromStage: "Before sowing",
        toStage: "During growth",
        fromValue: 6.20,
        toValue: 6.50,
        absoluteChange: 0.30,
        percentageChange: 4.8387
      },
      {
        fromStage: "During growth",
        toStage: "After harvesting",
        fromValue: 6.50,
        toValue: 6.80,
        absoluteChange: 0.30,
        percentageChange: 4.6154
      }
    ]

}
}

The exact field names can be refined before implementation.

9. Absolute change

The calculation is straightforward:

absoluteChange = toValue âˆ’ fromValue

Example:

Before = 6.20
During = 6.50

Change = 6.50 âˆ’ 6.20
= +0.30

The sign is scientifically useful:

+0.30 â†’ increase
-0.30 â†’ decrease
0.00 â†’ no change

The service should preserve the numeric sign rather than returning only a magnitude.

10. Percentage change

Where appropriate:

percentageChange =
((toValue âˆ’ fromValue) / fromValue) Ã— 100

Example:

((6.50 âˆ’ 6.20) / 6.20) Ã— 100
= 4.8387%

However, there is an important edge case:

fromValue = 0

Percentage change is mathematically undefined.

Therefore the backend should return:

percentageChange: null

rather than:

Infinity

or:

0

This is an important contract rule.

11. Missing-value handling

Historical observations can eventually contain missing values.

We should define this now.

If:

fromValue = null
toValue = 25

then:

absoluteChange: null
percentageChange: null
comparisonEligible: false

Likewise:

fromValue = 25
toValue = null

means the comparison cannot be calculated.

But the observations themselves should still be returned.

This distinction is important:

Missing data does not mean missing observation.

12. Comparison eligibility

I recommend explicitly returning:

comparisonEligible: true

or:

comparisonEligible: false

with a reason.

For example:

{
comparisonEligible: false,
reason: "Missing parameter value for the comparison interval."
}

Other possible reasons:

SITE_NOT_FOUND
STAGE_NOT_FOUND
PARAMETER_NOT_AVAILABLE
MISSING_FROM_VALUE
MISSING_TO_VALUE
ZERO_BASE_VALUE
INCOMPATIBLE_DEPTH
INCOMPATIBLE_DATASET

We don't necessarily need all of these immediately, but the contract should allow them.

13. Classification

The service should return classification for each observation, not just for the change.

For example:

Before sowing
pH = 5.9
Classification = Acidic

During growth
pH = 6.7
Classification = Neutral

After harvesting
pH = 6.4
Classification = Acidic

This allows the frontend to later display:

Acidic â†’ Neutral â†’ Acidic

without knowing anything about the scientific thresholds.

The comparison service should call the existing authoritative classification service rather than recreate:

if (ph < 6.5) ...

inside the historical code.

14. Classification transition

I recommend that the service eventually expose the classification transition explicitly.

For example:

{
fromClassification: "Acidic",
toClassification: "Neutral",
classificationChanged: true
}

This is useful because:

pH 6.49 â†’ pH 6.51

has a small numerical change but crosses a scientific classification boundary.

That is analytically meaningful.

15. Depth compatibility

This deserves a rule.

Our historical datasets have different sampling depths:

H1
0â€“30 cm
H2
0â€“15 cm

Therefore H1 and H2 should not be automatically compared.

For H2:

0â€“15 cm

is consistent across the three stages.

So H2 stage comparisons are eligible.

I recommend the service explicitly carry depth metadata:

depth: {
fromCm: 0,
toCm: 15
}

and eventually expose:

depthComparable: true

This protects us from accidentally producing scientifically misleading comparisons.

16. H1 vs H2

We should deliberately prevent an implicit comparison such as:

H1 Paderu Site S1
â†“
H2 Paderu Site 1

even if the coordinates happen to be close.

Why?

Because they are:

different studies
different sampling designs
potentially different locations
different sampling depths
different collection contexts

Therefore Phase 10.4.1 should establish:

Historical comparisons require an explicit comparison relationship; geographic proximity alone does not establish temporal comparability.

This is a very important scientific safeguard.

17. Dataset metadata

Every result should identify its source dataset.

For example:

dataset: {
id: 2,
code: "H2",
name: "...",
publicationYear: 2020
}

This is important for later reporting and provenance.

We should never return a historical value without being able to identify its dataset.

18. Source provenance

The result should preserve provenance information.

Something like:

source: {
datasetCode: "H2",
publicationYear: 2020,
sourceStatus: "verified"
}

The existing database already has:

source_status
exclusion_reason

so we should use that information rather than inventing new provenance logic.

19. Excluded observations

The three Anakapalle Site 3 observations are currently excluded.

They must not enter normal analytical comparison results.

So:

H2
Anakapalle
Site 3

should produce something like:

comparisonEligible = false

or preferably a query-level result indicating that the site is excluded.

The underlying source information remains preserved in:

historical_exclusions

This gives us the correct separation:

Published source record
â†“
Preserved provenance
â†“
Excluded from analytical dataset

We must not silently "fix" the coordinate.

20. Recommended service responsibilities

I suggest creating:

server/services/historicalComparisonService.js

Its responsibilities should be:

1. Validate comparison parameters
2. Resolve dataset
3. Resolve historical site
4. Retrieve observations
5. Verify comparison eligibility
6. Validate comparable stages
7. Validate comparable depth
8. Extract requested parameter
9. Obtain authoritative classification
10. Calculate absolute change
11. Calculate percentage change
12. Build comparison result contract
13. Return provenance/metadata

It should not:

- access HTTP request/response objects
- generate HTML
- manipulate Leaflet
- contain SQL directly if we maintain repository separation
- duplicate soil classification thresholds

21. Repository layer

Because our architecture requires separation, I recommend:

server/repositories/historicalRepository.js

or, if the project uses a different repository naming convention, we follow that existing convention.

The repository should handle things such as:

getDatasetByCode()
getHistoricalSite()
getObservationsForSite()
getObservationByStage()
getExcludedSites()

The comparison service should receive structured data from the repository.

Therefore:

MySQL
â†“
historicalRepository
â†“
historicalComparisonService
â†“
controller
â†“
REST API 22. Important design decision: don't put SQL in the comparison service

I strongly recommend avoiding:

// historicalComparisonService.js

const [rows] = await pool.query(...)

The service should instead do:

const site =
await historicalRepository.getSite(...);

This keeps the architecture consistent with the rest of the GIS backend.

23. Suggested internal service API

I would structure the service around a small number of functions:

validateComparisonRequest(request)

getHistoricalComparison(request)

buildObservationResult(observation, parameter)

calculateChange(fromValue, toValue)

calculatePercentageChange(fromValue, toValue)

buildComparisonResult(...)

Only the appropriate public method needs to be exported.

For example:

module.exports = {
getHistoricalComparison,
};

The helper functions can remain internal unless our tests benefit from exposing them.

24. First API contract

I suggest that the first REST API eventually support:

GET /api/soil-analysis/historical/comparison

with parameters such as:

dataset=H2
mandal=Paderu
siteNo=1
parameter=ph

But I do not want to lock this route yet.

We should first inspect the existing historical repository/service/controller structure, because the route naming should match the project's current architecture.

25. Test strategy

Before any frontend work, Phase 10.4.1 should have its own regression suite.

Something like:

server/tests/historicalComparisonService.test.js

At minimum:

Dataset tests
valid dataset
unknown dataset
inactive dataset
Site tests
valid mandal/site
unknown site
excluded site
Stage tests
Before sowing
During growth
After harvesting
invalid stage
missing stage
Parameter tests
pH
N
P
K
OC
EC
invalid parameter
Calculation tests
positive change
negative change
zero change
percentage increase
percentage decrease
zero baseline
null baseline
null target
Classification tests
classification returned
classification transition
classification unchanged
classification boundary
Depth tests
same depth â†’ eligible
different depth â†’ not automatically eligible
Provenance tests
dataset metadata
source status
Regression test

Most importantly:

H2
Paderu
Site 1
Before â†’ During â†’ After

should return all three observations and the two interval changes.

26. One particularly important rule

We should distinguish these two concepts:

Observation
The historical measurement exists.
Comparison
The historical measurements can legitimately be compared.

Those are not the same thing.

For example:

An observation may exist
â†“
but its value may be missing
â†“
therefore comparison is not calculable

or:

An observation exists
â†“
but the site is excluded
â†“
therefore analytical comparison is prohibited

This distinction will make the Phase 10.4 design much more robust.

27. Proposed Phase 10.4.1 contract

So I would freeze the conceptual contract as:

Historical Comparison Request
â”‚
â”œâ”€â”€ dataset
â”œâ”€â”€ site identity
â”œâ”€â”€ parameter
â””â”€â”€ comparison stages
â†“
Historical Comparison Service
â”‚
â”œâ”€â”€ dataset validation
â”œâ”€â”€ site validation
â”œâ”€â”€ exclusion validation
â”œâ”€â”€ stage validation
â”œâ”€â”€ depth compatibility
â”œâ”€â”€ value extraction
â”œâ”€â”€ backend classification
â”œâ”€â”€ absolute change
â”œâ”€â”€ percentage change
â””â”€â”€ provenance
â†“
Historical Comparison Result

And:

Frontend
â†“
does NOT calculate anything
â†“
only presents backend result 28. Recommended implementation order

I suggest we proceed in exactly this order:

Step 1 â€” Inspect existing historical backend structure

Determine whether we already have:

historicalRepository.js
historicalService.js
historicalController.js
historicalRoutes.js

or equivalent.

Step 2 â€” Freeze the data contract

Finalize the exact JSON structure.

Step 3 â€” Build repository

Only database/data-access responsibility.

Step 4 â€” Build historicalComparisonService.js

Scientific comparison and calculations.

Step 5 â€” Build tests

Before exposing an API.

Step 6 â€” Run regression tests

Only after the service is stable.

Step 7 â€” Build controller/API

Then Phase 10.4.2 can consume the stable backend contract.

My recommendation for our next move

Do not start coding the service yet. First let's inspect what historical backend files already exist in your project, so we don't accidentally create a second architecture or duplicate repository logic.

If you have the existing historical backend files, send them to me (complete files or your usual 1700-line chunks), and I will map them against the above 10.4.1 contract before giving you the exact implementation.

---

Final verification: your output contains all 7 requested test files? Let's count the headers:

spatialQueryService.test.js â€” 86
spatialAnalysisService.test.js â€” 93
soilAnalysisService.test.js â€” 37
soilAnalysisReportService.test.js â€” 17
soilAnalysisController.test.js â€” 18
historicalComparisonService.test.js â€” 31
cropSuitabilityService.test.js â€” 45

So all 7 passed.

Overall status

327 / 327 tests passed â€” 0 failures.

This is a strong regression checkpoint for the current Phase 10.2â€“10.4 analytical GIS backend work. In particular, the output confirms coverage across:

Spatial querying and filtering
Spatial analytical interpretation
Authoritative soil classification
Soil analysis reporting
Soil analysis REST controller
Historical comparison
Crop suitability and confidence/completeness

I would treat this as a clean regression checkpoint before proceeding with further Phase 10 development.

OK. Let's move on to the next phase

Absolutely. We have a clean checkpoint:

327/327 tests passing â€” 0 failures.

Based on our roadmap, the next major phase after the completed Phase 10.2 â€” Spatial Analytical Interpretation and Phase 10.3 â€” Spatial Soil Analysis work is:

Phase 10.4 â€” Spatial Crop Suitability

The intended sequence is:

10.4.1 â€” Spatial Crop Suitability Contract
10.4.2 â€” Spatial Crop Suitability Service
10.4.3 â€” REST API / Controller integration
10.4.4 â€” Backend validation and regression tests
10.4.5 â€” GIS/UI integration

And after that:

Phase 10.5 â€” Integrated Analytical GIS Reporting

Before we modify anything

Let's follow the same disciplined approach we have been using:

Git checkpoint â†’ inspect existing architecture â†’ define/freeze contract â†’ implement â†’ tests â†’ GIS integration â†’ regression checkpoint.

## Since your project roadmap document is authoritative, let's first establish the exact Phase 10.4 requirements from the roadmap rather than inventing the implementation.

Agreed. We will start with Phase 10.4.1 â€” Historical Comparison Data Contract.

The important distinction is that 10.4.1 is contract design only. We should freeze the input/output structure before touching the service, controller, or UI.

Given the workflow you already established, I suggest the contract should explicitly represent:

10.4.1 Contract responsibilities
Comparison request
Dataset
Site
Parameter
Requested historical stages
Site/stage identity
Historical site metadata
Stage identifiers
Chronological ordering
Observation data
Observation values
Sampling depth
Observation/stage metadata
Comparison eligibility
Whether comparison is possible
Eligibility reason
Depth compatibility
Analytical result
Parameter
Starting value
Ending value
Absolute change
Percentage change
Classification at each stage
Classification transition
Provenance
Dataset information
Site information
Stage information
Classification source
Calculation metadata
Unavailable/ineligible states
Missing dataset
Missing site
Missing requested stage
Missing measurement
Incompatible depth
Zero starting value for percentage change
Excluded site
-----------------------------------------
Recommended Phase 10.4.5 architecture
Current Soil Sample
        â”‚
        â–¼
Phase 10.3 Spatial Query
        â”‚
        â–¼
Historical Candidate Search
        â”‚
        â–¼
Historical Site Resolution
        â”‚
        â”œâ”€â”€ Dataset
        â”œâ”€â”€ Mandal
        â”œâ”€â”€ Site No
        â””â”€â”€ Distance
        â”‚
        â–¼
Depth Compatibility Check
        â”‚
        â”œâ”€â”€ incompatible â†’ explain / stop
        â”‚
        â””â”€â”€ compatible
                â”‚
                â–¼
        Historical Comparison API
                â”‚
                â–¼
        HistoricalComparisonResult
                â”‚
                â–¼
             UI display

And importantly, the existing Phase 10.4 service remains responsible for the actual comparison. The frontend still does no scientific calculation. The saved design explicitly establishes that distinction between an observation existing and being legitimately comparable.

So I agree with your proposal

I would now make this the official Phase 10.4.5 UI integration direction:

Select a current soil sample â†’ perform a spatial search for historical observations â†’ resolve the historical site â†’ verify depth compatibility â†’ perform historical comparison.

Before we code it, the next thing I would inspect is our existing Phase 10.3 spatial-query API/service, because we may be able to extend/reuse its spatial search capability rather than creating another spatial-query implementation.
------------------------------------------------
What the existing H2 data actually contains

The H2 import script explicitly stores three sampling rounds at the same site, with these dates. For example, Paderu Site 1 is:

Stored stage	Collection period
before	7â€“13 May 2018
during	11â€“16 Aug 2018
after	6â€“11 Nov 2018

All three are at the same coordinates and depth 0â€“15 cm.

The same pattern is visible for Paderu Site 2: May â†’ August â†’ November 2018.

So these are not merely arbitrary dates that we later converted into stages. The import data itself already contains the semantic stage values before, during, and after.

However, there is a crucial distinction:

The SQL file does not document the scientific rule that says why May = before sowing, August = during growth, and November = after harvesting.

The import script simply records the stages and their corresponding dates.

What our project notes said

Our Phase 10.4 design document subsequently treated those three labels as the historical sequence:

Before sowing â†’ During growth â†’ After harvesting, at the same mandal + site_no.

But that document is our software/data-contract design, not evidence that we independently established the agricultural calendar.

That means I would now make an important correction to our earlier reasoning:

We have evidence that the H2 records were intentionally structured into three sampling stages, but we do not currently have evidence in the saved project material establishing the agricultural-year/crop-calendar rule used to assign those stages.

And your question about "same agriculture year" is exactly right

The dates strongly suggest one agricultural cycle:

2018
May       â†’ Before
August    â†’ During
November  â†’ After

For Paderu Site 1, for example, the dates are all within 2018.

But we should not claim yet that:

May 2018 = before sowing
August 2018 = during growth
November 2018 = after harvesting

was derived by us from an agricultural-year calculation.

It appears to have been encoded into the imported H2 data as the source-stage structure.

Therefore I recommend we freeze this distinction

For Phase 10.4:

H2 source/import data
        â”‚
        â”œâ”€â”€ stage = before
        â”œâ”€â”€ stage = during
        â””â”€â”€ stage = after

We can confidently preserve those as source-defined sampling stages.

But we should not add a new rule such as "derive stage from date" unless we have evidence for the crop calendar used by the original study.

And this is especially important because our current repository does:

CASE LOWER(TRIM(hs.stage))
  WHEN 'before' THEN 'Before sowing'
  WHEN 'during' THEN 'During growth'
  WHEN 'after' THEN 'After harvesting'

So it is normalizing the existing stage field, not calculating it from dates.

One more important finding

The project notes explicitly say the observation retains its collectionPeriod alongside stage.

I think that's actually the right design.

We should therefore treat:

Stage = source-defined sampling stage
Collection period = factual temporal provenance
Agricultural year/crop cycle = not currently established in our data model

That prevents us from accidentally presenting an inference as a fact.

So before we proceed with 10.4.5, I agree we should verify the entire H2 date pattern across all 5 mandals/sites. We can do that from the existing import SQL/database and determine whether every site follows the same May â†’ August â†’ November cycle and whether there are any exceptions. That will give us a much stronger basis for the historical comparison design.
----------------------------
Absolutely. Weâ€™ll continue from the authoritative Phase 10.4 state.

Phase 10.4 â€” Historical Sample Comparison

We have completed:

10.4.1 Data contract â€” frozen
10.4.2 Historical comparison service â€” 38/38
10.4.3 REST API â€” 13/13
10.4.4 Backend validation â€” 347/347 regression

And we are now at:

10.4.5 â€” Map/UI Integration

The first implementation step should be the historical candidate-discovery layer, before we touch the popup UI.

Step 1 â€” Define the integration boundary

The intended flow remains:

Current soil sample selected
        â†“
Current sample ID
        â†“
Backend retrieves current coordinates + depth
        â†“
Find historical samples spatially near that location
        â†“
Group by historical dataset + mandal + site_no
        â†“
Determine candidate distance
        â†“
Compare sampling depth
        â†“
Return candidates
        â†“
UI presents candidates
        â†“
User selects "Compare"
        â†“
Existing /api/soil-analysis/historical
        â†“
Historical comparison result

This keeps the responsibilities clean:

Spatial discovery â†’ backend
Distance calculation â†’ backend
Depth compatibility â†’ backend
Historical comparison calculations â†’ existing historicalComparisonService
Scientific classification â†’ existing authoritative backend services
Presentation â†’ frontend

Most importantly, we will not modify the already-tested historical comparison service just to implement candidate discovery.

Step 2 â€” Add a dedicated historical candidate repository function

The next code change should therefore be in:

server/repositories/historicalRepository.js

We should add something along the lines of:

getHistoricalSpatialCandidates(...)

It should retrieve the information needed for candidate discovery, while leaving:

getHistoricalSiteObservations()
getHistoricalSiteExclusions()

unchanged.

I recommend that we use the current soil_samples.id as the API entry point, rather than allowing the browser to submit arbitrary latitude/longitude and depth values. That gives us a much stronger boundary:

sampleId â†’ authoritative current sample â†’ spatial discovery

rather than:

latitude + longitude + depth supplied by browser

This is also consistent with the existing selected-sample architecture in map.js.

Step 3 â€” Important scientific rule

We will not define:

â€œwithin X metres = historically comparable.â€

Instead:

Spatial proximity identifies historical candidates only.

Then depth compatibility and the historical site/stage structure determine whether comparison can proceed.

So the eventual UI should distinguish:

Historical candidate
        â‰ 
Scientifically eligible comparison

That distinction is important for the integrity of the GIS.
-----------------------------------------
can we create another front end page and add it to map.js / map-ui.js

Yes. In fact, for Phase 10.4.5.3, I think a separate frontend page is a cleaner architecture than putting a large historical-comparison UI directly into the existing map popup.

I would recommend:

                    Existing GIS Map
                         â”‚
                  Select Soil Sample
                         â”‚
              "Historical Analysis"
                         â”‚
                         â–¼
              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
              â”‚ Historical Analysis â”‚
              â”‚       Page          â”‚
              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                         â”‚
              Current Sample Summary
                         â”‚
              Find Historical Sites
                         â”‚
                         â–¼
          /api/soil-analysis/historical/
                    candidates
                         â”‚
                         â–¼
              Historical Candidates
                         â”‚
             â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
             â”‚                       â”‚
       Depth compatible        Depth incompatible
             â”‚                       â”‚
        [Compare]              [Not compatible]
             â”‚
             â–¼
        Historical
        Comparison
Recommended frontend structure

Rather than adding everything to map.js, we can create a dedicated page such as:

public/
â”œâ”€â”€ index.html
â”œâ”€â”€ historical-analysis.html
â”œâ”€â”€ css/
â”‚   â”œâ”€â”€ style.css
â”‚   â””â”€â”€ historical-analysis.css
â””â”€â”€ js/
    â”œâ”€â”€ map.js
    â”œâ”€â”€ map-ui.js
    â””â”€â”€ historical-analysis.js

Then the responsibilities stay clean:

map.js

knows which soil sample is selected
launches/navigates to Historical Analysis
does not contain historical-analysis UI logic

map-ui.js

adds the Historical Analysis action/button to the selected sample popup
passes the selected sampleId

historical-analysis.js

owns the entire historical-analysis page
retrieves candidates
renders candidate cards/table
handles Compare actions
calls the existing historical comparison API
displays comparison results

historical-analysis.css

styling specific to this page
One important design decision

I would not make the historical page independent of the selected sample.

For example, from S-001:

Soil Sample: S-001
Location: 17.712340, 83.301250
Depth: 0â€“15 cm

[Open Historical Analysis]

Clicking that should take the user to something like:

/historical-analysis.html?sampleId=1

Then historical-analysis.js reads sampleId=1 and obtains the authoritative current sample through the backend.

That is much better than storing the entire sample object in the URL or duplicating soil data in the frontend.

Why I prefer this approach

Your map.js is already around 4,930 lines. Adding another substantial analytical workflow directly into it would make the file harder to maintain.

A dedicated page gives us a clear boundary:

Map = spatial exploration. Historical Analysis page = historical analytical workflow.

And we can still integrate it tightly with map.js / map-ui.js.

Proposed Phase 10.4.5.3 implementation

I would do it incrementally:

Create historical-analysis.html
Create historical-analysis.css
Create historical-analysis.js
Add Historical Analysis button to the existing selected-sample popup
Pass sampleId
Call candidate API
Render historical candidate sites
Add Compare for eligible candidates
Call existing historical comparison API
Render the comparison
Test the complete map â†’ historical analysis â†’ comparison workflow

I strongly recommend this architecture for your project. It keeps the existing GIS map stable while giving Phase 10.4 its own proper analytical workspace.
------------------------------------
can we do the same for map.js. It became so heavy with almost 5000 lines of code. It would be great if we can break it based on the functionality

Absolutely. In fact, map.js is now the next logical refactoring target.

At ~5,000 lines, I would not try to rewrite it. We should do exactly what we did with map-ui.js:

Split by responsibility, preserve behavior, validate each step, then checkpoint.

The key difference is that map.js is much more tightly coupled, so we need to be more systematic.

Proposed map.js decomposition

Based on the functionality already present in your project, I would target something like:

public/js/
â”œâ”€â”€ map.js
â”œâ”€â”€ map-state.js
â”œâ”€â”€ map-samples.js
â”œâ”€â”€ map-thematic.js
â”œâ”€â”€ map-interpolation.js
â”œâ”€â”€ map-fertility.js
â”œâ”€â”€ map-spatial-analysis.js
â”œâ”€â”€ map-controls.js
â”œâ”€â”€ map-rendering.js
â”œâ”€â”€ map.js
â””â”€â”€ ...

But I don't want to blindly create these files yet. We should first inventory the actual current map.js and group its existing functions.

A more likely final architecture is:

File	Responsibility
map.js	Core Leaflet initialization + orchestration
map-state.js	Shared map state, selected sample, layers, flags
map-samples.js	Soil sample loading/rendering/markers/popups
map-thematic.js	Thematic parameter selection/symbology/legend coordination
map-interpolation.js	Interpolation requests, surface rendering, visibility/opacity
map-fertility.js	Fertility zoning generation/rendering/state
map-spatial-analysis.js	Phase 10.2 spatial analytical map interaction
map-controls.js	Map controls, toggles, refresh, external sample controls
map-rendering.js	Shared map-layer/rendering helpers

However, we should let the existing code determine the exact boundaries rather than forcing this structure.

Important rule

I would not duplicate the map-ui.js split.

For example:

map-ui-interpolation.js

already owns the presentation/UI construction for interpolation.

The new:

map-interpolation.js

would own the map-side behavior:

API request
    â†“
receive interpolation result
    â†“
create/update Leaflet layer
    â†“
manage map visibility/state

That separation is very clean:

UI layer                         Map/application layer

map-ui-interpolation.js   â†’   map-interpolation.js
map-ui-thematic.js        â†’   map-thematic.js
map-ui-spatial-analysis.js â†’  map-spatial-analysis.js
map-ui-sample.js          â†’   map-samples.js
Most important: no functional changes

Our refactoring rules should be:

No API changes
No calculation changes
No classification changes
No visual behavior changes
No renaming unless necessary
No ES modules
Preserve the existing global-script architecture
Move functions rather than rewrite them
Validate node --check
Validate git diff --check
Start the application
Test all existing map functionality
Commit only after runtime validation

And we'll keep your current clean checkpoint:

363c498
Complete historical analysis UI and split map UI

as the rollback point.

I suggest we do this in stages

Stage 1 â€” Inventory map.js

We'll identify every:

function
const
let
var

and classify them by responsibility.

Stage 2 â€” Build the dependency map

This is particularly important because functions in map.js call one another extensively.

Stage 3 â€” Decide the exact file boundaries

Only after seeing the dependencies.

Stage 4 â€” Extract one responsibility at a time

For example:

map-state.js
       â†“
map-samples.js
       â†“
map-thematic.js
       â†“
map-interpolation.js
       â†“
map-fertility.js
       â†“
map-spatial-analysis.js
       â†“
map-controls.js

Stage 5 â€” Validate after each major extraction

That makes it easy to identify exactly where any regression occurs.

Let's start with the inventory

Since your map.js is around 5,000 lines, don't paste the entire file yet.

Run this in PowerShell:

git show HEAD:public/js/map.js | Select-String -Pattern '^(function|const|let|var) '

Send me the output.

That will give us the complete function/variable inventory from the committed, known-good map.js at checkpoint 363c498, and we can design the split precisely before touching the code.
----------------------------------
Yes. This inventory makes the split very clear, and I would actually make the architecture slightly cleaner than the earlier tentative structure.

There are several distinct responsibilities currently packed into map.js, including some UI-builder code that should arguably have been separated during the previous map-ui.js refactor.

1. What the current map.js contains

I see these major functional groups:

A. Core map / lifecycle
getMap()
initializeMap()
refreshMapSize()
fitMapToSamples()
clearMarkers()

This should remain in the core map.js.

B. Map state
map
soilMarkers
selectedSoilSample
sampleLabelsVisible
addSampleModeActive
...

There are also state variables for:

thematic mapping
interpolation
fertility zoning
spatial analysis
spatial queries

We should centralize these rather than leaving dozens of globals scattered across files.

C. Soil sample / marker management
initializeSampleLabelToggleControl()
initializeAddSampleControl()
toggleSampleLabels()
setSampleLabelsVisible()
updateSampleLabelToggleButton()
buildSampleLabel()
bindSampleMarkerLabel()
updateSampleMarkerLabels()
restoreSampleMarkerLabel()

clearSoilSampleMarkers()
getSoilSampleMarkers()
renderSoilSamples()
handleMapClick()
addSampleMarker()

getSelectedSoilSample()
setSelectedSoilSample()
handleSampleMarkerClick()

getSampleMarker()
focusSampleMarker()

This is a very natural module:

map-samples.js
D. Thematic map

This is another large, self-contained subsystem:

initializeThematicMapControl()
setThematicMapParameter()
getThematicMapParameter()
getThematicMapParameterLabel()
resetThematicMapParameter()

updateThematicMapData()
updateThematicMapReport()
getThematicReportForSample()
getThematicValueObject()
getThematicClassification()
getThematicPresentationCategory()

createStandardMarkerIcon()
createThematicMarkerIcon()
applyThematicMarkerSymbology()

setThematicFilterCategory()
clearThematicFilter()
getThematicFilterCategory()
applyThematicFilter()

updateThematicLegend()
getLegendCategoriesForParameter()
getThematicCategoryCounts()
removeThematicLegend()

refreshMarkerPopup()
refreshOpenThematicInspection()

getThematicStatisticUnit()
getNumericThematicValue()
formatThematicStatisticValue()
getThematicReportCategory()
getThematicAnalysisReports()
calculateThematicAnalysisStats()
getThematicAnalysisStats()

initializeThematicAnalysisControl()
removeThematicAnalysisControl()
updateThematicAnalysisPanel()
refreshThematicAnalysis()

This should become:

map-thematic.js

Notice that this is map-side thematic behavior, whereas:

map-ui-thematic.js

already contains the HTML/UI construction.

That gives us a very clean pair:

map-ui-thematic.js
        â†“
UI construction

map-thematic.js
        â†“
map state + markers + filtering + reports
E. Interpolation

This is already very clearly isolated:

initializeInterpolationControl()
getInterpolationStatusContainer()
initializeInterpolationStatusControl()
getInterpolationMethodLabel()
getInterpolationControlValue()
setInterpolationControlBusy()
setInterpolationSurfaceOpacity()
updateInterpolationControlFromConfiguration()

ensureInterpolationLayerGroup()
getInterpolationExtent()
getInterpolationGridDimensions()
getInterpolationCellPosition()
createInterpolationRaster()
renderInterpolationSurface()

clearInterpolationLayerOnly()
setInterpolationOpacity()
getInterpolationOpacity()
setInterpolationVisible()
updateInterpolationVisibilityControl()
setInterpolationSurfaceVisible()
clearInterpolationSurface()

getInterpolationColor()
updateInterpolationLegend()
removeInterpolationLegend()

setInterpolationStatus()
getInterpolationResult()
getInterpolationConfiguration()
isInterpolationVisible()
isInterpolationRequestInProgress()
isInterpolationSurfaceVisible()
getInterpolationStatistics()

This becomes:

map-interpolation.js

Again, paired naturally with:

map-ui-interpolation.js
F. Fertility zoning

This is another complete subsystem:

normalizeFertilityZoneClass()
initializeFertilityZoningControl()
setFertilityZoningStatus()
setFertilityZoningControlBusy()
updateFertilityZoningLegend()
removeFertilityZoningLegend()

ensureFertilityZoningLayerGroup()
getFertilityZoningExtent()
getFertilityZoningGridDimensions()
getFertilityZoningCellPosition()
getFertilityZoningCellBounds()
createFertilityZoningCell()
buildFertilityZoningCellTooltip()
renderFertilityZoningSurface()

getFertilityZoningOptionValue()
setFertilityZoningVisible()
clearFertilityZoningLayerOnly()
clearFertilityZoning()

getFertilityZoningResult()
getFertilityZoningConfiguration()
isFertilityZoningVisible()
isFertilityZoningRequestInProgress()
getFertilityZoningStatistics()

buildFertilityZoningControl()
updateFertilityZoningControl()
updateFertilityZoningVisibility()
buildFertilityZoningStatus()
buildFertilityZoningLegend()
addFertilityZoningLegendItem()
getFertilityZoningLegendCounts()

This is substantial enough that it absolutely deserves:

map-fertility.js

And interestingly, the last group:

buildFertilityZoningControl()
buildFertilityZoningStatus()
buildFertilityZoningLegend()
...

is UI construction.

So we have a choice:

Option A â€” keep all fertility functionality together

map-fertility.js

Option B â€” split it exactly like the other subsystems

map-fertility.js
map-ui-fertility.js

I recommend Option B because it makes the architecture consistent.

G. Spatial analytical analysis

We already have:

spatialAnalysisPopup
spatialAnalysisRequestInProgress
spatialAnalysisRequestSequence
SPATIAL_ANALYSIS_API_BASE

and the functions:

handleMapClick()

appears to be involved here, together with the spatial analytical request/result processing.

We should inspect this group carefully before extracting it because handleMapClick() may coordinate multiple behaviors.

Target:

map-spatial-analysis.js

paired with the existing:

map-ui-spatial-analysis.js
H. Spatial query

At the bottom we have:

mapSpatialQueryResult
mapSpatialQueryLayerGroup
mapSpatialQueryControl
mapSpatialQueryStatusControl
mapSpatialQueryRequestInProgress
mapSpatialQueryRequestSequence
MAP_SPATIAL_QUERY_API_BASE

This is clearly another subsystem.

Target:

map-spatial-query.js

This is especially appropriate because we already have:

spatial-query.js

which is the query UI/API contract layer.

So we'd have:

spatial-query.js
        â†“
query controls / API contract

map-spatial-query.js
        â†“
map presentation / result layer
I. Generic map errors / utility
clearMapError()
showMapError()
escapeHtml()

These should probably remain in:

map.js

unless we discover more shared utilities.

2. Proposed final structure

After seeing the real inventory, I recommend this:

public/js/
â”‚
â”œâ”€â”€ map.js
â”‚
â”œâ”€â”€ map-state.js
â”œâ”€â”€ map-samples.js
â”œâ”€â”€ map-thematic.js
â”œâ”€â”€ map-interpolation.js
â”œâ”€â”€ map-fertility.js
â”œâ”€â”€ map-spatial-analysis.js
â”œâ”€â”€ map-spatial-query.js
â”‚
â”œâ”€â”€ map-ui.js
â”œâ”€â”€ map-ui-sample.js
â”œâ”€â”€ map-ui-thematic.js
â”œâ”€â”€ map-ui-interpolation.js
â”œâ”€â”€ map-ui-fertility.js
â”œâ”€â”€ map-ui-spatial-analysis.js
â”‚
â”œâ”€â”€ spatial-query.js
â”œâ”€â”€ historical-analysis.js
â””â”€â”€ app.js

That would turn the current roughly 5,000-line map.js into a relatively small orchestrator.

Conceptually:

                         app.js
                           â”‚
                           â–¼
                         map.js
                           â”‚
       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
       â”‚                   â”‚                    â”‚
       â–¼                   â–¼                    â–¼
 map-state.js       map-samples.js       map-controls
       â”‚
       â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
       â–¼               â–¼               â–¼               â–¼
 map-thematic.js  map-interpolation  map-fertility  map-spatial-*

And the UI layer remains separate:

map-thematic.js
       â†•
map-ui-thematic.js

map-interpolation.js
       â†•
map-ui-interpolation.js

map-fertility.js
       â†•
map-ui-fertility.js

map-spatial-analysis.js
       â†•
map-ui-spatial-analysis.js

map-samples.js
       â†•
map-ui-sample.js

This is much easier to maintain.

3. One important correction before we start

I would not immediately create all those files.

There are dependencies between these functions, especially:

initializeMap()
handleMapClick()
addSampleMarker()
refreshMarkerPopup()
applyThematicMarkerSymbology()

and the various layer/state variables.

So the next step should be dependency mapping, exactly as you suggested: break it based on functionality, but without accidentally breaking global references.

Let's get the line ranges first

Run this:

git show HEAD:public/js/map.js |
  Select-String -Pattern '^(function|const|let|var) ' |
  ForEach-Object {
    "{0}: {1}" -f $_.LineNumber, $_.Line.Trim()
  }

This is important because it gives us the exact line number of every declaration in the known-good committed file.

Send me that output.

Then I can give you the exact extraction plan, including:

which declarations go into each file
which variables remain global
which functions depend on which modules
the correct <script> loading order
where map.js should stop
whether we really need map-state.js
whether fertility UI should become map-ui-fertility.js

And only after that will we start moving code.

Your checkpoint 363c498 gives us an excellent safe rollback point, so this is a good time to do the refactor.

Revised target architecture

I would now freeze this structure:
public/js/
â”œâ”€â”€ map.js
â”œâ”€â”€ map-samples.js
â”œâ”€â”€ map-thematic.js
â”œâ”€â”€ map-interpolation.js
â”œâ”€â”€ map-fertility.js
â”œâ”€â”€ map-spatial-analysis.js
â”‚
â”œâ”€â”€ map-ui.js
â”œâ”€â”€ map-ui-sample.js
â”œâ”€â”€ map-ui-thematic.js
â”œâ”€â”€ map-ui-interpolation.js
â”œâ”€â”€ map-ui-fertility.js
â”œâ”€â”€ map-ui-spatial-analysis.js
â”‚
â”œâ”€â”€ spatial-query.js
â””â”€â”€ app.js
------------------------------------------
You're right. I overstated the conclusion. I conflated:

Phase 10.5 â€” Regression & Performance Validation = complete

with:

Phase 10 â€” Analytical GIS Integration = complete/frozen

Those are not automatically the same thing.

What we have actually proven

We have now completed the Phase 10.5 validation execution:

152/152 automated tests pass.
9 samples load and render.
Thematic analysis works.
IDW interpolation works across parameters, power, resolution and opacity.
Fertility zoning works.
Interpolation can be cleared and regenerated.
Fertility zoning can be cleared and regenerated.
Thematic layers remain stable.
Historical comparison works.
Spatial analysis/query workflows work.

So the correct statement is:

Phase 10.5 â€” Regression & Performance Validation: COMPLETE âœ…

What remains for Phase 10

The authoritative process we established was:

Phase 10.1
Analytical Layer State & Visibility
        â†“
Phase 10.2
Spatial Analytical Interpretation
        â†“
Phase 10.3
Spatial Filtering & Analytical Queries
        â†“
Phase 10.4
Historical Sample Comparison
        â†“
Phase 10.5
Regression & Performance Validation
        â†“
Phase 10 FREEZE / CHECKPOINT

The important distinction is that Phase 10.5 validates the completed Phase 10 analytical flow; it doesn't itself mean we have already performed the formal Phase 10 freeze.

And your earlier requirement was specifically:

complete Phase 10.5 validation then freeze Phase 10.

We have now reached that point.

Therefore, current status should be
Item	Status
Phase 10.1	âœ… Complete
Phase 10.2	âœ… Complete
Phase 10.3	âœ… Complete
Phase 10.4	âœ… Complete
Phase 10.5 validation	âœ… Complete
Phase 10 formal freeze/checkpoint	â³ PENDING
Phase 10 overall	ðŸŸ¡ Pending formal freeze

So you were correct to challenge my wording.

We should not yet say â€œPhase 10 â€” Analytical GIS Integration: COMPLETE/FROZEN.â€

The next step is the formal Phase 10 freeze/checkpoint, including the required documentation/Git checkpoint and final repository verification. Only after that should we declare Phase 10 frozen.
-------------------------------------------------
Yes. I agree â€” Phase 10.6 is the cleaner and more accurate roadmap designation.

Corrected Phase 10 structure
Phase	Status
10.1 Analytical Layer State & Visibility	âœ… Complete
10.2 Spatial Analytical Interpretation	âœ… Complete
10.3 Spatial Filtering & Analytical Queries	âœ… Complete
10.4 Historical Sample Comparison	âœ… Complete
10.5 Regression & Performance Validation	âœ… Complete
10.6 Integrated Analytical GIS Reporting	â³ Next development target

And our current baseline remains:

076f530 Freeze Phase 10 Analytical GIS Integration

That gives us a clean checkpoint before developing 10.6.

Phase 10.6 â€” Integrated Analytical GIS Reporting

I recommend we begin 10.6 with requirements/design only, before touching code.

The reporting layer should ultimately integrate the analytical outputs already established:

                    SOIL SAMPLES
                         â”‚
          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
          â†“              â†“              â†“
      Thematic       Spatial         Historical
      Analysis       Analysis        Comparison
          â”‚              â”‚              â”‚
          â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                         â†“
                  Spatial Queries
                         â”‚
              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
              â†“                     â†“
       IDW Interpolation      Fertility Zoning
              â”‚                     â”‚
              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                         â†“
              INTEGRATED ANALYTICAL
                     REPORT

The key principle should remain:

Backend = scientific authority and report data.
Frontend = report presentation and interaction.

Before implementation, we should define the 10.6 report contract: what the report contains, which backend services supply each section, how results are represented, whether the report is on-page/exportable, and the acceptance criteria.

Phase 10.6 â€” Integrated Analytical GIS Reporting is now our next development target.
-------------------------------------
Yes. Now that we have the historical roadmap material and the Phase 10 baseline, we can define Phase 10.6 in the same controlled style as the rest of the project.

The existing project principle is explicit: scientific interpretation remains backend-authoritative, independently testable, and separate from GIS presentation. The Phase 10 work was specifically intended to make thematic analysis, IDW interpolation, and fertility zoning behave as a coherent analytical GIS.

Phase 10.6 â€” GIS Integration & Report Contract
Objective

Build a formal analytical reporting layer that integrates the authoritative outputs of the existing GIS analytical services into one consistent, testable report contract.

The report must consume existing backend analytical results. It must not independently recalculate soil classifications, interpolation mathematics, fertility classifications, or historical comparison results.

10.6 Architecture

The target architecture should be:

                         SOIL SAMPLES
                              â”‚
             â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
             â†“                â†“                â†“
        THEMATIC          SPATIAL          HISTORICAL
        ANALYSIS          ANALYSIS         COMPARISON
             â”‚                â”‚                â”‚
             â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                          â†“
                   SPATIAL QUERIES
                          â”‚
              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
              â†“                       â†“
       IDW INTERPOLATION        FERTILITY ZONING
              â”‚                       â”‚
              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                          â†“
                â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                â”‚ ANALYTICAL REPORT â”‚
                â”‚     CONTRACT      â”‚
                â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                          â”‚
             â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
             â†“            â†“            â†“
         REST API      GIS Report    Future Export
                         UI

This follows the project's existing principle:

Scientific interpretation â†’ tested analysis â†’ API â†’ dashboard/GIS presentation.

10.6.1 â€” Analytical Report Contract

Goal: Define the authoritative structure of an integrated analytical report before implementing the UI.

The contract should establish:

Report identity
report type
report version
generated timestamp
analysis context
source/sample count
geographic extent
sampling-depth context where applicable
Analytical sections

The initial contract should accommodate:

Sample Summary
Thematic Analysis
Spatial Analytical Interpretation
Spatial Query Results
IDW Interpolation
Fertility Zoning
Historical Comparison
Overall Analytical Summary
Scientific Authority / Provenance

Each section should explicitly distinguish:

available
unavailable
not requested
not applicable

rather than silently omitting analytical information.

Contract principle

Every scientific result should carry sufficient provenance to establish:

source
calculation location
classification location
method
parameters
status

For example:

Scientific authority: Backend
Calculation location: Backend
Classification location: Backend

This preserves the authority model already validated in the historical comparison workflow.

10.6.2 â€” Report Data Aggregation Service

Create a backend service whose responsibility is report composition, not scientific calculation.

Conceptually:

Existing authoritative services
          â”‚
          â”œâ”€â”€ Soil Analysis
          â”œâ”€â”€ Spatial Analysis
          â”œâ”€â”€ Spatial Query
          â”œâ”€â”€ Interpolation
          â”œâ”€â”€ Fertility Zoning
          â””â”€â”€ Historical Comparison
                    â”‚
                    â†“
          Analytical Report Service
                    â”‚
                    â†“
             Report Contract

The service should:

invoke existing services
collect their authoritative results
normalize them into the report contract
preserve source/provenance
handle unavailable sections consistently
avoid duplicating scientific logic
Explicit prohibition

10.6 must not introduce:

duplicate pH classification
duplicate N/P/K classification
duplicate OC/EC classification
duplicate fertility calculations
duplicate IDW mathematics
frontend scientific calculations

This follows the established architectural rule that GIS must never become the source of scientific classification.

10.6.3 â€” Report REST API

Expose the report contract through a dedicated backend endpoint.

Conceptually:

GET /api/soil-analysis/report

or, if the final request requires a POST payload:

POST /api/soil-analysis/report

The exact endpoint should be decided after the contract is finalized, rather than prematurely locking the API.

The API should support the necessary report context, such as:

selected samples
spatial extent
analytical parameters
interpolation configuration
fertility configuration
historical comparison context

The response should have a stable top-level contract:

success
report
metadata
sections
provenance
errors / warnings
10.6.4 â€” GIS Report Integration

Integrate the report into the existing GIS without disrupting the frozen analytical layers.

The GIS should be able to request a report based on the current analytical context.

For example:

Current GIS state
       â”‚
       â”œâ”€â”€ thematic parameter
       â”œâ”€â”€ spatial query
       â”œâ”€â”€ interpolation result
       â”œâ”€â”€ fertility result
       â””â”€â”€ selected/sample context
                    â†“
             Generate Report
                    â†“
             Backend API
                    â†“
          Integrated Report
Important

The report should reflect the current analytical state, but it should not take ownership of that state.

The existing:

thematic layer
interpolation layer
fertility layer
sample markers
spatial-query layer

must remain independently controlled.

This follows the Phase 10 independence requirement that clearing or regenerating one analytical presentation must not accidentally affect another.

10.6.5 â€” Report Presentation

Build the initial report as a structured analytical view, rather than immediately jumping to PDF/export functionality.

Suggested presentation:

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚        INTEGRATED SOIL GIS REPORT          â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Report / Analysis Metadata                 â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ 1. Soil Sample Summary                     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ 2. Thematic Analysis                       â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ 3. Spatial Analytical Interpretation        â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ 4. Spatial Query Results                   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ 5. IDW Interpolation                       â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ 6. Fertility Zoning                        â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ 7. Historical Comparison                   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ 8. Integrated Summary                      â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Scientific Authority / Provenance           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

The first objective is correctness of the report contract and integration.

Export formats can be considered separately after the integrated report is stable.

10.6.6 â€” Report Validation

This becomes the final validation gate for 10.6.

Contract tests

Verify:

required fields exist
optional sections behave correctly
unavailable results are represented consistently
provenance is preserved
no scientific values are silently altered
Integration tests

Verify:

Samples
   â†“
Thematic
   â†“
Spatial Analysis
   â†“
Spatial Query
   â†“
Interpolation
   â†“
Fertility
   â†“
Historical
   â†“
Integrated Report
Regression tests

Verify that generating a report does not:

remove sample markers
clear interpolation
clear fertility zoning
change thematic classification
modify spatial-query results
alter historical comparison results
change analytical layer visibility
Scientific-authority test

The final report must demonstrate:

Scientific interpretation and calculations originate from backend authoritative services.

Phase 10.6 Acceptance Criteria

Phase 10.6 should not be considered complete until all of these pass:

Area	Acceptance
Report contract	Defined and versioned
Backend aggregation	Uses existing authoritative services
Scientific calculations	No duplication in report layer
REST API	Stable contract
GIS integration	Generates report from analytical context
Thematic analysis	Correctly represented
Spatial analysis	Correctly represented
Spatial queries	Correctly represented
IDW	Correct method/configuration represented
Fertility zoning	Correct result/configuration represented
Historical comparison	Correctly represented
Provenance	Preserved
Missing/unavailable sections	Explicitly represented
Layer independence	Preserved
Existing Phase 10 regression suite	Still passing
Report tests	Passing
Browser integration	Passing
Final Git checkpoint	Required
Phase 10.6 Development Sequence

I recommend we implement it in this exact order:

10.6.1  Report Contract Definition
           â†“
10.6.2  Report Data Model
           â†“
10.6.3  Analytical Report Service
           â†“
10.6.4  Report REST API
           â†“
10.6.5  Backend Contract Tests
           â†“
10.6.6  GIS Report Integration
           â†“
10.6.7  Report Presentation
           â†“
10.6.8  End-to-End Report Validation
           â†“
10.6.9  Regression Validation
           â†“
10.6.10 Phase 10.6 Freeze
What we should do now

I recommend that we only do 10.6.1 first:

Phase 10.6.1 â€” Integrated Analytical GIS Report Contract Definition

No coding yet.

We should define the exact JSON/report contract, field-by-field, including the sections, statuses, provenance, analytical configurations, and error/warning structure.

Once that contract is approved, the backend service and API can be built against a stable specification.

This also preserves the project's earlier discipline of defining the analytical architecture before implementation rather than allowing the UI to drive the scientific/data contract.
-------------------------------------
Yes â€” we are addressing exactly that, and I agree this should be an explicit architectural requirement of Phase 10.6.

The historical analysis should be sample-contextual, not an independent page that happens to contain historical data.

Correct architecture

From the current sample context:

Soil Sample: S-001
Location: 17.712340, 83.301250
Depth: 0â€“15 cm

[Open Historical Analysis]

the link should carry only the stable sample identifier:

/historical-analysis.html?sampleId=1

Then:

historical-analysis.html
        â†“
historical-analysis.js
        â†“
GET /api/soil-samples/1
        â†“
Authoritative current sample S-001
        â†“
GET /api/... historical comparison for sample 1
        â†“
Backend selects/validates historical candidates
        â†“
Historical comparison results
Why this is the right design

It preserves a very important rule:

The frontend passes an identifier; the backend owns the authoritative soil sample and all analytical relationships.

So we should not do this:

/historical-analysis.html?sampleId=1&sampleCode=S-001&lat=17.712340&lon=83.301250&depth=0-15...

and we should definitely not serialize the whole sample object into the URL.

The frontend should never have to decide:

which historical site corresponds to S-001
whether the depth is compatible
whether the historical observation is eligible
which historical dataset should be used
whether a spatial relationship is valid
how the historical change is calculated
how classifications transition

Those remain backend responsibilities.

This also affects our Phase 10.6 roadmap

I would make this an explicit requirement under 10.6.4 Historical Data â†” GIS Integration, rather than leaving it implied.

10.6.4 Historical Data â†” GIS Integration

10.6.4.1 Current Sample Context

Every historical-analysis request originates from a selected/current soil sample.

Current Sample
    â†“
sampleId
    â†“
Historical Analysis

10.6.4.2 Contextual Navigation

GIS/sample UI provides:

Open Historical Analysis

using only:

sampleId

10.6.4.3 Authoritative Sample Resolution

historical-analysis.js obtains the current sample from the backend using sampleId.

The frontend does not reconstruct the sample from URL parameters.

10.6.4.4 Historical Candidate Resolution

The backend determines the appropriate historical candidate(s) using the authoritative current sample and the existing historical comparison rules.

10.6.4.5 Historical â†” Current Spatial Relationship

The report/UI explicitly distinguishes:

current sample
historical site
spatial relationship
comparison eligibility

A historical site must not automatically be represented as the same physical sampling location merely because it is geographically close.

10.6.4.6 Historical Comparison

The backend supplies:

historical observations
observation stages
historical values
backend classifications
current value
absolute change
percentage change
classification transition
eligibility
provenance

10.6.4.7 GIS Presentation

The historical page can then present the relationship visually/analytically without becoming the owner of the scientific logic.

One important refinement

I would actually make the navigation contract even more general:

/historical-analysis.html?sampleId=1

is the page navigation contract.

But the API contract should remain something like:

GET /api/soil-samples/1

for the authoritative current sample, and then the historical-analysis API should accept the sample ID, not frontend-copied sample attributes.

That gives us a clean chain:

GIS Current Sample
       â”‚
       â”‚ sampleId
       â–¼
Historical Analysis Page
       â”‚
       â”‚ sampleId
       â–¼
Backend
       â”‚
       â”œâ”€â”€ Current authoritative sample
       â”‚
       â”œâ”€â”€ Historical candidates
       â”‚
       â”œâ”€â”€ Spatial relationship
       â”‚
       â”œâ”€â”€ Depth compatibility
       â”‚
       â”œâ”€â”€ Historical observations
       â”‚
       â””â”€â”€ Comparison calculations/classifications
       â–¼
Historical Analysis Result

So yes, your proposed design is not only included â€” I would make it a formal acceptance criterion of Phase 10.6.

And it fits perfectly with the architecture we've already established in Phase 10: the GIS/frontend selects context; the backend remains the scientific authority.
-----------------------------------------------
Absolutely. Let's continue with Phase 10.6 â€” GIS Integration & Report Contract, keeping the sample-contextual historical architecture we just agreed on.

I recommend we proceed in this order:

10.6.1 â€” Integrated Analytical GIS Report Contract
10.6.2 â€” Report Data Model
10.6.3 â€” Analytical Report Aggregation Service
10.6.4 â€” Historical Data â†” GIS Integration
10.6.5 â€” Report REST API
10.6.6 â€” Backend Contract & Integration Tests
10.6.7 â€” GIS Report Integration
10.6.8 â€” Integrated Report Presentation
10.6.9 â€” End-to-End & Regression Validation
10.6.10 â€” Phase 10.6 Freeze
Let's start with 10.6.1

The key principle will be:

The report contract integrates authoritative analytical results; it does not create new scientific calculations.

And the historical portion will explicitly follow:

Current GIS Sample
       â”‚
       â”‚ sampleId
       â–¼
Historical Analysis
       â”‚
       â–¼
Backend resolves authoritative
current sample
       â”‚
       â–¼
Backend resolves historical
candidate(s)
       â”‚
       â–¼
Spatial + depth + dataset eligibility
       â”‚
       â–¼
Historical comparison
       â”‚
       â–¼
Integrated GIS Report

The report therefore remains anchored to the selected current sample.

For example:

S-001
17.712340, 83.301250
0â€“15 cm
      â”‚
      â””â”€â”€ Open Historical Analysis
              â”‚
              â–¼
historical-analysis.html?sampleId=1

No duplicated sample object, coordinates, depth, classifications, or analytical results in the URL.

10.6.1 contract sections

I suggest we formally define these nine report sections:

Section	Purpose
sampleSummary	Authoritative current sample context
thematicAnalysis	Current thematic classification
spatialAnalysis	Spatial analytical interpretation
spatialQuery	Spatial/attribute query results
interpolation	IDW result/configuration metadata
fertilityZoning	Fertility-zone result/configuration
historicalComparison	Historical GIS-linked comparison
analyticalSummary	Integrated interpretation/status
provenance	Scientific authority and calculation provenance

Every section should also have an explicit status such as:

available
not_requested
not_applicable
unavailable
error

That prevents the frontend from guessing whether an empty result means no data, not requested, or a failure.

Most importantly

For the historical section, I would make the contract distinguish:

currentSample
historicalSite
spatialRelationship
depthCompatibility
comparisonEligibility
observations
changes
classificationTransitions
provenance

rather than flattening historical information into a generic list.

That gives us a proper foundation for the eventual historical-analysis.html?sampleId=1 page and for the integrated GIS report.

Next, I recommend we define the exact 10.6.1 JSON contract field-by-field before touching any code.
---------------------------------------------
Yes â€” we absolutely can, and in fact I think your current popup is a very good place to integrate the historical context.

The important distinction is that the historical information should be contextual to the location/sample represented by the popup, rather than becoming an unrelated historical-data block.

Your current popup already has this structure:

Spatial Analysis
â”‚
â”œâ”€â”€ Location
â”œâ”€â”€ Spatial Context
â”‚   â”œâ”€â”€ Within sample analytical extent
â”‚   â”œâ”€â”€ Nearest Sample
â”‚   â””â”€â”€ Distance
â”‚
â”œâ”€â”€ Analytical Soil Properties
â”‚   â”œâ”€â”€ pH
â”‚   â”œâ”€â”€ Nitrogen
â”‚   â”œâ”€â”€ Phosphorus
â”‚   â”œâ”€â”€ Potassium
â”‚   â”œâ”€â”€ Organic Carbon
â”‚   â””â”€â”€ Electrical Conductivity
â”‚
â”œâ”€â”€ Overall Fertility
â”‚
â””â”€â”€ Sample Context
    â””â”€â”€ Soil Texture

We can extend it naturally:

Spatial Analysis
â”‚
â”œâ”€â”€ Location
â”‚
â”œâ”€â”€ Spatial Context
â”‚
â”œâ”€â”€ Analytical Soil Properties
â”‚
â”œâ”€â”€ Overall Fertility
â”‚
â”œâ”€â”€ Sample Context
â”‚   â””â”€â”€ Soil Texture
â”‚
â””â”€â”€ Historical Context
    â”œâ”€â”€ Historical Data Available
    â”œâ”€â”€ Historical Site
    â”œâ”€â”€ Distance / Spatial Relationship
    â”œâ”€â”€ Depth Compatibility
    â”œâ”€â”€ Historical Observations
    â”œâ”€â”€ Current vs Historical Changes
    â””â”€â”€ Classification Transitions
But there is one important issue

Your example popup is for an arbitrary map location:

Location: 17.72518, 83.28750

It is not itself a current soil sample.

The popup says:

Nearest Sample: S-006
Distance: 1.941 km

So we should not automatically pretend that the clicked location is S-006.

Instead, the backend should determine the historical context through the authoritative relationship:

Clicked GIS location
        â†“
Spatial analysis
        â†“
Nearest / associated current sample
        â†“
S-006
        â†“
Historical comparison for S-006
        â†“
Historical information

That is completely consistent with the architecture we just established.

Even better: make the relationship explicit

For your example, the popup could eventually show something like:

Historical Context

Current Sample: S-006
Historical Comparison: Available

Historical Site: Anakapalle Site X
Historical Dataset: Visakhapatnam Kharif Rice Soil Fertility Dataset

Spatial Relationship:
1.94 km from current sample

Depth:
Current: 0â€“15 cm
Historical: 0â€“15 cm
Depth Compatibility: Compatible

Historical Observations:
Before sowing     7.10 Neutral
During growth     7.20 Neutral
After harvesting  7.15 Neutral

Current vs Historical:
Current pH:       6.81 Neutral
Historical range:  7.10â€“7.20
Classification:   Neutral â†’ Neutral

And similarly for N, P, K, OC and EC if historical observations are available.

But I would not put everything into the popup

The popup should remain a summary.

Something like:

Historical Context

Historical comparison available
Current Sample: S-006
Historical Site: Anakapalle Site X
Depth Compatibility: Compatible

pH
Current: 6.81 Neutral
Historical: 7.10â€“7.20 Neutral
Transition: Neutral â†’ Neutral

[Open Historical Analysis]

Then:

/historical-analysis.html?sampleId=6

opens the complete historical analysis.

That gives us a very clean hierarchy:

MAP
 â”‚
 â”œâ”€â”€ Spatial Analysis popup
 â”‚       â”‚
 â”‚       â”œâ”€â”€ Current spatial information
 â”‚       â”œâ”€â”€ Current analytical information
 â”‚       â””â”€â”€ Historical summary
 â”‚               â”‚
 â”‚               â””â”€â”€ Open Historical Analysis
 â”‚                         â”‚
 â”‚                         â–¼
 â”‚                historical-analysis.html
 â”‚                         â”‚
 â”‚                         â–¼
 â”‚                    sampleId=6
 â”‚                         â”‚
 â”‚                         â–¼
 â”‚                Backend authoritative
 â”‚                current sample + history
This actually strengthens Phase 10.6

It means Historical Data â†” GIS Integration isn't merely a separate historical page.

It becomes a proper GIS analytical layer:

Current spatial context â†’ current sample â†’ historical context â†’ detailed historical analysis

That is much stronger than treating historical analysis as an independent feature.

And importantly, the backend remains responsible for determining the historical relationship, while the popup merely presents the authoritative result.

So I would revise our Phase 10.6 design to explicitly include:

10.6.4 Historical Data â†” GIS Contextual Integration

with two entry points:

Current sample â†’ Historical Analysis
Spatial map location â†’ associated/nearest current sample â†’ Historical Summary

That is the architecture I would recommend for this project.
-----------------------------------
-----------------------------------
This gives us a very clean responsibility:

spatialAnalysisService

Answers:

"What is happening analytically at this geographic coordinate?"

historicalContextService

Answers:

"What historical analytical context is associated with the current sample nearest to this coordinate?"

That distinction is important.
----------------------------------
----------------------------------
Next: Reporting Phase

I recommend we now formally begin:

Phase 10.6 â€” Integrated Analytical GIS Reporting

And, as we agreed, we should not start coding immediately.

Our first task should be:

10.6.1 â€” Integrated Analytical GIS Report Contract Definition

We'll define the exact report contract first, including:

Report
â”œâ”€â”€ contractVersion
â”œâ”€â”€ reportType
â”œâ”€â”€ status
â”œâ”€â”€ generatedAt
â”œâ”€â”€ analysisContext
â”œâ”€â”€ sections
â”‚   â”œâ”€â”€ sampleSummary
â”‚   â”œâ”€â”€ thematicAnalysis
â”‚   â”œâ”€â”€ spatialAnalysis
â”‚   â”œâ”€â”€ spatialQuery
â”‚   â”œâ”€â”€ interpolation
â”‚   â”œâ”€â”€ fertilityZoning
â”‚   â”œâ”€â”€ historicalComparison
â”‚   â””â”€â”€ overallSummary
â”œâ”€â”€ provenance
â”œâ”€â”€ warnings
â””â”€â”€ errors

We'll also decide exactly how these statuses behave:

available
unavailable
not_requested
not_applicable
error

Most importantly, the report will consume authoritative outputs from the existing services rather than duplicate scientific calculations.

So we are now in a very good position: clean Git baseline â†’ define report contract â†’ implement aggregation â†’ test â†’ integrate into GIS.

------------------------------------
Absolutely. We can now formally freeze Step 10.6.1 before writing any implementation code.

Phase 10.6 â€” Integrated Analytical GIS Reporting
Step 10.6.1 â€” Integrated Analytical GIS Report Contract Definition
1. Objective

The Integrated Analytical GIS Report provides a single authoritative reporting contract that brings together the results already produced by the project's analytical backend services.

The report layer is an orchestration and presentation contract, not a scientific calculation layer.

2. Core architectural rule

The report service must never recalculate scientific results.

It must consume authoritative results from existing services.

Therefore:

Responsibility	Owner
Soil classification	soilAnalysisService
Soil recommendations	Existing analytical services
Spatial interpolation	interpolationService
Spatial analytical interpretation	spatialAnalysisService
Spatial filtering/query	spatialQueryService
Fertility zoning	Existing fertility zoning service
Historical candidate discovery	historicalCandidateService
Historical comparison	historicalComparisonService
Historical GIS context	historicalContextService
Integrated report	New reporting layer
Report presentation	Frontend
Scientific authority	Backend

-------------------
20. Final Step 10.6.1 Acceptance Criteria

I recommend we mark 10.6.1 complete only when these are formally satisfied:

 Integrated report purpose defined
 Report is an orchestration layer, not a scientific calculation layer
 contractVersion defined
 reportType defined
 Root report status defined
 analysisContext defined
 Selected parameter represented
 Spatial query context represented
 Interpolation context represented
 Fertility zoning context represented
 Historical context represented
 Nine analytical report sections defined
 Section status model defined
 Provenance model defined
 Warning model defined
 Error model defined
 Historical GIS integration explicitly included
 Backend remains scientific authority
 No duplicate scientific calculations permitted
 Contract designed for REST/GIS/future export reuse
 Compact GIS popup remains separate from full report contract
Step 10.6.1 â€” FINAL STATUS: DEFINED / READY FOR IMPLEMENTATION

I would not write any service code yet under 10.6.1.

The next step should be 10.6.2 â€” Report Data Model, where we translate this contract into the exact JavaScript object structures, section schemas, normalization rules, and reusable builders that soilAnalysisReportService/new integrated report services will use.

-------------------------------------------
Yes. Letâ€™s make 10.6.2 â€” Report Data Model precise enough that we can implement it directly in 10.6.3 without redesigning the contract.

The key principle is:

The data model organizes authoritative results; it does not create new scientific results.

Step 10.6.2 â€” Exact Report Data Model
1. Root model

The canonical JavaScript model should be:

{
  contractVersion: "1.0",
  reportType: "integrated_analytical_gis",
  status: "complete",
  generatedAt: "2026-09-11T...Z",

  analysisContext: {
    sampleCount: 0,
    sampleIds: [],
    geographicExtent: null,
    depthContext: null,
    selectedParameter: null,
    spatialQueryContext: null,
    interpolationContext: null,
    fertilityZoningContext: null,
    historicalContext: null
  },

  sections: {
    sampleSummary: createSection(),
    thematicAnalysis: createSection(),
    spatialAnalysis: createSection(),
    spatialQuery: createSection(),
    interpolation: createSection(),
    fertilityZoning: createSection(),
    historicalComparison: createSection(),
    overallSummary: createSection()
  },

  provenance: {
    scientificAuthority: "backend",
    calculationLocation: "backend",
    classificationLocation: "backend",
    sections: {}
  },

  warnings: [],
  errors: []
}

I recommend eight analytical sections, rather than nine. The "Scientific Authority / Provenance" item from 10.6.1 is better represented by the dedicated provenance object instead of duplicating it as a report section.

2. Section wrapper

Every section gets the same wrapper:

{
  status: "available",
  data: {}
}

The allowed statuses are:

const SECTION_STATUS = Object.freeze({
  AVAILABLE: "available",
  UNAVAILABLE: "unavailable",
  NOT_REQUESTED: "not_requested",
  NOT_APPLICABLE: "not_applicable",
  ERROR: "error",
});

For an unavailable section:

{
  status: "unavailable",
  data: null
}

For an error:

{
  status: "error",
  data: null,
  error: {
    code: "SECTION_ERROR",
    message: "..."
  }
}

This gives every consumer a predictable structure.

3. analysisContext
3.1 Sample context
{
  sampleCount: 9,
  sampleIds: [1, 2, 3, 4, 5, 6, 7, 8, 9]
}

Important:

sampleIds are identifiers only.

The report service must obtain sample information from the authoritative source/service rather than maintaining a second copy of soil measurements.

4. Geographic extent
{
  geographicExtent: {
    minLatitude: 17.62,
    maxLatitude: 17.74,
    minLongitude: 82.96,
    maxLongitude: 83.31
  }
}

Exact values come from the existing spatial-analysis result.

The report service should not independently recalculate them.

5. Depth context

I recommend this structure:

{
  depthContext: {
    uniform: true,
    fromCm: 0,
    toCm: 15
  }
}

For heterogeneous samples:

{
  depthContext: {
    uniform: false,
    fromCm: null,
    toCm: null
  }
}

If depth is unavailable:

depthContext: null

This avoids pretending that all samples have the same depth when they do not.

6. Selected parameter

Use the existing canonical parameter identifiers:

"standard"
"ph"
"nitrogen"
"phosphorus"
"potassium"
"organic_carbon"
"electrical_conductivity"

Therefore:

selectedParameter: "phosphorus"

or:

selectedParameter: null

No alternative parameter naming should be introduced by the report layer.

7. Spatial query context
{
  requested: true,

  latitude: 17.72518,
  longitude: 83.28750,

  radiusMeters: null,

  boundingBox: null,

  filters: null
}

For a radius query:

{
  requested: true,
  latitude: 17.72518,
  longitude: 83.28750,
  radiusMeters: 5000,
  boundingBox: null,
  filters: null
}

For a bounding-box query:

{
  requested: true,
  latitude: null,
  longitude: null,
  radiusMeters: null,

  boundingBox: {
    minLatitude: 17.60,
    maxLatitude: 17.75,
    minLongitude: 82.90,
    maxLongitude: 83.35
  },

  filters: null
}
8. Interpolation context
{
  requested: true,

  method: "idw",

  parameter: "phosphorus",

  power: 2,

  resolution: {
    rows: 50,
    columns: 50
  }
}

If interpolation was not requested:

{
  requested: false,
  method: null,
  parameter: null,
  power: null,
  resolution: null
}

The report model records configuration; it does not calculate the interpolation.

9. Fertility zoning context
{
  requested: true,

  parameters: [
    "nitrogen",
    "phosphorus",
    "potassium",
    "organic_carbon"
  ],

  configuration: {}
}

The configuration object should contain the authoritative zoning configuration returned by the existing fertility system rather than a duplicated set of classification thresholds.

If not requested:

{
  requested: false,
  parameters: [],
  configuration: null
}
10. Historical context

This needs to reflect our finalized historical GIS architecture.

{
  requested: true,

  sampleId: 7,

  parameter: "phosphorus",

  candidateStatus: "available",

  comparisonStatus: "available"
}

For the nearest candidate being ineligible:

{
  requested: true,

  sampleId: 7,

  parameter: "phosphorus",

  candidateStatus: "not_eligible",

  comparisonStatus: "not_requested"
}

This preserves the important rule:

Nearest historical candidate only. Do not silently fall back to a farther eligible candidate.

11. Sample Summary section
{
  status: "available",

  data: {
    sampleCount: 9,

    samples: [
      {
        id: 1,
        sampleCode: "S-001",
        latitude: 17.71234,
        longitude: 83.30125,
        depthFromCm: 0,
        depthToCm: 15,
        sampleDate: "...",
        soilTexture: "Loamy"
      }
    ]
  }
}

The sample summary is descriptive.

It must not contain independently calculated scientific classifications.

12. Thematic Analysis section
{
  status: "available",

  data: {
    parameter: "phosphorus",

    label: "Phosphorus",

    unit: "kg/ha",

    results: [
      {
        sampleId: 1,
        sampleCode: "S-001",
        value: 18,
        classification: "Medium"
      }
    ]
  }
}

The classification is copied from the authoritative backend analytical result.

It is not calculated by the report service.

13. Spatial Analysis section

This should preserve the existing spatialAnalysisService result rather than inventing another spatial schema.

{
  status: "available",

  data: {
    location: {
      latitude: 17.72518,
      longitude: 83.28750
    },

    spatialContext: {
      withinSampleExtent: true,

      nearestSample: {
        id: 7,
        sample_code: "S-006",
        latitude: 17.72,
        longitude: 83.27,
        distance: 1941,
        distanceUnit: "m"
      },

      sampleExtent: {
        minLatitude: null,
        maxLatitude: null,
        minLongitude: null,
        maxLongitude: null
      }
    },

    interpolatedAnalysis: {},

    sampleContext: {},

    metadata: {}
  }
}

The report layer can normalize naming if necessary, but it must not recalculate the contents.

14. Spatial Query section
{
  status: "available",

  data: {
    query: {
      latitude: 17.72518,
      longitude: 83.28750,
      radiusMeters: 5000
    },

    resultCount: 3,

    results: [
      {
        sampleId: 7,
        sampleCode: "S-006",
        latitude: 17.72,
        longitude: 83.27
      }
    ],

    metadata: {}
  }
}

Again, query filtering belongs to spatialQueryService.

15. Interpolation section
{
  status: "available",

  data: {
    parameter: "phosphorus",

    method: "idw",

    power: 2,

    resolution: {
      rows: 50,
      columns: 50
    },

    result: {},

    metadata: {}
  }
}

The result is the authoritative interpolation output.

No second IDW implementation.

16. Fertility Zoning section
{
  status: "available",

  data: {
    result: {},

    configuration: {},

    metadata: {}
  }
}

The exact result structure should remain whatever the existing fertility zoning service returns.

The reporting layer should not redesign the scientific zoning result.

17. Historical Comparison section

This is the most structured section because we already have a stable historical comparison contract.

{
  status: "available",

  data: {
    sample: {
      id: 7,
      sampleCode: "S-006"
    },

    parameter: {
      key: "phosphorus",
      label: "Phosphorus",
      unit: "kg/ha"
    },

    candidate: {
      datasetCode: "H2",
      datasetName: "Visakhapatnam Kharif Rice Soil Fertility Dataset",

      site: {
        mandal: "Anakapalle",
        siteNo: 4
      },

      distance: {
        value: 1.23,
        unit: "km"
      },

      depth: {
        fromCm: 0,
        toCm: 15,
        compatible: true
      }
    },

    observations: [],

    changes: [],

    eligibility: {
      eligible: true,
      reason: null
    },

    metadata: {}
  }
}

The exact observations, changes, and eligibility values come from historicalComparisonService.

18. Historical observations

The normalized reporting representation should be:

{
  stage: "Before sowing",

  value: 20.5,

  classification: "Medium"
}

Then:

observations: [
  {
    stage: "Before sowing",
    value: 20.5,
    classification: "Medium"
  },
  {
    stage: "During growth",
    value: 22.4,
    classification: "Medium"
  },
  {
    stage: "After harvesting",
    value: 20.5,
    classification: "Medium"
  }
]
19. Historical changes
changes: [
  {
    fromStage: "Before sowing",
    toStage: "During growth",

    absoluteChange: 1.9,

    percentageChange: 9.27,

    classificationTransition: {
      from: "Medium",
      to: "Medium"
    },

    status: "unchanged"
  }
]

This preserves the scientific result already calculated by the historical comparison service.

20. Overall Summary

The overall summary should be descriptive aggregation, not a new scientific algorithm.

Recommended structure:

{
  status: "available",

  data: {
    selectedParameter: "phosphorus",

    overallFertility: {
      value: "Low",
      source: "soil_analysis"
    },

    spatialAnalysisAvailable: true,

    spatialQueryAvailable: true,

    interpolationAvailable: true,

    fertilityZoningAvailable: true,

    historicalComparisonAvailable: true,

    historicalComparisonEligible: true
  }
}

The report service can determine these booleans from section status.

It must not invent a new fertility calculation.

21. Provenance model

I recommend a common structure:

{
  scientificAuthority: "backend",

  calculationLocation: "backend",

  classificationLocation: "backend",

  sections: {
    sampleSummary: {},
    thematicAnalysis: {},
    spatialAnalysis: {},
    spatialQuery: {},
    interpolation: {},
    fertilityZoning: {},
    historicalComparison: {}
  }
}

Each section can contain:

{
  source: "soilAnalysisService",
  method: "backend_authoritative_result"
}

or:

{
  source: "historical_database",
  method: "historical_comparison"
}

This is primarily an auditability model.

22. Warning model
warnings: [
  {
    section: "historicalComparison",
    code: "HISTORICAL_NOT_AVAILABLE",
    message: "No compatible historical comparison is available."
  }
]

Warnings should never contain scientific calculations.

23. Error model
errors: [
  {
    section: "interpolation",
    code: "INTERPOLATION_ERROR",
    message: "Interpolation result could not be generated."
  }
]

One section failure should not automatically destroy successfully generated sections.

24. Canonical factory functions

For implementation in 10.6.3, I recommend these small model helpers:

createEmptyReport()
createSection()
createAnalysisContext()
createProvenance()
createWarning()
createError()

For example:

function createSection(status = "not_requested", data = null) {
  return {
    status,
    data,
  };
}

And:

function createEmptyReport() {
  return {
    contractVersion: "1.0",
    reportType: "integrated_analytical_gis",
    status: "complete",
    generatedAt: new Date().toISOString(),

    analysisContext: createAnalysisContext(),

    sections: {
      sampleSummary: createSection(),
      thematicAnalysis: createSection(),
      spatialAnalysis: createSection(),
      spatialQuery: createSection(),
      interpolation: createSection(),
      fertilityZoning: createSection(),
      historicalComparison: createSection(),
      overallSummary: createSection(),
    },

    provenance: createProvenance(),

    warnings: [],
    errors: [],
  };
}

These are model constructors, not analytical services.

25. Important normalization rule

There should be one direction of authority:

Existing service
      â†“
Authoritative result
      â†“
Report model normalization
      â†“
Integrated report
      â†“
REST API / GIS UI / Export

Never:

Existing service
      â†“
Report recalculates
      â†“
Different result

That distinction should be explicitly documented in the code.

26. Final 10.6.2 model

The complete hierarchy is therefore:

IntegratedAnalyticalGISReport
â”‚
â”œâ”€â”€ contractVersion
â”œâ”€â”€ reportType
â”œâ”€â”€ status
â”œâ”€â”€ generatedAt
â”‚
â”œâ”€â”€ analysisContext
â”‚   â”œâ”€â”€ sampleCount
â”‚   â”œâ”€â”€ sampleIds
â”‚   â”œâ”€â”€ geographicExtent
â”‚   â”œâ”€â”€ depthContext
â”‚   â”œâ”€â”€ selectedParameter
â”‚   â”œâ”€â”€ spatialQueryContext
â”‚   â”œâ”€â”€ interpolationContext
â”‚   â”œâ”€â”€ fertilityZoningContext
â”‚   â””â”€â”€ historicalContext
â”‚
â”œâ”€â”€ sections
â”‚   â”œâ”€â”€ sampleSummary
â”‚   â”œâ”€â”€ thematicAnalysis
â”‚   â”œâ”€â”€ spatialAnalysis
â”‚   â”œâ”€â”€ spatialQuery
â”‚   â”œâ”€â”€ interpolation
â”‚   â”œâ”€â”€ fertilityZoning
â”‚   â”œâ”€â”€ historicalComparison
â”‚   â””â”€â”€ overallSummary
â”‚
â”œâ”€â”€ provenance
â”‚   â”œâ”€â”€ scientificAuthority
â”‚   â”œâ”€â”€ calculationLocation
â”‚   â”œâ”€â”€ classificationLocation
â”‚   â””â”€â”€ sections
â”‚
â”œâ”€â”€ warnings[]
â””â”€â”€ errors[]
Step 10.6.2 status

DEFINED â€” READY FOR IMPLEMENTATION

The important architectural decision here is that we do not create duplicate scientific models for IDW, fertility, spatial analysis, or historical comparison. The report model is deliberately a stable container around the existing authoritative results.

Next: Step 10.6.3

We can now implement the Analytical Report Aggregation Service. That is where we decide exactly which existing services are called, in what order, what is optional vs mandatory, and how their results are assembled into this model.
----------------------------------------
Phase 10.6.3 status

Analytical Report Aggregation Service â€” COMPLETE

We have validated:

canonical integrated report contract
all-sample and selected-sample handling
missing-sample warnings
mandatory sample summary
thematic report aggregation
spatial analysis integration
spatial query integration
interpolation integration
fertility zoning integration
historical GIS integration
nearest-candidate-only preservation
backend provenance
overall summary
section failure isolation
complete / partial / error handling
request validation
full regression compatibility
---------------------------------------------------------
Absolutely. We can proceed from the clean 3550ff6 checkpoint.

The important point is that 10.6.4 is not starting historical functionality from scratch. The historical backend integration already exists and was validated through historicalContextService.js and the 10.6.3 aggregation service. Phase 10.6.4 should therefore formalize and complete the Historical Data â†” GIS reporting contract, without duplicating any historical scientific logic.

Phase 10.6.4 â€” Historical Data â†” GIS Integration
Objective

Connect the existing historical-analysis workflow to the integrated GIS report so that a report can carry:

Current GIS sample
       â†“
Nearest historical candidate
       â†“
Depth compatibility
       â†“
Selected parameter
       â†“
Historical observations
       â†“
Absolute / percentage changes
       â†“
Classification transitions
       â†“
Integrated GIS report

The existing rule remains:

Nearest historical candidate only. No fallback to the second-nearest candidate.

What 10.6.4 must preserve

The historical subsystem remains authoritative:

historicalCandidateService â†’ candidate discovery
historicalComparisonService â†’ historical classification/change calculations
historicalContextService â†’ orchestration and nearest-candidate-only rule
analyticalReportAggregationService â†’ report integration only

The aggregation/reporting layer must not:

calculate historical distances
select another candidate
determine depth compatibility
calculate historical changes
classify historical observations
calculate percentage changes
duplicate historical repository queries
10.6.4 implementation

I recommend four concrete pieces:

10.6.4.1 Historical report section contract

The integrated report's:

sections.historicalComparison

should consistently contain:

{
  status: "available",
  data: {
    success: true,
    status: "available",
    currentSample: {},
    parameter: {},
    candidateSummary: {},
    candidate: {},
    comparison: {},
    provenance: {},
    metadata: {}
  }
}

For an unavailable historical match:

{
  status: "available",
  data: {
    success: true,
    status: "unavailable",
    ...
  }
}

For an ineligible nearest candidate:

{
  status: "available",
  data: {
    success: true,
    status: "not_eligible",
    candidate: {},
    comparison: null
  }
}

This distinction is important:

Report section status describes whether the historical service executed successfully.

Historical data status describes whether historical analysis was actually available.

10.6.4.2 Historical context in analysisContext

The report should expose enough context for GIS/report consumers:

analysisContext: {
  ...
  historicalContext: {
    requested: true,
    sampleId: 123,
    parameter: "nitrogen",
    status: "available",
    candidateSelection: "nearest_candidate_only"
  }
}

For no historical result:

historicalContext: {
  requested: true,
  sampleId: 123,
  parameter: "nitrogen",
  status: "unavailable",
  candidateSelection: "nearest_candidate_only"
}

This is context, not a second copy of the complete historical result.

10.6.4.3 Historical provenance

The existing provenance must remain in the backend report:

{
  scientificAuthority: "Backend",
  calculationLocation: "Backend",
  classificationLocation: "Backend",
  source: "historical_database"
}

But, as we already decided, this should not be dumped into the compact GIS popup.

The popup remains user-focused:

Parameter
Dataset
Site
Distance
Depth
Stages
Comparison
Transitions
Status
Open Historical Analysis
10.6.4.4 Dedicated regression tests

We should add tests specifically proving the complete historical â†’ integrated-report path.

At minimum:

Historical section available.
Historical section unavailable.
Nearest candidate not eligible.
Nearest candidate only â€” no fallback.
Historical comparison available.
Historical comparison unavailable.
Historical parameter normalization.
Historical provenance preserved.
Historical context added to analysisContext.
Historical failure does not destroy thematic/sample sections.
Historical failure produces partial rather than error.
No historical request produces not_requested.
Missing sample/parameter produces not_applicable.
Existing historicalContextService is called rather than candidate/comparison services directly.
No duplicate historical calculations occur in the aggregation layer.
One important architectural refinement

Because 10.6.3 already calls historicalContextService.getHistoricalContext(), we should not create another historical service just to call it again.

So the 10.6.4 implementation should primarily be:

historicalContextService
        â”‚
        â–¼
analyticalReportAggregationService
        â”‚
        â”œâ”€â”€ historicalComparison section
        â”‚
        â”œâ”€â”€ historicalContext
        â”‚
        â””â”€â”€ provenance

That keeps the architecture clean.

Current phase boundary

After 10.6.4:

10.6.1  Contract Definition                 âœ“
10.6.2  Report Data Model                   âœ“
10.6.3  Aggregation Service                 âœ“
10.6.4  Historical Data â†” GIS Integration   â† NOW
10.6.5  Report REST API
10.6.6  Contract & Integration Tests
10.6.7  GIS Report Integration
10.6.8  Report Presentation
10.6.9  End-to-End Validation
10.6.10 Freeze

And importantly, 10.6.4 should not yet build the REST endpoint or the final report UI. Those belong to 10.6.5â€“10.6.8.

First implementation step

Before changing code, let's inspect the current committed 10.6.3 aggregation service and its test file so we modify exactly what is now in the repository rather than relying on an older version.

Run:

Get-Content ".\server\services\analyticalReportAggregationService.js" |
  Select-Object -First 1700

and:

Get-Content ".\server\tests\analyticalReportAggregationService.test.js" |
  Select-Object -First 2200

Send those two outputs in chunks if PowerShell output is too large. Then I'll give you the complete 10.6.4 implementation, including the exact test additions, without disturbing the clean 10.6.3 checkpoint.
----------------------------------------
11. What should NOT be added next

Based on this audit, I would not recommend immediately adding:

âŒ Another interpolation algorithm

For example:

Kriging
spline
nearest-neighbour interpolation

There is currently no demonstrated requirement for one.

âŒ Another fertility classification system

The authoritative classification already exists in soilAnalysisService.

âŒ Frontend scientific calculations

The backend authority principle is already working.

âŒ Another spatial-analysis service

spatialAnalysisService already provides point-based spatial interpretation.

âŒ Another spatial-query service

spatialQueryService already handles analytical/spatial filtering.

âŒ Another fertility-zoning engine

fertilityZoningService already provides the complete zoning calculation.

âŒ Large map.js refactoring

There is no analytical justification for it.
-----------------------------------------
Scientific rules I recommend
Method	Calculation	Classification
IDW	existing IDW	after interpolation
Kriging	continuous kriging surface	after interpolation
Spline	continuous spline surface	after interpolation
Nearest-neighbour	nearest measured value	after interpolation

Most importantly:

Never interpolate categorical labels.

For example, we should not interpolate "Low", "Medium" and "High". We interpolate the underlying N/P/K/etc. numerical value and then pass the resulting value through the existing authoritative classifier.

One important distinction

Kriging is not simply another IDW formula. It requires additional scientific machinery, typically:

variogram/semivariogram
covariance model
model parameters
spatial relationship matrix
solution of a linear system
handling of insufficient/degenerate sample configurations

So I would not implement a superficial "Kriging-like" calculation just to add the method name.

Likewise, Spline needs an explicitly chosen mathematical formulation, and nearest-neighbour needs clear tie/edge behavior.

Recommended implementation sequence

I suggest:

Phase 10.7.1 â€” Interpolation Method Architecture

Refactor the existing method selection minimally so that:

method = idw
method = kriging
method = spline
method = nearest_neighbour

can be selected through one controlled backend interface.

Then implement and test individually:

10.7.2 â€” Nearest-neighbour
10.7.3 â€” Spline
10.7.4 â€” Kriging
10.7.5 â€” Comparative interpolation validation
10.7.6 â€” REST API integration
10.7.7 â€” GIS/frontend method selector
Yes. I recommend we treat these as three scientifically distinct interpolation engines, rather than trying to force them into the existing IDW implementation.

A good architecture for the Soil Analysis GIS would be:

Method	Core scientific basis	Main mathematical components
Kriging	Geostatistics + spatial autocorrelation	Variogram/semivariogram, covariance model, model parameters, spatial relationship matrix, linear system
Spline	Smooth mathematical surface through/near observations	Basis/radial functions, smoothing/tension parameter, linear system
Nearest-neighbour	Local spatial assignment	Distance metric, nearest-sample search, deterministic selection
1. Kriging â€” the most scientifically involved

For our project, I suggest implementing Ordinary Kriging first.

The conceptual workflow should be:

Soil samples
     â”‚
     â–¼
Calculate pairwise distances
     â”‚
     â–¼
Calculate experimental semivariogram
     â”‚
     â–¼
Fit theoretical variogram model
     â”‚
     â”œâ”€â”€ Nugget
     â”œâ”€â”€ Sill
     â””â”€â”€ Range
     â”‚
     â–¼
Build spatial relationship matrix
     â”‚
     â–¼
Build Kriging linear system
     â”‚
     â–¼
Solve for Î» weights
     â”‚
     â–¼
Estimated soil value
     â”‚
     â–¼
Prediction uncertainty / kriging variance

The ordinary kriging estimator is:

$$ \hat Z(s_0)=\sum_{i=1}^{n}\lambda_i Z(s_i) $$

subject to:

$$ \sum_{i=1}^{n}\lambda_i=1 $$

The weights are not simply distance weights. They are obtained from the spatial correlation structure.

2. Experimental semivariogram

For sample locations \(s_i\) and \(s_j\):

$$ \gamma(h)= \frac{1}{2} E[(Z(s_i)-Z(s_j))^2] $$

In practice we calculate the experimental semivariogram from sample pairs:

$$ \hat{\gamma}(h) = \frac{1}{2N(h)} \sum_{(i,j)\in h} [Z(s_i)-Z(s_j)]^2 $$

where:

\(h\) = distance lag
\(N(h)\) = number of sample pairs in that lag
\(Z(s_i)\) = observed soil value
\(Z(s_j)\) = observed soil value

This gives us the empirical relationship:

distance between samples
          â†“
difference in soil values
          â†“
spatial variability

This is fundamentally different from IDW.

3. Theoretical variogram models

We should support several models rather than hard-code one.

Spherical
$$ \gamma(h)= \begin{cases} C_0+C\left[ 1.5\frac{h}{a} -0.5\left(\frac{h}{a}\right)^3 \right], &0<h\leq a\\ C_0+C,&h>a \end{cases} $$
Exponential
$$ \gamma(h)= C_0+C \left(1-e^{-h/a}\right) $$
Gaussian
$$ \gamma(h)= C_0+C \left(1-e^{-(h/a)^2}\right) $$

where:

\(C_0\) = nugget
\(C\) = structured variance
\(C_0+C\) = sill
\(a\) = range

These parameters should become explicit backend objects rather than hidden constants.

For example:

{
    model: "spherical",
    nugget: 0.05,
    sill: 1.20,
    range: 3500
}

The actual values should ultimately be estimated from the soil dataset rather than arbitrarily selected.

4. Covariance model

We should also explicitly represent covariance.

For a stationary process:

$$ C(h)=C(0)-\gamma(h) $$

Conceptually:

Semivariogram
      â”‚
      â–¼
spatial variability
      â”‚
      â–¼
Covariance
      â”‚
      â–¼
spatial relationship

This is important because the kriging system can be formulated using either variograms or covariance functions.

I recommend our implementation internally use one consistent representation and expose the scientific terminology in the API.

5. Spatial relationship matrix

For \(n\) soil samples we construct an \(n\times n\) matrix.

For example, with four samples:

$$ \Gamma= \begin{bmatrix} 0 & \gamma_{12} & \gamma_{13} & \gamma_{14}\\ \gamma_{21} & 0 & \gamma_{23} & \gamma_{24}\\ \gamma_{31} & \gamma_{32} & 0 & \gamma_{34}\\ \gamma_{41} & \gamma_{42} & \gamma_{43} & 0 \end{bmatrix} $$

This matrix represents the spatial relationship between every pair of samples.

For a prediction location \(s_0\), we additionally construct:

$$ \gamma_0= \begin{bmatrix} \gamma_{10}\\ \gamma_{20}\\ \gamma_{30}\\ \gamma_{40} \end{bmatrix} $$
6. Solution of the linear system

Ordinary Kriging then solves:

$$ \begin{bmatrix} \Gamma & \mathbf{1}\\ \mathbf{1}^{T} & 0 \end{bmatrix} \begin{bmatrix} \lambda\\ \mu \end{bmatrix} = \begin{bmatrix} \gamma_0\\ 1 \end{bmatrix} $$

where:

\(\lambda\) = kriging weights
\(\mu\) = Lagrange multiplier
\(\Gamma\) = spatial relationship matrix
\(\gamma_0\) = relationship between prediction location and samples
\(\mathbf{1}\) = vector of ones

This is the critical mathematical step.

We should not calculate these weights using a simple inverse-distance formula.

7. Spline

Spline should be treated separately from Kriging.

Its objective is essentially:

Find a smooth surface that honours the observed spatial data according to the selected spline formulation.

For a radial-basis formulation, a surface can be represented conceptually as:

$$ f(x,y)= a_0+a_1x+a_2y+ \sum_{i=1}^{n}\lambda_i\phi(r_i) $$

where:

$$ r_i=\sqrt{(x-x_i)^2+(y-y_i)^2} $$

and \(\phi(r)\) is the selected basis function.

For example, a thin-plate spline uses:

$$ \phi(r)=r^2\ln(r) $$

The implementation again requires solving a linear system, but the scientific basis is different from Kriging.

So:

Kriging
  â””â”€â”€ spatial stochastic model
       â””â”€â”€ variogram/covariance
            â””â”€â”€ kriging system

Spline
  â””â”€â”€ smooth mathematical surface
       â””â”€â”€ radial basis function
            â””â”€â”€ spline system

We should not describe spline as "another form of IDW."

8. Nearest-neighbour interpolation

This one is intentionally much simpler.

For prediction location \(s_0\):

$$ \hat Z(s_0)=Z(s_k) $$

where:

$$ k=\arg\min_i d(s_0,s_i) $$

In other words:

Prediction point
       â”‚
       â–¼
calculate distance to samples
       â”‚
       â–¼
find minimum distance
       â”‚
       â–¼
return that sample's value

There are no variogram parameters, no covariance model and no linear-system solution.

That distinction is scientifically important.

9. I recommend this backend structure

Rather than putting all of this inside one enormous service, I would build:

server/services/interpolation/
â”‚
â”œâ”€â”€ interpolationEngine.js
â”‚
â”œâ”€â”€ idwInterpolation.js
â”‚
â”œâ”€â”€ krigingInterpolation.js
â”‚
â”œâ”€â”€ variogram.js
â”‚
â”œâ”€â”€ covariance.js
â”‚
â”œâ”€â”€ splineInterpolation.js
â”‚
â”œâ”€â”€ nearestNeighbourInterpolation.js
â”‚
â”œâ”€â”€ spatialMatrix.js
â”‚
â””â”€â”€ linearSystemSolver.js

And conceptually:

                    Interpolation Engine
                           â”‚
          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
          â”‚                â”‚                â”‚
         IDW            Kriging           Spline
          â”‚                â”‚                â”‚
          â”‚          â”Œâ”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”          â”‚
          â”‚          â”‚           â”‚          â”‚
          â”‚       Variogram   Covariance    â”‚
          â”‚          â”‚           â”‚          â”‚
          â”‚          â””â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜          â”‚
          â”‚                â”‚                â”‚
          â”‚        Spatial Matrix           â”‚
          â”‚                â”‚                â”‚
          â”‚        Linear Solver            â”‚
          â”‚                                 â”‚
          â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                      â”‚
               Raster/grid values
                      â”‚
                      â–¼
                GIS presentation

And nearest-neighbour sits alongside them as an independent method.

10. Scientific rule set I recommend

I would formalize your table like this:

Interpolation	Variogram / Semivariogram	Covariance Model	Model Parameters	Spatial Relationship Matrix	Linear System
Kriging	Required	Required/derived	Required	Required	Required
Spline	Not required	Not required	Spline parameters	Basis-function matrix	Required
Nearest-neighbour	Not required	Not required	None/minimal	Not required	Not required
IDW	Not required	Not required	Power, radius/neighbours	Not required	Not required

This gives us a very clean scientific separation.

Most importantly

I would not implement all three at once.

For the current Soil Analysis GIS roadmap, I suggest:

Step 1 â€” Kriging scientific foundation

Define interpolation data contract
Distance calculation
Experimental semivariogram
Variogram binning
Spherical/Exponential/Gaussian models
Parameter estimation
Covariance conversion
Spatial relationship matrix
Linear-system solver
Ordinary Kriging prediction
Kriging variance
Backend tests
REST API
GIS integration

Then:

Step 2 â€” Spline

Step 3 â€” Nearest-neighbour

That order is useful because Kriging establishes the strongest scientific/geostatistical foundation, while spline and nearest-neighbour can then be implemented as genuinely different interpolation families rather than variations of the existing IDW code.

---------------------------
For this project, I recommend we use a regularized thin-plate spline / radial-basis-function formulation rather than a simple 1-D cubic spline. Soil observations are irregularly distributed in 2-D geographic space, so a spatial spline must account for both latitude and longitude through a distance-based basis function.

Proposed Spline architecture
server/services/interpolation/
â”œâ”€â”€ spatialDistance.js
â”œâ”€â”€ variogram.js
â”œâ”€â”€ covariance.js
â”œâ”€â”€ krigingMatrix.js
â”œâ”€â”€ linearSystemSolver.js
â”œâ”€â”€ krigingInterpolation.js
â”‚
â”œâ”€â”€ splineBasis.js
â”œâ”€â”€ splineMatrix.js
â”œâ”€â”€ splineInterpolation.js
â””â”€â”€ nearestNeighbourInterpolation.js   â† later

I suggest building Spline in three stages:

1. splineBasis.js

Responsible only for the mathematical basis function and validation.

For a thin-plate spline, the radial basis is commonly:

$$ \phi(r)=r^2\ln(r) $$

with the limiting value:

$$ \phi(0)=0 $$

This module should handle:

distance validation
spline basis evaluation
zero-distance handling
basis matrix construction
target basis-vector construction

2. splineMatrix.js

Build the augmented thin-plate spline system.

For sample locations \(x_i\), the system has the form:

$$ \begin{bmatrix} K & P\\ P^T & 0 \end{bmatrix} \begin{bmatrix} w\\ a \end{bmatrix} = \begin{bmatrix} z\\ 0 \end{bmatrix} $$

where:

\(K\) = radial-basis matrix
\(P\) = polynomial constraint matrix
\(w\) = spline weights
\(a\) = polynomial coefficients
\(z\) = observed soil values

For a 2-D first-order polynomial:

$$ P= \begin{bmatrix} 1 & x_1 & y_1\\ 1 & x_2 & y_2\\ \vdots & \vdots & \vdots\\ 1 & x_n & y_n \end{bmatrix} $$

This gives us a proper spatial spline rather than treating the samples as a sequence.

3. splineInterpolation.js

This becomes the orchestration layer:

sample points
      â†“
validate coordinates/values
      â†“
convert coordinates to local metres
      â†“
calculate pairwise distances
      â†“
build spline basis matrix
      â†“
build polynomial constraint matrix
      â†“
build augmented spline system
      â†“
solve using existing linearSystemSolver.js
      â†“
calculate target basis vector
      â†“
calculate interpolated value
      â†“
return prediction + diagnostics
Important scientific choice

I recommend local metre coordinates rather than raw latitude/longitude.

So the spline backend now has two independently validated layers:

Component	Tests	Result
Spline Basis	78	âœ… 78/78
Spline Matrix	85	âœ… 85/85
Spline subtotal	163	âœ… 163/163
What we have validated

The matrix tests confirm the complete scientific structure:

$$ A = \begin{bmatrix} K & P\\ P^T & 0 \end{bmatrix} $$

including:

K basis block
P = [1,x,y]
Páµ€
3Ã—3 zero constraint block
correct (n + 3) Ã— (n + 3) dimensions
matrix symmetry
polynomial constraint preservation
coordinate validation
dimension consistency
invalid-input handling
input immutability
Next: splineInterpolation.js

We can now build the actual interpolation engine.

It will combine the already validated components:

spatialDistance.js
        â†“
distance matrix / target distances
        â†“
splineBasis.js
        â†“
K / target basis vector
        â†“
splineMatrix.js
        â†“
[ K  P ] [ w ] = [ z ]
[ Páµ€ 0 ] [ a ]   [ 0 ]
        â†“
linearSystemSolver.js
        â†“
weights + polynomial coefficients
        â†“
predicted soil value

One important scientific point: we should not bypass the existing linearSystemSolver.js. The spline interpolation service should reuse that validated solver rather than introducing another numerical solver.

Excellent. We now have the exact interfaces. We can build splineInterpolation.js without introducing any new spatial-distance or linear-solver logic.

Design

This will implement a 2-D thin-plate spline interpolation:

$$ \hat z(x,y)= \sum_{i=1}^{n}w_i\phi(d_i) +a_0+a_1x+a_2y $$

with

$$ \phi(r)=r^2\ln(r) $$

and the augmented system:

$$ \begin{bmatrix} K&P\\ P^T&0 \end{bmatrix} \begin{bmatrix} w\\a \end{bmatrix} = \begin{bmatrix} z\\0 \end{bmatrix} $$

For this implementation:

geographic distances use your existing spatialDistance.js
polynomial coordinates use local metric metres
solving uses your existing linearSystemSolver.js
no database access
no GIS/UI logic
input arrays are never modified
at least 3 samples are required
singular/degenerate sample geometry is reported rather than silently producing a result
1. Create splineInterpolation.js

Absolutely. Now that IDW â†’ Kriging â†’ Thin-Plate Spline are checkpointed, we can add Nearest-Neighbour Interpolation as the next independent interpolation method.

1. Scientific definition

Nearest-neighbour interpolation assigns the value of the geographically closest known soil sample to the target location.

For target location \(s_0\):

$$ \hat Z(s_0)=Z(s_i) $$

where

$$ s_i=\arg\min_{s_j} d(s_0,s_j) $$

and \(d\) is the spatial distance between the target and each known sample.

So unlike IDW, Kriging, and Spline:

there is no weighting
there is no variogram
there is no matrix solution
there is no smoothing
the predicted surface is piecewise constant
every location receives the value of its nearest observed sample

This makes it particularly useful as a baseline/reference interpolation method.

2. Proposed architecture

We should keep it consistent with our existing modular interpolation architecture:

server/services/interpolation/
â”‚
â”œâ”€â”€ spatialDistance.js
â”œâ”€â”€ variogram.js
â”œâ”€â”€ covariance.js
â”œâ”€â”€ krigingMatrix.js
â”œâ”€â”€ linearSystemSolver.js
â”œâ”€â”€ krigingInterpolation.js
â”œâ”€â”€ splineBasis.js
â”œâ”€â”€ splineMatrix.js
â”œâ”€â”€ splineInterpolation.js
â””â”€â”€ nearestNeighbourInterpolation.js

The important point is that spatialDistance.js already provides everything we need.

We should reuse:

buildTargetDistanceVector(target, points)

and:

findMinimumDistance(...)
findNearestPointIndex(...)

rather than creating another distance implementation.

3. Proposed interpolation contract

I recommend the function:

interpolateNearestNeighbour(samples, target)

with alias:

nearestNeighbourInterpolation

A successful result could be:

{
  success: true,
  method: "nearest_neighbour",
  prediction: 215,
  target: {
    latitude: 17.7123400,
    longitude: 83.3012500
  },
  nearestSample: {
    index: 0,
    latitude: 17.7123400,
    longitude: 83.3012500,
    value: 215,
    distanceMetres: 0
  },
  sampleCount: 3,
  diagnostics: {
    interpolationType: "nearest_neighbour",
    distanceMetric: "geodesic_local_euclidean"
  }
}

This gives the frontend/backend analytical layers enough information to explain why a particular value was produced.

4. Validation rules

We should explicitly validate:

Samples

Each sample must contain:

{
  latitude,
  longitude,
  value
}

with:

finite latitude
finite longitude
valid geographic coordinates
finite numeric value
Minimum samples

Unlike Spline, Nearest-Neighbour technically requires only one sample.

Therefore:

MIN_SAMPLE_COUNT = 1

This is scientifically important. We should not artificially require three samples.

Target

Target must contain:

{
  latitude,
  longitude
}

with valid geographic coordinates.

Tie handling

If two or more samples are exactly the same distance from the target, we should define deterministic behaviour.

I recommend:

Select the first sample encountered at the minimum distance.

That gives deterministic results and avoids introducing an arbitrary secondary weighting rule.

5. Testing strategy

I recommend a dedicated:

server/tests/nearestNeighbourInterpolation.test.js

We should test at least:

single-sample interpolation
two-sample interpolation
three-sample interpolation
selects closest sample
selects correct sample when target is between samples
exact sample location
target closer to second sample
target closer to third sample
tie-distance deterministic behaviour
zero-distance selection
finite prediction
negative values
zero values
constant values
invalid samples
empty samples
null samples
invalid target
missing target
invalid sample values
invalid coordinates
input immutability
target immutability
correct method identifier
correct nearest-sample metadata
correct distance in metres
alias equivalence

We can make the suite considerably more comprehensive, as we did for Spline.

6. One important design decision

I recommend not creating a separate nearest-neighbour distance module.

We already have the authoritative spatial-distance layer:

spatialDistance.js
        â”‚
        â”œâ”€â”€ IDW
        â”œâ”€â”€ Kriging
        â”œâ”€â”€ Spline
        â””â”€â”€ Nearest-Neighbour

That keeps all interpolation methods using the same coordinate and distance calculations.

It also means that if we later improve our spatial-distance implementation, all interpolation methods benefit consistently.

7. Implementation order

Let's proceed in this order:

Step 1  â†’ nearestNeighbourInterpolation.js
Step 2  â†’ module-load verification
Step 3  â†’ nearestNeighbourInterpolation.test.js
Step 4  â†’ run tests
Step 5  â†’ fix any failures
Step 6  â†’ review numerical/scientific correctness
Step 7  â†’ Git checkpoint + Soil Analysis GIS.md

I suggest we do not touch map.js yet. First we'll establish a completely tested backend interpolation method, just as we did with Kriging and Spline.

Step 1

We can now build:

server/services/interpolation/nearestNeighbourInterpolation.js

using the existing spatialDistance.js functions and following the same defensive coding style as the Kriging and Spline modules.
-----------------------------------------------
Excellent. Phase 12.2 is now committed, pushed, and frozen.

Git checkpoint
c1a3f85 (HEAD -> master, origin/master)
Phase 12.2: add experimental variogram parameter estimation

Repository status:

Working tree: CLEAN
Local master:  c1a3f85
Remote master: c1a3f85
Phase 12.2 validation
Validation	Result
Parameter-estimation tests	38/38
Interpolation regression	128/128
Full project regression	788/788
Test suites	47
Failures	0
git diff --check	Clean
Git push	Successful
Scientific functionality now frozen

Phase 12.2 establishes the deterministic experimental-variogram estimation foundation:

Nugget â€” near-origin lag mean
Sill â€” upper semivariance fraction
Structured variance â€” sill âˆ’ nugget
Range â€” practical threshold method
Weighted SSE â€” pair-count weighted model-fit diagnostic
Weighted RMSE â€” normalized fit diagnostic
Supports:
spherical
exponential
Gaussian
Configurable:
nugget lag count
sill upper fraction
range threshold
Explicitly no numerical optimization yet
Explicitly no automatic model selection yet
Explicitly not integrated into interpolationService.js yet

That last point is important: the scientific estimator is now independently tested and versioned before it becomes part of production interpolation parameter resolution.

Recommended next phase

The natural next step is Phase 12.3 â€” Variogram Estimation Robustness & Scientific Edge Cases before connecting estimation to Kriging.

I would test the estimator against:

sparse experimental lags
insufficient usable lags
flat semivariograms
noisy/non-monotonic semivariograms
nugget greater than observed semivariance
sill close to nugget
range threshold reached at the first lag
threshold never reached â†’ maximum-distance fallback
duplicate/zero-distance pairs
invalid pair counts
extreme but valid semivariance values
deterministic repeatability

After that, we can consider 12.4 numerical model fitting/optimization, and only after that integrate estimated parameters into the Kriging path.

Phase 12.2 checkpoint c1a3f85 is solid.
---------------------------------------------------
Agreed. Weâ€™ll move to Phase 12.3 â€” Variogram Estimation Robustness & Scientific Edge Cases.

The important architectural rule remains: do not integrate the estimator into interpolationService.js yet. We first harden the scientific estimator independently.

Phase 12.3 sequence
12.3.1 â€” Robustness contract
Define valid/invalid experimental variogram conditions.
Define behavior for sparse, flat, noisy, and non-monotonic data.
Preserve deterministic estimation.
12.3.2 â€” Edge-case validation
insufficient usable lags
zero/invalid distances
invalid semivariances
invalid pair counts
sill â‰ˆ nugget
threshold not reached
threshold reached at first lag
12.3.3 â€” Robust estimation behavior
Ensure estimates remain mathematically valid.
Prevent nonsensical range/sill/nugget combinations.
Preserve existing deterministic methodology.
12.3.4 â€” Regression tests
Add focused robustness tests.
Run the existing 38-test estimator suite.
Run the 128-test interpolation regression.
Run the complete suite.
12.3.5 â€” Git checkpoint
First step

Let's inspect the current Phase 12.2 estimator and its tests before changing anything.
-------------------------------------------------
Yes. We can move forward from the clean 5d8a01d baseline.

Given where we stopped, I recommend we continue with the scientific interpolation development, rather than changing the UI yet.

Next phase: scientific interpolation completion

We currently have the verified foundation:

Spatial Distance
      â†“
Variogram / Semivariogram
      â†“
Covariance
      â†“
Kriging Matrix
      â†“
Linear System Solver
      â†“
Kriging

alongside:

IDW
Thin-Plate Spline
Nearest-Neighbour

The next logical step is to formalize the scientific parameter estimation layer so the interpolation methods have defensible, data-derived parameters rather than relying on arbitrary values.

I suggest this sequence:

Kriging parameter estimation
experimental semivariogram
model fitting
nugget
structured variance
total sill
range
diagnostics / fit quality
insufficient-data handling
Kriging scientific validation
parameter plausibility
duplicate locations
sparse samples
zero variance
very small ranges
numerical stability
Spline scientific parameters
smoothing/tension policy
parameter validation
deterministic defaults
diagnostics
Nearest-neighbour scientific contract
distance metric
tie handling
deterministic selection
boundary behaviour

Unified interpolation parameter contract

IDW
â”œâ”€â”€ power
â””â”€â”€ resolution

Kriging
â”œâ”€â”€ variogram model
â”œâ”€â”€ nugget
â”œâ”€â”€ sill
â”œâ”€â”€ range
â””â”€â”€ diagnostics

Spline
â””â”€â”€ smoothing/tension parameters

Nearest-neighbour
â””â”€â”€ deterministic spatial rule
Integration into prepareInterpolation()
resolve parameters once
validate sample count
construct the interpolation configuration
pass immutable scientific parameters to grid generation
never estimate parameters per cell
Regression test
run the interpolation tests
run the complete 850+ test suite
create another Git checkpoint
Important architectural rule

We should preserve the principle you've established:

Scientific calculations and classification remain backend authoritative. The frontend only presents the resulting analytical surface and metadata.

And we should avoid changing the already-verified interpolationService.js contract unless the new scientific requirements genuinely require an extension.

I recommend starting with Step 1: Kriging scientific parameter estimation and its tests.

12.5.1  Cross-validation foundation
12.5.2  Kriging prediction diagnostics
12.5.3  Variogram/model validation criteria
12.5.4  Acceptance/rejection rules
12.5.5  Kriging validation tests
12.5.6  Integration with scientific parameter pipeline
12.5.7  Full regression + checkpoint

After Kriging is scientifically validated, we can proceed to:

12.6  Thin-Plate Spline scientific foundation
12.7  Nearest-Neighbour scientific foundation
12.8  Comparative interpolation validation
---------------------------------------------
Excellent. The current architecture gives us a clean place to add 12.5.1 â€” Kriging Cross-Validation Foundation without changing krigingInterpolation.js.

I reviewed the supplied contracts. The key point is that interpolateKriging() is already a pure prediction engine: it accepts points, target, and validated covariance parameters, and returns prediction diagnostics. That is exactly what cross-validation should orchestrate.

12.5.1.1 â€” Scientific Cross-Validation Contract

I recommend freezing the following design before implementation.

1. Method: Leave-One-Out Cross-Validation

For n observations:

Original dataset
      â”‚
      â”œâ”€â”€ Hold out observation 1
      â”‚      â””â”€â”€ predict using observations 2..n
      â”‚
      â”œâ”€â”€ Hold out observation 2
      â”‚      â””â”€â”€ predict using observations 1,3..n
      â”‚
      â”œâ”€â”€ ...
      â”‚
      â””â”€â”€ Hold out observation n
             â””â”€â”€ predict using observations 1..n-1

For each held-out observation:

observed value
      â†“
Kriging prediction
      â†“
residual = predicted âˆ’ observed

We should use the convention:

residual = predictedValue - observedValue

This makes positive residual mean over-prediction and negative residual mean under-prediction.

2. Important scientific decision: parameters are fixed

For this foundation, the supplied variogram parameters should be used unchanged for every fold.

Example:

{
  model: "spherical",
  nugget: 0.1,
  sill: 1.0,
  range: 2000
}

The process is therefore:

validated variogram parameters
            â”‚
            â”œâ”€â”€ fold 1 â†’ Kriging
            â”œâ”€â”€ fold 2 â†’ Kriging
            â”œâ”€â”€ fold 3 â†’ Kriging
            â””â”€â”€ ...

We should not re-estimate the variogram separately for every fold in 12.5.1.

Why?

Because this phase is intended to answer:

How well does this particular Kriging configuration predict unseen observations?

If we simultaneously change the variogram parameters in every fold, we would be testing both parameter estimation and prediction at once.

That can be introduced later as a separate scientific validation mode.

3. Minimum sample count

Ordinary Kriging requires at least two training observations.

LOOCV removes one observation.

Therefore:

n - 1 >= 2

which means:

n >= 3

So the cross-validation service should reject fewer than 3 samples.

This is different from interpolateKriging(), whose minimum is correctly 2.

4. Proposed service

Create:

server/services/interpolation/krigingCrossValidationService.js

It should be an orchestration/diagnostic layer.

It should not:

calculate distances itself
calculate covariance itself
construct Kriging matrices itself
solve linear systems itself
estimate variogram parameters
access the database
modify interpolationService.js
modify krigingInterpolation.js

Its primary dependency will be:

krigingInterpolation.js
        â†“
interpolateKriging()
5. Proposed input contract
{
  points,
  parameters,
  options
}

Where:

points = [
  {
    latitude,
    longitude,
    value
  },
  ...
]

and:

parameters = {
  model,
  nugget,
  sill,
  range
}

Optional numerical options can be passed through to interpolateKriging():

{
  weightTolerance,
  residualTolerance,
  pivotTolerance
}
6. Proposed individual validation result

Each fold should preserve enough information for scientific diagnostics:

{
  index: 0,

  sample: {
    latitude: 17.7000,
    longitude: 83.3000,
    value: 10
  },

  trainingSampleCount: 2,

  observedValue: 10,

  predictedValue: 12.34,

  residual: 2.34,

  absoluteError: 2.34,

  squaredError: 5.4756,

  success: true
}

For a failed fold:

{
  index: 0,

  sample: {...},

  trainingSampleCount: 2,

  observedValue: 10,

  predictedValue: null,

  residual: null,

  absoluteError: null,

  squaredError: null,

  success: false,

  error: "...",
  errors: [...]
}

This is preferable to silently dropping failed folds.

7. Aggregate diagnostics

For successful folds:

Mean Error / Bias
ME = Î£(predicted - observed) / n

This tells us whether predictions systematically over- or under-estimate.

Mean Absolute Error
MAE = Î£|predicted - observed| / n
Root Mean Square Error
RMSE = âˆš(Î£(predicted - observed)Â² / n)

We should calculate these only from successful validation folds.

8. Proposed aggregate contract
{
  success: true,

  method: "ordinary_kriging",

  validationMethod: "leave_one_out",

  sampleCount: 5,

  successfulValidationCount: 5,

  failedValidationCount: 0,

  predictions: [
    ...
  ],

  metrics: {
    meanError,
    meanAbsoluteError,
    rootMeanSquareError
  },

  parameters: {
    model,
    nugget,
    sill,
    range
  }
}

And importantly, provenance:

parameterSource

should not be invented by the cross-validation service.

If the caller supplies estimated parameters, we can later pass their provenance through explicitly.

For now, the cross-validation service should report the parameters actually used, without claiming how they were obtained.

9. No acceptance/rejection yet

This is important.

12.5.1 should calculate diagnostics, but should not say:

RMSE < X = acceptable
RMSE > X = unacceptable

There is no universal soil-property RMSE threshold that we should arbitrarily impose here.

Likewise, it should not declare:

"Good Kriging"
"Poor Kriging"
"Best model"

Those decisions belong to the later 12.5.3 / 12.5.4 validation criteria phase.

So the architecture remains:

12.5.1
Cross-validation
      â†“
raw validation predictions
      â†“
ME / MAE / RMSE
      â†“
12.5.2
Prediction diagnostics
      â†“
12.5.3
Model validation criteria
      â†“
12.5.4
Acceptance/rejection rules
10. Failure policy

A particularly important design decision:

One failed fold should not cause the entire mathematical process to disappear.

Instead:

5 folds
â”‚
â”œâ”€â”€ fold 1 success
â”œâ”€â”€ fold 2 success
â”œâ”€â”€ fold 3 failure
â”œâ”€â”€ fold 4 success
â””â”€â”€ fold 5 success

should produce:

success: true
successfulValidationCount: 4
failedValidationCount: 1

with metrics based on the four successful folds, plus an explicit warning/diagnostic that one fold failed.

However:

successfulValidationCount === 0

must return:

success: false

because there are no validation predictions from which to calculate metrics.

We can later add a formal minimum successful-fold criterion in 12.5.4.

11. Data immutability

The service must not mutate:

original points
individual sample objects
parameters
options

For each fold it should construct a new training array excluding the held-out index.

Conceptually:

points
  â”‚
  â”œâ”€â”€ original remains untouched
  â”‚
  â”œâ”€â”€ fold 0 â†’ new training array
  â”œâ”€â”€ fold 1 â†’ new training array
  â””â”€â”€ ...
12. Scientific architecture

This gives us a very clean separation:

                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚ Variogram / parameters  â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                 â”‚
                                 â–¼
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚ Kriging Cross Validationâ”‚
                    â”‚       12.5.1            â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                 â”‚
                     leave one sample out
                                 â”‚
              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
              â–¼                  â–¼                  â–¼
         Training set       Training set       Training set
              â”‚                  â”‚                  â”‚
              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                 â–¼
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚ interpolateKriging()    â”‚
                    â”‚ existing authoritative   â”‚
                    â”‚ prediction engine        â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                 â–¼
                    observed / predicted
                                 â”‚
                                 â–¼
                    residual diagnostics
                                 â”‚
                                 â–¼
                         ME / MAE / RMSE

This means we don't need to touch the existing Kriging implementation at all.

Next implementation step

I recommend we now create only the new test file first:

server/tests/krigingCrossValidationService.test.js

with the scientific contract tests before implementing the service.

That will let us lock down:

LOOCV fold generation
minimum 3-sample requirement
fixed parameters across folds
observed/predicted/residual calculation
MAE
RMSE
mean error
successful/failed fold accounting
zero-success failure
input immutability
exact delegation to existing Kriging behavior

Then we implement the service against those tests.

No existing production file needs to change for 12.5.1.
-----------------------------------------------------
Correct. Based on your roadmap, 12.5.1–12.5.7 is the complete Kriging validation track, and the checkpoint we just created covers the final integration/regression gate.

So the next development phase is:

12.6 — Thin-Plate Spline Scientific Foundation

We should approach it with the same scientific discipline used for Kriging:

12.6 Thin-Plate Spline
│
├── 12.6.1 Mathematical foundation
│   ├── Thin-plate spline basis function
│   ├── Radial basis formulation
│   ├── Spatial distance handling
│   └── Polynomial drift terms
│
├── 12.6.2 Spline system construction
│   ├── Spline basis matrix
│   ├── Polynomial constraint matrix
│   ├── Augmented linear system
│   └── Matrix dimensions / structural validation
│
├── 12.6.3 Spline parameter validation
│   ├── Smoothing parameter
│   ├── Numerical constraints
│   ├── Degenerate configurations
│   └── Insufficient observations
│
├── 12.6.4 Spline solver integration
│   ├── Existing linear solver
│   ├── Prediction equation
│   └── Numerical residual diagnostics
│
├── 12.6.5 Cross-validation / diagnostics
│   ├── Leave-one-out prediction
│   ├── Error metrics
│   └── Failure diagnostics
│
├── 12.6.6 Production integration
│   ├── interpolationService
│   ├── prepareInterpolation()
│   ├── buildInterpolationGrid()
│   └── generateInterpolationSurface()
│
└── 12.6.7 Full regression + checkpoint
Important architectural rule

We should not immediately modify interpolationService.js.

First establish and test the scientific foundation independently:

Existing spatialDistance
        ↓
Spline basis
        ↓
Spline matrix
        ↓
Polynomial constraints
        ↓
Linear system
        ↓
Spline prediction
        ↓
Diagnostics / validation
        ↓
Production integration

This mirrors the successful Kriging progression and keeps the scientific layer independently testable.

First step: 12.6.1

Let's inspect the existing spline implementation and tests before designing anything, because your project already has:

splineBasis
splineInterpolation
splineMatrix
-------------------------------------------------------------------
This confirms that the existing spline implementation already contains most of the 12.6 mathematical foundation. We should not create duplicate modules.

What we have already
12.6 area	Existing implementation	Status
12.6.1 TPS basis	splineBasis.js	Implemented
Radial basis φ(r)=r²ln(r)	splineBasis.js	Implemented
Spatial distance handling	spatialDistance.js	Implemented
Polynomial drift terms [1,x,y]	splineMatrix.js	Implemented
Basis matrix K	splineBasis.js	Implemented
Polynomial matrix P	splineMatrix.js	Implemented
Pᵀ	splineMatrix.js	Implemented
Zero constraint block	splineMatrix.js	Implemented
Augmented TPS system	splineMatrix.js	Implemented
Matrix dimension validation	splineMatrix.js	Implemented
Linear-system solving	splineInterpolation.js	Implemented
Numerical equilibration	splineInterpolation.js	Implemented
Prediction equation	splineInterpolation.js	Implemented
Minimum sample validation	splineInterpolation.js	Implemented

The important point is that the existing architecture already has the correct system:

       ┌───────┬───────┐
       │   K   │   P   │
       ├───────┼───────┤
       │  Pᵀ   │   0   │
       └───────┴───────┘
          [ w , a ]

with:

A x = b

[ K   P ] [ w ] = [ z ]
[ Pᵀ  0 ] [ a ]   [ 0 ]

So 12.6 should be treated as a scientific validation/strengthening phase, rather than rebuilding the spline engine.

One important scientific observation

Your splineMatrix.js currently validates the structure of the augmented system, but from the output shown so far we have not yet established whether it validates the deeper mathematical requirements:

P has rank 3.
Sample coordinates are not collinear.
The augmented system has sufficient geometric support.
The matrix is structurally symmetric.
The lower-right constraint block is exactly zero.
Pᵀ actually corresponds to P.
The assembled matrix is numerically suitable for solving.

The existing splineInterpolation.js already detects at least some geometric/numerical failures through the solver, as shown by the presence of createCollinearSamples() in its tests. But we should determine where that validation currently happens before adding anything.

Therefore, next step

Please give me the remaining portions of the three files, especially the actual assembly and solve path.

Run:

Get-Content ".\server\services\interpolation\splineMatrix.js" |
  Select-Object -Skip 400 -First 300
Get-Content ".\server\services\interpolation\splineInterpolation.js" |
  Select-Object -Skip 450 -First 500

And the remaining tests:

Get-Content ".\server\tests\splineMatrix.test.js" |
  Select-Object -Skip 450 -First 350
Get-Content ".\server\tests\splineInterpolation.test.js" |
  Select-Object -Skip 450 -First 700

After that, I can give you a precise 12.6 gap analysis—what is already scientifically valid, what needs strengthening, and exactly what should become 12.6.1, 12.6.2, etc., without disturbing the working spline implementation.
-----------------------------------------------------------------
Yes. This confirms that the existing Thin-Plate Spline implementation already contains the core mathematical engine for Phase 12.6. We should strengthen and scientifically validate it rather than build another spline implementation.

Phase 12.6 review so far
Area	Current status	Assessment
TPS basis φ(r)=r²ln(r)	Implemented	✅
φ(0)=0 handling	Implemented	✅
Spatial distance matrix	Implemented	✅
Local metric coordinates	Implemented	✅
Polynomial drift [1,x,y]	Implemented	✅
Basis matrix K	Implemented	✅
Polynomial matrix P	Implemented	✅
Pᵀ	Implemented	✅
Zero constraint block	Implemented	✅
Augmented system [K P; Pᵀ 0]	Implemented	✅
RHS [z;0]	Implemented	✅
Linear solver	Implemented	✅
Matrix equilibration	Implemented	✅
Prediction equation	Implemented	✅
Exact sample reproduction	Tested	✅
Constant-value behavior	Tested	✅
Real-world 9-point dataset	Tested	✅
Non-collinear minimum geometry	Tested	✅
Geometric degeneracy validation	Needs strengthening	⚠️
Matrix structural validation	Needs strengthening	⚠️
Numerical residual diagnostics	Not yet evident	⚠️
Leave-one-out / CV diagnostics	Not yet evident	⚠️
Scientific acceptance rules	Not yet implemented	⚠️
One important point

I would not add a smoothing parameter yet.

The current implementation is an exact thin-plate spline interpolator:

$$ \begin{bmatrix} K&P\\ P^T&0 \end{bmatrix} \begin{bmatrix} w\\a \end{bmatrix} = \begin{bmatrix} z\\0 \end{bmatrix} $$

Adding a smoothing parameter would change this into a regularized/smoothing spline formulation. That is a scientific design decision, not merely a validation enhancement. We should not introduce it just because the Phase 12.6 outline originally mentioned it.

What I see as the main scientific gap

The current matrix builder correctly constructs:

K   P
Pᵀ  0

but structural correctness alone does not establish that the geometric configuration is suitable for a 2-D TPS.

For P = [1, x, y], the sample coordinates need sufficient rank. In particular, the points should not all be collinear.

You already have a collinear test fixture in splineInterpolation.test.js, which is good. The next question is whether the production implementation explicitly detects and reports that geometry, or merely lets the linear solver fail because the augmented system becomes singular/ill-conditioned.

For a scientific GIS implementation, I would prefer:

invalid/degenerate geometry
        ↓
explicit validation
        ↓
scientific diagnostic
        ↓
do not send an unsuitable system to the solver

rather than:

degenerate geometry
        ↓
solver failure
        ↓
generic numerical error

That distinction will matter later when we build comparative interpolation diagnostics.

Also important: matrix residuals

The current result reports:

diagnostics: {
  basisFunction: "r^2 * ln(r)",
  polynomialOrder: 1,
  polynomialDimension: 3,
  systemSize: dimensions.systemSize,
  pivotTolerance: solverOptions.pivotTolerance,
  matrixEquilibration: {
    applied: true,
    columnScaling: "max_abs",
    rowScaling: "max_abs",
  },
}

That's useful, but it doesn't yet tell us whether the computed solution actually satisfies the TPS system numerically.

For Phase 12.6.4/12.6.5 I would expect diagnostics along the lines of:

maximum absolute system residual
RMS system residual
polynomial constraint residual
interpolation residual

without changing the interpolation mathematics.

That gives us a way to distinguish:

mathematically valid system,
successfully solved system,
numerically accurate solution.
Therefore, I would structure the remaining Phase 12.6 work as
12.6.1 Mathematical foundation          ← essentially complete
12.6.2 Spline system construction      ← essentially complete
12.6.3 Scientific/geometric validation ← strengthen
12.6.4 Solver + residual diagnostics   ← strengthen
12.6.5 Cross-validation diagnostics    ← add
12.6.6 Production integration          ← inspect existing integration
12.6.7 Regression + checkpoint

And importantly, no new spline engine.

Before modifying anything, I want to see the remainder of splineInterpolation.test.js, because the output stopped while still inside the production tests. That will tell us exactly how much validation is already present and prevent us from duplicating tests.

Please run:

Get-Content ".\server\tests\splineInterpolation.test.js" |
  Select-Object -Skip 1100 -First 900

Also, because the splineMatrix.test.js output stopped in the middle of buildAugmentedSplineMatrix, get the remainder:

Get-Content ".\server\tests\splineMatrix.test.js" |
  Select-Object -Skip 800 -First 500

Once those are reviewed, we can make the 12.6 scientific gap analysis final and then implement only the missing validation/diagnostics.
--------------------------------------------------------------------------
This fills the remaining gap in the review. The existing TPS implementation is stronger than the initial inspection suggested.

Final Phase 12.6 gap assessment
Already implemented and well tested

12.6.1 Mathematical foundation — essentially complete

Thin-plate radial basis r² ln(r)
φ(0)=0
Geographic distance calculation
Local metric coordinates
First-order polynomial drift [1,x,y]
Minimum sample count of 3
Basis matrix construction
Target basis vector

12.6.2 Spline system construction — essentially complete

The implementation explicitly constructs:

[K  P]
[Pᵀ 0]

and the tests verify:

correct matrix dimensions
K block
P block
Pᵀ block
zero constraint block
symmetry
polynomial constraints
input immutability
dimension consistency

That is a good scientific foundation.

Existing production safeguards

The interpolation engine already handles:

insufficient samples
invalid coordinates
invalid values
invalid target
duplicate locations
collinear geometry
invalid pivot tolerance
solver failure
non-finite solution components
non-finite prediction
matrix equilibration
exact reproduction at observed locations
constant-value data
real-world 9-point EC geometry

The real-world test is particularly useful because it establishes a deterministic scientific regression value:

prediction = 0.17296346818652533

with a 1e-9 tolerance.

What is actually missing

I would now reduce Phase 12.6 substantially rather than adding unnecessary machinery.

12.6.3 Scientific/geometric validation

Needs strengthening.

The current implementation detects collinear and duplicate geometries indirectly through the linear solver:

geometry
   ↓
singular/unsuitable augmented system
   ↓
solver failure

For a scientific interpolation service, it would be better to identify the geometry explicitly:

geometry
   ↓
geometric validation
   ↓
valid / degenerate
   ↓
solver

This would provide a much clearer diagnostic than:

Unable to solve spline interpolation system.

For example, a result could distinguish:

insufficient observations
duplicate locations
collinear observations
insufficient spatial rank
numerical solver failure

rather than treating all of them as solver failures.

12.6.4 Solver integration

The solver integration itself is already complete.

What is missing is post-solution numerical verification.

Currently we know:

solver.success === true

but we don't explicitly calculate how closely the solution satisfies:

A x = b

and the TPS constraints.

I recommend adding diagnostics such as:

maximum absolute system residual
RMS system residual
maximum polynomial constraint residual
maximum interpolation residual

This does not change the interpolation result. It only verifies the numerical solution.

12.6.5 Cross-validation

This appears genuinely missing.

The existing tests demonstrate interpolation at known samples, but that is not the same as leave-one-out cross-validation.

For example:

sample 1 removed → predict sample 1
sample 2 removed → predict sample 2
...
sample n removed → predict sample n

Then calculate standard error metrics.

For the scientific foundation, I would keep this separate from the production prediction path.

One thing I would NOT change

I would not introduce a smoothing parameter into the current TPS implementation.

The current system is an exact interpolating TPS:

[K P] [w] = [z]
[Pᵀ 0] [a]   [0]

Adding λ would create a different mathematical model. Since the current project has already established exact TPS interpolation, we should not introduce regularization without a specific scientific requirement.

So I would revise the original roadmap:

12.6 Thin-Plate Spline
│
├── 12.6.1 Mathematical foundation       ✅ Existing
├── 12.6.2 System construction            ✅ Existing
├── 12.6.3 Geometric validation           🔧 Strengthen
├── 12.6.4 Solver residual diagnostics    🔧 Add
├── 12.6.5 Cross-validation diagnostics   🔧 Add
├── 12.6.6 Production integration         🔍 Verify
└── 12.6.7 Regression + checkpoint        ⏳

This is much cleaner than creating another spline implementation.

Recommended next step

Before modifying code, I want to inspect the complete-system validation test remainder, because the output stopped during:

"should preserve all polynomial constraints in the assembled system"

Run:

Get-Content ".\server\tests\splineMatrix.test.js" |
  Select-Object -Skip 1150 -First 400

Then we can freeze 12.6.1 + 12.6.2 as already implemented, and start with 12.6.3 geometric validation only.
---------------------------------------------------------------
Recommended implementation order

I would now proceed exactly like this:

12.6.3.1 Create splineGeometry.js
12.6.3.2 Add dedicated splineGeometry.test.js
12.6.3.3 Integrate geometry validation into interpolateSpline()
12.6.3.4 Update the two existing collinear/duplicate tests
12.6.3.5 Run spline tests
12.6.3.6 Run full 1,001-test regression

This keeps the change isolated and preserves the already-frozen 12.6.1 mathematical foundation and 12.6.2 matrix construction.

No production interpolationService.js change is needed yet. First we should make the spline engine scientifically explicit and test it independently.
----------------------------------------
Yes. We can now proceed with Phase 12.6.5 — Thin-Plate Spline Cross-Validation Diagnostics.

Phase 12.6.5 scope

We will implement this in four controlled steps:

Leave-One-Out Cross-Validation (LOOCV)
Remove one observation at a time.
Fit TPS using the remaining observations.
Predict the omitted observation.
Record observed value, predicted value, and prediction error.
Cross-validation error metrics
Mean Error / Bias
MAE
RMSE
Maximum absolute error
Number of successful and failed folds
Failure diagnostics
Insufficient observations
Duplicate locations
Collinear remaining points
Invalid coordinates/values
Solver/interpolation failure
Identify the specific failed fold/sample.
Dedicated tests
Unit tests for validation and metrics.
Successful LOOCV.
Geometric failure cases.
Numerical/interpolation failure cases.
Regression protection.
Important scientific rule

We will not introduce an arbitrary pass/fail threshold for MAE or RMSE.

Cross-validation will report the predictive diagnostics. It will not automatically declare the spline scientifically acceptable or unacceptable. That keeps this phase consistent with the approach we used for Kriging.

Also, we will not introduce a smoothing parameter. The existing implementation remains an exact thin-plate spline.

First step

Before creating the new service, let's inspect the current spline interpolation exports and test structure so we integrate LOOCV cleanly rather than duplicating existing logic.
---------------------------------------------------------------------
Phase 12.7 — Nearest-Neighbour Scientific Foundation

I recommend keeping this phase deliberately smaller than Kriging and TPS because nearest-neighbour interpolation has a much simpler mathematical model.

Proposed roadmap
12.7 Nearest-Neighbour Scientific Foundation
│
├── 12.7.1 Mathematical foundation
│   ├── Nearest-neighbour definition
│   ├── Euclidean spatial distance
│   ├── Nearest-sample selection
│   └── Exact sample-location behavior
│
├── 12.7.2 Spatial selection validation
│   ├── Coordinate validation
│   ├── Distance calculation
│   ├── Tie handling
│   └── Empty/invalid observations
│
├── 12.7.3 Prediction validation
│   ├── Observed-value preservation
│   ├── Nearest-sample identity
│   ├── Finite prediction
│   └── Deterministic behavior
│
├── 12.7.4 Diagnostic foundation
│   ├── Selected sample
│   ├── Distance to selected sample
│   ├── Candidate count
│   └── Prediction diagnostics
│
├── 12.7.5 Cross-validation diagnostics
│   ├── Leave-one-out prediction
│   ├── Error metrics
│   └── Failed-fold diagnostics
│
├── 12.7.6 Production integration
│   ├── interpolationService
│   ├── prepareInterpolation()
│   ├── buildInterpolationGrid()
│   └── generateInterpolationSurface()
│
└── 12.7.7 Regression + checkpoint
One important scientific distinction

For nearest-neighbour interpolation:

$$ \hat Z(x_0)=Z(x_i) $$

where \(x_i\) is the observed sample location having the minimum spatial distance to the prediction location \(x_0\).

There are therefore no:

variogram parameters
covariance model
kriging weights
spline coefficients
smoothing parameter
distance-power parameter

The scientific work should instead establish that the nearest sample is selected correctly and deterministically.

Tie handling

This deserves an explicit rule rather than leaving JavaScript array ordering to define scientific behavior.

I suggest:

When two or more observations have equal minimum distance within the defined numerical tolerance, select the observation with the lowest original observation index.

That gives us deterministic, reproducible nearest-neighbour interpolation.

Cross-validation

We can use LOOCV similarly to TPS, but the interpretation is different:

For each held-out observation:

training samples
      ↓
remove observation i
      ↓
find nearest remaining sample
      ↓
predict held-out location
      ↓
compare predicted vs observed

Again, LOOCV should remain diagnostic rather than an automatic acceptance/rejection gate.

First step: inspect the existing implementation

Before changing anything, let's inspect the current nearest-neighbour implementation and tests.

Run:

Get-Content ".\server\services\interpolation\nearestNeighbourInterpolation.js" |
    Select-Object -First 1200

Then:

Get-Content ".\server\tests\nearestNeighbourInterpolation.test.js" |
    Select-Object -First 1200

And locate all current nearest-neighbour references:

Get-ChildItem ".\server" -Recurse -File |
    Select-String -Pattern "nearest_neighbour|nearestNeighbour|nearest-neighbour" |
    Select-Object Path, LineNumber, Line

Don't modify anything yet. Once we see the existing implementation, we'll decide which parts of 12.7 are already scientifically sound and avoid rebuilding functionality that is already correct.

Let's start Phase 12.7 Nearest-Neighbour Scientific Foundation  

Yes. We’ll start Phase 12.7 from the frozen checkpoint 78b5071.

We should follow the same discipline used for Kriging and TPS: inspect first, define the scientific contract, then implement only the missing foundation.

Phase 12.7 starting plan
12.7.1 Mathematical foundation
        ↓
12.7.2 Spatial selection validation
        ↓
12.7.3 Prediction validation
        ↓
12.7.4 Diagnostic foundation
        ↓
12.7.5 Cross-validation diagnostics
        ↓
12.7.6 Production integration
        ↓
12.7.7 Full regression + checkpoint

For 12.7.1, the scientific contract will be:

Given target location x₀:

dᵢ = spatialDistance(x₀, xᵢ)

i* = argmin(dᵢ)

Ẑ(x₀) = Z(xᵢ*)

The implementation must therefore establish:

valid geographic coordinates;
consistent metric distance calculation;
deterministic nearest-sample selection;
exact sample-location preservation;
deterministic tie handling;
invalid/empty observation behavior;
finite predicted values.

We will not introduce unnecessary parameters such as power, smoothing, variogram, covariance, or weighting.
--------------------------------------
Good. We have enough to establish the starting point for Phase 12.7 without rewriting working code.

The important finding is that the current nearest-neighbour implementation already contains most of the 12.7.1 mathematical foundation.

Phase 12.7.1 — Mathematical Foundation assessment
Already implemented

The current implementation correctly establishes:

Nearest-neighbour formulation
Ẑ(s₀) = Z(sᵢ)

where sᵢ is the sample having minimum distance from s₀.

Metric spatial distance

It delegates to the existing authoritative:

server/services/interpolation/spatialDistance.js

This keeps nearest-neighbour consistent with the other interpolation methods.

Target-to-sample distance vector
buildNearestNeighbourDistances(target, samples)

delegates to:

buildTargetDistanceVector(target, samples)
Nearest-sample selection
findNearestSampleIndex(distances)

selects the minimum distance.

Deterministic tie handling

The current algorithm uses:

if (distance < nearestDistance)

rather than <=.

Therefore an equal-distance later observation does not replace the earlier observation.

That gives us the existing rule:

For equal minimum distances, the first observation in the supplied sample sequence is selected.

This is deterministic and does not require an arbitrary numerical tolerance at this stage.

Exact sample reproduction

At zero distance:

distance = 0
prediction = observed sample value

Your existing tests already verify this.

No weighting
weighting = none
No smoothing
smoothing = false
No mutation

Both samples and target are protected by existing tests.

Minimum sample count
MIN_SAMPLE_COUNT = 1

which is scientifically appropriate for nearest-neighbour interpolation.

One thing I would change

There is a small formatting defect in validateSample():

      if (

The indentation is inconsistent:

      if (
    isFiniteNumericValue(sample.latitude) &&

It is harmless, but since we're establishing a scientific foundation, we should clean that when we make the Phase 12.7 changes.

More importantly, I would not introduce a tie tolerance yet.

The existing rule is mathematically clear:

minimum distance
→ first observation attaining that minimum

Adding something like 1e-10 metres would introduce a new scientific parameter without a requirement.

What 12.7.1 still needs

Rather than immediately modifying nearestNeighbourInterpolation.js, I want to establish the distance contract explicitly.

The nearest-neighbour mathematical chain should be frozen as:

Target geographic coordinate
          │
          ▼
Validate latitude / longitude
          │
          ▼
Convert target + samples to
consistent local metric coordinates
          │
          ▼
Calculate target → sample distances
          │
          ▼
Find minimum distance
          │
          ▼
Select first sample attaining minimum
          │
          ▼
Return that sample's observed value

And the scientific invariants should be:

1. distance(s₀, sᵢ) ≥ 0
2. distance(s₀, sᵢ) = distance(sᵢ, s₀)
3. distance(sᵢ, sᵢ) = 0
4. nearest index ∈ [0, n-1]
5. prediction = observed value of nearest sample
6. exact sample location → exact observed value
7. no weighting
8. no smoothing
9. deterministic tie resolution
Step 2 — inspect the authoritative distance implementation

Because nearest-neighbour delegates its geometry to spatialDistance.js, let's verify that contract before freezing 12.7.1.

Run:

Get-Content ".\server\services\interpolation\spatialDistance.js" |
    Select-Object -First 1000

Then inspect its existing tests:

Get-Content ".\server\tests\spatialDistance.test.js" |
    Select-Object -First 1200

And run the current nearest-neighbour test suite as the 12.7 starting baseline:

node --test ".\server\tests\nearestNeighbourInterpolation.test.js"
Don't modify anything yet.

Once we have those results, we'll formally freeze 12.7.1 Mathematical Foundation, add only the missing scientific tests, and then move to 12.7.2 Spatial Selection Validation.
----------------------------------------------------------
This confirms 12.7.1 is already substantially implemented and the existing nearest-neighbour test suite is healthy: 90/90 passed.

One important finding is that spatialDistance.test.js does not exist, so we should not create a broad duplicate test suite just for the distance module. The nearest-neighbour tests already exercise the required public behavior through nearestNeighbourInterpolation.js.

12.7.1 assessment
Scientific requirement	Current implementation	Status
Euclidean spatial distance	calculateDistance()	✅
Metric unit = metres	EARTH_RADIUS_METRES	✅
Target → sample distances	buildTargetDistanceVector()	✅
Nearest sample = minimum distance	findNearestSampleIndex()	✅
Exact sample location	distance 0 → that sample	✅
Prediction = observed nearest value	calculateNearestNeighbourPrediction()	✅
No weighting	Explicitly reported	✅
No smoothing	Explicitly reported	✅
Deterministic ties	First minimum wins	✅
Single-sample case	Supported	✅
Invalid observations rejected	validateSamples()	✅
Input immutability	Tested	✅

The mathematical contract is therefore:

$$ d_i=d(x_0,x_i) $$ $$ i^*=\arg\min_i d_i $$ $$ \hat Z(x_0)=Z(x_{i^*}) $$

There is no scientific reason at this stage to add a distance tolerance, weighting factor, smoothing parameter, or tie tolerance.

One architectural point to note

spatialDistance.js contains both:

findMinimumDistance(distances)
findNearestPointIndex(target, points)

while nearestNeighbourInterpolation.js has its own:

findNearestSampleIndex(distances)
findNearestSampleDistance(distances)

This is not a correctness problem, and the current 90 tests pass. For Phase 12.7, however, we should decide whether the nearest-neighbour implementation should reuse the existing spatial-distance selection helpers rather than maintaining parallel selection logic.

I would not change that yet. First we should establish 12.7.2 Spatial Selection Validation from the actual current implementation.

Next step

Please send the complete current nearest-neighbour implementation so we can formally review its validation contract:

Get-Content ".\server\services\interpolation\nearestNeighbourInterpolation.js" |
    Select-Object -First 1000

Then we'll work through 12.7.2 specifically:

Coordinate validation
Distance validation
Empty observation handling
Invalid observation handling
Tie handling
Deterministic nearest-sample selection
Whether invalid observations should reject the entire interpolation or be excluded

We should keep the scientific behavior frozen unless the validation review identifies a genuine gap.
--------------------------------------------------------
Phase 12.7 status so far
12.7.1 Mathematical foundation       ✅ Complete
12.7.2 Spatial selection validation  ✅ Complete
12.7.3 Prediction validation         ✅ Complete
12.7.4 Diagnostic foundation         ✅ Complete
12.7.5 Cross-validation diagnostics  ⏳ Next
12.7.6 Production integration        ⏳
12.7.7 Regression + checkpoint       ⏳

The next meaningful scientific addition is therefore 12.7.5 — Nearest-Neighbour Cross-Validation Diagnostics.

For NN, leave-one-out cross-validation has a particularly simple definition:

$$ \hat Z_{-i}(x_i) = Z(x_{j^*}),\qquad j^*=\arg\min_{j\ne i}d(x_i,x_j) $$

So each observation is temporarily removed, the nearest remaining observation is selected, and the prediction error is:

$$ e_i=\hat Z_{-i}(x_i)-Z(x_i) $$

We should follow the same diagnostic convention already established for TPS:

minimum sample count: 2
leave one sample out
nearest remaining sample supplies prediction
error = predicted - observed
mean error
mean absolute error
RMSE
maximum absolute error
successful/failed fold counts
per-fold diagnostics
no acceptance threshold
no weighting
no smoothing
CV remains diagnostic and must not reject an interpolation surface.

Before writing any new code, I recommend inspecting the existing TPS LOOCV implementation so the NN diagnostic contract stays consistent across interpolation methods.
------------------------------------------------------
Yes. This existing TPS LOOCV service gives us a very clean template for Phase 12.7.5 Nearest-Neighbour Cross-Validation Diagnostics.

The important point is that we should reuse the diagnostic contract, not the TPS implementation itself.

12.7.5 scientific design

For nearest-neighbour LOOCV:

$$ \hat Z_{-i}(x_i)=Z(x_{j^*}),\qquad j^*=\arg\min_{j\ne i}d(x_i,x_j) $$

and:

$$ e_i=\hat Z_{-i}(x_i)-Z(x_i) $$

So the NN LOOCV service should have:

Item	NN rule
Minimum samples	2
Training set	All samples except held-out sample
Prediction	Value of nearest remaining sample
Distance	Existing local Euclidean metric
Tie handling	Existing first-minimum rule
Error	predicted - observed
Metrics	Mean error, MAE, RMSE, maximum absolute error
Failed folds	Retained diagnostically
Acceptance threshold	None
Smoothing	None
Weighting	None

This also means we should not create a generic cross-validation framework yet. TPS and NN have different interpolation mathematics, while their diagnostic output can remain structurally consistent.

One important difference from TPS

TPS requires 3 training samples, so LOOCV requires 4 original samples.

NN requires only 1 training sample, so LOOCV requires only:

2 original samples

With two samples:

Fold 0:
  training = [sample 1]
  target   = sample 0
  prediction = sample 1.value

Fold 1:
  training = [sample 0]
  target   = sample 1
  prediction = sample 0.value

That is scientifically valid for nearest-neighbour interpolation.

Recommended service

Create:

server/services/interpolation/nearestNeighbourCrossValidationService.js

with the same public structure as TPS:

MIN_LOOCV_SAMPLE_COUNT
validateLOOCVSamples
buildTrainingSamples
getSampleIdentifier
evaluateLOOCVFold
calculateCrossValidationMetrics
performLeaveOneOutCrossValidation
nearestNeighbourCrossValidation

The fold result should remain compatible with the TPS diagnostic convention:

{
  success: true,
  index,
  sampleCode,
  observed,
  predicted,
  error,
  absoluteError,
  squaredError,
  errorType: null,
  errors: []
}

For NN, we should additionally preserve the interpolation-specific diagnostic information:

nearestSample: {
  index,
  latitude,
  longitude,
  value,
  distanceMetres
}

That is useful because NN cross-validation is fundamentally a nearest-sample selection diagnostic, whereas TPS has solver/geometry diagnostics.

One subtle point

I would not automatically reject duplicate coordinates in NN LOOCV.

If the held-out sample has another sample at exactly the same location, the existing nearest-neighbour rule correctly gives:

distance = 0
prediction = value of the first minimum-distance remaining sample

That follows the already-established deterministic tie rule. We should test it rather than invent a new scientific exception.

Therefore our next implementation sequence should be
12.7.5.1 NN LOOCV mathematical foundation
12.7.5.2 NN LOOCV service
12.7.5.3 NN LOOCV tests
12.7.5.4 Regression validation

Then:

12.7.6 Production integration

For production integration, we should follow the same policy already established for TPS:

LOOCV is diagnostic only.

A technical LOOCV failure should appear in the interpolation result diagnostics but should not cause the interpolation surface itself to fail.

I recommend we now implement nearestNeighbourCrossValidationService.js based on this contract, then create its dedicated test suite before touching interpolationService.js.
--------------------------------------------------------------------
After that, Phase 12.7 is frozen, and we can move to:

12.8 Comparative Interpolation Validation

covering IDW vs Kriging vs Thin-Plate Spline vs Nearest-Neighbour under a common scientific validation framework.
---------------------------------------------
The important principle for this phase is: compare the four interpolation methods scientifically without creating an artificial “winner.” Each method should retain its own mathematical formulation and diagnostics.

Phase 12.8 — Comparative Interpolation Validation
Objective

Establish a common validation framework for:

IDW
Kriging
Thin-Plate Spline
Nearest-Neighbour

The comparison should answer:

How accurately does each method reproduce held-out observations?
How stable are its predictions?
How much spatial variation does it produce?
What diagnostic information is available?
Under what data conditions is a method technically unavailable or unsuitable?
Are the methods being compared using equivalent observations and targets?

No method will receive a score, rank, or overall winner designation.

Proposed roadmap
12.8 Comparative Interpolation Validation
│
├── 12.8.1 Common validation contract
│   ├── Common observation structure
│   ├── Common target definition
│   ├── Common prediction result
│   ├── Common error convention
│   └── Common diagnostic structure
│
├── 12.8.2 Cross-validation harmonization
│   ├── IDW LOOCV
│   ├── Kriging LOOCV
│   ├── Thin-Plate Spline LOOCV
│   ├── Nearest-Neighbour LOOCV
│   └── Common metric calculation
│
├── 12.8.3 Error-metric validation
│   ├── Mean Error
│   ├── Mean Absolute Error
│   ├── RMSE
│   ├── Maximum Absolute Error
│   └── Successful/failed folds
│
├── 12.8.4 Prediction diagnostics
│   ├── Prediction finiteness
│   ├── Exact-sample behavior
│   ├── Spatial distance information
│   ├── Method-specific diagnostics
│   └── Technical failure diagnostics
│
├── 12.8.5 Dataset consistency
│   ├── Same observations
│   ├── Same parameter
│   ├── Same coordinate system
│   ├── Same validation folds
│   └── Same target observations
│
├── 12.8.6 Comparative validation service
│   ├── Execute methods independently
│   ├── Preserve method-specific results
│   ├── Aggregate common metrics
│   └── Preserve unavailable/failed states
│
├── 12.8.7 Comparative validation tests
│   ├── Contract tests
│   ├── Metric tests
│   ├── consistency tests
│   ├── failure-isolation tests
│   └── immutability tests
│
├── 12.8.8 Production integration
│   ├── interpolationService
│   ├── prepareInterpolation()
│   ├── generateInterpolationSurface()
│   └── reporting compatibility
│
└── 12.8.9 Full regression + checkpoint
One important architectural decision

I recommend not immediately creating a large generic crossValidationService.js.

We already have method-specific implementations:

splineCrossValidationService.js
nearestNeighbourCrossValidationService.js

Kriging has its own scientific validation requirements, while IDW has different parameter behavior.

Therefore, 12.8 should introduce a comparative orchestration layer, while leaving the underlying scientific implementations independent:

                    Comparative Validation
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
         IDW             Kriging             TPS
          │                 │                 │
       own CV           own CV             own CV
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                     Nearest-Neighbour
                            │
                          own CV

The comparative layer should normalize results, not mathematics.

12.8.1 — Common validation contract

This should be our first implementation target.

A common result could conceptually contain:

{
  success: true,
  method: "kriging",
  status: "complete",

  sampleCount: 10,

  successfulFolds: 10,
  failedFolds: 0,

  metrics: {
    meanError: ...,
    meanAbsoluteError: ...,
    rmse: ...,
    maxAbsoluteError: ...
  },

  folds: [
    {
      index: 0,
      sampleCode: "S-001",
      observed: ...,
      predicted: ...,
      error: ...,
      absoluteError: ...,
      squaredError: ...,
      success: true
    }
  ],

  diagnostics: {
    ...
  },

  errors: []
}

But method-specific information must not be discarded.

For example:

Kriging
variogram
covariance model
weights
system residual
validation
acceptance/readiness
TPS
solver residual
LOOCV diagnostics
selected geometry
Nearest-Neighbour
nearest sample
distance to nearest sample
tie handling
IDW
power
neighbour/sample weighting
distance behavior

The common contract should sit above these.

12.8.2 — Common error convention

We should freeze one convention:

$$ e_i=\hat Z_i-Z_i $$

where:

\(Z_i\) = observed value
\(\hat Z_i\) = predicted value

Then:

$$ |e_i|=|\hat Z_i-Z_i| $$

and:

$$ RMSE= \sqrt{ \frac{1}{n} \sum_{i=1}^{n}e_i^2 } $$

This is already consistent with the TPS and nearest-neighbour implementations.

12.8.3 — Important fairness rule

The comparative tests should use the same dataset, parameter, observations, coordinates and held-out folds for every method whenever that method's mathematical requirements permit it.

For example:

Dataset
   │
   ├── IDW
   ├── Kriging
   ├── TPS
   └── Nearest-Neighbour

Not:

IDW       → dataset A
Kriging   → dataset B
TPS       → dataset C
NN        → dataset D

Otherwise the resulting metrics would not be directly comparable.

At the same time, if a method legitimately requires a minimum number of observations, that should be reported as:

not_applicable

rather than artificially forcing a prediction.

12.8.4 — What we should explicitly avoid

We should not introduce:

a composite interpolation score
weighted scoring
method ranking
“best interpolation method”
arbitrary RMSE acceptance thresholds
arbitrary error cutoffs
new smoothing parameters
new scientific defaults
method-specific penalties
normalization designed to make methods appear comparable when their mathematics differ

The purpose is validation and evidence, not selection by an invented scoring system.

First implementation step

I suggest we begin with:

12.8.1 Common Validation Contract

Before touching production interpolationService.js, we should inspect the existing:

server/services/interpolation/

validation/CV result structures and the existing tests, then define the smallest common contract that can represent all four methods without changing any existing scientific behavior.

Once that contract is frozen, we can build 12.8.2 around it incrementally.

No production changes yet. The next step should be to examine the existing IDW, Kriging, TPS and NN validation/CV contracts and identify exactly what can be normalized safely.
----------------------------------
12.8.3.1 Common contract

The comparative layer will accept the already-produced method-specific validation results and normalize them into one structure:

comparativeValidation
├── success
├── status
├── validationType
├── sampleCount
├── methods
│   ├── idw
│   ├── kriging
│   ├── spline
│   └── nearest_neighbour
└── errors

Each method entry will preserve its original diagnostic information:

methodResult
├── method
├── status
├── applicable
├── success
├── sampleCount
├── successfulFolds
├── failedFolds
├── metrics
├── folds
└── errors

For methods whose diagnostic is not applicable because of sample-count requirements, we will report that fact rather than treating it as a failure.
-----------------------------
The next roadmap phase is therefore:

12.9  Comparative interpolation analysis

if we decide such a phase is scientifically justified, otherwise the next major development area can proceed to the Integrated Analytical GIS Reporting / Phase 10.6 work already defined in your roadmap.
-------------------------------------------
Yes. We can do 12.9 first, but I would keep it deliberately small and diagnostic-only so it does not turn into another large interpolation subsystem. Then we can move directly to Phase 10.6 Integrated Analytical GIS Reporting.

Phase 12.9 — Comparative Interpolation Analysis

The key distinction from 12.8 is:

12.8 = validate and normalize the four methods.
12.9 = analyze the normalized results.
It must not select, rank, score, or recommend a method.
Proposed 12.9 scope
12.9 Comparative Interpolation Analysis
│
├── 12.9.1 Analysis contract
│   ├── common input contract
│   ├── method coverage
│   ├── applicability
│   └── diagnostic status
│
├── 12.9.2 Error analysis
│   ├── mean error
│   ├── mean absolute error
│   ├── RMSE
│   └── maximum absolute error
│
├── 12.9.3 Prediction consistency analysis
│   ├── fold coverage
│   ├── common successful folds
│   ├── common failed folds
│   └── prediction spread
│
├── 12.9.4 Method-difference diagnostics
│   ├── pairwise prediction differences
│   ├── maximum absolute difference
│   └── mean absolute difference
│
├── 12.9.5 Comparative analysis tests
│
├── 12.9.6 Production integration
│   └── diagnostic-only result
│
└── 12.9.7 Regression + checkpoint

Importantly, the output would say things such as:

IDW RMSE = X, Kriging RMSE = Y, TPS RMSE = Z, Nearest-Neighbour RMSE = W.

It would not say "Kriging is best" or assign a score/rank.

For prediction differences, we can compare methods at the same held-out locations where predictions are available. That gives us useful scientific information about agreement/disagreement between interpolation methods without turning it into a selection mechanism.
------------------------------------------

------------------------------------------------------------
Phase 12.9  Comparative Interpolation Analysis  COMPLETED
------------------------------------------------------------

Phase 12.9 has been implemented and validated as a
diagnostic-only comparative analysis layer built on the
Phase 12.8 common comparative validation contract.

Completed scope:

12.9.1 Analysis contract
- Common normalized comparative-validation input
- Method coverage and applicability
- Diagnostic status preservation

12.9.2 Error analysis
- Mean Error
- Mean Absolute Error
- RMSE
- Maximum Absolute Error

12.9.3 Prediction consistency analysis
- Fold coverage
- Common successful folds
- Common failed folds
- Prediction spread

12.9.4 Method-difference diagnostics
- Pairwise prediction differences
- Maximum absolute difference
- Mean absolute difference

12.9.5 Comparative analysis tests
- Contract validation
- Four-method coverage
- Error metrics
- Fold coverage
- Common-fold analysis
- Pairwise method differences
- Invalid-input handling
- Immutability
- Diagnostic-only constraints

12.9.6 Production integration
- Comparative analysis consumes the normalized
  Phase 12.8 validation results.
- Production integration remains diagnostic-only.
- Existing interpolation mathematics and method-specific
  validation implementations remain unchanged.

12.9.7 Regression + checkpoint
Final focused Phase 12.9 regression:

- comparativeAnalysisService.test.js
- comparativeValidationService.test.js
- comparativeValidationProductionIntegration.test.js

Result:
80 tests
80 passed
0 failed
0 cancelled
0 skipped

Scientific constraints preserved:
- No method ranking
- No preferred/best-method selection
- No composite score
- No weighting
- No arbitrary error thresholds
- No method-specific penalties
- No new smoothing parameters
- No changes to interpolation mathematics
- No changes to scientific defaults
- No artificial normalization intended to make methods
  mathematically comparable

Phase 12.9 is therefore frozen at the validated
diagnostic-only implementation.

