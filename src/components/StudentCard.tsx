import React from "react";
import { Student } from "@/types";
import { CircleNode } from "./CircleNode";

interface StudentCardProps {
  student: Student;
}

export function StudentCard({ student }: StudentCardProps) {
  return (
    <div className="flex flex-col items-center space-y-2">
      <CircleNode
        label={student.name}
        subtitle={`${student.age} yrs`}
        href={`/students/${student.id}`}
        className="h-24 w-24"
      />
      <span className="text-xs text-slate-500">View details</span>
    </div>
  );
}
