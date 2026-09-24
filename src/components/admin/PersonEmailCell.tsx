import type { DefaultServerCellComponentProps } from "payload";

// Guestlist list column: the related person's email.
export async function PersonEmailCell({ rowData, payload }: DefaultServerCellComponentProps) {
  const person = rowData?.person;
  if (person && typeof person === "object") return <>{person.email}</>;
  if (!person) return null;
  const doc = await payload
    .findByID({ collection: "people", id: person, depth: 0, select: { email: true } })
    .catch(() => null);
  return <>{doc?.email ?? ""}</>;
}
