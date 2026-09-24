import type { DefaultServerCellComponentProps } from "payload";

export function QuestionCountCell({ rowData }: DefaultServerCellComponentProps) {
  const rows = rowData?.extraFields;
  return <>{Array.isArray(rows) ? rows.length : 0}</>;
}
