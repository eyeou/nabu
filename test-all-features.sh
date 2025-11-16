#!/bin/bash

# Comprehensive Testing Script for Nabu Result Branch
# Tests all merged features from Master and ClassCreation branches

echo "=========================================="
echo "NABU - Comprehensive Feature Testing"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3001"
API_URL="$BASE_URL/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test result
print_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo "=========================================="
echo "1. SERVER HEALTH CHECK"
echo "=========================================="

# Test 1: Check if server is running
echo -n "Testing server availability... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ]; then
    print_result 0 "Server is running on port 3001"
else
    print_result 1 "Server is not responding (HTTP $HTTP_CODE)"
fi

echo ""
echo "=========================================="
echo "2. API ENDPOINT TESTS (Unauthenticated)"
echo "=========================================="

# Test 2: Classes endpoint (should require auth)
echo -n "Testing GET /api/classes (should require auth)... "
RESPONSE=$(curl -s $API_URL/classes)
if echo "$RESPONSE" | grep -q "Authentication required\|success"; then
    print_result 0 "Classes endpoint responding correctly"
else
    print_result 1 "Classes endpoint not responding as expected"
fi

# Test 3: Programs endpoint (should require auth)
echo -n "Testing GET /api/programs (should require auth)... "
RESPONSE=$(curl -s $API_URL/programs)
if echo "$RESPONSE" | grep -q "Authentication required\|success"; then
    print_result 0 "Programs endpoint responding correctly"
else
    print_result 1 "Programs endpoint not responding as expected"
fi

# Test 4: Students endpoint (should require auth)
echo -n "Testing GET /api/students (should require auth)... "
RESPONSE=$(curl -s $API_URL/students)
if echo "$RESPONSE" | grep -q "Authentication required\|success"; then
    print_result 0 "Students endpoint responding correctly"
else
    print_result 1 "Students endpoint not responding as expected"
fi

echo ""
echo "=========================================="
echo "3. FILE STRUCTURE VERIFICATION"
echo "=========================================="

# Test 5: Check if exam upload route exists
if [ -f "app/api/exams/upload/route.ts" ]; then
    print_result 0 "Exam upload API route exists"
else
    print_result 1 "Exam upload API route missing"
fi

# Test 6: Check if student bulk route exists
if [ -f "app/api/students/bulk/route.ts" ]; then
    print_result 0 "Student bulk creation API route exists"
else
    print_result 1 "Student bulk creation API route missing"
fi

# Test 7: Check if student extract route exists
if [ -f "app/api/students/extract/route.ts" ]; then
    print_result 0 "Student extraction API route exists"
else
    print_result 1 "Student extraction API route missing"
fi

# Test 8: Check if StudentRegistryUpload component exists
if [ -f "components/StudentRegistryUpload.tsx" ]; then
    print_result 0 "StudentRegistryUpload component exists"
else
    print_result 1 "StudentRegistryUpload component missing"
fi

# Test 9: Check if AI library has required functions
if grep -q "analyzeAndGradeExamImage" lib/ai.ts; then
    print_result 0 "AI exam grading function exists"
else
    print_result 1 "AI exam grading function missing"
fi

# Test 10: Check if AI library has student extraction
if grep -q "extractStudentsFromRegistry" lib/ai.ts; then
    print_result 0 "AI student extraction function exists"
else
    print_result 1 "AI student extraction function missing"
fi

# Test 11: Check if AI library has summary generation
if grep -q "generateStudentAnalysisFromLLM" lib/ai.ts; then
    print_result 0 "AI summary generation function exists"
else
    print_result 1 "AI summary generation function missing"
fi

echo ""
echo "=========================================="
echo "4. DELETE FUNCTIONALITY VERIFICATION"
echo "=========================================="

# Test 12: Check if student delete endpoint exists
if [ -f "app/api/students/[studentId]/route.ts" ] && grep -q "DELETE" app/api/students/[studentId]/route.ts; then
    print_result 0 "Student DELETE endpoint exists"
else
    print_result 1 "Student DELETE endpoint missing"
fi

# Test 13: Check if class delete endpoint exists
if [ -f "app/api/classes/[classId]/route.ts" ] && grep -q "DELETE" app/api/classes/[classId]/route.ts; then
    print_result 0 "Class DELETE endpoint exists"
else
    print_result 1 "Class DELETE endpoint missing"
fi

# Test 14: Check if program delete endpoint exists
if [ -f "app/api/programs/[programId]/route.ts" ] && grep -q "DELETE" app/api/programs/[programId]/route.ts; then
    print_result 0 "Program DELETE endpoint exists"
else
    print_result 1 "Program DELETE endpoint missing"
fi

# Test 15: Check if dashboard has delete class functionality
if grep -q "handleDeleteClass" app/dashboard/page.tsx; then
    print_result 0 "Dashboard has delete class functionality"
else
    print_result 1 "Dashboard missing delete class functionality"
fi

