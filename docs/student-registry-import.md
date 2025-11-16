# Student Registry Import Feature

## Overview

The Student Registry Import feature allows teachers to automatically create multiple students by uploading photos or PDFs of class registries. The system uses AI-powered OCR to extract student names and ages from the documents.

## Features

### 1. AI-Powered Extraction
- Uses BLACKBOX vision model for intelligent OCR
- Extracts student names and ages automatically
- Handles various document formats (handwritten, printed, tables, forms)
- Supports multiple languages and formats

### 2. Multi-Format Support
- **Images**: JPG, JPEG, PNG (AI extraction)
- **Documents**: PDF (converted to images, then AI extraction)
- **Spreadsheets**: CSV (instant parsing, no AI needed)
- **Pages**: Up to 2 files per upload

### 3. Review & Edit Interface
- Preview all extracted students before creation
- Edit names and ages
- Add additional students manually
- Remove incorrect extractions
- Validation for required fields

### 4. Flexible Integration
- Available during class creation (multi-step flow)
- Available on existing class pages (import button)
- Can skip and add students later
- Manual addition still available

## User Flow

### During Class Creation

1. **Create Class**
   - Enter class name
   - Click "Create"

2. **Add Students Options**
   - Choose "Import from Registry" or "Add Students Later"
   - If importing, proceed to upload

3. **Upload Registry**
   - Select up to 2 files (JPG, PNG, PDF, or CSV)
   - Click "Extract Students"
   - Wait for processing:
     - CSV: Instant parsing
     - PDF: Converted to images, then AI extraction
     - Images: Direct AI extraction

4. **Review & Edit**
   - Review extracted student list
   - Edit names/ages as needed
   - Add or remove students
   - Click "Confirm & Create Students"

5. **Complete**
   - Students are created in bulk
   - Redirected to class page

### On Existing Class

1. **Open Class Page**
   - Navigate to class detail page

2. **Import Students**
   - Click "📄 Import Students" button
   - Modal opens with upload interface

3. **Upload & Extract**
   - Follow same upload process as above

4. **Confirm**
   - Students are added to existing class
   - Modal closes and list refreshes

## Technical Implementation

### Backend Components

#### 1. AI Extraction Function (`lib/ai.ts`)

```typescript
export async function extractStudentsFromRegistry(params: {
  imageUrls: string[];
}): Promise<StudentRegistryExtractionResult>
```

**Features:**
- Accepts array of image data URLs
- Uses vision model for OCR
- Returns structured student data
- Includes fallback for missing credentials

**Response Format:**
```json
{
  "students": [
    { "name": "John Doe", "age": 10 },
    { "name": "Jane Smith", "age": 11 }
  ],
  "rawText": "Extracted text...",
  "detectedFormat": "Table format"
}
```

#### 2. Extract API Endpoint (`/api/students/extract`)

**Method:** POST

**Request Body:**
```json
{
  "imageUrls": ["data:image/jpeg;base64,..."]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "students": [...],
    "rawText": "...",
    "detectedFormat": "..."
  },
  "message": "Successfully extracted N students"
}
```

**Validation:**
- Requires authentication
- Maximum 2 images
- Valid image URLs required

#### 3. Bulk Create API Endpoint (`/api/students/bulk`)

**Method:** POST

**Request Body:**
```json
{
  "classId": "class-id",
  "students": [
    { "name": "John Doe", "age": 10 },
    { "name": "Jane Smith", "age": 11 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [...created students...],
  "message": "Successfully created N students"
}
```

**Features:**
- Verifies class ownership
- Creates all students in transaction
- Validates all student names
- Returns created student records

### Frontend Components

#### 1. StudentRegistryUpload Component

**Location:** `components/StudentRegistryUpload.tsx`

**Props:**
```typescript
interface StudentRegistryUploadProps {
  onStudentsExtracted: (students: ExtractedStudent[]) => void;
  onCancel?: () => void;
}
```

**Features:**
- File upload with validation
- AI extraction trigger
- Preview/edit interface
- Add/remove students
- Loading states
- Error handling

**States:**
- Upload view (file selection)
- Extracting view (loading)
- Preview view (edit interface)

#### 2. Enhanced Class Creation Page

**Location:** `app/classes/create/page.tsx`

**Flow:**
1. `class-info` - Enter class name
2. `add-students` - Choose import or skip
3. `upload-registry` - Upload and extract

