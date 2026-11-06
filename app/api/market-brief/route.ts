import { istToday, writeSection, type Session, type WriteResult } from '@/lib/market-brief';

/**
 * Writes one section of the YGL market briefs into Notion (see lib/market-brief.ts).
 *
 *   GET /api/market-brief?session=open|close|weekly[&date=YYYY-MM-DD][&dry=1][&force=1]
 *
 * Vercel Cron calls it twice every weekday (vercel.json) and sends `Authorization: Bearer <CRON_SECRET>`;
 * any request without that secret is refused. The Friday close run also writes the weekly strategy
 * (the free Vercel plan allows only two cron jobs). `date` fills in a past day (news is only added
 * for the current day or week), `dry=1` returns what would be written without touching Notion, and
 * `force=1` replaces a section this job wrote before.
 */

export const maxDuration = 60; // seconds; a brief needs about 60 small price requests

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SESSIONS: Session[] = ['open', 'close', 'weekly'];

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const session = params.get('session') as Session;
  if (!SESSIONS.includes(session)) {
    return Response.json({ error: 'session must be open, close or weekly' }, { status: 400 });
  }
  const date = params.get('date') ?? istToday();
  if (!DATE.test(date) || date > istToday()) {
    return Response.json({ error: 'date must be YYYY-MM-DD and not in the future' }, { status: 400 });
  }
  const options = { dryRun: params.get('dry') === '1', force: params.get('force') === '1' };

  // Friday's close also writes the week in review (the weekday of a YYYY-MM-DD date is the same in any zone).
  const runs: Session[] = session === 'close' && new Date(`${date}T00:00:00Z`).getUTCDay() === 5 ? ['close', 'weekly'] : [session];

  const results: (WriteResult | { session: Session; error: string })[] = [];
  for (const run of runs) {
    try {
      const result = await writeSection(run, date, options);
      console.log(`market-brief: ${run} ${date} ${result.status}${result.pageCreated ? ' (page created)' : ''}`);
      results.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`market-brief: ${run} ${date} failed: ${message}`);
      results.push({ session: run, error: message });
    }
  }
  const failed = results.some((r) => 'error' in r);
  return Response.json(results.length === 1 ? results[0] : results, { status: failed ? 500 : 200 });
}
