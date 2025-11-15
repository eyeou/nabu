import { StudentCard } from "@/components/StudentCard";

const placeholderStudents = Array.from({ length: 30 }).map((_, index) => ({
  id: `placeholder-${index + 1}`,
  name: `Student ${index + 1}`,
  age: 12 + (index % 4),
  classId: "placeholder-class",
  avatarUrl: null,
}));

export default async function ClassDetailPage({
  params,
}: {
  params: { classId: string };
}) {
  const klass = {
    id: params.classId,
    name: "Placeholder Class",
    students: placeholderStudents,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-800">{klass.name}</h1>
          <p className="mt-1 text-sm text-slate-500">30 student seats. {klass.students.length} currently enrolled.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 md:grid-cols-5 lg:grid-cols-6">
        {klass.students.map((student) => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>
    </div>
  );
}
