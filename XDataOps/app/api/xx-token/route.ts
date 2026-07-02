import { NextRequest, NextResponse } from 'next/server';
import { processXxToken } from '@/lib/xx-token-logic';
import { readSpreadsheetRows } from '@/lib/file-parsing';
import { validateFileHeaders, EXPECTED_HEADERS } from '@/lib/header-validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SAFE_RESPONSE_BYTES = 4.2 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData();
    const childFile = formData.get('childFile') as File | null;
    const tokenFile = formData.get('tokenFile') as File | null;

    if (!childFile || !tokenFile) {
      return NextResponse.json(
        { success: false, error: 'Both the Child Details file and the DS Tokens file are required.' },
        { status: 400 },
      );
    }

    const childBuffer = Buffer.from(await childFile.arrayBuffer());
    const tokenBuffer = Buffer.from(await tokenFile.arrayBuffer());

    // ── Header validation ─────────────────────────────────────
    const validationErrors = [];

    const childRows = readSpreadsheetRows(childBuffer);
    const childErr  = validateFileHeaders(
      childRows,
      EXPECTED_HEADERS.xxTokenChild.required,
      EXPECTED_HEADERS.xxTokenChild.label,
    );
    if (childErr) validationErrors.push(childErr);

    const tokenRows = readSpreadsheetRows(tokenBuffer);
    const tokenErr  = validateFileHeaders(
      tokenRows,
      EXPECTED_HEADERS.xxTokenDs.required,
      EXPECTED_HEADERS.xxTokenDs.label,
    );
    if (tokenErr) validationErrors.push(tokenErr);

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'One or more files have incorrect headers.', validationErrors },
        { status: 400 },
      );
    }

    // ── Core processing (lib/xx-token-logic.ts untouched) ─────
    const result = processXxToken(childBuffer, tokenBuffer);

    const payload        = { success: true, data: result };
    const estimatedBytes = Buffer.byteLength(JSON.stringify(payload), 'utf-8');

    if (estimatedBytes > SAFE_RESPONSE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `Response is too large (${(estimatedBytes / 1024 / 1024).toFixed(1)} MB). Try splitting the Child Details file into smaller batches.`,
        },
        { status: 413 },
      );
    }

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during processing.';
    return NextResponse.json(
      { success: false, error: `X>X Token Import failed: ${message}` },
      { status: 500 },
    );
  }
}
