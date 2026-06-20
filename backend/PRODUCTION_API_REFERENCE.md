# Production Module - API Quick Reference Guide

## 🚀 Quick Start

All endpoints are protected by JWT authentication. Include token in request header:
```
Authorization: Bearer <your_jwt_token>
```

All endpoints return unified JSON response format:
```json
{
  "success": true|false,
  "data": {...} | null,
  "error": "ERROR_CODE" | null,
  "message": "Human readable message"
}
```

---

## 📊 Example Workflow: Complete Order Processing

### **Step 1: Create Material Requisition**
```bash
POST /api/production/material-allocation/requisition
Content-Type: application/json
Authorization: Bearer <token>

{
  "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
  "requestedMaterialId": "660e8400-e29b-41d4-a716-446655440111",
  "requestedVolume": 50.00,
  "volumeUnit": "Kg"
}

Response:
{
  "success": true,
  "data": {
    "requisitionId": "770e8400-e29b-41d4-a716-446655440222",
    "status": "PENDING",
    "requestedVolume": 50,
    "volumeUnit": "Kg",
    "message": "Requisition created and awaiting digital signature release authorization"
  }
}
```

### **Step 2: Release Material with Signature**
```bash
POST /api/production/material-allocation/requisition/release
Content-Type: application/json
Authorization: Bearer <token>

{
  "requisitionId": "770e8400-e29b-41d4-a716-446655440222",
  "approvalSignature": "DIGITAL_SIGNATURE_BASE64_ENCODED",
  "approvedBy": "supervisor@fabricsync.com"
}

Response:
{
  "success": true,
  "data": {
    "requisitionId": "770e8400-e29b-41d4-a716-446655440222",
    "status": "RELEASED",
    "approvedAt": "2026-06-19T10:30:00Z",
    "message": "Requisition released. Ready for material dispatch."
  }
}
```

### **Step 3: Dispatch Material to Floor**
```bash
POST /api/production/material-allocation/dispatch
Content-Type: application/json
Authorization: Bearer <token>

{
  "requisitionId": "770e8400-e29b-41d4-a716-446655440222",
  "dispatchedVolume": 50.00,
  "dispatchedBy": "warehouse_operator@fabricsync.com"
}

Response:
{
  "success": true,
  "data": {
    "requisitionId": "770e8400-e29b-41d4-a716-446655440222",
    "status": "DISPATCHED",
    "dispatchedAt": "2026-06-19T10:45:00Z",
    "orderStatus": "MATERIAL_ALLOCATED",
    "message": "Material dispatched to production floor and inventory decremented"
  }
}
```

---

### **Step 4: Dispatch to Weaving Vendor**
```bash
POST /api/production/yarn-fabric/weaving/dispatch
Content-Type: application/json
Authorization: Bearer <token>

{
  "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
  "vendorId": "vendor-weaving-001",
  "yarnType": "Cotton Blend",
  "totalYardage": 5000.00,
  "requiredYarnWeight": 50.00
}

Response:
{
  "success": true,
  "data": {
    "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
    "loomLogId": "880e8400-e29b-41d4-a716-446655440333",
    "weavingStatus": "INPROGRESS",
    "message": "Yarn dispatched to weaving vendor"
  }
}
```

### **Step 5: Log Raw Fabric Output**
```bash
POST /api/production/yarn-fabric/fabric-output/log
Content-Type: application/json
Authorization: Bearer <token>

{
  "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
  "vendorId": "vendor-weaving-001",
  "rollPieceCount": 12,
  "totalMassWeight": 48.50,
  "fabricDensityGsm": 200.00,
  "totalLength": 4950.00,
  "poYieldTargetWeight": 48.00,
  "returnedAt": "2026-06-20T15:00:00Z"
}

Response:
{
  "success": true,
  "data": {
    "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
    "fabricMetrics": {
      "rollPieceCount": 12,
      "totalMassWeight": 48.50,
      "fabricDensityGsm": 200.00,
      "totalLength": 4950.00
    },
    "yieldCompliance": {
      "isCompliant": true,
      "wasteVariance": 0.50,
      "message": "Weight EXCEEDS target. Target: 48.00Kg, Actual: 48.50Kg, Excess: 0.50Kg",
      "factoryLossLogged": false
    },
    "message": "Raw fabric output logged successfully"
  }
}
```

