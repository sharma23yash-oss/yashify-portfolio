import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Share picture (1200 x 630) for /hire, in the same style as app/opengraph-image.tsx: navy card,
 * Source Serif + Geist from assets/og/, flexbox only, nothing important in the top/bottom 40px.
 * app/hire/twitter-image.tsx reuses it for X.
 */

export const alt =
  'Hire Yash Sharma: DCF models, Excel analytics, websites and AI workflows. Book a free 30-min call.';
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

const SERVICES = ['DCF & financial models', 'Excel analytics', 'Websites & web apps', 'AI workflows'];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          padding: '0 80px',
          backgroundColor: NAVY,
          backgroundImage:
            'radial-gradient(circle at 92% 6%, rgba(20,184,166,0.34), rgba(20,184,166,0) 46%), radial-gradient(circle at 4% 104%, rgba(48,84,168,0.42), rgba(48,84,168,0) 52%)',
          fontFamily: 'Geist',
          color: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', fontSize: 22, fontWeight: 600, letterSpacing: 2.6, color: TEAL }}>
          HIRE ME · YASHIFY.TECH
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 24,
            fontFamily: 'Source Serif 4',
            fontSize: 72,
            fontWeight: 600,
            lineHeight: 1.06,
            letterSpacing: -1.5,
          }}
        >
          <div style={{ display: 'flex' }}>AI-powered financial</div>
          <div style={{ display: 'flex' }}>analyst and builder</div>
        </div>

        <div
          style={{
            display: 'flex',
            width: 96,
            height: 5,
            margin: '28px 0',
            borderRadius: 3,
            backgroundImage: 'linear-gradient(90deg, #14B8A6, #34D399)',
          }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, maxWidth: 1000 }}>
          {SERVICES.map((s) => (
            <div
              key={s}
              style={{
                display: 'flex',
                padding: '10px 22px',
                borderRadius: 999,
                border: '1.5px solid rgba(94,234,212,0.55)',
                backgroundColor: 'rgba(94,234,212,0.10)',
                fontSize: 28,
                fontWeight: 600,
                color: '#FFFFFF',
              }}
            >
              {s}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', marginTop: 34, fontSize: 30, color: SLATE }}>
          Yash Sharma · Fixed quotes · Book a free 30-min call
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
