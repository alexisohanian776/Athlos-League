import { handleUpload } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/current-user';

/* Meet hero shots. Same browser-to-Blob route as avatars and proof photos,
   because a server action would cap the body at 1MB. Admin only — this
   writes public league imagery, not a personal file. */
export const dynamic = 'force-dynamic';

const MAX_PHOTO = 20 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request) {
  const session = await currentUser();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });
  }

  const body = await request.json();
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!String(pathname).startsWith('meets/')) throw new Error('Bad upload path.');
        return {
          allowedContentTypes: IMAGE_TYPES,
          maximumSizeInBytes: MAX_PHOTO,
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
