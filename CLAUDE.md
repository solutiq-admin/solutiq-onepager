@AGENTS.md

# CLAUDE.md

Context for Claude Code working in this repo. Read this before making changes.

## What this project is

A single-page Next.js 15 (App Router) lead-gen site for SOLUTIQ, a Johannesburg-based
strategic consulting firm. It replaces the placeholder currently live at solutiq.africa
until the full multi-page site (a separate, larger build) ships. This repo is scoped
to do one job: convert a general consulting enquiry into a contact-form submission.

Solo founder, solo engineer (Anesu). No team, no design/dev handoff process — assume
one person is running this end to end. Be direct, don't pad explanations, don't propose
processes that need people who don't exist.

## Source of truth for design and copy

The visual design comes from a Claude Design export — match it exactly, don't
reinterpret or restyle it. If a Claude Code prompt in the build guide describes a
section, that description is derived from the export; treat spacing, colour, and
copy in the export as final, not a starting point.

Do not invent new copy. Every content string on this page traces back to the
locked SOLUTIQ_Website_Content_Architecture_v1.md (Home page section). If new
copy is ever needed, ask — don't draft brand voice from scratch.

## Brand rules (non-negotiable)

- **SOLUTIQ** — always full capitals, every context, no exceptions.
- Colours: Black `#0A0A0A` (primary canvas) · Navy `#161B35` · Product-dark `#211F27`
  (card elevation only) · Gold `#F9B630` (accent only — eyebrows, focus rings, single
  CTA border; **never** body text, **never** the logo colour) · White `#FFFFFF` ·
  Silver `#B3AFAE` (supporting text/metadata only).
- Typography: Ubuntu 700 for headings, Cabin 400–600 for body.
- Logo: white on dark, floats directly on the background — never boxed, never gold.
- British/South African spelling throughout: organisation, optimise, programme, centre.
- Tagline "So Africa can build its own." is **retired** — do not use it anywhere.
  Active surface copy is the descriptor: "Technology · Talent · Partnership".

## Scope boundaries — do not add these here

This page deliberately excludes things that belong to the full site or later phases.
Don't "helpfully" add them:

- No DPI, SEI, or long-term-mission content anywhere on this page.
- No `/what-we-do`, `/about`, `/work` as real routes — everything is one scroll,
  same-page anchors only (`#practices`, `#contact`).
- No Supabase, no database, no auth — the contact form posts to a Resend-backed
  API route only. (When the full site's `contact_submissions` table exists, the
  form's destination can be swapped without changing the form itself.)
- No case studies, client logos, or testimonials — none exist yet; don't fabricate
  or imply any.
- No Careers, Black Book, blog, or legal pages (Privacy/Terms) — not built yet,
  don't ship placeholder legal text as if it's binding.

If a task seems to require crossing one of these boundaries, stop and flag it
rather than building around it.

## Stack

- Next.js 15, App Router, TypeScript, Tailwind CSS, shadcn/ui
- Resend for the contact form's email delivery (`RESEND_API_KEY`, `CONTACT_TO_EMAIL`
  env vars — never hardcode or log the key)
- Deployed on Vercel, domain `solutiq.africa` (root)

## Coding conventions

- No abstractions until a pattern appears three times.
- No libraries for anything achievable in ten lines of TypeScript.
- Whole files over partial snippets/diffs when generating or rewriting a component.
- Keep components single-purpose and matched 1:1 to the page sections in
  `components/onepager/`: Nav, Hero, WhatWeAre, PracticesGrid, WhoWeWorkWith,
  ClosingCta, ContactForm, Footer.
- Respect `prefers-reduced-motion` on any animated element — static fallback always.
- Never surface internal error details, stack traces, or the Resend API key in
  client-facing responses or the browser console.

## Content reference (copy this exactly, don't paraphrase)

- Eyebrow: `TECHNOLOGY · TALENT · PARTNERSHIP`
- Hero headline: `Strategic builders for African organisations.`
- Five practices (title — one-line promise):
  1. Strategic Systems & Operations — Before we build anything, we learn how you work.
  2. Technology & Digital Transformation — From surviving digitally to leading with it.
  3. Experience & Convening Strategy — A great event happens once. A great system makes it happen every time.
  4. People & Organisational Development — Your strategy is only as strong as the people carrying it.
  5. Commercial & Growth Strategy — Growth needs more than a good idea. It needs a commercial engine.
- Contact fields: Name, Email, Organisation (optional), Message
- Contact details: anesu@solutiq.africa · +27 78 440 7053 · Johannesburg, South Africa
- Footer copyright: © 2026 SOLUTIQ TECHNOLOGIES (PTY) Ltd · solutiq.africa

## Build reference

Full phase-by-phase build steps live in `SOLUTIQ_OnePager_Claude_Code_Build_Guide.md`
in this repo. Follow phase order — don't jump ahead (e.g. don't wire the contact form
before the sections it lives inside exist).