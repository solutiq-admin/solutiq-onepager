import config from "@payload-config";
import { getPayload } from "payload";

// Unsubscribe by the token in an email's footer link or List-Unsubscribe
// header. Sets marketingOptOut only: registered guests still get updates
// and cancellations for their events (see lib/email/bulk.ts).

// People tokens are 24 random bytes, base64url: 32 characters.
const TOKEN = /^[A-Za-z0-9_-]{16,64}$/;

export async function findByUnsubscribeToken(token: string | undefined) {
  if (!token || !TOKEN.test(token)) return null;
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "people",
    where: { unsubscribeToken: { equals: token } },
    limit: 1,
    depth: 0,
    select: { marketingOptOut: true },
  });
  return docs[0] ?? null;
}

// Returns false for an unknown token. Repeating it changes nothing.
export async function unsubscribeByToken(token: string | undefined): Promise<boolean> {
  const person = await findByUnsubscribeToken(token);
  if (!person) return false;
  if (!person.marketingOptOut) {
    const payload = await getPayload({ config });
    await payload.update({ collection: "people", id: person.id, data: { marketingOptOut: true } });
  }
  return true;
}
