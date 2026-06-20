# TextileERP - Production Department API Reference

## Base URL
http://localhost:3000

## Production Module Base Path
/api/production

## Authentication and Authorization
All Production endpoints require:
- Authorization header with access token
- Approved user account status

Headers:
Authorization: Bearer {accessToken}
Content-Type: application/json

---

## Table of Contents
1. Material Allocation
2. Yarn and Fabric Phase
3. Wet Processing
4. Surface Decoration
5. Assembly Line
6. QC and Pre-Shipping

---

# 1. Material Allocation

## 1.1 Create Requisition
Endpoint: POST /api/production/material-allocation/requisition

Request Headers:
- Authorization: Bearer {accessToken}
- Content-Type: application/json

Request Body:
```json
{
  "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
  "requestedMaterialId": "f1b93d88-84ea-4a8e-b65b-f6f5ca35bf36",
  "requestedVolume": 350,
  "volumeUnit": "Kg"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "requisitionId": "d78e3b77-f4be-4adf-95de-7e4b6e5cf8a2",
    "status": "PENDING",
    "requestedVolume": 350,
    "volumeUnit": "Kg",
    "message": "Requisition created and awaiting digital signature release authorization"
  }
}
```

## 1.2 Release Requisition
Endpoint: POST /api/production/requisition/release

Request Body:
```json
{
  "requisitionId": "d78e3b77-f4be-4adf-95de-7e4b6e5cf8a2",
  "approvalSignature": "signed-by-management",
  "approvedBy": "Manager User"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "requisitionId": "d78e3b77-f4be-4adf-95de-7e4b6e5cf8a2",
    "status": "RELEASED",
    "approvedAt": "2026-06-19T10:15:23.000Z",
    "message": "Requisition released. Ready for material dispatch."
  }
}
```

## 1.3 Dispatch Material
Endpoint: POST /api/production/material/dispatch

Request Body:
```json
{
  "requisitionId": "d78e3b77-f4be-4adf-95de-7e4b6e5cf8a2",
  "dispatchedVolume": 340,
  "dispatchedBy": "Warehouse Lead"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "requisitionId": "d78e3b77-f4be-4adf-95de-7e4b6e5cf8a2",
    "status": "DISPATCHED",
    "dispatchedVolume": 340,
    "dispatchedAt": "2026-06-19T10:23:00.000Z",
    "dispatchLogId": "406b2da9-b26f-40fa-89fc-df39f5fbaad8",
    "orderStatus": "MATERIAL_ALLOCATED",
    "message": "Material dispatched to production floor and inventory decremented"
  }
}
```

## 1.4 Get Requisition Status
Endpoint: GET /api/production/requisition/status/:requisitionId

Request Body: None

Response (200):
```json
{
  "success": true,
  "data": {
    "requisitionId": "d78e3b77-f4be-4adf-95de-7e4b6e5cf8a2",
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "status": "DISPATCHED",
    "requestedVolume": 350,
    "volumeUnit": "Kg",
    "approvedAt": "2026-06-19T10:15:23.000Z",
    "dispatchedAt": "2026-06-19T10:23:00.000Z",
    "dispatchLogs": []
  }
}
```

## 1.5 Cancel Requisition
Endpoint: POST /api/production/requisition/cancel

Request Body:
```json
{
  "requisitionId": "d78e3b77-f4be-4adf-95de-7e4b6e5cf8a2",
  "reason": "Vendor delay"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "requisitionId": "d78e3b77-f4be-4adf-95de-7e4b6e5cf8a2",
    "status": "CANCELLED",
    "reason": "Vendor delay",
    "message": "Requisition cancelled successfully"
  }
}
```

---

# 2. Yarn and Fabric Phase

## 2.1 Initiate Yarn Twisting
Endpoint: POST /api/production/yarn-fabric/twisting/initiate

Request Body:
```json
{
  "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
  "twistingVendorId": "VENDOR-TWIST-01",
  "dispatchDetails": "Batch 1 dispatch"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "loomLogId": "b42dc5fb-5f36-43f5-8f99-b9b4b1f1a811",
    "yarnTwistingStatus": "PENDING",
    "dispatchedToVendor": "2026-06-19T11:00:00.000Z",
    "message": "Yarn twisting initiated - awaiting vendor processing"
  }
}
```

