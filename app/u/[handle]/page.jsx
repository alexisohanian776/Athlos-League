import { permanentRedirect } from 'next/navigation';

/* Fan profiles moved to /fans/<handle>, which reads better beside
   /athletes/<slug>. Old links keep working. */
export default function LegacyProfileRedirect({ params }) {
  permanentRedirect(`/fans/${params.handle}`);
}
