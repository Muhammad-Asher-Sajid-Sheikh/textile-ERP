# FabricSync Production Department Module - Complete Implementation Guide

## 📊 System Overview

This document provides a comprehensive guide to the Production Department module for the FabricSync Textile ERP system. The module implements an enterprise-grade, asynchronous state-driven pipeline that manages production workflows from order authorization through export readiness.

---

## 🏗️ Architecture Layers

### 1. **Data Model Layer** (Prisma Schema)
- **OrderToken**: Master order entity with status tracking
- **TechPack**: Locked technical specifications
- **ProductionRequisition**: Material allocation requests
- **WarehouseMaterialInventory**: Pre-approved master samples
- **LoomOutputLog**: Yarn twisting & weaving metrics
- **WetProcessingLog**: Dyeing & fabric processing with weight loss calculations
- **DecorPrintingLog**: Printing vendor tracking
- **EmbroideryPieceLog**: Embroidery with pre-stitching validation
- **AssemblyJobCard**: Worker piece-rate tracking
- **QcInspection**: Quality control audits
- **PreShippingSample**: Customer sample approval gate
- **DiscrepancyAlert**: Piece count & variance tracking
- **ClaimDispute**: Financial claims for weight loss failures

### 2. **Business Logic Layer** (Services)
Each service implements strict validation and state enforcement:
- `MaterialAllocationService`: Gate 1 - Material allocation
- `YarnFabricPhaseService`: Gate 2 - Yarn & fabric processing
- `WetProcessingService`: Gate 3 - Wet processing & claims
- `SurfaceDecorationService`: Gate 4 - Printing & embroidery
- `AssemblyLineService`: Gate 5 - Assembly pipeline
- `QcPreShippingService`: Gate 6 - Quality control & PS gate

### 3. **Validation Layer**
- `StateMachine`: Enforces sequential state transitions
- `ProductionValidator`: Applies all business logic invariants:
  - 9-11% weight loss tolerance window
  - GSM density validation (10-1000 range)
  - Piece count discrepancy tracking
  - Pre-stitching validation (≥2 sides)
  - Piece-rate wage calculation

### 4. **API Layer** (Controllers & Routes)
- **Controllers**: Handle HTTP requests with error handling
- **Routes**: RESTful endpoints with authentication & validation
- **Middleware**: Token validation, input schema validation

---

## 🔄 Production Pipeline Flow

### **Phase 1: Material Allocation Gate**
**Status Transition**: `AUTHORIZED` → `MATERIAL_ALLOCATED`

1. Create production requisition
2. Validate requested volume against pre-approved master samples
3. Release requisition with digital signature authorization
4. Dispatch material to production floor
5. Automatically decrement warehouse inventory

**Key Invariant**: Cannot proceed without locked Tech Pack instructions

### **Phase 2: Yarn & Fabric Phase (3rd Party Vendor)**
**Status Transition**: `MATERIAL_ALLOCATED` → `WET_PROCESSING_INPROGRESS`

1. Check if yarn twisting required (Tech Pack dependent)
2. Initiate yarn twisting if needed
3. Dispatch yarn to weaving vendor
4. Log raw fabric output metrics:
   - Roll piece counts
   - Total mass weight (Kg)
   - Fabric density (GSM)
   - Total length (Yards)
5. Validate against PO yield targets
6. Log waste variance as factory loss (non-blocking)

**Key Invariant**: Sequential prerequisite check - weaving cannot proceed without material allocation

### **Phase 3: Wet Processing & Claims Verification (3rd Party)**
**Status Transition**: `WET_PROCESSING_INPROGRESS` → `SURFACE_DECORATION_INPROGRESS` or `FAILED`

1. Dispatch fabric to dyehouses with unique Digital Track ID
2. Log three mandatory quality tests:
   - **COLOR_FASTNESS**: Pass/Fail
   - **SHRINKING**: Pass/Fail
   - **GASOLINE_SMELL**: Pass/Fail
