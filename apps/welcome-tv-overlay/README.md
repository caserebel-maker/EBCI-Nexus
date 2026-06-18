# EBCI Welcome TV Overlay

Transparent Windows overlay for the TV machine. Use this when Canva should run by itself, while EBCI Nexus only shows the check-in welcome popup on top.

## Use

1. Open the Canva presentation in Chrome/Edge and start autoplay/fullscreen.
2. Run this overlay app on the same Windows machine.
3. The overlay stays click-through and always on top.
4. When a card scan is inserted into `card_scans`, the welcome popup appears for 3 seconds.

## Setup

```powershell
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

Use the public anon key only. Do not put the service role key in this app.

## Hotkeys

- `Ctrl + Alt + T`: show demo popup
- `Ctrl + Alt + R`: reload overlay
- `Ctrl + Alt + D`: open/close DevTools
- `Ctrl + Alt + Q`: quit overlay

## Production notes

For the TV:

1. Start the Canva presentation first and let Canva handle autoplay.
2. Start this overlay app after Canva is already visible on the TV.
3. Use `Ctrl + Alt + T` once to test the popup.
4. Leave it running.

The overlay is click-through, so mouse and keyboard still go to Canva behind it.
If a full-screen browser ever appears above the overlay, start the overlay again after opening Canva full-screen.
