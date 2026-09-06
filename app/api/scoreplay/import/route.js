import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/current-user';
import { getMediaAsset, scoreplayConfigured } from '@/lib/scoreplay';

/* Copies a chosen library image into our own Blob store.

   Scoreplay URLs are signed and expire, so pointing a stub straight at one
   would leave a broken image later. The bytes are pulled server-side and
   re-hosted, which also keeps the key off the client. */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request) {
  const session = await currentUser();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });
  }
  if (!scoreplayConfigured()) {
    return NextResponse.json({ error: 'Scoreplay is not configured.' }, { status: 503 });
  }

  const { id, slug } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'No media id.' }, { status: 400 });

  try {
    const asset = await getMediaAsset(id);
    if (!asset.url) return NextResponse.json({ error: 'That asset has no image.' }, { status: 404 });

    const res = await fetch(asset.url, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ error: `Fetch failed (${res.status}).` }, { status: 502 });

    const type = res.headers.get('content-type') || 'image/jpeg';
    if (!type.startsWith('image/')) {
      return NextResponse.json({ error: 'That asset is not a web image.' }, { status: 415 });
    }

    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'That image is too large to import.' }, { status: 413 });
    }

    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const blob = await put(`meets/${slug || 'meet'}-${Date.now()}.${ext}`, Buffer.from(bytes), {
      access: 'public',
      addRandomSuffix: true,
      contentType: type,
    });
    return NextResponse.json({ url: blob.url, name: asset.name });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
