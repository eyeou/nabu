# OCR → AI analysis pipeline

This document explains how exam photos become structured data and actionable AI summaries. It is intended for agents working on the codebase so they know which hooks to touch, how to expand the pipeline, and where to expect side effects.

## High-level intent

1. A teacher selects the relevant class then uploads up to 30 scanned pages of graded copies from the *Programs → Lessons* modal (no per-student form input).
2. The backend sends each image to GPT‑4.1 via the Blackbox AI chat completions endpoint to:
   * OCR the content,
   * Transcribe the exact student name + grade text written on the copy,
   * Capture teacher comments per question,
   * Produce targeted advice / program sections to review (without recomputing a score — the grade is always extracted verbatim from the teacher’s annotation, never recalculated per page).
3. We store each exam (`Assessment`) and the **student’s graded attempt** (`StudentAssessment`) in Postgres (Supabase) via Prisma.
4. We update the student’s `StudentLessonStatus` and regenerate the AI summary (strengths/weaknesses/recommendations) using the same analyzed data.

## Key files and responsibilities

| File | Role |
| --- | --- |
| `lib/ai.ts` | Contains the Blackbox client, `analyzeAndGradeExamImage`, the student analysis prompt, and helpers for combining multiple page results. Prompts are in French and focus on copy corrections + program guidance. |
| `lib/copy-insights.ts` | Shared parser for `gradedResponses` JSON (grade text, advice summary, program recommendations, per-question notes). Used by both API + UI. |
| `app/api/exams/upload/route.ts` | Entry point for exam uploads. Groups analyzed pages by detected student name, auto-creates students inside the selected class when needed, persists assessments, and triggers summary regeneration. |
| `app/api/summaries/generate/route.ts` | Regenerates `StudentSummary` rows by calling `generateStudentAnalysisFromLLM` with lesson statuses plus the most recent assessment data. |
| `app/programs/[programId]/page.tsx` | UI modal for lesson uploads; teacher picks a class, drops up to 30 images, and AI handles student assignment automatically. |
| `app/students/[studentId]/page.tsx` | Displays the latest AI summary plus the detected grade text and copy-specific advice. |
| `app/classes/[classId]/page.tsx` | Fetches enriched student details on modal open to present AI insights and exam reviews with the same insight layout. |
| `lib/prisma.ts` | Controls logging levels: only warn/error by default; enable `PRISMA_DEBUG=true` to see queries. |

## Data model changes

Added two tables:

* `Assessment` (lesson ↔ exam metadata + raw AI output in `extractedData`).
* `StudentAssessment` (joins assessment + student with graded responses).

Each `StudentAssessment.gradedResponses` stores the JSON returned by the multimodal model so the UI can reference the detected grade text, the advice/program recommendations, and the per-question notes (student answer, teacher comment, improvement advice, optional awarded points).

## Upload flow (detailed)

1. **UI**: Teacher selects the class, picks one lesson, drags every scanned page, and clicks *Upload & analyze*. Payload = `{ lessonId, classId, imageDataUrls[] }`.
2. **API (per page)**: `/api/exams/upload` valide l’authentification/lesson, puis envoie toutes les images en parallèle (concurrence configurable via `EXAM_OCR_CONCURRENCY`, 3 par défaut) vers `analyzeAndGradeExamImage`. Chaque réponse contient le nom détecté, la note relevée, les conseils et les retours par question. La note est strictement extraite depuis l’annotation du professeur (souvent sur 20) : aucune moyenne ni recalcul par copie n’est effectué.
3. **Grouping**: Pages are bucketed by normalized student name so that all documents detected for the same student/lesson are merged into a single exam attempt. `mergeExamAnalyses` concatène les questions, fusionne les conseils/recommandations et assemble la trace OCR.
4. **Student resolution**: We attempt to match the detected name (case-insensitive) against existing students owned by the teacher. If no match is found we create a new student in the selected class.
5. **Persistence**:
   * `Assessment` stores lesson linkage, the concatenated `sourceImageUrl`, and the extracted metadata (grade text, advice arrays, per-question data).
   * `StudentAssessment` links the student + assessment and persists the same JSON in `gradedResponses`.
   * `StudentLessonStatus` records the detected grade (numeric parsing when possible) and short notes built from the top improvement advice.
6. **LLM summary**: `regenerateStudentSummaries` reloads lesson statuses + the latest assessments (parsed with `lib/copy-insights.ts`) and calls `generateStudentAnalysisFromLLM`, which outputs `{ strengths, weaknesses, recommendations }` strictly tied to copy evidence.
7. **UI updates**: Once the API responds, the modal lists every processed student (grade text + summaries), and the student/class pages reflect the refreshed insight cards automatically.

## Logging and observability

* The API logs every step with emojis (`📥`, `🧠`, `👤`, `🗂️`, `📊`, `🧾`, `✨`, `💥`). These appear in the terminal for easy tracing (unless Prisma logs are re-enabled).  
* Prisma logs are suppressed to avoid overwhelming the console; set `PRISMA_DEBUG=true` for development tracing.

## Environment variables

* `BLACKBOX_API_KEY`, `BLACKBOX_API_BASE_URL`, `BLACKBOX_TEXT_MODEL`, `BLACKBOX_VISION_MODEL`: configure the Blackbox/OpenAI-compatible client.  
* `EXAM_OCR_CONCURRENCY`: nombre maximum de copies analysées simultanément (par défaut 3).  
* `PRISMA_DEBUG`: when `true`, Prisma logs queries in addition to warn/error.

## Testing

* Run `npm run lint` after editing any file mentioned above (existing `<img>` warnings remain).  
* Manual test: upload a batch of pages for several students via the Programs modal; verify `/api/exams/upload` logs every page, groups them by detected name, auto-creates missing students inside the chosen class, and that each related student profile shows the new grade text + summaries.

## Contribution notes

* To add new fields to the AI prompt, edit `lib/ai.ts` and ensure the JSON schema still contains `strengths`, `weaknesses`, and `recommendations`.  
* When modifying `app/api/exams/upload/route.ts`, preserve the logging order (upload → OCR → student resolve → save → summary) so shell traces remain readable.  
* Always regenerate summaries immediately after writing new assessments; otherwise the student profile will show stale data.  
* If you need to store actual image files (Supabase storage), send the resulting URLs via `imageUrls` or `imageDataUrls` and keep the rest of the pipeline untouched (the downstream JSON contract `{ gradeText, adviceSummary[], programRecommendations[], questions[] }` must remain stable).