---

### **Step 6: Dispatch to Wet Processing (Dyehouse)**
```bash
POST /api/production/wet-processing/dispatch
Content-Type: application/json
Authorization: Bearer <token>

{
  "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
  "millId": "dyehouse-bengal-001",
  "inputTotalWeight": 48.50
}

Response:
{
  "success": true,
  "data": {
    "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
    "wetProcessingLogId": "990e8400-e29b-41d4-a716-446655440444",
    "dispatchTrackId": "DYE-1718886000000-abc12345",
    "status": "PENDING",
    "inputTotalWeight": 48.50,
    "message": "Fabric dispatched to dyehouse for wet processing"
  }
}
```

### **Step 7: Log Quality Tests**
```bash
POST /api/production/wet-processing/quality-test/log
Content-Type: application/json
Authorization: Bearer <token>

{
  "wetProcessingLogId": "990e8400-e29b-41d4-a716-446655440444",
  "testType": "COLOR_FASTNESS",
  "result": "PASSED",
  "testedBy": "lab_tech_001@fabricsync.com"
}

Response:
{
  "success": true,
  "data": {
    "qualityTestId": "aaa0e8400-e29b-41d4-a716-446655440555",
    "testType": "COLOR_FASTNESS",
    "result": "PASSED",
    "testedAt": "2026-06-22T10:15:00Z",
    "message": "Quality test COLOR_FASTNESS recorded"
  }
}

// Repeat for SHRINKING and GASOLINE_SMELL tests
```

### **Step 8: Complete Wet Processing (Weight Loss Validation)**
```bash
POST /api/production/wet-processing/complete
Content-Type: application/json
Authorization: Bearer <token>

{
  "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
  "outputTotalWeight": 43.65,
  "returnedAt": "2026-06-23T14:30:00Z",
  "returnedFrom": "dyehouse-bengal-001"
}

Response (PASSED - within 9-11% tolerance):
{
  "success": true,
  "data": {
    "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
    "inputTotalWeight": 48.50,
    "outputTotalWeight": 43.65,
    "weightLossPercentage": 10.00,
    "isWithinTolerance": true,
    "status": "PASSED",
    "message": "Weight loss 10.00% is within tolerance (9% - 11%)",
    "orderStatus": "SURFACE_DECORATION_INPROGRESS"
  }
}

Response (FAILED - outside tolerance):
{
  "success": true,
  "data": {
    "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
    "weightLossPercentage": 15.00,
    "isWithinTolerance": false,
    "status": "FAILED",
    "claimDispute": {
      "claimDisputeId": "bbb0e8400-e29b-41d4-a716-446655440666",
      "claimStatus": "OPEN",
      "message": "ALERT: Automated financial claim dispute created. Weight loss outside tolerance window."
    },
    "orderStatus": "FAILED"
  }
}
```

---

### **Step 9: Surface Decoration - Printing Branch**
```bash
POST /api/production/decoration/printing/dispatch
Content-Type: application/json
Authorization: Bearer <token>

{
  "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
  "vendorId": "printer-delhi-001",
  "rollsSent": 12
}

Response:
{
  "success": true,
  "data": {
    "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
    "decorLogId": "ccc0e8400-e29b-41d4-a716-446655440777",
    "status": "INPROGRESS",
    "rollsSent": 12,
    "message": "Fabric rolls dispatched to printing vendor"
  }
}

# Complete Printing
POST /api/production/decoration/printing/complete
{
  "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
  "rollsReturned": 12,
  "specAuditNotes": "All prints match specifications. Color matching verified.",
  "specAuditBy": "qa_inspector_001@fabricsync.com"
}

Response:
{
  "success": true,
  "data": {
    "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "RETURNED",
    "rollsSent": 12,
    "rollsReturned": 12,
    "hasDiscrepancy": false,
    "message": "Printing completed and verified"
  }
}
```