## 2.2 Complete Yarn Twisting
Endpoint: POST /api/production/yarn-fabric/twisting/complete

Request Body:
```json
{
  "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
  "twistingCompletedAt": "2026-06-19T12:10:00.000Z",
  "notes": "Twisting done"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "yarnTwistingStatus": "COMPLETED",
    "twistingCompletedAt": "2026-06-19T12:10:00.000Z",
    "message": "Yarn twisting completed"
  }
}
```

## 2.3 Dispatch to Weaving
Endpoint: POST /api/production/yarn-fabric/weaving/dispatch

Request Body:
```json
{
  "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
  "vendorId": "VENDOR-WEAVE-09"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "loomLogId": "b42dc5fb-5f36-43f5-8f99-b9b4b1f1a811",
    "weavingStatus": "INPROGRESS",
    "dispatchedToVendor": "2026-06-19T12:30:00.000Z",
    "vendorId": "VENDOR-WEAVE-09",
    "message": "Yarn dispatched to weaving vendor"
  }
}
```

## 2.4 Log Raw Fabric Output
Endpoint: POST /api/production/yarn-fabric/fabric-output/log

Request Body:
```json
{
  "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
  "rollPieceCount": 120,
  "totalMassWeight": 1000,
  "fabricDensityGsm": 180,
  "totalLength": 2500,
  "poYieldTargetWeight": 980,
  "returnedAt": "2026-06-19T16:30:00.000Z"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "loomLogId": "b42dc5fb-5f36-43f5-8f99-b9b4b1f1a811",
    "weavingStatus": "COMPLETED",
    "fabricMetrics": {
      "rollPieceCount": 120,
      "totalMassWeight": 1000,
      "fabricDensityGsm": 180,
      "totalLength": 2500
    },
    "yieldCompliance": {
      "isCompliant": true,
      "wasteVariance": 20,
      "message": "Weight EXCEEDS target. Target: 980Kg, Actual: 1000Kg, Excess: 20Kg",
      "factoryLossLogged": false
    },
    "message": "Raw fabric output logged successfully"
  }
}
```

## 2.5 Get Yarn and Fabric Status
Endpoint: GET /api/production/yarn-fabric/status/:orderTokenId

Request Body: None

Response (200):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "loomLogId": "b42dc5fb-5f36-43f5-8f99-b9b4b1f1a811",
    "yarnTwistingStatus": "COMPLETED",
    "weavingStatus": "COMPLETED",
    "fabricMetrics": {
      "rollPieceCount": 120,
      "totalMassWeight": 1000,
      "fabricDensityGsm": 180,
      "totalLength": 2500
    },
    "poYieldTarget": 980,
    "actualWasteWeight": null,
    "wasteVarianceLogged": false
  }
}
```

---

# 3. Wet Processing

## 3.1 Dispatch to Wet Processing
Endpoint: POST /api/production/wet-processing/dispatch

Request Body:
```json
{
  "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
  "inputTotalWeight": 1000
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "wetProcessingLogId": "89df8682-7b32-45e2-b3fb-a41b77f13f91",
    "dispatchTrackId": "DYE-1750332132000-caf3bd90",
    "status": "PENDING",
    "inputTotalWeight": 1000,
    "dispatchedAt": "2026-06-19T17:00:00.000Z",
    "message": "Fabric dispatched to dyehouse for wet processing"
  }
}
```

## 3.2 Log Quality Test
Endpoint: POST /api/production/wet-processing/quality-test/log

Request Body:
```json
{
  "wetProcessingLogId": "89df8682-7b32-45e2-b3fb-a41b77f13f91",
  "testType": "COLOR_FASTNESS",
  "result": true,
  "testedBy": "QC Analyst 1",
  "notes": "Passed all checks"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "qualityTestId": "2f31a9a3-e607-44ba-a976-e0b5ba9a6d2f",
    "testType": "COLOR_FASTNESS",
    "result": "PASSED",
    "testedAt": "2026-06-19T17:20:00.000Z",
    "testedBy": "QC Analyst 1",
    "message": "Quality test COLOR_FASTNESS recorded"
  }
}
```

## 3.3 Complete Wet Processing
Endpoint: POST /api/production/wet-processing/complete

Request Body:
```json
{
  "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
  "outputTotalWeight": 900,
  "returnedAt": "2026-06-19T21:00:00.000Z",
  "returnedFrom": "Dye Mill Alpha"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "wetProcessingLogId": "89df8682-7b32-45e2-b3fb-a41b77f13f91",
    "inputTotalWeight": 1000,
    "outputTotalWeight": 900,
    "weightLossPercentage": 10,
    "isWithinTolerance": true,
    "status": "PASSED",
    "qualityTests": [],
    "returnedAt": "2026-06-19T21:00:00.000Z",
    "message": "Weight loss 10% is within tolerance (9% - 11%)"
  }
}
```

## 3.4 Get Wet Processing Status
Endpoint: GET /api/production/wet-processing/status/:orderTokenId

Request Body: None

Response (200):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "wetProcessingLogId": "89df8682-7b32-45e2-b3fb-a41b77f13f91",
    "dispatchTrackId": "DYE-1750332132000-caf3bd90",
    "status": "PASSED",
    "inputTotalWeight": 1000,
    "outputTotalWeight": 900,
    "weightLossPercentage": 10,
    "isWithinTolerance": true,
    "qualityTests": [],
    "claimDispute": null
  }
}
```