3. Calculate weight loss percentage: `((Input - Output) / Input) × 100`
4. Validate against 9-11% tolerance window:
   - ✅ **Within Tolerance** (9-11%): Status = `PASSED`
   - ❌ **Outside Tolerance** (<9% or >11%): Status = `FAILED`
     - Automatically create claim dispute
     - Transition order to `FAILED`
     - Alert management system

**Key Invariant**: All three quality tests must be completed before gate closure

### **Phase 4: Surface Decoration Branches**
**Status Transition**: `SURFACE_DECORATION_INPROGRESS` → `ASSEMBLY_INPROGRESS`

#### **Printing Branch** (if enabled in Tech Pack)
1. Dispatch rolls to printing vendor
2. Log returned roll specs
3. Conduct visual specification audit
4. Update printing QA log
5. Validate piece count:
   - If `sent ≠ returned`: Flag `DISCREPANCY_ALERT`

#### **Embroidery Branch** (if enabled in Tech Pack)
1. Cut continuous fabric rolls into individual pieces
2. Pre-stitch all pieces on ≥2 sides (prevents fraying)
3. Dispatch pre-stitched pieces to embroidery vendor
4. Receive and validate piece count:
   - If `sent ≠ returned`: Flag `DISCREPANCY_ALERT`

**Key Invariant**: Both branches are parallelized; order supports BOTH, PRINTING_ONLY, EMBROIDERY_ONLY, or NONE

### **Phase 5: In-House Assembly Line**
**Status Transition**: `ASSEMBLY_INPROGRESS` → `QC_VERIFICATION_INPROGRESS`

1. Create job card for each worker with base piece rate
2. Log work across 6 sequential phases:
   - `PHASE1_CUTTING`
   - `PHASE2_STITCHING`
   - `PHASE3_INITIAL_CHECK`
   - `PHASE4_FOLDING`
   - `PHASE5_FINAL_CHECK`
   - `PHASE6_PACKING`
3. Update piece-rate wage dynamically: `Wage = Pieces × Base Rate`
4. Enforce sequential phase prerequisites

**Key Invariant**: Cannot skip phases; worker payroll is calculated in real-time

### **Phase 6: Quality Control & Pre-Shipping Gate**
**Status Transition**: `QC_VERIFICATION_INPROGRESS` → `PS_APPROVED` → `EXPORT_READY`

#### **QC Inspection (100% Compliance Sweep)**
1. Audit three mandatory categories:
   - **STRUCTURAL**: Physical integrity
   - **AESTHETIC**: Visual appearance
   - **ASEPTIC**: Sanitary/hygiene compliance
2. All three must pass for order verification

#### **Pre-Shipping Sample Gate (10% Extraction Rule)**
1. Calculate 10% sample size: `Sample Units = ceil(Total Units × 0.10)`
2. Send sample to customer for approval
3. Customer approval gates:
   - ✅ **APPROVED**: `is_ps_approved = TRUE` → `EXPORT_READY`
   - ❌ **REJECTED**: `is_ps_approved = FALSE` → `ASSEMBLY_INPROGRESS` (rework)

**Key Invariant**: Export cannot proceed without QC verification AND PS approval

---

## 📦 Data Types & Precision

All measurements use high-precision decimals to prevent accounting rounding errors:

- **Decimal(12,2)**: Mass weights, lengths, yardages, wages, quantities
- **Decimal(10,2)**: GSM density, percentages, rates

Example:
```typescript
const yarnWeight = new Decimal('123.45');  // Correct
const fabricDensity = new Decimal('456.78');  // Correct
```

---

## 🔐 Validation Rules & Constraints

### 1. **Weight Loss Tolerance (9-11%)**
```
Formula: ((Input Weight - Output Weight) / Input Weight) × 100

Example:
- Input: 100 Kg
- Output: 90 Kg
- Loss: ((100-90)/100) × 100 = 10% ✅ PASSED (within 9-11%)

- Input: 100 Kg
- Output: 85 Kg  
- Loss: ((100-85)/100) × 100 = 15% ❌ FAILED (outside 9-11%)
  → Triggers claim dispute automatically
```

