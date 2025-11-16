# Student Registry Import - Testing Instructions

## Prerequisites
- Development server running on http://localhost:3001
- BLACKBOX_API_KEY set in .env file
- Test image file (convert content/class_students.pdf to PNG/JPG)

## Test Files Available

The feature now supports multiple formats:
- **CSV**: `content/class_students.csv` (30 students, ready to use)
- **PDF**: `content/class_students.pdf` (will be auto-converted to images)
- **Images**: Convert PDF to PNG if you want to test image-only upload

No conversion needed! You can test with any of these formats directly.

## Critical Path Test Cases

### Test 1A: Create Class with CSV Import
**Steps:**
1. Navigate to http://localhost:3001
2. Login/Signup if needed
3. Go to Dashboard
4. Click "Create New Class"
5. Enter class name: "Test Class CSV 2024"
6. Click "Create"
7. On the "Add Students" screen, click "Import from Registry"
8. Upload `content/class_students.csv`
9. Click "Extract Students"
10. Should process instantly (no AI needed)

**Expected Results:**
- ✅ File upload accepts CSV
- ✅ Instant processing (no loading delay)
- ✅ Extracts all 30 students with names and ages
- ✅ Shows preview table with all students
- ✅ All names match: Alice Martin, Lucas Bernard, Emma Dubois, etc.
- ✅ All ages are correct (12-14)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________________

---

### Test 1B: Create Class with PDF Import
**Steps:**
1. Navigate to http://localhost:3001
2. Login/Signup if needed
3. Go to Dashboard
4. Click "Create New Class"
5. Enter class name: "Test Class PDF 2024"
6. Click "Create"
7. On the "Add Students" screen, click "Import from Registry"
8. Upload `content/class_students.pdf`
9. Click "Extract Students"
10. Wait for PDF conversion + AI processing (10-15 seconds)

**Expected Results:**
- ✅ File upload accepts PDF
- ✅ Shows "Extracting..." loading state
- ✅ PDF is converted to images automatically
- ✅ Extracts students with names and ages
- ✅ Shows preview table with all students
- ✅ Names and ages are reasonably accurate

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________________

---

### Test 1C: Create Class with Image Import
**Steps:**
1. Convert PDF to PNG first (optional, for testing image-only)
2. Navigate to http://localhost:3001
3. Login/Signup if needed
4. Go to Dashboard
5. Click "Create New Class"
6. Enter class name: "Test Class Image 2024"
7. Click "Create"
8. On the "Add Students" screen, click "Import from Registry"
9. Upload the PNG/JPG image
10. Click "Extract Students"
11. Wait for AI processing (5-10 seconds)

**Expected Results:**
- ✅ File upload accepts PNG/JPG
- ✅ Shows "Extracting..." loading state
- ✅ Extracts students with names and ages
- ✅ Shows preview table with all students
- ✅ Names and ages are reasonably accurate

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________________

---

### Test 2: Edit Extracted Students
**Steps:**
1. After extraction in Test 1
2. Click on a student's name field
3. Edit the name (e.g., change "Alice Martin" to "Alice M.")
4. Click on age field
5. Change age (e.g., 14 to 15)
6. Click "Remove" on one student
7. Click "+ Add Another Student"
8. Enter a new student manually

**Expected Results:**
- ✅ Name field is editable
- ✅ Age field is editable and accepts numbers only
- ✅ Remove button deletes the student from preview
- ✅ Can add new students manually
- ✅ All changes are reflected in the preview

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________________

---

### Test 3: Confirm and Create Students
**Steps:**
1. After editing in Test 2
2. Click "Confirm & Create Students"
3. Wait for creation
4. Should redirect to class detail page

**Expected Results:**
- ✅ Shows loading state during creation
- ✅ Redirects to class detail page
- ✅ All students appear in the class
- ✅ Student count is correct
- ✅ Names and ages match what was confirmed

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________________

---

### Test 4: Import Students to Existing Class
**Steps:**
1. Navigate to an existing class detail page
2. Click "📄 Import Students" button
3. Upload image file
4. Click "Extract Students"
5. Review and confirm

**Expected Results:**
- ✅ Modal opens with upload interface
- ✅ Extraction works same as in class creation
- ✅ New students are added to existing class
- ✅ Existing students remain unchanged
- ✅ Modal closes after successful import

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________________

