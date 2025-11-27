# Laboratory Test Ordering System - Complete Documentation

## 📋 **Table of Contents**
1. [System Overview](#system-overview)
2. [Laboratory Structure](#laboratory-structure)
3. [Test Groups Distribution](#test-groups-distribution)
4. [New Workflow Implementation](#new-workflow-implementation)
5. [Urgency Field Fix](#urgency-field-fix)
6. [Technical Implementation](#technical-implementation)
7. [Usage Examples](#usage-examples)
8. [Data Storage](#data-storage)
9. [Testing & Verification](#testing--verification)

---

## 🏥 **System Overview**

The Laboratory Test Ordering System has been completely refactored with a **lab-first workflow** and **23 test groups** across **5 specialized laboratories**. The system provides:

- ✅ **5 Laboratories** with specialized test groups
- ✅ **23 Test Groups** (packages) organized by specialty
- ✅ **118 Individual Tests** across all categories
- ✅ **Lab-first workflow**: Select lab → test group → individual tests
- ✅ **Flexible test selection**: Choose all or specific tests from any group
- ✅ **Fixed urgency display**: Routine/Urgent options working correctly
- ✅ **Enhanced UI**: Category badges, removed Type column, clean interface

---

## 🔬 **Laboratory Structure**

### **1. Hematology Lab**
**Location**: Laboratory Department, Building A  
**Turnaround**: Routine: 24 hours, STAT: 2-4 hours  
**Test Groups (4)**:
- Complete Blood Count (CBC) - 8 tests
- Peripheral Blood Smear - 3 tests
- Anemia Workup - 8 tests
- Specialized Hematology Tests - 4 tests

**Total Individual Tests**: 23

### **2. Biochemistry Lab**
**Location**: Laboratory Department, Building A  
**Turnaround**: Routine: 24-48 hours, STAT: 4-6 hours  
**Test Groups (5)**:
- Liver Function Tests (LFT) - 8 tests
- Kidney Function Tests (KFT) - 3 tests
- Urinalysis - 7 tests
- Lipid Profile & Glucose Tests - 8 tests
- Electrolyte & Metabolic Panel - 7 tests

**Total Individual Tests**: 33

### **3. Microbiology & Infection Diseases Lab**
**Location**: Laboratory Department, Building B  
**Turnaround**: Routine: 48-72 hours, STAT: 24 hours (preliminary)  
**Test Groups (4)**:
- Blood Culture - 2 tests
- Urine Culture - 1 test
- Sputum Culture - 1 test
- Stool Tests - 4 tests

**Total Individual Tests**: 8

### **4. Immunology & Serology Lab**
**Location**: Laboratory Department, Building B  
**Turnaround**: Routine: 3-5 days, STAT: 24-48 hours  
**Test Groups (9)**:
- General Immunology Tests - 4 tests
- Hepatitis & Viral Markers - 6 tests
- TORCH Panel - 4 tests
- Autoimmune Panel - 10 tests
- Allergy Tests - 3 tests
- Quantitative Immunoglobulins - 4 tests
- Complement Levels - 3 tests
- Flow Cytometry - 2 tests
- Tumor Markers - 4 tests

**Total Individual Tests**: 40

### **5. Histopathology & Cytology Lab**
**Location**: Laboratory Department, Building C  
**Turnaround**: Routine: 5-7 days, STAT: 48-72 hours (frozen section: 30 min)  
**Test Groups (4)**:
- Routine Histopathology - 3 tests
- Special Stains - 4 tests
- Molecular Pathology - 5 tests
- Body Fluid Cytology - 2 tests

**Total Individual Tests**: 14

---

## 📊 **Test Groups Distribution**

### **Summary Statistics**
| Laboratory | Test Groups | Total Tests |
|------------|-------------|-------------|
| **Hematology** | 4 | 23 tests |
| **Biochemistry** | 5 | 33 tests |
| **Microbiology** | 4 | 8 tests |
| **Immunology** | 9 | 40 tests |
| **Histopathology** | 4 | 14 tests |
| **TOTAL** | **23** | **118 tests** |

### **How Filtering Works**
The system **filters test groups by selected laboratory**:

1. **Select Laboratory** → System filters test groups by lab category
2. **Select Test Group** → System shows only tests within that group
3. **Select Tests** → Choose all or specific tests from the group

**Example**: When you select "Hematology" lab, you see exactly 4 test groups (CBC, Blood Smear, Anemia Workup, Specialized). This is the correct behavior - each lab only shows its relevant test groups.

---

## 🔄 **New Workflow Implementation**

### **Previous Workflow (Removed)**
❌ Step 1: Select Order Type (Test Package vs Individual Tests)  
❌ Step 2a: If Package → Select Package → Select Tests  
❌ Step 2b: If Individual → Select Category → Select Tests  
❌ Step 3: Select Laboratory  

### **New Workflow (Current)**
✅ **Step 1: Select Laboratory**  
✅ **Step 2: Select Test Group** (filtered by lab)  
✅ **Step 3: Select Individual Tests** (from the group)  

### **Key Features**
1. **Smart Filtering**: Test groups are automatically filtered based on selected laboratory
2. **Simplified Selection**: No more "Order Type" radio buttons or separate modes
3. **Flexible Test Selection**: Always shows all tests in the selected group with "Select All/Clear All" options
4. **Visual Feedback**: Lab details displayed immediately, clear step-by-step progression

### **Technical Changes**
- ❌ Removed: `orderType`, `selectedCategory` fields, Order Type UI, separate package/individual logic
- ✅ Added: `SET_LAB`, `SELECT_ALL_TESTS`, `CLEAR_ALL_TESTS` actions, smart filtering, step-by-step UI
- ✅ Updated: Form structure, dropdown filtering, simplified save logic

---

## ⚡ **Urgency Field Fix**

### **Problem Solved**
When selecting "urgent", the system was showing "routine" after saving due to OpenEHR template limitations.

### **Solution**
Store urgency in description and narrative fields, then parse on retrieval:

**Saving**:
```typescript
description = `Test Group: ${name} | Category: ${category} | Laboratory: ${lab} | Selected Tests (...) | Urgency: urgent`;
narrative = `${name} ordered (urgent) due to ${indication}`;
```

**Retrieving**:
```typescript
let urgency = "routine";
if (description && description.toLowerCase().includes('urgency: urgent')) {
  urgency = "urgent";
} else if (narrative && narrative.toLowerCase().includes('(urgent)')) {
  urgency = "urgent";
}
```

### **UI Changes**
- ✅ Removed "Order Type" from details dialog
- ✅ Simplified urgency options: Routine/Urgent only (removed STAT/ASAP)
- ✅ Fixed color coding: Green for routine, Red for urgent
- ✅ Removed Type column from table, kept Category column

---

## 💻 **Technical Implementation**

### **Files Modified**
1. **`EnhancedOrdersTab.tsx`** - Main component with new workflow
2. **`test-orders/route.ts`** - Backend API with urgency handling
3. **`openehr.ts`** - OpenEHR parsing for new description format

### **Key Code Changes**

#### **Frontend (EnhancedOrdersTab.tsx)**
```typescript
// New form structure
interface TestOrderForm {
  target_lab: string;
  selectedPackage: string;
  selectedTests: string[];
  clinical_indication: string;
  urgency: "routine" | "urgent";
  // ... other fields
}

// Smart filtering
const availablePackages = useMemo(() => {
  if (!formState.target_lab) return [];
  const category = getLabCategory(formState.target_lab);
  return Object.values(TEST_PACKAGES).filter(pkg => pkg.category === category);
}, [formState.target_lab]);
```

#### **Backend (route.ts)**
```typescript
// Include urgency in description
const description = `Test Group: ${pkg.name} | Category: ${pkg.category} | Laboratory: ${targetLab.name} | Selected Tests (...) | Urgency: ${urgency}`;
```

#### **OpenEHR Parsing (openehr.ts)**
```typescript
// Extract category and urgency from description
const categoryMatch = description.match(/Category:\s*([^|]+)/);
const urgencyMatch = description.toLowerCase().includes('urgency: urgent');
```

---

## 🎯 **Usage Examples**

### **Example 1: Ordering CBC Tests**
```
1. Doctor clicks "New Test Order"
2. Selects "Hematology" lab
   → Sees lab details (Building A, 24h turnaround)
3. Dropdown shows 4 test groups for Hematology
4. Selects "Complete Blood Count (CBC)"
   → Shows 8 tests with checkboxes
5. Clicks "Select All" (or selects specific tests)
   → Counter shows "8 of 8 tests selected"
6. Fills in clinical indication
7. Selects urgency (Routine/Urgent)
8. Clicks "Order Tests"
```

### **Example 2: Ordering Partial Liver Function Tests**
```
1. Doctor clicks "New Test Order"
2. Selects "Biochemistry" lab
   → Sees lab details (Building A, 24-48h turnaround)
3. Dropdown shows 5 test groups for Biochemistry
4. Selects "Liver Function Tests (LFT)"
   → Shows 8 tests with checkboxes
5. Manually selects only: ALT, AST, ALP, Bilirubin
   → Counter shows "4 of 8 tests selected"
6. Fills in clinical indication
7. Selects "Urgent" urgency
8. Clicks "Order Tests"
```

### **Example 3: Ordering Hepatitis Panel**
```
1. Doctor clicks "New Test Order"
2. Selects "Immunology & Serology" lab
   → Sees lab details (Building B, 3-5 days turnaround)
3. Dropdown shows 9 test groups for Immunology
4. Selects "Hepatitis & Viral Markers"
   → Shows 6 tests with checkboxes
5. Clicks "Select All"
   → Counter shows "6 of 6 tests selected"
6. Fills in clinical indication
7. Selects "Urgent" urgency
8. Clicks "Order Tests"
```

---

## 💾 **Data Storage**

### **Order Data Structure**
```json
{
  "service_name": "Complete Blood Count (CBC)",
  "service_type_value": "Test Group",
  "test_category": "Hematology",
  "target_lab": "Hematology",
  "is_package": true,
  "description": "Test Group: Complete Blood Count (CBC) | Category: Hematology | Laboratory: Hematology | Selected Tests (5/8): RBCs, WBCs, Hemoglobin, Hematocrit, Platelets | Urgency: urgent",
  "clinical_indication": "Patient presents with fatigue",
  "urgency": "urgent",
  "requesting_provider": "Dr. Smith",
  "receiving_provider": "Hematology",
  "narrative": "Complete Blood Count (CBC) ordered (urgent) due to Patient presents with fatigue"
}
```

### **OpenEHR Storage**
- Description field contains structured data with urgency
- Narrative field contains human-readable summary
- Category and lab extracted from description on retrieval
- Urgency parsed from both description and narrative

---

## ✅ **Testing & Verification**

### **Workflow Testing**
- [x] Lab selection shows correct test groups
- [x] Test group filtering works correctly
- [x] Individual test selection works
- [x] Select All/Clear All buttons functional
- [x] Form validation works
- [x] Orders save successfully to OpenEHR

### **Urgency Testing**
- [x] Routine orders save and display correctly
- [x] Urgent orders save and display correctly
- [x] Red badge shows for urgent orders
- [x] Green badge shows for routine orders
- [x] No more 422 OpenEHR errors

### **UI Testing**
- [x] Category badges show correctly
- [x] Type column removed from table
- [x] Order Type removed from details dialog
- [x] Only Routine/Urgent options in dropdown
- [x] Test group count messages display

### **Data Verification**
To verify all 23 test groups are working:

1. **Select Hematology Lab**
   - Should show: 4 test groups
   - Message: "4 test groups available for Hematology"

2. **Select Biochemistry Lab**
   - Should show: 5 test groups
   - Message: "5 test groups available for Biochemistry"

3. **Select Microbiology Lab**
   - Should show: 4 test groups
   - Message: "4 test groups available for Microbiology & Infection Diseases"

4. **Select Immunology Lab**
   - Should show: 9 test groups
   - Message: "9 test groups available for Immunology & Serology"

5. **Select Histopathology Lab**
   - Should show: 4 test groups
   - Message: "4 test groups available for Histopathology & Cytology"

---

## 🎉 **Implementation Status**

### **Complete Features**
- ✅ Lab-first workflow implemented
- ✅ 23 test groups across 5 laboratories
- ✅ Smart filtering by laboratory
- ✅ Flexible test selection (all or specific)
- ✅ Urgency field fixed (Routine/Urgent)
- ✅ UI cleaned up (removed Order Type, added Category badges)
- ✅ OpenEHR integration working
- ✅ TypeScript compilation successful
- ✅ No lint errors
- ✅ Production ready

### **Key Benefits**
1. **More Intuitive**: Doctors think "Which lab?" first
2. **Less Confusion**: No need to understand packages vs individual tests
3. **Faster**: Fewer steps, clearer progression
4. **Smarter**: Only shows relevant test groups for selected lab
5. **Flexible**: Can still select all or specific tests from any group
6. **Consistent**: Same workflow for all test types
7. **Better UX**: Step-by-step labels guide the user
8. **Reduced Errors**: Can't select incompatible lab/test combinations

---

## 📈 **System Statistics**

- **Total Test Packages**: 23
- **Total Individual Tests**: 118
- **Total Laboratories**: 5
- **Categories**: 5
- **Largest Package**: Autoimmune Panel (10 tests)
- **Largest Category**: Immunology & Serology (40 tests)
- **Workflow Steps**: 3 (Lab → Test Group → Tests)
- **Urgency Options**: 2 (Routine, Urgent)

---

## 🔮 **Future Enhancements**

Potential improvements for future consideration:
1. **Test result tracking** - Link orders to results
2. **Order status tracking** - Pending, Processing, Complete
3. **Bulk ordering** - Order multiple test groups at once
4. **Test history** - Show patient's previous test orders
5. **Integration with EMR** - Auto-populate clinical indications
6. **Mobile optimization** - Responsive design for tablets/phones
7. **Order templates** - Save frequently ordered test combinations
8. **Automated routing** - Smart lab selection based on test patterns

---

## 🎯 **Conclusion**

The Laboratory Test Ordering System has been successfully refactored with a **streamlined, user-friendly workflow** that:

- ✅ **Simplifies the ordering process** with lab-first selection
- ✅ **Provides comprehensive test coverage** across all major specialties
- ✅ **Fixes critical issues** with urgency display and UI clutter
- ✅ **Maintains full OpenEHR integration** for data persistence
- ✅ **Delivers excellent user experience** with clear visual feedback

The system is now production-ready and provides doctors with an intuitive, efficient way to order laboratory tests while maintaining data integrity and clinical accuracy.

**Your lab test ordering system is now complete and optimized for clinical use! 🚀**
