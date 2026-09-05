import { handleUpload } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/current-user';

/* Same shape as the avatar upload: the browser sends the file straight to
   Blob against a short-lived token, because a server action would cap the
   body at 1MB and a phone photo is far bigger. */
export const dynamic = 'force-dynamic';

const MAX_PROOF = 12 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await request.json();
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const prefix = `proofs/${session.id}-`;
        if (!String(pathname).startsWith(prefix)) throw new Error('Bad upload path.');
        return {
          allowedContentTypes: IMAGE_TYPES,
          maximumSizeInBytes: MAX_PROOF,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.id }),
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
