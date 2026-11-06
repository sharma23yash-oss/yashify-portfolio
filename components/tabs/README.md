# The five tabs

`app/page.tsx` shows four tabs: **Portfolio · YouTube · YGL Market Briefs · Yashify AI**.

A tab is a URL fragment: `/#youtube`, `/#newsletters`, `/#ai`. The plain page (and any other
fragment, such as `/#projects`) is the Portfolio, so every older link keeps working. Back and forward move
between tabs, and a link to a tab can be shared.

| File | What it does |
| --- | --- |
| `view.ts` | the list of tabs and the small router (`useView`, `goToView`) |
| `TabBar.tsx` | the tab bar in the header, and `TabPanel` (the Portfolio stays mounted; the other tabs are built when opened) |
| `YouTubePanel.tsx` | the YouTube tab, with the Brush Script MT welcome heading |
| `NewsletterPanel.tsx` | the YGL Market Briefs tab (`/#newsletters`) and its optional e-mail box |
| `AiPanel.tsx`, `ai-tools.ts` | the Yashify AI tab and the list of AI tools it shows |
| `copy.ts` | the "copy to the clipboard" helper |

## What to edit

The content of the tabs sits near the top of `app/page.tsx`, below `SITE`.

### YouTube: `YOUTUBE`

- `welcome` is the large Brush Script MT heading. Brush Script MT is a system font on macOS and Windows;
  other devices fall back to a similar handwriting font.
- `channelId` (starts with `UC`; YouTube Studio, Settings, Channel, Advanced settings) adds a
  **Latest uploads** player that updates by itself.
- `videos` lists hand-picked videos: `{ url: 'https://www.youtube.com/watch?v=…', title: '…' }`.

Videos load only when someone clicks play, so the tab stays fast.

### Newsletters: `NEWSLETTERS`

Each item in `items` becomes a card with a subscribe button. The **e-mail box** under the cards is off until
you give it somewhere to send the addresses:

1. Create a file called `.env.local` in the project folder with one line:
   `NEXT_PUBLIC_NEWSLETTER_ENDPOINT=https://your-endpoint`
2. Restart `npm run dev`.

The endpoint receives a form POST with an `email` field and should answer 200 (a JSON body of
`{"ok": false}` or an `error` is treated as a failure). It has to allow requests from your site (CORS).
A free option is a Google Apps Script web app that adds each address to a Google Sheet:

```js
// In the Sheet: Extensions, Apps Script. Paste this, then Deploy, New deployment, Web app,
// "Execute as: Me", "Who has access: Anyone". Use the web app URL as the endpoint.
function doPost(e) {
  var email = ((e.parameter && e.parameter.email) || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return reply({ ok: false, error: 'invalid email' });
  SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].appendRow([new Date(), email]);
  return reply({ ok: true });
}
function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
```

The Content Security Policy in `next.config.ts` lets the page contact exactly that one address and nothing else. (For a
Google Apps Script address it also allows `script.googleusercontent.com`, because Google sends the answer from there.)
Restart `npm run dev` after changing `.env.local`, and add the variable to your hosting settings too when you deploy.

### Yashify AI: `ai-tools.ts`

Add an object to `AI_TOOLS` and it appears in the scrolling strip and in the directory. Give it a
`handoff` of `{ base, param }` if the tool opens with a prompt in its link (`base?param=your prompt`), or
`'copy'` to have the prompt copied for pasting. `LAUNCHER_IDS` picks the big buttons under the prompt box.

Yashify AI is a launchpad: it does not run an AI model of its own, and nothing typed in it is sent to this site.
