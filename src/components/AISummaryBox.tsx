import React from "react";

interface AISummaryBoxProps {
  subject: string;
  bulletPoints: string[];
}

export function AISummaryBox({ subject, bulletPoints }: AISummaryBoxProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700">{subject}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
        {bulletPoints.length === 0 ? (
          <li className="list-none text-slate-400">No summary available yet.</li>
        ) : (
          bulletPoints.map((point, index) => <li key={index}>{point}</li>)
        )}
      </ul>
    </div>
  );
}
