import Link from "next/link";

const placeholderPrograms = [
  {
    id: "placeholder-program",
    title: "Foundations of Literacy",
    description: "Scaffolded lessons covering reading levels and comprehension."
  }
];

export default async function ProgramsPage() {
  const programs = placeholderPrograms;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-800">Programs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create lesson pathways to differentiate instruction across learning levels.
          </p>
        </div>
        <Link
          href="/programs/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          New Program
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {programs.map((program) => (
          <Link
            key={program.id}
            href={`/programs/${program.id}`}
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-slate-800 group-hover:text-indigo-600">
              {program.title}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {program.description ?? "No description provided."}
            </p>
          </Link>
        ))}
        {programs.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No programs yet. Create your first program to begin mapping differentiated learning paths.
          </div>
        )}
      </div>
    </div>
  );
}
