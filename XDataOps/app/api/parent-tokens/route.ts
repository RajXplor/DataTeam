/**
 * Phase 1 — Parent Token Import + Duplicate Gateway Review.
 * Banking report is Phase 2 and lives in /api/parent-tokens/banking/route.ts.
 * Core lib/parent-tokens-logic.ts is untouched.
 */
import { NextRequest, NextResponse } from 'next/server';
import { processParentTokens } from '@/lib/parent-tokens-logic';
import { readSpreadsheetRowsWithPreambleSkip } from '@/lib/file-parsing';
import { validateFileHeaders, EXPECTED_HEADERS } from '@/lib/header-validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SAFE_RESPONSE_BYTES = 4.2 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const ppFile  = formData.get('ppFile')  as File | null;
    const dsFile  = formData.get('dsFile')  as File | null;
    const gflFile = formData.get('gflFile') as File | null;

    if (!ppFile || !dsFile || !gflFile) {
      return NextResponse.json(
        { success: false, error: 'Payment Plan, DS Tokens, and Guardian Financial List are all required.' },
        { status: 400 },
      );
    }

    const ppBuffer  = Buffer.from(await ppFile.arrayBuffer());
    const dsBuffer  = Buffer.from(await dsFile.arrayBuffer());
    const gflBuffer = Buffer.from(await gflFile.arrayBuffer());

    // ── Header validation ─────────────────────────────────────
    const validationErrors = [];

    const ppRows  = readSpreadsheetRowsWithPreambleSkip(ppBuffer);
    const ppErr   = validateFileHeaders(ppRows,  EXPECTED_HEADERS.paymentPlan.required,  EXPECTED_HEADERS.paymentPlan.label);
    if (ppErr)  validationErrors.push(ppErr);

    const dsRows  = readSpreadsheetRowsWithPreambleSkip(dsBuffer);
    const dsErr   = validateFileHeaders(dsRows,  EXPECTED_HEADERS.dsTokens.required,     EXPECTED_HEADERS.dsTokens.label);
    if (dsErr)  validationErrors.push(dsErr);

    const gflRows = readSpreadsheetRowsWithPreambleSkip(gflBuffer);
    const gflErr  = validateFileHeaders(gflRows, EXPECTED_HEADERS.guardianList.required, EXPECTED_HEADERS.guardianList.label);
    if (gflErr) validationErrors.push(gflErr);

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'One or more files have incorrect headers.', validationErrors },
        { status: 400 },
      );
    }

    // ── Core processing (no bankBuffer → banking section is skipped) ──────
    const result = await processParentTokens(ppBuffer, dsBuffer, gflBuffer);

    // Return only Phase 1 fields
    const payload = {
      success: true,
      data: {
        serviceName:       result.serviceName,
        tokenCsvBase64:    result.tokenCsvBase64,
        tokenCsvFilename:  result.tokenCsvFilename,
        dupReviewBase64:   result.dupReviewBase64,
        dupReviewFilename: result.dupReviewFilename,
        summary: {
          validTokens:    result.summary.validTokens,
          dupGatewayRows: result.summary.dupGatewayRows,
          issNoGw:        result.summary.issNoGw,
          issNoParent:    result.summary.issNoParent,
          issChildDiff:   result.summary.issChildDiff,
        },
        issues: result.issues,
      },
    };

    const estimatedBytes = Buffer.byteLength(JSON.stringify(payload), 'utf-8');
    if (estimatedBytes > SAFE_RESPONSE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `Response is too large (${(estimatedBytes / 1024 / 1024).toFixed(1)} MB). Try splitting the payment plan file into smaller batches.`,
        },
        { status: 413 },
      );
    }

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error.';
    return NextResponse.json(
      { success: false, error: `Parent Tokens processing failed: ${message}` },
      { status: 500 },
    );
  }
}
