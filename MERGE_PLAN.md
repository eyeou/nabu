# Merge Plan: Master + ClassCreation → Result Branch

## Objective
Merge features from both branches into a new "Result" branch that contains:
- From Master: Exam upload with AI grading and student feedback
- From ClassCreation: Student registry import and delete functionality
- Common base: Keep all shared features

## Branch Analysis

### Master Branch (AI Features)
**Key Files:**
- `app/api/exams/upload/route.ts` - Exam upload with AI grading
- `lib/ai.ts` - AI functions (analyzeAndGradeExamImage, generateStudentAnalysisFromLLM)
- Database models: Assessment, StudentAssessment, StudentSummary, StudentLessonStatus

**Features:**
1. Upload exam photos (multiple pages supported)
2. AI extracts questions, answers, and grades
3. Automatically matches student by name
4. Creates student if not found (with classId)
5. Generates AI summaries (strengths, weaknesses, recommendations)
6. Updates lesson status with scores

### ClassCreation Branch (Import & Delete Features)
**Key Files:**
- `components/StudentRegistryUpload.tsx` - Registry upload component
- `app/api/students/bulk/route.ts` - Bulk student creation
- `app/api/students/extract/route.ts` - AI extraction from registry photos
- `app/classes/[classId]/page.tsx` - Delete button implementation
- `app/classes/create/page.tsx` - Import during class creation
- `lib/ai.ts` - extractStudentsFromRegistry function

**Features:**
1. Upload class registry (CSV, JPG, PNG)
2. AI extracts student names and ages
3. Bulk create students
4. Delete student with confirmation
5. Visual delete button (× on hover)

## Merge Strategy

### Step 1: Create Result Branch from Master
```bash
git checkout master
git checkout -b Result
```
**Rationale:** Master has the exam upload feature which is more complex and critical

### Step 2: Merge ClassCreation Features

#### 2.1 Files to Copy from ClassCreation (No Conflicts)
- `components/StudentRegistryUpload.tsx` ✅ NEW
- `app/api/students/bulk/route.ts` ✅ NEW  
- `app/api/students/extract/route.ts` ✅ NEW
- `docs/STUDENT_IMPORT_AND_DELETE_COMPLETE.md` ✅ NEW
- `docs/student-registry-import.md` ✅ NEW
- `docs/DELETE_BUTTON_UI.md` ✅ NEW
- `test-student-import.sh` ✅ NEW
- `STUDENT_REGISTRY_FEATURE_SUMMARY.md` ✅ NEW

#### 2.2 Files to Merge (Conflicts Expected)
- `lib/ai.ts` - Need to add extractStudentsFromRegistry function
- `app/classes/[classId]/page.tsx` - Need to add delete button + import modal
- `app/classes/create/page.tsx` - Need to add import option
- `types/index.ts` - May need to merge type definitions

#### 2.3 Dependencies to Add
- `papaparse` - For CSV parsing (from ClassCreation)

### Step 3: Detailed Merge Actions

#### Action 1: Merge lib/ai.ts
**Changes needed:**
- Keep all Master functions (analyzeAndGradeExamImage, generateStudentAnalysisFromLLM)
- Add extractStudentsFromRegistry from ClassCreation
- Add ExtractedStudent, StudentRegistryExtractionResult types
- Add fallbackStudentExtraction function

#### Action 2: Merge app/classes/[classId]/page.tsx
**Changes needed:**
- Keep Master's exam display logic
- Add ClassCreation's delete button (× on hover)
- Add ClassCreation's import modal
- Add StudentRegistryUpload component
- Merge state management

#### Action 3: Merge app/classes/create/page.tsx
**Changes needed:**
- Add import option during class creation
- Keep existing create logic

#### Action 4: Merge types/index.ts
**Changes needed:**
- Merge any new type definitions from both branches

### Step 4: Testing Plan
1. Test exam upload (Master feature)
2. Test student registry import (ClassCreation feature)
3. Test delete student (ClassCreation feature)
4. Test AI summaries generation (Master feature)
5. Test all features together

### Step 5: Push to Result Branch
```bash
git add .
git commit -m "Merge: Combined Master (AI exam grading) + ClassCreation (import & delete)"
git push origin Result
```

## File-by-File Merge Details

### 1. lib/ai.ts
**Status:** MERGE REQUIRED
**Action:** 
- Keep Master version as base
- Add from ClassCreation:
  - extractStudentsFromRegistry function
  - ExtractedStudent interface
  - StudentRegistryExtractionResult interface
  - fallbackStudentExtraction function

### 2. app/classes/[classId]/page.tsx
**Status:** MERGE REQUIRED
**Action:**
- Keep Master's student detail modal with exam data
- Add ClassCreation's:
  - Delete button (× on hover over student circle)
  - Import Students button
  - Import modal with StudentRegistryUpload
  - handleDeleteStudent function
  - handleStudentsExtracted function

### 3. app/classes/create/page.tsx
**Status:** CHECK DIFFERENCES
**Action:** Compare and merge if needed

### 4. types/index.ts
**Status:** CHECK DIFFERENCES
**Action:** Merge type definitions

### 5. package.json
**Status:** MERGE REQUIRED
**Action:** Add papaparse dependency

## Success Criteria
- ✅ Can upload exam photos and get AI grading
- ✅ Can import students from CSV/photos
- ✅ Can delete students with × button
- ✅ AI summaries generate correctly
- ✅ All existing features still work
- ✅ No TypeScript errors
- ✅ All tests pass

## Rollback Plan
If merge fails:
```bash
git checkout master
git branch -D Result
# Start over with different strategy
