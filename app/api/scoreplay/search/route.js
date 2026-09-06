import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/current-user';
import { scoreplayConfigured, searchForMeet, searchLibrary } from '@/lib/scoreplay';

/* Proxied so the Scoreplay key stays on the server. Admin only. */
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = await currentUser();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });
  }
  if (!scoreplayConfigured()) {
    return NextResponse.json({ error: 'Scoreplay is not configured.' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  try {
    /* No query means "show me this meet's race" — the caller passes the
       meet's city and year rather than a search term. */
    const result = q === null || q === ''
      ? await searchForMeet({
          city: searchParams.get('city') || '',
          year: searchParams.get('year') || '',
          name: searchParams.get('name') || '',
        })
      : await searchLibrary(q, Number(searchParams.get('page')) || 1);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
