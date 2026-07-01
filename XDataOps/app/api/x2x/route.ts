import { NextRequest, NextResponse } from 'next/server';
import { processX2X } from '@/lib/x2x-logic';
import { readSpreadsheetRows } from '@/lib/file-parsing';
import { validateFileHeaders, EXPECTED_HEADERS } from '@/lib/header-validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SAFE_RESPONSE_BYTES = 4.2 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const childrenFile = formData.get('childrenFile') as File | null;
    const ecFile       = formData.get('ecFile')       as File | null;
    const serviceId    = (formData.get('serviceId')   as string | null)?.trim() ?? '';
    const serviceName  = (formData.get('serviceName') as string | null)?.trim() ?? '';

    if (!childrenFile || !ecFile) {
      return NextResponse.json(
        { success: false, error: 'Both the Children Data Master file and the Emergency Contact Reports file are required.' },
        { status: 400 },
      );
    }
    if (!serviceId || !serviceName) {
      return NextResponse.json(
        { success: false, error: 'New Service ID and New Service Name are both required.' },
        { status: 400 },
      );
    }

    const childrenBuffer = Buffer.from(await childrenFile.arrayBuffer());
    const ecBuffer       = Buffer.from(await ecFile.arrayBuffer());

    // ── Header validation (runs before core logic, guardrail preserved) ──
    const validationErrors = [];

    const childrenRows = readSpreadsheetRows(childrenBuffer);
    const childrenErr  = validateFileHeaders(
      childrenRows,
      EXPECTED_HEADERS.childrenData.required,
      EXPECTED_HEADERS.childrenData.label,
    );
    if (childrenErr) validationErrors.push(childrenErr);

    const ecRows = readSpreadsheetRows(ecBuffer);
    const ecErr  = validateFileHeaders(
      ecRows,
      EXPECTED_HEADERS.emergencyContacts.required,
      EXPECTED_HEADERS.emergencyContacts.label,
    );
    if (ecErr) validationErrors.push(ecErr);

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'One or more files have incorrect headers.', validationErrors },
        { status: 400 },
      );
    }

    // ── Core processing (lib/x2x-logic.ts untouched) ────────────────────
    const result = processX2X(childrenBuffer, ecBuffer, serviceId, serviceName);

    const payload      = { success: true, data: result };
    const estimatedBytes = Buffer.byteLength(JSON.stringify(payload), 'utf-8');

    if (estimatedBytes > SAFE_RESPONSE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error:
            `The generated import file is too large to return in one request ` +
            `(${(estimatedBytes / 1024 / 1024).toFixed(1)} MB, limit ~4 MB). ` +
            `Try splitting the Children Data Master by class or room.`,
        },
        { status: 413 },
      );
    }

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during processing.';
    return NextResponse.json(
      { success: false, error: `X2X processing failed: ${message}` },
      { status: 500 },
    );
  }
}