---

### Test 5: Error Handling - Invalid File Type
**Steps:**
1. Try to upload a TXT file
2. Try to upload a DOCX file
3. Try to upload more than 2 files

**Expected Results:**
- ✅ TXT file is rejected by file input
- ✅ DOCX file is rejected by file input
- ✅ More than 2 files shows error: "Maximum 2 files allowed"
- ✅ Error messages are clear and helpful

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________________

---

### Test 6: Edge Case - Empty/Invalid Image
**Steps:**
1. Upload a blank white image
2. Upload an image with no text
3. Upload a very blurry image

**Expected Results:**
- ✅ System handles gracefully (no crash)
- ✅ Either extracts nothing or shows fallback data
- ✅ User can still add students manually
- ✅ Clear error message if extraction fails

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________________

---

### Test 7: Validation - Required Fields
**Steps:**
1. Extract students
2. Clear a student's name field
3. Try to confirm

**Expected Results:**
- ✅ Shows error: "At least one student with a name is required"
- ✅ Cannot proceed without valid names
- ✅ Age field is optional (can be empty)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________________

---

## API Endpoint Testing (Optional)

### Test Extract Endpoint
```bash
# First, get an auth token by logging in
# Then test the extract endpoint

# Create a base64 image data URL from your PNG
base64 -w 0 content/class_students.png > /tmp/image_base64.txt

# Create test payload
cat > /tmp/test_extract.json << 'EOF'
{
  "imageUrls": ["data:image/png;base64,<paste_base64_here>"]
}
EOF

# Test the endpoint
curl -X POST http://localhost:3001/api/students/extract \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=<your_token>" \
  -d @/tmp/test_extract.json
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "students": [
      {"name": "Alice Martin", "age": 14},
      {"name": "Lucas Bernard", "age": 14},
      ...
    ],
    "rawText": "...",
    "detectedFormat": "..."
  },
  "message": "Successfully extracted 30 students"
}
```

---

### Test Bulk Create Endpoint
```bash
curl -X POST http://localhost:3001/api/students/bulk \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=<your_token>" \
  -d '{
    "classId": "<your_class_id>",
    "students": [
      {"name": "Test Student 1", "age": 12},
      {"name": "Test Student 2", "age": 13}
    ]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Test Student 1",
      "age": 12,
      "classId": "...",
      ...
    },
    ...
  ],
  "message": "Successfully created 2 students"
}
```

---

## Performance Testing

### Test with Large Image
1. Create a high-resolution image (5MB+)
2. Upload and measure extraction time
3. Should complete within 30 seconds

### Test with Many Students
1. Create an image with 50+ students
2. Verify all are extracted
3. Verify bulk creation handles large batches

---

## Test Results Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| Test 1A: CSV Import | ⬜ | |
| Test 1B: PDF Import | ⬜ | |
| Test 1C: Image Import | ⬜ | |
| Test 2: Edit Extracted Students | ⬜ | |
| Test 3: Confirm and Create | ⬜ | |
| Test 4: Import to Existing Class | ⬜ | |
| Test 5: Invalid File Type | ⬜ | |
| Test 6: Empty/Invalid Image | ⬜ | |
| Test 7: Required Fields | ⬜ | |

**Overall Status:** ⬜ Pass / ⬜ Fail

**Issues Found:**
1. _______________________
2. _______________________
3. _______________________

**Recommendations:**
1. _______________________
2. _______________________
3. _______________________

---

## Known Limitations

1. **File Limit**: Maximum 2 files per upload
2. **CSV Format**: Must have "Name" and optionally "Age" columns (case-insensitive)
3. **PDF Processing**: Requires client-side PDF.js library (included automatically)
4. **API Dependency**: Images and PDFs require BLACKBOX_API_KEY for AI extraction
5. **Fallback Mode**: Without API key, returns 3 sample students for images/PDFs
6. **CSV Independence**: CSV parsing works without API key (instant processing)

---

## Next Steps After Testing

1. Document any bugs found
2. Create issues for improvements
3. Update user documentation based on findings
4. Test with various CSV formats and delimiters
5. Test PDF quality and extraction accuracy
