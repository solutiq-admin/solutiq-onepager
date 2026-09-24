"use client";

import { useRowLabel } from "@payloadcms/ui";

// Shows the question text on collapsed rows instead of "Question 01".
export function QuestionRowLabel() {
  const { data, rowNumber } = useRowLabel<{ label?: string }>();
  return <>{data?.label || `Question ${String((rowNumber ?? 0) + 1).padStart(2, "0")}`}</>;
}
