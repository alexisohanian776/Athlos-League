import { handleUpload } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/current-user';

/* Mints a short-lived, single-upload token so the browser can send the file
   straight to Blob. A server action can't carry it: Next caps action bodies
   at 1MB by default and Vercel caps any function request at 4.5MB, so a
   normal headshot never arrives. */
export const dynamic = 'force-dynamic';

const MAX_AVATAR = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request) {
  const session = await currentUser();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json();

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        /* The client proposes the pathname, so pin it to this account —
           otherwise one signed-in user could overwrite another's photo. */
        const prefix = `avatars/${session.id}-`;
        if (!String(pathname).startsWith(prefix)) {
          throw new Error('Bad upload path.');
        }
        return {
          allowedContentTypes: IMAGE_TYPES,
          maximumSizeInBytes: MAX_AVATAR,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.id }),
        };
      },
      /* The URL is persisted by the profile form when it saves, not here:
         this webhook never fires against localhost, and relying on it would
         make the feature untestable outside production. */
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