## 3.5 Get Mandatory Quality Tests
Endpoint: GET /api/production/wet-processing/mandatory-tests/:wetProcessingLogId

Request Body: None

Response (200):
```json
{
  "success": true,
  "data": {
    "wetProcessingLogId": "89df8682-7b32-45e2-b3fb-a41b77f13f91",
    "allTestsCompleted": false,
    "testStatus": [
      {
        "testType": "COLOR_FASTNESS",
        "recorded": true,
        "result": "PASSED",
        "testedAt": "2026-06-19T17:20:00.000Z"
      }
    ],
    "message": "Some quality tests are pending"
  }
}
```

---

# 4. Surface Decoration

## 4.1 Dispatch to Printing
Endpoint: POST /api/production/decoration/printing/dispatch

Request Body:
```json
{
  "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
  "vendorId": "PRINT-12",
  "rollsSent": 120
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "decorLogId": "b6417b6f-c2e9-4f0f-a3ed-d9f99f2aa00d",
    "status": "INPROGRESS",
    "rollsSent": 120,
    "dispatchedToVendor": "2026-06-19T21:30:00.000Z",
    "vendorId": "PRINT-12",
    "message": "Fabric rolls dispatched to printing vendor"
  }
}
```

## 4.2 Complete Printing
Endpoint: POST /api/production/decoration/printing/complete

Request Body:
```json
{
  "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
  "rollsReturned": 118,
  "returnedAt": "2026-06-19T22:40:00.000Z",
  "specAuditBy": "QA Supervisor",
  "specAuditNotes": "Color match acceptable"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "decorLogId": "b6417b6f-c2e9-4f0f-a3ed-d9f99f2aa00d",
    "status": "DISCREPANCY_FLAGGED",
    "rollsSent": 120,
    "rollsReturned": 118,
    "specAuditCompleted": true,
    "hasDiscrepancy": true,
    "discrepancyCount": 2,
    "discrepancyMessage": "DISCREPANCY ALERT: Sent 120 pieces, received 118. Shortage: 2 pieces",
    "message": "DISCREPANCY ALERT: Printing rolls mismatch detected"
  }
}
```

## 4.3 Initiate Embroidery
Endpoint: POST /api/production/decoration/embroidery/initiate

Request Body:
```json
{
  "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
  "totalPiecesCut": 1000,
  "preStitchBy": "Cutting Team A"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "embroideryLogId": "d3b77b8d-a7aa-4ccc-bbe8-94f9526ebdee",
    "totalPiecesCut": 1000,
    "piecesPreStitched": 1000,
    "preStitchValidation": "All 1000 pieces pre-stitched on at least 2 sides",
    "message": "Embroidery pieces cut and pre-stitched on ≥2 sides"
  }
}
```