---

### **Step 10: Assembly Line - Create Job Card**
```bash
POST /api/production/assembly/job-card/create
Content-Type: application/json
Authorization: Bearer <token>

{
  "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
  "workerId": "WORKER-001",
  "workerName": "Ravi Kumar",
  "basePieceRate": 5.50
}

Response:
{
  "success": true,
  "data": {
    "jobCardId": "ddd0e8400-e29b-41d4-a716-446655440888",
    "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
    "workerId": "WORKER-001",
    "workerName": "Ravi Kumar",
    "basePieceRate": 5.50,
    "message": "Job card created successfully"
  }
}
```

### **Step 11: Log Assembly Phases**
```bash
POST /api/production/assembly/phase/log
Content-Type: application/json
Authorization: Bearer <token>

{
  "jobCardId": "ddd0e8400-e29b-41d4-a716-446655440888",
  "phase": "PHASE1_CUTTING",
  "piecesProcessed": 120,
  "startedAt": "2026-06-24T08:00:00Z"
}

Response:
{
  "success": true,
  "data": {
    "phaseLogId": "eee0e8400-e29b-41d4-a716-446655440999",
    "phase": "PHASE1_CUTTING",
    "status": "INPROGRESS",
    "piecesProcessed": 120,
    "message": "Phase PHASE1_CUTTING logging initiated"
  }
}

# Complete Phase and Update Wage
POST /api/production/assembly/phase/complete
{
  "jobCardId": "ddd0e8400-e29b-41d4-a716-446655440888",
  "phase": "PHASE1_CUTTING",
  "completedAt": "2026-06-24T12:00:00Z"
}

Response:
{
  "success": true,
  "data": {
    "phaseLogId": "eee0e8400-e29b-41d4-a716-446655440999",
    "phase": "PHASE1_CUTTING",
    "status": "COMPLETED",
    "jobCardUpdate": {
      "totalPiecesCompleted": 120,
      "basePieceRate": 5.50,
      "calculatedWage": 660.00  // 120 × 5.50
    },
    "message": "Phase PHASE1_CUTTING completed. Wage updated."
  }
}
```

---

### **Step 12: QC Inspection**
```bash
POST /api/production/qc/inspection/start
Content-Type: application/json
Authorization: Bearer <token>

{
  "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
  "totalCargoUnits": 1000
}

Response:
{
  "success": true,
  "data": {
    "qcInspectionId": "fff0e8400-e29b-41d4-a716-446655440aaa",
    "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "PENDING",
    "mandatoryAudits": ["STRUCTURAL", "AESTHETIC", "ASEPTIC"],
    "message": "100% QC inspection initiated - awaiting audit completion"
  }
}

# Log Audit Results
POST /api/production/qc/audit/log
{
  "qcInspectionId": "fff0e8400-e29b-41d4-a716-446655440aaa",
  "auditType": "STRUCTURAL",
  "passed": true,
  "findings": "All seams intact, no tears detected"
}

# Complete QC (all three audits must be logged)
POST /api/production/qc/inspection/complete
{
  "qcInspectionId": "fff0e8400-e29b-41d4-a716-446655440aaa",
  "inspectedBy": "qc_manager@fabricsync.com"
}

Response:
{
  "success": true,
  "data": {
    "qcInspectionId": "fff0e8400-e29b-41d4-a716-446655440aaa",
    "overallStatus": "PASSED",
    "auditResults": {
      "structural": { "passed": true, ... },
      "aesthetic": { "passed": true, ... },
      "aseptic": { "passed": true, ... }
    },
    "message": "QC verification PASSED - ready for PS gate"
  }
}
```

---

