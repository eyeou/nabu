import { NextRequest } from 'next/server';
import { getTeacherFromRequest } from '@/lib/auth';
import { extractStudentsFromRegistry } from '@/lib/ai';

// POST /api/students/extract - Extract students from registry images
export async function POST(request: NextRequest) {
  try {
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Authentication required'
        }),
        { status: 401 }
      );
    }

    const body = await request.json();
    const { imageUrls } = body as {
      imageUrls: string[];
    };

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'At least one image URL is required'
        }),
        { status: 400 }
      );
    }

    if (imageUrls.length > 2) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Maximum 2 images allowed'
        }),
        { status: 400 }
      );
    }

    console.info('🧠 Extracting students from registry images...');
    const result = await extractStudentsFromRegistry({ imageUrls });
    console.info(`✅ Extracted ${result.students.length} students`);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        message: `Successfully extracted ${result.students.length} student${result.students.length > 1 ? 's' : ''}`
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Extract students error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to extract students from registry'
      }),
      { status: 500 }
    );
  }
}
