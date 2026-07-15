import { NextRequest, NextResponse } from 'next/server';
import { processParentTokens, normalisePPHeaders, normaliseDSHeaders } from '@/lib/parent-tokens-logic';
import { readSpreadsheetRowsWithPreambleSkip } from '@/lib/file-parsing';
import { validateFileHeaders, EXPECTED_HEADERS } from '@/lib/header-validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SAFE_RESPONSE_BYTES = 4.2 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const ppFile   = formData.get('ppFile')   as File | null;
    const dsFile   = formData.get('dsFile')   as File | null;
    const gflFile  = formData.get('gflFile')  as File | null;
    const bankFile = formData.get('bankFile') as File | null;

    if (!ppFile || !dsFile || !gflFile || !bankFile) {
      return NextResponse.json(
        { success: false, error: 'All four files are required for the No Banking Report.' },
        { status: 400 },
      );
    }

    const ppBuffer   = Buffer.from(await ppFile.arrayBuffer());
    const dsBuffer   = Buffer.from(await dsFile.arrayBuffer());
    const gflBuffer  = Buffer.from(await gflFile.arrayBuffer());
    const bankBuffer = Buffer.from(await bankFile.arrayBuffer());

    // ── Header validation (runs before core logic) ────────────
    const validationErrors = [];

    const ppRows  = normalisePPHeaders(readSpreadsheetRowsWithPreambleSkip(ppBuffer));
    const ppErr   = validateFileHeaders(ppRows, EXPECTED_HEADERS.paymentPlan.required, EXPECTED_HEADERS.paymentPlan.label);
    if (ppErr) validationErrors.push(ppErr);

    const dsRows  = normaliseDSHeaders(readSpreadsheetRowsWithPreambleSkip(dsBuffer));
    const dsErr   = validateFileHeaders(dsRows, EXPECTED_HEADERS.dsTokens.required, EXPECTED_HEADERS.dsTokens.label);
    if (dsErr) validationErrors.push(dsErr);

    const gflRows = readSpreadsheetRowsWithPreambleSkip(gflBuffer);
    const gflErr  = validateFileHeaders(gflRows, EXPECTED_HEADERS.guardianList.required, EXPECTED_HEADERS.guardianList.label);
    if (gflErr) validationErrors.push(gflErr);

    const bankRows = readSpreadsheetRowsWithPreambleSkip(bankBuffer);
    const bankErr  = validateFileHeaders(bankRows, EXPECTED_HEADERS.bankDetails.required, EXPECTED_HEADERS.bankDetails.label);
    if (bankErr) validationErrors.push(bankErr);

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'One or more files have incorrect headers.', validationErrors },
        { status: 400 },
      );
    }

    // ── Core processing (lib untouched) ───────────────────────
    const result = await processParentTokens(ppBuffer, dsBuffer, gflBuffer, bankBuffer);

    // Return only the banking-relevant slice
    const payload = {
      success: true,
      data: {
        noBankingBase64:   result.noBankingBase64,
        noBankingFilename: result.noBankingFilename,
        summary: { noBankingCount: result.summary.noBankingCount },
      },
    };

    const estimatedBytes = Buffer.byteLength(JSON.stringify(payload), 'utf-8');
    if (estimatedBytes > SAFE_RESPONSE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `No Banking Report is too large to return (${(estimatedBytes / 1024 / 1024).toFixed(1)} MB). Try splitting the bank details file into smaller batches.`,
        },
        { status: 413 },
      );
    }

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error.';
    return NextResponse.json(
      { success: false, error: `No Banking Report generation failed: ${message}` },
      { status: 500 },
    );
  }
}
