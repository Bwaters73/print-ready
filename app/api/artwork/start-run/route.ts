import { NextResponse } from "next/server";
import { uniqueSlug } from "@/lib/artwork-run";
import type { Orientation } from "@/lib/artwork-types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { concept?: string; orientation?: Orientation };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const concept = (body.concept || "").trim();
  if (!concept) {
    return NextResponse.json({ error: "Give this run a title." }, { status: 400 });
  }
  const orientation: Orientation = body.orientation === "landscape" ? "landscape" : "portrait";

  return NextResponse.json({ runSlug: uniqueSlug(concept), orientation });
}
