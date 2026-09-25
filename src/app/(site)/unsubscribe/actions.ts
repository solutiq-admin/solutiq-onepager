"use server";

import { redirect } from "next/navigation";

import { unsubscribeByToken } from "@/lib/email/unsubscribe";

// The confirm button on /unsubscribe. The page re-reads the Person after the
// redirect, so it shows the stored state, not an assumed one.
export async function unsubscribe(formData: FormData) {
  const token = formData.get("u");
  if (typeof token !== "string") redirect("/unsubscribe");
  await unsubscribeByToken(token);
  redirect(`/unsubscribe?u=${encodeURIComponent(token)}`);
}
