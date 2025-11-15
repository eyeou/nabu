import Link from "next/link";

const placeholderClasses = [
  {
    id: "placeholder-1",
    name: "Algebra Foundations",
    studentCount: 30,
  },
];

export default async function ClassesPage() {
  const classes = placeholderClasses;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-800">Classes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track each class of students and monitor mastery across programs.
          </p>
        </div>
        <Link
          href="/classes/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          New Class
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {classes.map((klass) => (
          <Link
            key={klass.id}
            href={`/classes/${klass.id}`}
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-slate-800 group-hover:text-indigo-600">
              {klass.name}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {klass.studentCount} students enrolled
            </p>
          </Link>
        ))}
        {classes.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No classes yet. Create your first class to enroll students.
          </div>
        )}
      </div>
    </div>
  );
}
