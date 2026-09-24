"use client";

import { Button, TextareaInput, toast, useAuth, useDocumentInfo } from "@payloadcms/ui";
import { useState, useTransition } from "react";

import { canManage } from "@/access";

import { quickAddGuests, type QuickAddResult } from "./eventActions";

// Event edit view: paste guests, one per line, to add them to the guestlist.
export function QuickAdd() {
  const { id } = useDocumentInfo();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [result, setResult] = useState<QuickAddResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (!id || !canManage(user)) return null;

  const submit = () =>
    startTransition(async () => {
      const res = await quickAddGuests(id, text);
      setResult(res);
      if (!res.ok) toast.error(res.message);
      else {
        toast.success(res.message);
        // Keep only the lines that need fixing.
        setText(res.invalid.join("\n"));
      }
    });

  return (
    <div className="field-type" style={{ marginTop: "var(--base)" }}>
      <h3 style={{ marginBottom: "calc(var(--base) / 2)" }}>Add guests to the guestlist</h3>
      <TextareaInput
        path="quickAddText"
        label="One guest per line: Full name, email"
        placeholder={"Full name, name@example.com\nFull name, name@example.com"}
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        readOnly={pending}
      />
      <Button
        buttonStyle="secondary"
        size="medium"
        disabled={pending || !text.trim()}
        onClick={submit}
      >
        {pending ? "Adding…" : "Add to guestlist"}
      </Button>
      {result && (
        <div style={{ marginTop: "calc(var(--base) / 2)" }}>
          <p>{result.message}</p>
          {result.invalid.length > 0 && (
            <p style={{ color: "var(--theme-error-500)" }}>
              Invalid lines are left in the box above. Use the format “Full name, email”.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
