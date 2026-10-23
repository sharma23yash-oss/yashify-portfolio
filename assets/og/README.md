# Fonts for the share-preview image

`app/opengraph-image.tsx` draws the picture that LinkedIn, WhatsApp, X and other apps show when the
site is shared. It needs real font files, so these are bundled (Latin subsets from Fontsource):

| File | Font | Licence |
| --- | --- | --- |
| `SourceSerif4-SemiBold.woff` | Source Serif 4 | SIL Open Font License 1.1, see `LICENSE-SourceSerif4.txt` |
| `Geist-Regular.woff`, `Geist-SemiBold.woff` | Geist (© Vercel) | SIL Open Font License 1.1, see `LICENSE-Geist.txt` |

Keep them as `.woff`, `.ttf` or `.otf`: the image renderer cannot read `.woff2`.