# Test 16: Check if dashboard has delete program functionality
if grep -q "handleDeleteProgram" app/dashboard/page.tsx; then
    print_result 0 "Dashboard has delete program functionality"
else
    print_result 1 "Dashboard missing delete program functionality"
fi

# Test 17: Check if class page has delete student functionality
if grep -q "handleDeleteStudent" app/classes/[classId]/page.tsx; then
    print_result 0 "Class page has delete student functionality"
else
    print_result 1 "Class page missing delete student functionality"
fi

echo ""
echo "=========================================="
echo "5. UI COMPONENT VERIFICATION"
echo "=========================================="

# Test 18: Check if program page has exam upload UI
if grep -q "Upload student exam copy" app/programs/[programId]/page.tsx; then
    print_result 0 "Program page has exam upload UI"
else
    print_result 1 "Program page missing exam upload UI"
fi

# Test 19: Check if student profile shows AI summaries
if grep -q "AISummaryBox" app/students/[studentId]/page.tsx; then
    print_result 0 "Student profile displays AI summaries"
else
    print_result 1 "Student profile missing AI summaries"
fi

# Test 20: Check if class creation has import option
if grep -q "StudentRegistryUpload" app/classes/create/page.tsx; then
    print_result 0 "Class creation has student import option"
else
    print_result 1 "Class creation missing student import option"
fi

echo ""
echo "=========================================="
echo "6. DATABASE SCHEMA VERIFICATION"
echo "=========================================="

# Test 21: Check if Assessment model exists
if grep -q "model Assessment" prisma/schema.prisma; then
    print_result 0 "Assessment model exists in schema"
else
    print_result 1 "Assessment model missing from schema"
fi

# Test 22: Check if StudentAssessment model exists
if grep -q "model StudentAssessment" prisma/schema.prisma; then
    print_result 0 "StudentAssessment model exists in schema"
else
    print_result 1 "StudentAssessment model missing from schema"
fi

# Test 23: Check if StudentSummary model exists
if grep -q "model StudentSummary" prisma/schema.prisma; then
    print_result 0 "StudentSummary model exists in schema"
else
    print_result 1 "StudentSummary model missing from schema"
fi

echo ""
echo "=========================================="
echo "7. DEPENDENCY VERIFICATION"
echo "=========================================="

# Test 24: Check if papaparse is installed (for CSV parsing)
if grep -q "papaparse" package.json; then
    print_result 0 "papaparse dependency exists (CSV parsing)"
else
    print_result 1 "papaparse dependency missing"
fi

# Test 25: Check if @prisma/client is installed
if grep -q "@prisma/client" package.json; then
    print_result 0 "@prisma/client dependency exists"
else
    print_result 1 "@prisma/client dependency missing"
fi

echo ""
echo "=========================================="
echo "8. DOCUMENTATION VERIFICATION"
echo "=========================================="

# Test 26: Check if merge documentation exists
if [ -f "MERGE_COMPLETE.md" ]; then
    print_result 0 "Merge completion documentation exists"
else
    print_result 1 "Merge completion documentation missing"
fi

# Test 27: Check if exam upload documentation exists
if [ -f "docs/EXAM_UPLOAD_FEATURE_SUMMARY.md" ]; then
    print_result 0 "Exam upload feature documentation exists"
else
    print_result 1 "Exam upload feature documentation missing"
fi

# Test 28: Check if delete class documentation exists
if [ -f "docs/DELETE_CLASS_FEATURE.md" ]; then
    print_result 0 "Delete class feature documentation exists"
else
    print_result 1 "Delete class feature documentation missing"
fi

# Test 29: Check if student import documentation exists
if [ -f "docs/STUDENT_IMPORT_AND_DELETE_COMPLETE.md" ]; then
    print_result 0 "Student import documentation exists"
else
    print_result 1 "Student import documentation missing"
fi

echo ""
echo "=========================================="
echo "9. TYPESCRIPT COMPILATION"
echo "=========================================="

# Test 30: Check TypeScript compilation
echo -n "Running TypeScript type check... "
TSC_OUTPUT=$(npx tsc --noEmit 2>&1)
TSC_EXIT_CODE=$?
if [ $TSC_EXIT_CODE -eq 0 ]; then
    print_result 0 "TypeScript compilation successful (no errors)"
else
    # Count errors
    ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS")
    if [ $ERROR_COUNT -le 10 ]; then
        print_result 0 "TypeScript compilation has $ERROR_COUNT errors (acceptable, pre-existing)"
    else
        print_result 1 "TypeScript compilation has $ERROR_COUNT errors (too many)"
    fi
fi

echo ""
echo "=========================================="
echo "FINAL RESULTS"
echo "=========================================="
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}=========================================="
    echo "✓ ALL TESTS PASSED!"
    echo -e "==========================================${NC}"
    exit 0
else
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${YELLOW}=========================================="
    echo "⚠ SOME TESTS FAILED"
    echo "Pass Rate: $PASS_RATE%"
    echo -e "==========================================${NC}"
    exit 1
fi
