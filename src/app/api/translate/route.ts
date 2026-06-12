import { NextResponse } from "next/server";

import { translateFields } from "@/lib/translation/service";
import type {
  SiteLang,
  TranslationFieldInput,
  TranslationRequest,
} from "@/lib/translation/types";

function isSiteLang(value: unknown): value is SiteLang {
  return value === "en" || value === "de";
}

function parseField(value: unknown): TranslationFieldInput | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const contentType = row.contentType;
  const contentId = row.contentId;
  const field = row.field;
  const text = row.text;

  if (
    (contentType !== "article" && contentType !== "bulletin") ||
    typeof contentId !== "string" ||
    (field !== "title" && field !== "content" && field !== "excerpt") ||
    typeof text !== "string"
  ) {
    return null;
  }

  return {
    contentType,
    contentId,
    field,
    text,
    format: row.format === "html" ? "html" : "text",
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<TranslationRequest>;
    const targetLang = body.targetLang;
    const rawFields = body.fields;

    if (!isSiteLang(targetLang) || !Array.isArray(rawFields)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const fields = rawFields
      .map(parseField)
      .filter((field): field is TranslationFieldInput => field !== null)
      .slice(0, 40);

    if (fields.length === 0) {
      return NextResponse.json({ translations: {} });
    }

    const translations = await translateFields({ targetLang, fields });
    return NextResponse.json({ translations });
  } catch (err) {
    console.error("POST /api/translate:", err);
    return NextResponse.json(
      { error: "Translation failed." },
      { status: 500 },
    );
  }
}
