# EBCI Brand Assets

Logos shipped under `public/` so they're served statically from the
app origin and can be used in both the web UI and in transactional
emails (where absolute URLs are required).

| File | Use on… | Access |
| --- | --- | --- |
| `ebci-logo-silver.png` | dark / maroon backgrounds (headers, email hero) | `/brand/ebci-logo-silver.png` |
| `ebci-logo-maroon.png` | white / light backgrounds (footers, print) | `/brand/ebci-logo-maroon.png` |

Both files:
- Wordmark "EBCI" + tagline "Quality · Accuracy · Responsibility"
- Transparent background
- ~3.4:1 aspect ratio (width-dominant)

### Web usage

```tsx
<img src="/brand/ebci-logo-silver.png" alt="EBCI" className="h-10 md:h-12 w-auto" />
```

### Email usage (absolute URL, Outlook-safe)

```tsx
const logo = `${BASE_URL}/brand/ebci-logo-silver.png`
// in the email HTML:
<img src={logo} alt="EBCI" width="180" style="display:inline-block;height:auto;max-width:180px;" />
```

`width` as an attribute (not just CSS) is required for Outlook to
size the image correctly; `height: auto` in `style` preserves the
aspect ratio.

Do **not** inline the logos as base64 in email HTML — Gmail will clip
the message ("[...]"). Keep them as `<img src>` pointing at
production.
