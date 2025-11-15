import { ProgramGraph } from "@/components/ProgramGraph";
import { AISummaryBox } from "@/components/AISummaryBox";

const placeholderSummaries = [
  {
    id: "summary-math",
    subject: "Math",
    bulletPoints: ["Understands equivalent fractions", "Needs practice with multi-step problems"],
  },
  {
    id: "summary-french",
    subject: "French",
    bulletPoints: ["Improving vocabulary", "Reading comprehension at grade level"],
  },
  {
    id: "summary-other",
    subject: "Other Focus",
    bulletPoints: ["Enjoys project-based learning", "Responds well to visual aids"],
  },
];

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

const placeholderStudent = {
  id: "placeholder-student",
  name: "Avery Johnson",
  age: 13,
  className: "Placeholder Class",
};

export default async function StudentPage({
  params,
}: {
  params: { studentId: string };
}) {
  const student = { ...placeholderStudent, id: params.studentId };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
        <div className="flex-shrink-0">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 text-2xl font-semibold text-indigo-600">
            {student.name.charAt(0)}
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-slate-800">{student.name}</h1>
          <p className="text-sm text-slate-500">Age {student.age} • {student.className}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {placeholderSummaries.map((summary) => (
          <AISummaryBox key={summary.id} subject={summary.subject} bulletPoints={summary.bulletPoints} />
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl baholdnd text-slate-800">Program Progress</h2>
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Program Placeholder</h3>
              <p className="text-xs text-slate-500">Student statuses across lessons.</p>
            </div>
            <ProgramGraph lessons={placeholderLessons} links={placeholderLinks} />
          </div>
        </div>
      </section>
    </div>
  );
}
