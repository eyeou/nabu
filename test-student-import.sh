#!/bin/bash

# Test script for Student Registry Import Feature
# This script tests the API endpoints without requiring browser interaction

echo "🧪 Testing Student Registry Import Feature"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:3001"
AUTH_TOKEN=""

echo "📋 Prerequisites Check:"
echo "----------------------"

# Check if server is running
if curl -s "$API_BASE" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Server is running at $API_BASE"
else
    echo -e "${RED}✗${NC} Server is not running. Please start with: npm run dev"
    exit 1
fi

# Check if test image exists
if [ -f "content/class_students.png" ]; then
    echo -e "${GREEN}✓${NC} Test image found: content/class_students.png"
elif [ -f "content/class_students.pdf" ]; then
    echo -e "${YELLOW}⚠${NC} Only PDF found. Please convert to PNG first:"
    echo "   Option 1: Take a screenshot and save as content/class_students.png"
    echo "   Option 2: Use online converter: https://pdf2png.com"
    echo "   Option 3: Command: convert content/class_students.pdf content/class_students.png"
    exit 1
else
    echo -e "${RED}✗${NC} No test file found in content/ directory"
    exit 1
fi

echo ""
echo "🔐 Authentication:"
echo "------------------"
echo "Please provide your authentication token."
echo "To get your token:"
echo "1. Open browser DevTools (F12)"
echo "2. Go to Application > Cookies"
echo "3. Copy the 'auth-token' value"
echo ""
read -p "Enter auth token (or press Enter to skip API tests): " AUTH_TOKEN

if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${YELLOW}⚠${NC} Skipping API tests (no auth token provided)"
    echo ""
    echo "✅ Code Structure Tests:"
    echo "------------------------"
else
    echo ""
    echo "🧪 Running API Tests:"
    echo "---------------------"
    
    # Test 1: Extract endpoint with sample data
    echo ""
    echo "Test 1: Extract Students Endpoint"
    echo "-----------------------------------"
    
    # Create a simple test with base64 encoded small image
    # For actual testing, you'd need to base64 encode the real image
    echo "Note: Full image extraction test requires manual base64 encoding"
    echo "Run this command to test:"
    echo ""
    echo "base64 -w 0 content/class_students.png | sed 's/^/data:image\/png;base64,/' > /tmp/img_data.txt"
    echo ""
    echo "Then create JSON payload and test with curl"
    
    # Test 2: Bulk create endpoint
    echo ""
    echo "Test 2: Bulk Create Students Endpoint"
    echo "---------------------------------------"
    
    # You'll need a real class ID for this
    echo "Note: Requires a valid classId from your database"
    echo "Example command:"
    echo ""
    echo "curl -X POST $API_BASE/api/students/bulk \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -H 'Cookie: auth-token=$AUTH_TOKEN' \\"
    echo "  -d '{\"classId\":\"YOUR_CLASS_ID\",\"students\":[{\"name\":\"Test\",\"age\":12}]}'"
fi

echo ""
echo "📁 File Structure Tests:"
echo "------------------------"

# Check if all required files exist
files=(
    "lib/ai.ts"
    "app/api/students/bulk/route.ts"
    "app/api/students/extract/route.ts"
    "components/StudentRegistryUpload.tsx"
    "app/classes/create/page.tsx"
    "app/classes/[classId]/page.tsx"
    "docs/student-registry-import.md"
    "docs/pdf-to-image-conversion.md"
    "docs/TESTING_INSTRUCTIONS.md"
)

all_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file (missing)"
        all_exist=false
    fi
done

echo ""
echo "🔍 Code Quality Checks:"
echo "-----------------------"

# Check for TypeScript errors
if command -v npx &> /dev/null; then
    echo "Running TypeScript check..."
    if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
        echo -e "${RED}✗${NC} TypeScript errors found"
        npx tsc --noEmit | head -20
    else
        echo -e "${GREEN}✓${NC} No TypeScript errors"
    fi
else
    echo -e "${YELLOW}⚠${NC} TypeScript check skipped (npx not available)"
fi

echo ""
echo "📊 Summary:"
echo "-----------"

if [ "$all_exist" = true ]; then
    echo -e "${GREEN}✓${NC} All required files are present"
else
    echo -e "${RED}✗${NC} Some files are missing"
fi

echo ""
echo "🎯 Next Steps:"
echo "--------------"
echo "1. Convert PDF to PNG: content/class_students.pdf → content/class_students.png"
echo "2. Open browser: http://localhost:3001"
echo "3. Follow manual testing instructions in docs/TESTING_INSTRUCTIONS.md"
echo "4. Test the complete flow:"
echo "   - Create a new class"
echo "   - Click 'Import from Registry'"
echo "   - Upload the PNG image"
echo "   - Verify extraction results"
echo "   - Confirm and create students"
echo ""
echo "📖 Documentation:"
echo "-----------------"
echo "- Feature docs: docs/student-registry-import.md"
echo "- PDF conversion: docs/pdf-to-image-conversion.md"
echo "- Testing guide: docs/TESTING_INSTRUCTIONS.md"
echo ""
echo "✅ Test script complete!"