## 4.4 Dispatch to Embroidery
Endpoint: POST /api/production/decoration/embroidery/dispatch

Request Body:
```json
{
  "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
  "vendorId": "EMB-22",
  "piecesSent": 980
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "embroideryLogId": "d3b77b8d-a7aa-4ccc-bbe8-94f9526ebdee",
    "status": "INPROGRESS",
    "piecesSent": 980,
    "dispatchedToVendor": "2026-06-19T23:00:00.000Z",
    "vendorId": "EMB-22",
    "message": "Pre-stitched pieces dispatched to embroidery vendor"
  }
}
```

## 4.5 Complete Embroidery
Endpoint: POST /api/production/decoration/embroidery/complete

Request Body:
```json
{
  "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
  "piecesReturned": 975,
  "returnedAt": "2026-06-20T01:10:00.000Z"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "embroideryLogId": "d3b77b8d-a7aa-4ccc-bbe8-94f9526ebdee",
    "status": "DISCREPANCY_FLAGGED",
    "piecesSent": 980,
    "piecesReturned": 975,
    "hasDiscrepancy": true,
    "discrepancyCount": 5,
    "discrepancyMessage": "DISCREPANCY ALERT: Sent 980 pieces, received 975. Shortage: 5 pieces",
    "message": "DISCREPANCY ALERT: Embroidery piece count mismatch detected"
  }
}
```

## 4.6 Get Decoration Status
Endpoint: GET /api/production/decoration/status/:orderTokenId

Request Body: None

Response (200):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "printing": {
      "logId": "b6417b6f-c2e9-4f0f-a3ed-d9f99f2aa00d",
      "status": "DISCREPANCY_FLAGGED",
      "rollsSent": 120,
      "rollsReturned": 118,
      "hasDiscrepancy": true,
      "discrepancyCount": 2,
      "specAuditCompleted": true
    },
    "embroidery": {
      "logId": "d3b77b8d-a7aa-4ccc-bbe8-94f9526ebdee",
      "status": "DISCREPANCY_FLAGGED",
      "totalPiecesCut": 1000,
      "piecesPreStitched": 1000,
      "piecesSent": 980,
      "piecesReturned": 975,
      "hasDiscrepancy": true,
      "discrepancyCount": 5
    }
  }
}
```

---

# 5. Assembly Line

## 5.1 Create Job Card
Endpoint: POST /api/production/assembly/job-card/create

Request Body:
```json
{
  "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
  "workerId": "WRK-1002",
  "workerName": "Arafat Karim",
  "basePieceRate": 2.25
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "jobCardId": "0aa533f7-cd9b-4a97-912f-2f43f3e4f17e",
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "workerId": "WRK-1002",
    "workerName": "Arafat Karim",
    "basePieceRate": 2.25,
    "message": "Job card created successfully"
  }
}
```

## 5.2 Log Assembly Phase
Endpoint: POST /api/production/assembly/phase/log

Request Body:
```json
{
  "jobCardId": "0aa533f7-cd9b-4a97-912f-2f43f3e4f17e",
  "phase": "PHASE1_CUTTING",
  "piecesProcessed": 300,
  "startedAt": "2026-06-20T03:00:00.000Z"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "phaseLogId": "63f53fb5-ef41-43c6-8bc2-a39d9f2e0328",
    "jobCardId": "0aa533f7-cd9b-4a97-912f-2f43f3e4f17e",
    "phase": "PHASE1_CUTTING",
    "status": "INPROGRESS",
    "piecesProcessed": 300,
    "startedAt": "2026-06-20T03:00:00.000Z",
    "message": "Phase PHASE1_CUTTING logging initiated"
  }
}
```

## 5.3 Complete Assembly Phase
Endpoint: POST /api/production/assembly/phase/complete

Request Body:
```json
{
  "jobCardId": "0aa533f7-cd9b-4a97-912f-2f43f3e4f17e",
  "phase": "PHASE1_CUTTING",
  "completedAt": "2026-06-20T04:00:00.000Z"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "phaseLogId": "63f53fb5-ef41-43c6-8bc2-a39d9f2e0328",
    "jobCardId": "0aa533f7-cd9b-4a97-912f-2f43f3e4f17e",
    "phase": "PHASE1_CUTTING",
    "status": "COMPLETED",
    "completedAt": "2026-06-20T04:00:00.000Z",
    "jobCardUpdate": {
      "totalPiecesCompleted": 300,
      "basePieceRate": 2.25,
      "calculatedWage": 675
    },
    "message": "Phase PHASE1_CUTTING completed. Wage updated."
  }
}
```

## 5.4 Get Job Card
Endpoint: GET /api/production/assembly/job-card/:jobCardId

Request Body: None

Response (200):
```json
{
  "success": true,
  "data": {
    "jobCardId": "0aa533f7-cd9b-4a97-912f-2f43f3e4f17e",
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "workerId": "WRK-1002",
    "workerName": "Arafat Karim",
    "basePieceRate": 2.25,
    "totalPiecesCompleted": 300,
    "calculatedWage": 675,
    "phaseLogs": []
  }
}
```

## 5.5 Get Order Job Cards
Endpoint: GET /api/production/assembly/order-job-cards/:orderTokenId

Request Body: None

Response (200):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "jobCardCount": 1,
    "jobCards": [
      {
        "jobCardId": "0aa533f7-cd9b-4a97-912f-2f43f3e4f17e",
        "workerId": "WRK-1002",
        "workerName": "Arafat Karim",
        "basePieceRate": 2.25,
        "totalPiecesCompleted": 300,
        "calculatedWage": 675,
        "phaseCount": 1,
        "completedPhases": 1
      }
    ],
    "totalWagePayable": 675
  }
}
```

