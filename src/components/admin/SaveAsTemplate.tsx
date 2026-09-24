"use client";

import { Button, TextInput, toast, useAuth, useDocumentInfo, useFormModified } from "@payloadcms/ui";
import { useState, useTransition } from "react";

import { canManage } from "@/access";

import { saveEventAsTemplate } from "./eventActions";

// Event edit view: turn this event's saved questions into a form template.
export function SaveAsTemplate() {
  const { id } = useDocumentInfo();
  const { user } = useAuth();
  const modified = useFormModified();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  if (!id || !canManage(user)) return null;

  const submit = () => {
    if (modified) {
      toast.error("Save the event first. Templates are made from the saved questions.");
      return;
    }
    startTransition(async () => {
      const res = await saveEventAsTemplate(id, name);
      if (res.ok) {
        toast.success(res.message);
        setName("");
      } else toast.error(res.message);
    });
  };

  return (
    <div className="field-type" style={{ marginBottom: "var(--base)" }}>
      <TextInput
        path="saveAsTemplateName"
        label="Save these questions as a template"
        placeholder="Template name"
        value={name}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        readOnly={pending}
      />
      <Button
        buttonStyle="secondary"
        size="medium"
        disabled={pending || !name.trim()}
        onClick={submit}
      >
        {pending ? "Saving…" : "Save as template"}
      </Button>
      {modified && (
        <p style={{ color: "var(--theme-elevation-500)" }}>
          You have unsaved changes. Save the event before creating a template.
        </p>
      )}
    </div>
  );
}
