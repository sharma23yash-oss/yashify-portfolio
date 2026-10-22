# Yashify Portfolio

The personal portfolio site of **Yash Sharma**: resume, projects, shared files, YouTube, newsletters and a launchpad of AI tools on one page with five tabs.

## The five tabs

| Tab | What it is |
| --- | --- |
| **Portfolio** | Education, internships, projects and contact details, with a link to the resume PDF |
| **Google Drive** | Files shared with "Anyone with the link" |
| **YouTube** | The channel welcome, plus the latest and hand-picked videos |
| **Newsletters** | Newsletters to subscribe to, plus an optional e-mail sign-up box |
| **Yashify AI** | A launchpad into ChatGPT, Claude, Gemini and other AI tools. No AI model runs on this site |

Each tab has its own link (`/#drive`, `/#youtube`, `/#newsletters`, `/#ai`), so a link can point straight to a tab.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · three.js with React Three Fiber and drei · Framer Motion · Lucide icons.

## Run it locally

You need Node.js 20.9 or newer.

```bash
npm install
npm run dev      # http://localhost:3005
```

Check a production build with `npm run build && npm start`.

## Edit the content

The text, links and lists of the Portfolio sit near the top of `app/page.tsx`. How to add Google Drive files, YouTube videos and newsletters is in [`components/tabs/README.md`](components/tabs/README.md). The resume is `public/resume.pdf` and the photo is `public/image.png`.

## Settings

| Variable | Needed? | What it does |
| --- | --- | --- |
| `NEXT_PUBLIC_NEWSLETTER_ENDPOINT` | Optional | An `https` address that accepts a form POST with an `email` field. Without it the sign-up box of the Newsletters tab stays off. |

Locally, put it in `.env.local`. On Vercel, add it under Project Settings, Environment Variables, then redeploy (it is read when the site is built).

## Deploy

The site is hosted on Vercel and every push to `main` deploys to production.

Logos of organisations shown on the site belong to their respective owners.
