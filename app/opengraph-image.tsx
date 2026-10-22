import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * The share-preview picture (1200 x 630) that LinkedIn, WhatsApp, Slack, iMessage and X show when
 * the site's link is pasted. Next.js draws it once at build time and adds the og:image tags itself,
 * so there is nothing else to wire up. app/twitter-image.tsx reuses this card for X.
 *
 * Edit the words in the JSX below. Keep text large (the card is shown at thumbnail size), keep the
 * layout to flexbox (the renderer has no CSS grid) and keep the fonts in assets/og/.
 * Keep important content away from the top and bottom 40px: X crops the card to 2:1.
 */

export const alt =
  'Yash Sharma. Equity research and financial modeling. MBA 2027 (Finance & Marketing), MANIT Bhopal.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const NAVY = '#0B1F3A';
const TEAL = '#5EEAD4';
const SLATE = '#CBD5E1';

const readFont = (file: string) => readFile(join(process.cwd(), 'assets/og', file));
const [serifSemiBold, sansRegular, sansSemiBold] = await Promise.all([
  readFont('SourceSerif4-SemiBold.woff'),
  readFont('Geist-Regular.woff'),
  readFont('Geist-SemiBold.woff'),
]);

/* The little chart on the right is only a picture of "a model's output": it carries no real numbers.
 * Bars are heights in px (the last two are drawn as estimates), the line joins the bar tops. */
const YEARS = ['FY24', 'FY25', 'FY26', 'FY27E', 'FY28E'];
const BARS = [58, 76, 98, 124, 152];
const BAR_W = 40;
const BAR_GAP = 18;
const CHART_W = YEARS.length * BAR_W + (YEARS.length - 1) * BAR_GAP; // 272
const CHART_H = 190;
const ESTIMATE_FROM = 3;
const LINE_POINTS = BARS.map((h, i) => `${i * (BAR_W + BAR_GAP) + BAR_W / 2},${CHART_H - h - 18}`);

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundColor: NAVY,
          backgroundImage:
            'radial-gradient(circle at 90% 8%, rgba(20,184,166,0.32), rgba(20,184,166,0) 46%), radial-gradient(circle at 6% 104%, rgba(48,84,168,0.42), rgba(48,84,168,0) 52%)',
          fontFamily: 'Geist',
          color: '#FFFFFF',
        }}
      >
        {/* left: who, and what */}
        <div
          style={{
            position: 'absolute',
            left: 72,
            top: 0,
            bottom: 0,
            width: 700,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 21,
              fontWeight: 600,
              letterSpacing: 2.4,
              color: TEAL,
            }}
          >
            MBA 2027 · FINANCE & MARKETING · MANIT BHOPAL
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 26,
              fontFamily: 'Source Serif 4',
              fontSize: 106,
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: -2,
              whiteSpace: 'nowrap',
            }}
          >
            Yash Sharma
          </div>

          <div
            style={{
              display: 'flex',
              width: 96,
              height: 5,
              margin: '30px 0',
              borderRadius: 3,
              backgroundImage: 'linear-gradient(90deg, #14B8A6, #34D399)',
            }}
          />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 56,
              fontWeight: 600,
              lineHeight: 1.12,
              color: TEAL,
            }}
          >
            <div style={{ display: 'flex' }}>Equity Research &</div>
            <div style={{ display: 'flex' }}>Financial Modeling</div>
          </div>

          <div style={{ display: 'flex', marginTop: 30, fontSize: 30, color: SLATE }}>
            3-statement & DCF models · Indian equities
          </div>
        </div>

        {/* right: a picture of a model's output */}
        <div
          style={{
            position: 'absolute',
            left: 804,
            top: 172,
            width: CHART_W + 56,
            height: CHART_H + 56 + 38,
            display: 'flex',
            flexDirection: 'column',
            padding: 28,
            borderRadius: 28,
            border: '1.5px solid rgba(255,255,255,0.18)',
            backgroundColor: 'rgba(255,255,255,0.07)',
          }}
        >
          <div style={{ display: 'flex', position: 'relative', width: CHART_W, height: CHART_H }}>
            {[0.25, 0.5, 0.75].map((f) => (
              <div
                key={f}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: CHART_H * f,
                  width: CHART_W,
                  height: 1,
                  backgroundColor: 'rgba(255,255,255,0.10)',
                }}
              />
            ))}

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: BAR_GAP,
                width: CHART_W,
                height: CHART_H,
              }}
            >
              {BARS.map((h, i) => (
                <div
                  key={YEARS[i]}
                  style={{
                    display: 'flex',
                    width: BAR_W,
                    height: h,
                    borderRadius: 8,
                    ...(i < ESTIMATE_FROM
                      ? { backgroundColor: 'rgba(94,234,212,0.85)' }
                      : {
                          backgroundColor: 'rgba(94,234,212,0.16)',
                          border: '2px dashed rgba(94,234,212,0.9)',
                        }),
                  }}
                />
              ))}
            </div>

            <svg
              width={CHART_W}
              height={CHART_H}
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              style={{ position: 'absolute', left: 0, top: 0 }}
            >
              <polyline
                points={LINE_POINTS.join(' ')}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {LINE_POINTS.map((p) => {
                const [x, y] = p.split(',');
                return <circle key={p} cx={x} cy={y} r="6" fill={NAVY} stroke="#FFFFFF" strokeWidth="3" />;
              })}
            </svg>
          </div>

          <div style={{ display: 'flex', gap: BAR_GAP, marginTop: 14, width: CHART_W }}>
            {YEARS.map((y) => (
              <div
                key={y}
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  width: BAR_W,
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  color: '#94A3B8',
                }}
              >
                {y}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Source Serif 4', data: serifSemiBold, weight: 600, style: 'normal' },
        { name: 'Geist', data: sansRegular, weight: 400, style: 'normal' },
        { name: 'Geist', data: sansSemiBold, weight: 600, style: 'normal' },
      ],
    },
  );
}
