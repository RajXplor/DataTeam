import { NextRequest, NextResponse } from 'next/server';
import { processD2DStaff } from '@/lib/d2d-staff-logic';
import { validateFileHeaders, EXPECTED_HEADERS } from '@/lib/header-validation';
import * as XLSX from 'xlsx';

export const runtime     = 'nodejs';
export const maxDuration = 60;

const SAFE_RESPONSE_BYTES = 4.2 * 1024 * 1024;

/**
 * Sheet-aware header peek — scans all sheets in a binary Excel workbook
 * to find the one containing staff data, then returns its column names.
 * Falls back to reading the first CSV line for plain-text uploads.
 */
function peekStaffHeaders(buffer: Buffer): string[] {
  const magic   = buffer.slice(0, 4);
  const isExcel =
    (magic[0] === 0xd0 && magic[1] === 0xcf) ||
    (magic[0] === 0x50 && magic[1] === 0x4b);

  if (!isExcel) {
    const firstLine = buffer.toString('utf-8').replace(/^\uFEFF/, '').split(/\r?\n/)[0] ?? '';
    return firstLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  }

  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  for (const sheetName of wb.SheetNames) {
    const ws   = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: false, defval: '' });
    if (rows.length === 0) continue;
    const keys = Object.keys(rows[0]);
    if (keys.includes('First Name')) return keys;
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData();
    const staffFile = formData.get('staffFile') as File | null;

    if (!staffFile) {
      return NextResponse.json(
        { success: false, error: 'Staff export file is required.' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await staffFile.arrayBuffer());

    // ── Header validation (sheet-aware) ───────────────────────
    const foundHeaders = peekStaffHeaders(buffer);
    const fakeRow      = Object.fromEntries(foundHeaders.map((h) => [h, '']));
    const hErr         = validateFileHeaders(
      [fakeRow],
      EXPECTED_HEADERS.d2dStaff.required,
      EXPECTED_HEADERS.d2dStaff.label,
    );
    if (hErr) {
      return NextResponse.json(
        { success: false, error: 'File validation failed.', validationErrors: [hErr] },
        { status: 400 },
      );
    }

    // ── Core processing ───────────────────────────────────────
    const result = processD2DStaff(buffer);

    const payload        = { success: true, data: result };
    const estimatedBytes = Buffer.byteLength(JSON.stringify(payload), 'utf-8');

    if (estimatedBytes > SAFE_RESPONSE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `Response is too large (${(estimatedBytes / 1024 / 1024).toFixed(1)} MB). Try splitting the staff file into smaller batches.`,
        },
        { status: 413 },
      );
    }

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during processing.';
    return NextResponse.json(
      { success: false, error: `D > D Staff processing failed: ${message}` },
      { status: 500 },
    );
  }
}