### 2. **GSM Validation (10-1000)**
- Fabric density must fall within realistic textile range
- Prevents invalid data entry

### 3. **Piece Count Discrepancy**
- Sent pieces must equal returned pieces
- Any mismatch triggers `DISCREPANCY_ALERT`
- Prevents fabric loss on assembly lines

### 4. **Pre-Stitching Requirement (≥2 sides)**
- All embroidery pieces must be pre-stitched on at least 2 sides
- Prevents fraying during shipping

### 5. **Phase Prerequisites**
- Cannot log Phase N until Phase N-1 is completed
- Enforces sequential assembly line workflow

### 6. **Export Readiness Gate**
```
Prerequisites:
- Order Status = 'PS_APPROVED'
- isPsApproved = true
- QC Verification = 'VERIFIED'

If ANY condition fails: 403 Forbidden error
```

---

## 🌐 API Endpoints Reference

### **Material Allocation**
- `POST /api/production/material-allocation/requisition` - Create requisition
- `POST /api/production/material-allocation/requisition/release` - Release with signature
- `POST /api/production/material-allocation/dispatch` - Dispatch material
- `GET /api/production/material-allocation/requisition/:requisitionId` - Get status

### **Yarn & Fabric Phase**
- `POST /api/production/yarn-fabric/twisting/initiate` - Initiate twisting
- `POST /api/production/yarn-fabric/weaving/dispatch` - Dispatch to weaving
- `POST /api/production/yarn-fabric/fabric-output/log` - Log fabric metrics
- `GET /api/production/yarn-fabric/status/:orderTokenId` - Get phase status

### **Wet Processing**
- `POST /api/production/wet-processing/dispatch` - Dispatch to dyehouse
- `POST /api/production/wet-processing/quality-test/log` - Log quality test
- `POST /api/production/wet-processing/complete` - Complete processing (calculates weight loss)
- `GET /api/production/wet-processing/status/:orderTokenId` - Get processing status

### **Surface Decoration**
- `POST /api/production/decoration/printing/dispatch` - Dispatch to printer
- `POST /api/production/decoration/printing/complete` - Complete printing
- `POST /api/production/decoration/embroidery/initiate` - Initiate embroidery
- `POST /api/production/decoration/embroidery/dispatch` - Dispatch to embroidery vendor
- `POST /api/production/decoration/embroidery/complete` - Complete embroidery
- `GET /api/production/decoration/status/:orderTokenId` - Get decoration status

### **Assembly Line**
- `POST /api/production/assembly/job-card/create` - Create worker job card
- `POST /api/production/assembly/phase/log` - Log phase work
- `POST /api/production/assembly/phase/complete` - Complete phase (updates wage)
- `GET /api/production/assembly/job-card/:jobCardId` - Get job card details
- `GET /api/production/assembly/job-cards/:orderTokenId` - Get all job cards
- `GET /api/production/assembly/phase-status/:orderTokenId` - Get phase execution status

### **QC & Pre-Shipping**
- `POST /api/production/qc/inspection/start` - Start QC inspection
- `POST /api/production/qc/audit/log` - Log audit result
- `POST /api/production/qc/inspection/complete` - Complete QC
- `POST /api/production/ps/sample/initiate` - Create PS sample
- `POST /api/production/ps/sample/send-to-customer` - Send to customer
- `POST /api/production/ps/sample/approve` - Customer approves
- `POST /api/production/ps/sample/reject` - Customer rejects (triggers rework)
- `POST /api/production/export/validate-readiness` - Validate export gate
- `GET /api/production/qc-ps/status/:orderTokenId` - Get QC & PS status

---

## 📋 Unified Response Format

### **Success Response**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "status": "IN_PROGRESS",
    "metrics": {...}
  }
}
```

### **Validation Error**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Input validation failed",
  "details": [
    {
      "field": "fabricDensityGsm",
      "message": "GSM must be between 10 and 1000"
    }
  ]
}
```

