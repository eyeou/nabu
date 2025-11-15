import React from "react";
import { CircleNode } from "./CircleNode";
import { Lesson, LessonLink } from "@/types";

interface ProgramGraphProps {
  lessons: Lesson[];
  links?: LessonLink[];
  onSelectLesson?: (lesson: Lesson) => void;
}

export function ProgramGraph({ lessons, links = [], onSelectLesson }: ProgramGraphProps) {
  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
      {lessons.map((lesson) => (
        <div key={lesson.id} className="relative flex flex-col items-center">
          <CircleNode
            label={lesson.title}
            onClick={() => onSelectLesson?.(lesson)}
            subtitle={lesson.orderIndex != null ? `#${lesson.orderIndex}` : undefined}
          />
          <div className="mt-2 text-center text-xs text-slate-500">
            {links
              .filter((link) => link.fromLessonId === lesson.id)
              .map((link) => (
                <div key={link.id}>→ {link.relationType}</div>
              ))}
          </div>
        </div>
      ))}
      {lessons.length === 0 && (
        <div className="col-span-full rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No lessons yet. Use the editor to add lessons.
        </div>
      )}
    </div>
  );
}
