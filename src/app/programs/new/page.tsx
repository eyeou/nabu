export default function NewProgramPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Create Program</h1>
        <p className="mt-1 text-sm text-slate-500">Placeholder form. Connect to backend actions to create programs.</p>
      </div>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Teacher ID</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Teacher ID"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Title</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Program title"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Description</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Brief description"
          />
        </div>
        <button
          type="button"
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Save Placeholder
        </button>
      </form>
    </div>
  );
}