## 5.6 Get Order Phase Status
Endpoint: GET /api/production/assembly/phase-status/:orderTokenId

Request Body: None

Response (200):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "jobCardCount": 1,
    "phaseStatus": [
      {
        "phase": "PHASE1_CUTTING",
        "totalLogs": 1,
        "completed": 1,
        "inProgress": 0,
        "pending": 0,
        "totalPiecesProcessed": 300
      }
    ]
  }
}
```

---

# 6. QC and Pre-Shipping

## 6.1 Start QC Inspection
Endpoint: POST /api/production/qc/inspection/start

Request Body:
```json
{
  "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "qcInspectionId": "4a2dfabd-5db2-4f2c-8e18-66f40ea881cb",
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "status": "PENDING",
    "mandatoryAudits": ["STRUCTURAL", "AESTHETIC", "ASEPTIC"],
    "message": "100% QC inspection initiated - awaiting audit completion"
  }
}
```

## 6.2 Log QC Audit
Endpoint: POST /api/production/qc/audit/log

Request Body:
```json
{
  "qcInspectionId": "4a2dfabd-5db2-4f2c-8e18-66f40ea881cb",
  "auditType": "STRUCTURAL",
  "passed": true,
  "findings": "No defects"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "qcInspectionId": "4a2dfabd-5db2-4f2c-8e18-66f40ea881cb",
    "auditType": "STRUCTURAL",
    "passed": true,
    "findings": "No defects",
    "message": "STRUCTURAL audit logged"
  }
}
```

## 6.3 Complete QC Inspection
Endpoint: POST /api/production/qc/inspection/complete

Request Body:
```json
{
  "qcInspectionId": "4a2dfabd-5db2-4f2c-8e18-66f40ea881cb",
  "inspectedBy": "QC Head",
  "notes": "All checks complete"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "qcInspectionId": "4a2dfabd-5db2-4f2c-8e18-66f40ea881cb",
    "overallStatus": "PASSED",
    "auditResults": {
      "structural": {"passed": true},
      "aesthetic": {"passed": true},
      "aseptic": {"passed": true}
    },
    "message": "QC verification PASSED - ready for PS gate"
  }
}
```

## 6.4 Initiate Pre-Shipping Sample
Endpoint: POST /api/production/qc/ps-sample/initiate

Request Body:
```json
{
  "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
  "totalCargoUnits": 2000
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "psLogId": "aa0ab634-824f-4f12-92fe-9f89e5280f8a",
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "totalCargoUnits": 2000,
    "sampleSize": 200,
    "sampleUnits": 200,
    "status": "PENDING",
    "message": "Pre-Shipping sample created: 10% (200 units) of 2000 total units"
  }
}
```

## 6.5 Send Pre-Shipping Sample to Customer
Endpoint: POST /api/production/qc/ps-sample/send

Request Body:
```json
{
  "psLogId": "aa0ab634-824f-4f12-92fe-9f89e5280f8a",
  "sentAt": "2026-06-20T07:30:00.000Z",
  "sentTo": "customer@buyer.com"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "psLogId": "aa0ab634-824f-4f12-92fe-9f89e5280f8a",
    "status": "SENT_TO_CUSTOMER",
    "sentAt": "2026-06-20T07:30:00.000Z",
    "sentTo": "customer@buyer.com",
    "message": "Pre-Shipping sample sent to customer customer@buyer.com. Awaiting approval."
  }
}
```

## 6.6 Approve Pre-Shipping Sample
Endpoint: POST /api/production/qc/ps-sample/approve

Request Body:
```json
{
  "psLogId": "aa0ab634-824f-4f12-92fe-9f89e5280f8a",
  "approvedAt": "2026-06-20T10:00:00.000Z",
  "customerApprovedBy": "Buyer QA"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "psLogId": "aa0ab634-824f-4f12-92fe-9f89e5280f8a",
    "status": "APPROVED",
    "customerApprovedAt": "2026-06-20T10:00:00.000Z",
    "customerApprovedBy": "Buyer QA",
    "orderStatus": "PS_APPROVED",
    "message": "Customer approved pre-shipping sample. Order ready for export."
  }
}
```

## 6.7 Reject Pre-Shipping Sample
Endpoint: POST /api/production/qc/ps-sample/reject

Request Body:
```json
{
  "psLogId": "aa0ab634-824f-4f12-92fe-9f89e5280f8a",
  "reworkOrders": "Restitch and re-pack batch A"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "psLogId": "aa0ab634-824f-4f12-92fe-9f89e5280f8a",
    "status": "REJECTED",
    "reworkInitiatedAt": "2026-06-20T10:20:00.000Z",
    "reworkOrders": "Restitch and re-pack batch A",
    "orderStatus": "ASSEMBLY_INPROGRESS",
    "message": "Pre-shipping sample rejected. Rework orders created and order routed back to assembly."
  }
}
```

## 6.8 Validate Export Readiness
Endpoint: POST /api/production/export/validate-readiness

Request Body:
```json
{
  "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "status": "EXPORT_READY",
    "isPsApproved": true,
    "message": "Order is ready for export. Hand over to Export Department."
  }
}
```

Response (403):
```json
{
  "success": false,
  "error": "EXPORT_NOT_READY",
  "message": "Export requires PS approval. Current status: QC_VERIFICATION_INPROGRESS"
}
```

## 6.9 Get QC and PS Status
Endpoint: GET /api/production/qc/ps-status/:orderTokenId

Request Body: None

Response (200):
```json
{
  "success": true,
  "data": {
    "orderTokenId": "c0fbbd9f-0ab4-4ec8-8a9a-2395b4a4dbe1",
    "qcInspection": {
      "qcInspectionId": "4a2dfabd-5db2-4f2c-8e18-66f40ea881cb",
      "status": "VERIFIED",
      "overallStatus": "PASSED"
    },
    "preShippingSample": {
      "psLogId": "aa0ab634-824f-4f12-92fe-9f89e5280f8a",
      "status": "APPROVED",
      "totalCargoUnits": 2000,
      "sampleSize": 200,
      "sampleUnits": 200,
      "customerApproval": true
    }
  }
}
```

---

## Common Error Response Format
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "details": []
}
```

Possible error codes:
- VALIDATION_ERROR
- INVALID_REQUEST
- VALIDATION_FAILED
- NOT_FOUND
- EXPORT_NOT_READY
- INTERNAL_SERVER_ERROR
