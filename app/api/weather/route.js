import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/current-user';

/* Weather at the venue on the night of the meet, from Open-Meteo's
   historical archive. No API key, and no third party sees anything beyond a
   city name and a date.

   Sampled at 19:00 local rather than taking the daily maximum — these are
   evening meets, and an afternoon high is not the weather anyone in the
   stands experienced. */
export const dynamic = 'force-dynamic';

/* WMO weather codes, worded the way a ticket stub would. */
const CONDITIONS = {
  0: 'clear', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast',
  45: 'fog', 48: 'freezing fog',
  51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle',
  56: 'freezing drizzle', 57: 'freezing drizzle',
  61: 'light rain', 63: 'rain', 65: 'heavy rain',
  66: 'freezing rain', 67: 'freezing rain',
  71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains',
  80: 'light showers', 81: 'showers', 82: 'heavy showers',
  85: 'snow showers', 86: 'snow showers',
  95: 'thunderstorms', 96: 'thunderstorms', 99: 'thunderstorms',
};

export async function GET(request) {
  const session = await currentUser();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const city = (searchParams.get('city') || '').trim();
  const date = (searchParams.get('date') || '').trim();

  if (!city) return NextResponse.json({ error: 'Set the location first.' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Set the date first.' }, { status: 400 });
  }
  if (new Date(`${date}T23:59:59Z`) > new Date()) {
    return NextResponse.json({ error: 'That meet has not happened yet.' }, { status: 400 });
  }

  try {
    /* The location field is "City, Country"; the geocoder wants the city. */
    const place = city.split(',')[0].trim();
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1`,
      { cache: 'no-store' }
    );
    const geo = await geoRes.json();
    const spot = geo.results?.[0];
    if (!spot) return NextResponse.json({ error: `Could not place "${place}".` }, { status: 404 });

    const url = `https://archive-api.open-meteo.com/v1/archive`
      + `?latitude=${spot.latitude}&longitude=${spot.longitude}`
      + `&start_date=${date}&end_date=${date}`
      + `&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    const hours = data.hourly?.time || [];
    /* 19:00, falling back to the last hour with a reading — the archive lags
       a few days, so a very recent meet can be partially filled. */
    let i = hours.findIndex((t) => t.endsWith('T19:00'));
    if (i < 0 || data.hourly.temperature_2m[i] === null) {
      i = hours.reduce((best, _, idx) => (data.hourly.temperature_2m[idx] !== null ? idx : best), -1);
    }
    if (i < 0) {
      return NextResponse.json({ error: 'No record for that date yet.' }, { status: 404 });
    }

    const temp = Math.round(data.hourly.temperature_2m[i]);
    const condition = CONDITIONS[data.hourly.weather_code[i]] || 'clear';
    return NextResponse.json({ text: `${temp}°F, ${condition}`, at: hours[i], place: spot.name });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