### **Business Logic Error**
```json
{
  "success": false,
  "error": "BUSINESS_LOGIC_ERROR",
  "message": "Weight loss 15% is OUTSIDE tolerance range (9-11%)"
}
```

### **Authorization Error**
```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "403 Forbidden: Pre-Shipping sample not approved by customer"
}
```

---

## 🔄 State Diagram

```
AUTHORIZED
    ↓
MATERIAL_ALLOCATED (Gate 1: Material Requisition)
    ↓
YARN_WEAVING_INPROGRESS (Gate 2: Yarn & Fabric)
    ↓
WET_PROCESSING_INPROGRESS (Gate 3: Wet Processing)
    ├─→ FAILED (if weight loss outside 9-11% tolerance)
    │   └─→ CLAIM_DISPUTE created
    ↓
SURFACE_DECORATION_INPROGRESS (Gate 4: Printing/Embroidery)
    ├─→ DISCREPANCY_ALERT (if piece count mismatch)
    ↓
ASSEMBLY_INPROGRESS (Gate 5: Assembly Line)
    ↓
QC_VERIFICATION_INPROGRESS (Gate 6: QC Inspection)
    ↓
PS_SAMPLE_PENDING (Gate 6b: Pre-Shipping Sample)
    ├─→ ASSEMBLY_INPROGRESS (if customer rejects, rework)
    ↓
PS_APPROVED (Customer approved sample)
    ↓
EXPORT_READY (Ready for Export Department)
```

---

## 🛠️ Development Notes

### Dependencies
- **Prisma**: ORM with automatic migrations
- **Express**: REST API framework
- **Express-Validator**: Input schema validation
- **UUID**: Unique identifiers for all records
- **Decimal.js**: High-precision arithmetic

### Authentication
All production routes are protected by token validation middleware:
```typescript
app.use(checkToken);  // Validates JWT from Authorization header
app.use(checkApproved);  // Ensures user is APPROVED status
```

### Error Handling
Centralized error handler distinguishes between:
- 400: Validation errors, business logic violations
- 403: Authorization/prerequisite failures
- 404: Resource not found
- 500: Unexpected server errors

### Database Migrations
After schema changes, generate migration:
```bash
npx prisma migrate dev --name "add_production_tables"
```

---

## 📊 Key Metrics & KPIs

The system automatically tracks and enables reporting on:
1. **Weight Loss Percentage**: Per wet processing log
2. **Piece-Rate Wages**: Real-time per worker
3. **Discrepancy Count**: Per decoration branch
4. **Phase Execution Time**: Per assembly phase
5. **Quality Audit Results**: Structural/Aesthetic/Aseptic
6. **PS Approval Rate**: Customer acceptance rate
7. **Yield Compliance**: PO target variance
8. **Claim Disputes**: Financial exposure tracking

---

## 🚀 Deployment Checklist

- [ ] Prisma schema migrated to production database
- [ ] Environment variables configured (DATABASE_URL, etc.)
- [ ] Production routes imported in app.js
- [ ] Authentication middleware verified
- [ ] Test all 6 gates end-to-end
- [ ] Validate weight loss calculation edge cases
- [ ] Test piece count discrepancy alerts
- [ ] Verify export readiness validation
- [ ] Monitor error logs for unexpected failures
- [ ] Load test with realistic order volumes

---

## 📞 Support & Troubleshooting

**Common Issues:**

1. **Order stuck in PENDING state**
   - Check TechPack: `isInstructionsLocked` must be true
   - Verify material requisition status

2. **Weight loss claim disputes**
   - Validate output weight recording accuracy
   - Confirm input weight matches loom output

3. **Piece count mismatches**
   - Verify printing/embroidery vendor tracking
   - Cross-reference dispatch vs return logs

4. **Phase cannot be logged**
   - Check prerequisite phase completion
   - Ensure job card exists for order

5. **Export validation fails**
   - Confirm QC status = `VERIFIED`
   - Confirm PS status = `APPROVED` and `isPsApproved = true`

---

**Last Updated**: 2026-06-19  
**Module Version**: 1.0.0  
**Status**: Production Ready