### **Step 13: Pre-Shipping Sample Gate**
```bash
POST /api/production/ps/sample/initiate
Content-Type: application/json
Authorization: Bearer <token>

{
  "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
  "totalCargoUnits": 1000
}

Response:
{
  "success": true,
  "data": {
    "psLogId": "ggg0e8400-e29b-41d4-a716-446655440bbb",
    "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
    "totalCargoUnits": 1000,
    "sampleSize": 100.00,
    "sampleUnits": 100,
    "message": "Pre-Shipping sample created: 10% (100 units) of 1000 total units"
  }
}

# Send to Customer
POST /api/production/ps/sample/send-to-customer
{
  "psLogId": "ggg0e8400-e29b-41d4-a716-446655440bbb",
  "sentTo": "customer@retailchain.com",
  "sentAt": "2026-06-25T10:00:00Z"
}

# Customer Approves
POST /api/production/ps/sample/approve
{
  "psLogId": "ggg0e8400-e29b-41d4-a716-446655440bbb",
  "customerApprovedBy": "Rajesh@retailchain.com",
  "approvedAt": "2026-06-26T14:30:00Z"
}

Response:
{
  "success": true,
  "data": {
    "psLogId": "ggg0e8400-e29b-41d4-a716-446655440bbb",
    "status": "APPROVED",
    "orderStatus": "PS_APPROVED",
    "message": "Customer approved pre-shipping sample. Order ready for export."
  }
}
```

### **Step 14: Export Readiness Validation**
```bash
POST /api/production/export/validate-readiness
Content-Type: application/json
Authorization: Bearer <token>

{
  "orderTokenId": "550e8400-e29b-41d4-a716-446655440000"
}

Response (SUCCESS):
{
  "success": true,
  "data": {
    "orderTokenId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "EXPORT_READY",
    "isPsApproved": true,
    "message": "Order is ready for export. Hand over to Export Department."
  }
}

Response (FAILURE):
{
  "success": false,
  "error": "EXPORT_NOT_READY",
  "message": "403 Forbidden: Pre-Shipping sample not approved by customer"
}
```

---

## 🔍 GET Status Endpoints

### Get Order Progress at Any Stage
```bash
# Material Allocation
GET /api/production/material-allocation/requisition/{requisitionId}

# Yarn & Fabric Phase
GET /api/production/yarn-fabric/status/{orderTokenId}

# Wet Processing
GET /api/production/wet-processing/status/{orderTokenId}

# Assembly Line
GET /api/production/assembly/job-cards/{orderTokenId}
GET /api/production/assembly/phase-status/{orderTokenId}

# QC & Pre-Shipping
GET /api/production/qc-ps/status/{orderTokenId}
```

---

## ⚠️ Common Error Scenarios

### 1. **Weight Loss Outside Tolerance**
```json
{
  "success": false,
  "error": "BUSINESS_LOGIC_ERROR",
  "message": "Weight loss 15% is OUTSIDE tolerance range (9-11%)"
}
```
**Action**: Review output weight measurement; create claim dispute automatically

### 2. **Piece Count Discrepancy**
```json
{
  "success": true,
  "data": {
    "discrepancyMessage": "DISCREPANCY ALERT: Sent 100 pieces, received 98. Shortage: 2 pieces",
    "hasDiscrepancy": true,
    "discrepancyCount": 2
  }
}
```
**Action**: Investigate vendor; create alert for assembly line

### 3. **Phase Prerequisite Not Met**
```json
{
  "success": false,
  "error": "BUSINESS_LOGIC_ERROR",
  "message": "Phase PHASE2_STITCHING cannot proceed. Missing prerequisites: PHASE1_CUTTING"
}
```
**Action**: Complete preceding phase first

### 4. **Export Readiness Blocked**
```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "403 Forbidden: Pre-Shipping sample not approved by customer"
}
```
**Action**: Wait for customer approval or rework

---

## 📊 Batch Calculations

### Calculate Final Wages for an Order
```bash
GET /api/production/assembly/job-cards/{orderTokenId}

Response:
{
  "success": true,
  "data": {
    "jobCardCount": 5,
    "totalWagePayable": 3500.00,  // Sum of all workers' calculated wages
    "jobCards": [
      {
        "workerName": "Ravi Kumar",
        "totalPiecesCompleted": 600,
        "basePieceRate": 5.50,
        "calculatedWage": 3300.00
      },
      ...
    ]
  }
}
```

---

**Version**: 1.0.0  
**Last Updated**: 2026-06-19
