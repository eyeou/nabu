import { ProgramGraph } from "@/components/ProgramGraph";
import { LessonEditor } from "@/components/LessonEditor";
import Link from "next/link";

const placeholderLessons = [
  {
    id: "lesson-1",
    programId: "placeholder-program",
    title: "Number Sense",
    description: "Introduce multi-digit numbers",
    orderIndex: 1,
    testData: "",
  },
  {
    id: "lesson-2",
    programId: "placeholder-program",
    title: "Fractions",
    description: "Visual fraction models",
    orderIndex: 2,
    testData: "",
  },
];

const placeholderLinks = [
  {
    id: "link-1",
    fromLessonId: "lesson-1",
    toLessonId: "lesson-2",
    relationType: "prerequisite",
  },
];

export default async function ProgramDetailPage({
  params,
}: {
  params: { programId: string };
}) {
  const program = {
    id: params.programId,
    title: "Placeholder Program",
    description: "Example program to demonstrate lesson relationships.",
    lessons: placeholderLessons,
  };

  const links = placeholderLinks;

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-800">{program.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{program.description}</p>
        </div>
        <ProgramGraph lessons={program.lessons} links={links} />
        <Link href="/dashboard" className="text-sm font-medium text-indigo-600">
          ← Back to dashboard
        </Link>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Lesson Editor</h2>
        <p className="mt-1 text-xs text-slate-500">Select a lesson to edit its content or add assessments.</p>
        <div className="mt-4">
          <LessonEditor
            lesson={program.lessons[0] ?? null}
            onSave={async () => {
              "use server";
            }}
          />
        </div>
      </div>
    </div>
  );
}
