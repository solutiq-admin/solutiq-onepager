import { Button } from "@payloadcms/ui";
import type { DefaultServerCellComponentProps } from "payload";

// Events list column: opens the public event page in a new tab. Drafts are
// not public, so there is nothing to open until the event is published.
export function EventPreviewCell({ rowData }: DefaultServerCellComponentProps) {
  const slug = rowData?.slug;
  if (typeof slug !== "string" || !slug) return null;
  if (rowData?.status === "draft") {
    return <span style={{ color: "var(--theme-elevation-500)" }}>Draft, not public</span>;
  }
  return (
    <Button el="anchor" url={`/events/${slug}`} newTab buttonStyle="pill" size="small" margin={false}>
      Preview
    </Button>
  );
}
