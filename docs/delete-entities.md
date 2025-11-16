# Delete Classes, Programs & Lessons

This document summarizes the new destructive actions available in the dashboard.

## Classes
- Navigate to `Classes → select a class`.
- The header now exposes a `Supprimer la classe` button next to the existing actions.
- Confirmation text reminds teachers that every student belonging to the class will be removed.
- On success the UI redirects to `dashboard?view=classes`. Errors remain inline under the action buttons.

## Programs
- Open any program from the dashboard.
- The header contains a `Supprimer le programme` button. Deleting a program removes every lesson and assessment tied to it.
- Errors are surfaced inline under the actions. Success redirects back to the programs list.

## Lessons
- Inside a program page, each lesson circle shows a red × icon on hover/tap. Clicking it deletes the lesson after confirmation.
- The lesson modal also provides a `Supprimer la leçon` button so teachers can delete while reviewing uploads.
- When a lesson disappears, open modals close automatically and the grid updates without a refetch.

## API Reference
- `DELETE /api/classes/:classId`
- `DELETE /api/programs/:programId`
- `DELETE /api/lessons/:lessonId`
All endpoints require an authenticated teacher and enforce ownership before removing data.

## QA Checklist
1. Create a throwaway class/program/lesson.
2. Trigger each delete action and confirm the redirect/state updates.
3. Attempt a second delete on the same resource to verify the 404/inline error.
4. Refresh the dashboard to ensure the removed entities no longer appear.


