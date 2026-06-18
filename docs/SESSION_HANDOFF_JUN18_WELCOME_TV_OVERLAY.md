# Session Handoff: Welcome TV Overlay

Date: 2026-06-18
Repo: EBCI-Nexus-App
Branch: main
Latest overlay commit: a7bf47b Add Windows welcome TV overlay app

## Goal

ทำระบบ Welcome TV แบบไม่ต้อง embed Canva ในเว็บ EBCI แล้ว เพื่อเลี่ยงปัญหา Canva slide ไม่ autoplay เมื่ออยู่ใน iframe

แนวทางใหม่:

1. เปิด Canva presentation บนเครื่อง Windows ที่ต่อทีวีโดยตรง
2. ให้ Canva เป็นตัว autoplay/fullscreen เอง
3. รันแอป overlay โปร่งใสของ EBCI ทับด้านบน
4. เมื่อพนักงานแตะบัตรและข้อมูลเข้า Supabase `card_scans` แอป overlay จะเด้ง popup ต้อนรับ 3 วินาที แล้วปิดเอง

## Files Added

- `apps/welcome-tv-overlay/package.json`
- `apps/welcome-tv-overlay/package-lock.json`
- `apps/welcome-tv-overlay/main.js`
- `apps/welcome-tv-overlay/preload.js`
- `apps/welcome-tv-overlay/renderer.html`
- `apps/welcome-tv-overlay/renderer.js`
- `apps/welcome-tv-overlay/config.example.json`
- `apps/welcome-tv-overlay/README.md`
- `apps/welcome-tv-overlay/assets/frame1.png`
- `apps/welcome-tv-overlay/assets/ebci-logo-silver.png`

## What The Overlay Does

- Runs as an Electron app on Windows
- Transparent fullscreen window
- Always-on-top over Canva
- Click-through, so mouse/keyboard still control Canva behind it
- Listens to Supabase Realtime insert events on `public.card_scans`
- Fetches employee data from `employees`
- Shows welcome/check-in or check-out popup for 3 seconds
- Plays a short chime by default

## Windows Setup

On the Windows TV machine:

```powershell
git pull
cd apps\welcome-tv-overlay
copy config.example.json config.json
npm install
npm start
```

Edit `config.json` before starting:

```json
{
  "supabaseUrl": "https://YOUR_PROJECT.supabase.co",
  "supabaseAnonKey": "YOUR_SUPABASE_ANON_KEY",
  "popupDurationMs": 3000,
  "soundEnabled": true,
  "timezone": "Asia/Bangkok"
}
```

Important:

- Use Supabase anon key only
- Do not use service role key in this app
- `config.json` is ignored by git

## Daily Operating Steps

1. Turn on the Windows PC connected to the vertical TV
2. Open Chrome or Edge
3. Open the Canva presentation link
4. Start Canva presentation autoplay/fullscreen from Canva itself
5. Open PowerShell in the repo
6. Run:

```powershell
cd apps\welcome-tv-overlay
npm start
```

7. Press `Ctrl + Alt + T` once to test popup
8. Leave both Canva and overlay running

## Hotkeys

- `Ctrl + Alt + T`: show demo popup
- `Ctrl + Alt + R`: reload overlay
- `Ctrl + Alt + D`: open/close DevTools
- `Ctrl + Alt + Q`: quit overlay

## Expected Real Behavior

If Canva is open full-screen and the overlay app is running:

1. Employee taps card at HIP device
2. HIP sync/agent inserts a row into Supabase `card_scans`
3. Supabase Realtime sends the insert event to the Windows overlay
4. Overlay fetches the employee profile/photo
5. Popup appears over the Canva slide for 3 seconds
6. Popup disappears automatically
7. Canva keeps autoplaying in the background

## Testing Without Real Card Tap

Use demo hotkey:

```text
Ctrl + Alt + T
```

This shows a demo employee popup for 3 seconds.

Use real card test:

1. Keep Canva running
2. Keep overlay running
3. Tap an employee card
4. Watch for popup
5. Check the lower-left overlay status log if popup does not appear

## Troubleshooting

### Popup does not appear

Check:

- `config.json` exists
- `supabaseUrl` is correct
- `supabaseAnonKey` is correct
- Windows machine has internet
- Supabase Realtime is enabled for `card_scans`
- New rows are actually inserted into `card_scans`
- Employee ID in `card_scans.employee_id` matches an active row in `employees`

### Canva appears above the popup

Try:

1. Open Canva fullscreen first
2. Start overlay after Canva is already fullscreen
3. If still behind, press `Ctrl + Alt + R`
4. If needed, quit overlay with `Ctrl + Alt + Q` and start it again

### Sound does not play

Check:

- Windows volume
- Browser/Canva volume is unrelated; overlay uses its own Electron audio
- `soundEnabled` in `config.json` should be `true`
- If sound still fails, press `Ctrl + Alt + T` once after app starts

### Popup shows but employee photo missing

Check:

- `employees.photo_url`
- Supabase storage bucket `employee-photos`
- Public URL access for that image

## Production Notes

- This overlay app does not need Vercel deploy
- This overlay app should run on the Windows PC connected to TV
- Canva presentation should be opened normally outside EBCI Nexus
- The overlay is only responsible for the popup
- This avoids Canva iframe autoplay restrictions

## Next Recommended Improvements

1. Create a Windows shortcut/startup script for one-click launch
2. Build a portable `.exe` with:

```powershell
npm run pack:win
```

3. Add optional config to hide the lower-left debug status in production
4. Add a small health indicator page for HR/IT to see whether the overlay is online

