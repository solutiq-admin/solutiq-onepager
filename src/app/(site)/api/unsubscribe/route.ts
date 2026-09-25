import { unsubscribeByToken } from "@/lib/email/unsubscribe";

// One-click unsubscribe (RFC 8058), the target of the List-Unsubscribe header
// on bulk emails. Mail clients POST "List-Unsubscribe=One-Click" here with no
// cookies and no confirmation step. The answer is the same whether or not the
// token matched, so the endpoint reveals nothing about who is on the list.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("u") ?? undefined;
  try {
    await unsubscribeByToken(token);
  } catch (error) {
    console.error("One-click unsubscribe failed", error);
    return new Response("Something went wrong. Please try again.", { status: 500 });
  }
  return new Response("You're unsubscribed.", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// A client that opens the header link in a browser gets the confirm page.
// GET never unsubscribes: link scanners prefetch URLs.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = new URL("/unsubscribe", url);
  const token = url.searchParams.get("u");
  if (token) page.searchParams.set("u", token);
  return Response.redirect(page, 303);
}
