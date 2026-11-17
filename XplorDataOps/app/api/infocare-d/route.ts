import { NextRequest, NextResponse } from 'next/server';
import { processInfocareD, type InfocareDInput } from '@/lib/infocare-d-logic';

export const runtime     = 'nodejs';
export const maxDuration = 60;

const SAFE_RESPONSE_BYTES = 4.2 * 1024 * 1024;

/** File field names expected in FormData */
const FILE_FIELDS: (keyof InfocareDInput)[] = [
  'childCurrentA', 'childCurrentB',
  'childWaitlistA', 'childWaitlistB',
  'childPastA', 'childPastB',
  'childFutureA', 'childFutureB',
  'staffA', 'staffB',
  'contactAllPast', 'contactAllCurrent', 'contactAllFuture',
  'contactBpPast', 'contactBpCurrent', 'contactBpFuture',
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const input: InfocareDInput = {};
    let fileCount = 0;

    for (const field of FILE_FIELDS) {
      const f = formData.get(field) as File | null;
      if (f) {
        input[field] = Buffer.from(await f.arrayBuffer());
        fileCount++;
      }
    }

    if (fileCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Please upload at least one file.' },
        { status: 400 },
      );
    }

    const result = processInfocareD(input);

    if (result.files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No output files were generated. Check that uploaded files contain data rows.' },
        { status: 400 },
      );
    }

    const payload        = { success: true, data: result };
    const estimatedBytes = Buffer.byteLength(JSON.stringify(payload), 'utf-8');

    if (estimatedBytes > SAFE_RESPONSE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `Response is too large (${(estimatedBytes / 1024 / 1024).toFixed(1)} MB). Process fewer file categories at once.`,
        },
        { status: 413 },
      );
    }

    return NextResponse.json(payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error.';
    return NextResponse.json(
      { success: false, error: `Infocare > D processing failed: ${msg}` },
      { status: 500 },
    );
  }
}