**Features:**
- Multi-step wizard
- State management
- Navigation between steps
- Bulk student creation

#### 3. Class Detail Page Enhancement

**Location:** `app/classes/[classId]/page.tsx`

**Added:**
- "Import Students" button
- Import modal
- Bulk creation handler
- List refresh after import

## API Reference

### POST /api/students/extract

Extract students from registry images.

**Authentication:** Required

**Request:**
```json
{
  "imageUrls": string[] // Max 2, base64 data URLs
}
```

**Response:**
```json
{
  "success": boolean,
  "data": {
    "students": Array<{ name: string, age?: number }>,
    "rawText": string,
    "detectedFormat": string
  },
  "message": string
}
```

**Errors:**
- 401: Authentication required
- 400: Invalid request (missing/too many images)
- 500: Extraction failed

### POST /api/students/bulk

Create multiple students at once.

**Authentication:** Required

**Request:**
```json
{
  "classId": string,
  "students": Array<{
    name: string,
    age?: number
  }>
}
```

**Response:**
```json
{
  "success": boolean,
  "data": Student[],
  "message": string
}
```

**Errors:**
- 401: Authentication required
- 400: Invalid request (missing classId, empty students, invalid names)
- 404: Class not found or access denied
- 500: Creation failed

## Error Handling

### Client-Side
- File type validation
- File count validation (max 2)
- Name validation (required)
- Age validation (1-100)
- Network error handling
- User-friendly error messages

### Server-Side
- Authentication checks
- Class ownership verification
- Input validation
- Transaction rollback on failure
- Detailed error logging
- Fallback responses

## Performance Considerations

### Optimization
- Client-side file conversion (reduces server load)
- Bulk creation in single transaction (atomic)
- Maximum 2 files (prevents timeout)
- Efficient state management

### Limitations
- File size: Limited by browser memory
- Processing time: ~5-10 seconds per page
- Concurrent requests: Rate-limited by AI API
- Maximum students: No hard limit, but UI optimized for <100

## Security

### Authentication
- All endpoints require valid JWT token
- Teacher ID extracted from token

### Authorization
- Class ownership verified before operations
- Students can only be added to owned classes

### Validation
- File type whitelist (PDF, JPG, PNG)
- Input sanitization for names
- Age range validation (1-100)
- SQL injection prevention (Prisma)

### Data Privacy
- Images processed in memory (not stored)
- No permanent storage of uploaded files
- Student data encrypted in database

## Testing

### Unit Tests (Recommended)
- AI extraction function
- Bulk creation logic
- Validation functions
- Error handling

### Integration Tests (Recommended)
- API endpoints
- Authentication flow
- Database transactions
- Error scenarios

### Manual Testing
- Various document formats
- Different handwriting styles
- Edge cases (empty, invalid data)
- UI/UX flow
- Error messages
- Loading states

## Future Enhancements

### Potential Features
1. **CSV Import**: Direct CSV file upload
2. **Photo Extraction**: Extract student photos from registry
3. **Duplicate Detection**: Warn about existing students
4. **Batch Editing**: Edit multiple students at once
5. **Import History**: Track all imports with rollback
6. **Template Download**: Provide CSV template
7. **Multi-Page Support**: Support more than 2 pages
8. **Progress Indicator**: Show extraction progress
9. **Auto-Save**: Save draft extractions
10. **Export**: Export student list to CSV/PDF

### Performance Improvements
1. Parallel processing for multiple pages
2. Caching for repeated extractions
3. Compression for large files
4. Streaming for real-time updates

## Troubleshooting

### Common Issues

**Issue:** Extraction returns empty or incorrect data
- **Solution:** Ensure document is clear and readable
- **Solution:** Try different file format (PDF vs image)
- **Solution:** Check BLACKBOX_API_KEY is set

**Issue:** "Authentication required" error
- **Solution:** Ensure user is logged in
- **Solution:** Check JWT token is valid
- **Solution:** Refresh the page

**Issue:** "Class not found" error
- **Solution:** Verify class exists
- **Solution:** Check user owns the class
- **Solution:** Refresh class list

**Issue:** Slow extraction
- **Solution:** Reduce file size
- **Solution:** Use single page instead of two
- **Solution:** Check network connection

## Support

For issues or questions:
1. Check this documentation
2. Review TODO.md for known issues
3. Check console logs for errors
4. Verify API credentials are set
5. Test with sample documents first
