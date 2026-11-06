import { istToday, writeSection, type Session } from '@/lib/market-brief';

/**
 * Writes one section of the YGL Daily Market Brief into Notion (see lib/market-brief.ts).
 *
 *   GET /api/market-brief?session=open|close[&date=YYYY-MM-DD][&dry=1]
 *
 * Vercel Cron calls it twice every weekday (vercel.json) and sends `Authorization: Bearer <CRON_SECRET>`;
 * any request without that secret is refused. `date` fills in a past day (headlines are only added
 * for today), and `dry=1` returns what would be written without touching Notion.
 */

export const maxDuration = 60; // seconds; a brief needs about 60 small price requests

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const session = params.get('session');
  if (session !== 'open' && session !== 'close') {
    return Response.json({ error: 'session must be open or close' }, { status: 400 });
  }
  const date = params.get('date') ?? istToday();
  if (!DATE.test(date) || date > istToday()) {
    return Response.json({ error: 'date must be YYYY-MM-DD and not in the future' }, { status: 400 });
  }

  try {
    const result = await writeSection(session as Session, date, { dryRun: params.get('dry') === '1' });
    console.log(`market-brief: ${session} ${date} ${result.status}${result.pageCreated ? ' (page created)' : ''}`);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`market-brief: ${session} ${date} failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
}
