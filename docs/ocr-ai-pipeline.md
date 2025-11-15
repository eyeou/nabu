# OCR → AI analysis pipeline

This document explains how exam photos become structured data and actionable AI summaries. It is intended for agents working on the codebase so they know which hooks to touch, how to expand the pipeline, and where to expect side effects.

## High-level intent

1. A teacher uploads every scanned exam page from the *Programs → Lessons* modal.
2. The backend sends each image to GPT‑4.1 via the Blackbox AI chat completions endpoint to:
   * OCR the content,
   * Infer the correct answer per question,
   * Award points,
   * Provide short feedback by question and grade-level context.
3. We store each exam (`Assessment`) and the **student’s graded attempt** (`StudentAssessment`) in Postgres (Supabase) via Prisma.
4. We update the student’s `StudentLessonStatus` and regenerate the AI summary (strengths/weaknesses/recommendations) using the same analyzed data.

## Key files and responsibilities

| File | Role |
| --- | --- |
| `lib/ai.ts` | Contains the Blackbox client, `analyzeAndGradeExamImage`, the student analysis prompt, and helpers for combining multiple page results. Prompts are in French and focus on copy corrections. |
| `app/api/exams/upload/route.ts` | Entry point for exam uploads. Supports multiple `imageUrl`/`imageDataUrl` entries, logs each step, persists assessments, and triggers summary regeneration. |
| `app/api/summaries/generate/route.ts` | Regenerates `StudentSummary` rows by calling `generateStudentAnalysisFromLLM` with lesson statuses plus the most recent assessment data. |
| `app/programs/[programId]/page.tsx` | UI modal for lesson uploads; allows selecting a class/student and uploading multiple files at once. |
| `app/students/[studentId]/page.tsx` | Displays the latest AI summary and exam cards so teachers can verify the generated outputs. |
| `app/classes/[classId]/page.tsx` | Fetches enriched student details on modal open to present AI insights and exam reviews. |
| `lib/prisma.ts` | Controls logging levels: only warn/error by default; enable `PRISMA_DEBUG=true` to see queries. |

## Data model changes

Added two tables:

* `Assessment` (lesson ↔ exam metadata + raw AI output in `extractedData`).
* `StudentAssessment` (joins assessment + student with graded responses).

Each `StudentAssessment.gradedResponses` stores the per-question JSON returned by the multimodal model so the UI can reference question text, corrections, feedback, and awarded points.

## Upload flow (detailed)

1. **UI**: User selects class/student, picks one or multiple images, clicks *Upload & analyze*. The form sends `lessonId`, optional `classId`/`studentId`, `providedStudentName`, and an array of data‑URLs (`imageDataUrls`) to `/api/exams/upload`.
2. **API**: The route validates auth, lesson ownership, and image payload. It loops through each image, calling `analyzeAndGradeExamImage` (vision-enabled Blackbox request). Each call returns a structured JSON with questions, corrections, and the stated score on the copy.
3. **Merging**: `mergeExamAnalyses` concatenates question arrays, keeps the first declared `overallScore`/`maxScore`, and aggregates raw OCR text for traceability.
4. **Persistence**:
   * Creates `Assessment` record (source image URLs, extracted text/questions).
   * Creates `StudentAssessment` (student link, detected name, graded responses).
   * Upserts `StudentLessonStatus` with the provided score + notes referencing question-level feedback.
5. **LLM summary**: Calls `regenerateStudentSummaries`, which loads the student with lesson statuses and the last few assessments. `generateStudentAnalysisFromLLM` receives:
   * French system prompt forcing analysis from student copies.
   * Context object containing `lessons` (mastery/score) and `recentAssessments` (question breakdown).
   * The model must return { strengths, weaknesses, recommendations } in French, referencing copy errors.
6. **UI updates**: The new summary and exam cards show on the student profile and class modal automatically after each upload.

## Logging and observability

* The API logs every step with emojis (`📥`, `🧠`, `👤`, `🗂️`, `📊`, `🧾`, `✨`, `💥`). These appear in the terminal for easy tracing (unless Prisma logs are re-enabled).  
* Prisma logs are suppressed to avoid overwhelming the console; set `PRISMA_DEBUG=true` for development tracing.

## Environment variables

* `BLACKBOX_API_KEY`, `BLACKBOX_API_BASE_URL`, `BLACKBOX_TEXT_MODEL`, `BLACKBOX_VISION_MODEL`: configure the Blackbox/OpenAI-compatible client.  
* `PRISMA_DEBUG`: when `true`, Prisma logs queries in addition to warn/error.

## Testing

* Run `npm run lint` after editing any file mentioned above (existing `<img>` warnings remain).  
* Manual test: upload multi-page image via the Programs modal; verify `/api/exams/upload` logs each page, the student record receives the assessment, and the AI summary updates.

## Contribution notes

* To add new fields to the AI prompt, edit `lib/ai.ts` and ensure the JSON schema still contains `strengths`, `weaknesses`, and `recommendations`.  
* When modifying `app/api/exams/upload/route.ts`, preserve the logging order (upload → OCR → student resolve → save → summary) so shell traces remain readable.  
* Always regenerate summaries immediately after writing new assessments; otherwise the student profile will show stale data.  
* If you need to store actual image files (Supabase storage), send the resulting URLs via `imageUrls` or `imageDataUrls` and keep the rest of the pipeline untouched.

