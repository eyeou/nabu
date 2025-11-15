import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';

// POST /api/summaries/generate - Generate AI student summary (placeholder)
export async function POST(request: NextRequest) {
  try {
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Student ID is required'
      }), { status: 400 });
    }

    // Verify student exists and teacher has access
    const student = await prisma.student.findFirst({
      where: { id: studentId },
      include: {
        class: {
          select: { teacherId: true }
        },
        lessonStatuses: {
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
                testData: true
              }
            }
          }
        }
      }
    });

    if (!student || student.class.teacherId !== teacher.teacherId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Student not found or access denied'
      }), { status: 404 });
    }

    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate placeholder summaries based on lesson statuses
    const strengths = generateStrengthSummary(student.lessonStatuses);
    const weaknesses = generateWeaknessSummary(student.lessonStatuses);
    const recommendations = generateRecommendations(student.lessonStatuses);

    // Save summaries to database
    const summaryPromises = [
      {
        subject: 'strengths',
        bulletPoints: strengths
      },
      {
        subject: 'weaknesses',
        bulletPoints: weaknesses
      },
      {
        subject: 'recommendations',
        bulletPoints: recommendations
      }
    ].map(({ subject, bulletPoints }) =>
      prisma.studentSummary.upsert({
        where: {
          studentId_subject: {
            studentId,
            subject
          }
        },
        update: {
          bulletPointsJson: JSON.stringify(bulletPoints)
        },
        create: {
          studentId,
          subject,
          bulletPointsJson: JSON.stringify(bulletPoints)
        }
      })
    );

    const summaries = await Promise.all(summaryPromises);

    return new Response(JSON.stringify({
      success: true,
      data: summaries,
      message: 'Student summaries generated successfully'
    }), { status: 200 });

  } catch (error) {
    console.error('Generate summary error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to generate student summaries'
    }), { status: 500 });
  }
}

// Helper functions for generating placeholder AI summaries
function generateStrengthSummary(lessonStatuses: any[]) {
  const completedLessons = lessonStatuses.filter(status => 
    ['completed', 'mastered'].includes(status.masteryLevel)
  );
  
  if (completedLessons.length === 0) {
    return [
      'Shows willingness to engage with new material',
      'Demonstrates potential for growth',
      'Has a positive attitude towards learning'
    ];
  }

  const strengths = [
    `Successfully completed ${completedLessons.length} lesson${completedLessons.length > 1 ? 's' : ''}`,
    'Shows consistent progress in understanding core concepts',
    'Demonstrates good retention of learned material'
  ];

  const masteredLessons = completedLessons.filter(status => status.masteryLevel === 'mastered');
  if (masteredLessons.length > 0) {
    strengths.push(`Achieved mastery level in ${masteredLessons.length} area${masteredLessons.length > 1 ? 's' : ''}`);
  }

  return strengths;
}

function generateWeaknessSummary(lessonStatuses: any[]) {
  const strugglingLessons = lessonStatuses.filter(status => 
    status.masteryLevel === 'not_started' || (status.score && status.score < 70)
  );

  if (strugglingLessons.length === 0) {
    return [
      'No significant areas of concern identified',
      'May benefit from more challenging material',
      'Consider advanced topics to maintain engagement'
    ];
  }

  return [
    `Needs additional support in ${strugglingLessons.length} lesson area${strugglingLessons.length > 1 ? 's' : ''}`,
    'May benefit from alternative learning approaches',
    'Consider breaking down complex concepts into smaller steps',
    'Additional practice time may help solidify understanding'
  ];
}

function generateRecommendations(lessonStatuses: any[]) {
  const inProgressLessons = lessonStatuses.filter(status => status.masteryLevel === 'in_progress');
  const notStartedLessons = lessonStatuses.filter(status => status.masteryLevel === 'not_started');

  const recommendations = [];

  if (notStartedLessons.length > 0) {
    recommendations.push(
      `Focus on starting ${Math.min(notStartedLessons.length, 3)} pending lesson${notStartedLessons.length > 1 ? 's' : ''}`,
      'Establish a consistent study schedule'
    );
  }

  if (inProgressLessons.length > 0) {
    recommendations.push(
      'Continue current lesson progress with regular check-ins',
      'Use varied teaching methods to reinforce learning'
    );
  }

  recommendations.push(
    'Provide regular positive feedback to maintain motivation',
    'Consider peer learning opportunities',
    'Track progress with visual learning tools'
  );

  return recommendations.slice(0, 5); // Limit to 5 recommendations
}