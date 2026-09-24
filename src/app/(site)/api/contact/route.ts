import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type ContactPayload = {
  name: string;
  email: string;
  organisation?: string;
  message: string;
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Partial<ContactPayload> | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Please complete the required fields." },
        { status: 400 }
      );
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const organisation = typeof body.organisation === "string" ? body.organisation.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Please enter your name." },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Please enter a message." },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const contactToEmail = process.env.CONTACT_TO_EMAIL;

    if (!resendApiKey || !contactToEmail) {
      console.error("Missing RESEND_API_KEY or CONTACT_TO_EMAIL env configuration");
      return NextResponse.json(
        { success: false, error: "Something didn't send. Try again, or email hello@solutiq.africa." },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from: "SOLUTIQ <no-reply@solutiq.africa>",
      to: [contactToEmail],
      subject: `New enquiry from solutiq.africa — ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nOrganisation: ${organisation || "Not provided"}\nMessage: ${message}`,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Contact submission failed", error);
    return NextResponse.json(
      { success: false, error: "Something didn't send. Try again, or email hello@solutiq.africa." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: "Method not allowed." },
    { status: 405 }
  );
}

export const runtime = "nodejs";

