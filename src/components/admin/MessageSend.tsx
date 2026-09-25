"use client";

import { Button, toast, useAuth, useDocumentInfo, useFormModified } from "@payloadcms/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { canSendEmail } from "@/access";

import {
  getSendProgress,
  previewSend,
  sendNextBatch,
  sendTestMessage,
  startSend,
  type Progress,
  type SendPreview,
} from "./messageActions";

const CALENDAR_LABEL = {
  none: "",
  invite: " with a calendar invite",
  update: " with a calendar update",
  cancel: " with a calendar cancellation",
} as const;

const summary = ({ counts }: Progress) =>
  [
    `${counts.sent} of ${counts.total} sent`,
    counts.queued > 0 && `${counts.queued} to go`,
    counts.failed > 0 && `${counts.failed} failed`,
    counts.suppressed > 0 && `${counts.suppressed} skipped (unsubscribed or suppressed)`,
  ]
    .filter(Boolean)
    .join(" · ");

// Message edit view: test, send (after a confirmation step) and continue.
// Sending runs as repeated small server-action calls, one batch each, so it
// fits serverless time limits; closing the tab just pauses it.
export function MessageSend() {
  const { id } = useDocumentInfo();
  const { user } = useAuth();
  const modified = useFormModified();
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [preview, setPreview] = useState<SendPreview | null>(null);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const stopRef = useRef(false);

  const allowed = canSendEmail(user);

  useEffect(() => {
    if (!id || !allowed) return;
    getSendProgress(id).then((res) => res.ok && setProgress(res));
  }, [id, allowed]);

  if (!id || !allowed) return null;

  const busy = pending || running;
  const saveFirst = () => {
    toast.error("Save the message first. Emails are made from the saved version.");
  };

  const sendTest = () => {
    if (modified) return saveFirst();
    startTransition(async () => {
      const res = await sendTestMessage(id);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    });
  };

  const askToSend = () => {
    if (modified) return saveFirst();
    startTransition(async () => {
      const res = await previewSend(id);
      if (res.ok) setPreview(res);
      else toast.error(res.message);
    });
  };

  // Starts (or resumes) a run, then calls batches until nothing more can be
  // claimed. In retry mode, rows that failed before the run started are
  // tried once more. Not a transition, so progress renders as it happens.
  const run = async (begin: () => ReturnType<typeof getSendProgress>, retry: boolean) => {
    setRunning(true);
    setNotice(null);
    stopRef.current = false;
    let latest: Progress | null = null;
    try {
      const first = await begin();
      if (!first.ok) {
        toast.error(first.message);
        return;
      }
      latest = first;
      setProgress(first);
      const retryBefore = retry ? first.serverTime : undefined;
      while (!stopRef.current) {
        const res = await sendNextBatch(id, retryBefore);
        if (!res.ok) {
          toast.error(res.message);
          break;
        }
        latest = res;
        setProgress(res);
        if (res.claimed === 0) break;
      }
    } catch {
      // Network drop or a server timeout: whatever was claimed stays queued.
      toast.error("Lost contact with the server. Use Continue to pick up where it left off.");
    } finally {
      setRunning(false);
    }

    if (!latest) return;
    const { queued, failed } = latest.counts;
    if (stopRef.current) setNotice("Paused. Use Continue to send the rest.");
    else if (queued > 0) {
      setNotice(
        "Some emails are still queued: another window may be sending them, or a send was interrupted. Try Continue again in five minutes.",
      );
    } else if (failed > 0) toast.error(`Finished with ${failed} failed. Use Continue / retry unsent to try them again.`);
    else toast.success("Message sent.");
    router.refresh();
  };

  const confirmSend = () => {
    setPreview(null);
    void run(() => startSend(id), false);
  };

  const continueSend = () => void run(() => getSendProgress(id), true);

  const status = progress?.status ?? "draft";
  const counts = progress?.counts;
  const canContinue = status !== "draft" && Boolean(counts && (counts.queued > 0 || counts.failed > 0));

  return (
    <div className="field-type" style={{ marginTop: "var(--base)" }}>
      <h3 style={{ marginBottom: "calc(var(--base) / 2)" }}>Send</h3>
      <p style={{ marginBottom: "calc(var(--base) / 2)", color: "var(--theme-elevation-500)" }}>
        Emails go out from your address, {user?.email}, one per guest, each with their own registration link.
        Replies come to you.
      </p>

      {progress && counts && counts.total > 0 && (
        <p style={{ marginBottom: "calc(var(--base) / 2)" }} aria-live="polite">
          {running ? "Sending… " : ""}
          {summary(progress)}
        </p>
      )}
      {notice && <p style={{ marginBottom: "calc(var(--base) / 2)", color: "var(--theme-warning-500)" }}>{notice}</p>}

      {preview && (
        <div
          style={{
            marginBottom: "var(--base)",
            padding: "calc(var(--base) / 2) var(--base)",
            border: "1px solid var(--theme-elevation-150)",
            borderRadius: "var(--style-radius-s)",
          }}
        >
          <p style={{ marginBottom: "calc(var(--base) / 2)" }}>
            <strong>
              Send to {preview.recipients - preview.skipped} {preview.recipients - preview.skipped === 1 ? "person" : "people"}
            </strong>{" "}
            ({preview.audience}){CALENDAR_LABEL[preview.calendar]}?
            {preview.skipped > 0 && ` ${preview.skipped} more will be skipped: unsubscribed or suppressed.`}
          </p>
          {preview.warning && (
            <p style={{ marginBottom: "calc(var(--base) / 2)", color: "var(--theme-warning-500)" }}>{preview.warning}</p>
          )}
          <p style={{ marginBottom: "calc(var(--base) / 2)", color: "var(--theme-elevation-500)" }}>
            This can&apos;t be undone. Keep this tab open until it finishes; if it closes, use Continue.
          </p>
          <div style={{ display: "flex", gap: "calc(var(--base) / 2)" }}>
            <Button
              buttonStyle="primary"
              size="medium"
              disabled={busy || preview.recipients - preview.skipped === 0}
              onClick={confirmSend}
            >
              Confirm and send
            </Button>
            <Button buttonStyle="secondary" size="medium" disabled={busy} onClick={() => setPreview(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "calc(var(--base) / 2)" }}>
        <Button buttonStyle="secondary" size="medium" disabled={busy} onClick={sendTest}>
          Send test to me
        </Button>
        {status === "draft" && !preview && (
          <Button buttonStyle="primary" size="medium" disabled={busy} onClick={askToSend}>
            Send…
          </Button>
        )}
        {canContinue && !running && (
          <Button buttonStyle="primary" size="medium" disabled={busy} onClick={continueSend}>
            Continue / retry unsent
          </Button>
        )}
        {running && (
          <Button buttonStyle="secondary" size="medium" onClick={() => (stopRef.current = true)}>
            Pause
          </Button>
        )}
      </div>
    </div>
  );
}
