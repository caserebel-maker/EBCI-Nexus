# EBCI Check-in Kiosk

Windows 10 fullscreen kiosk app for a portrait 40-inch TV check-in display.

## What It Does

- Opens a single Electron `BrowserWindow` in fullscreen kiosk mode.
- Shows a live Canva presentation or Canva website as the standby background.
- Listens for USB RFID/card readers that type a card ID and press Enter.
- Shows a futuristic welcome HUD overlay for 3 seconds when an employee is found.
- Shows a smaller unknown-card message when a card ID is not found.
- Falls back to `public/assets/fallback-standby.png` if Canva cannot be loaded.

## Setup

1. Install dependencies:

   ```powershell
   npm.cmd install
   ```

2. Edit `public/config.json`:

   ```json
   {
     "standbyMode": "canva",
     "canvaUrl": "https://www.canva.com/design/xxxxx/view",
     "popupDurationMs": 3000,
     "canvaAdvanceIntervalMs": 8000,
     "unknownCardMessage": "ไม่พบข้อมูลพนักงาน",
     "companyName": "EBCI",
     "fallbackImage": "assets/fallback-standby.png"
   }
   ```

   After the app is installed, the runtime config is copied to:

   ```txt
   %APPDATA%\ebci-checkin-kiosk\config.json
   ```

   Edit that file on the kiosk machine when changing the Canva URL after installation.

3. Edit `public/employees.json` and put employee photos in `public/assets/employees/`.

4. Run in development mode:

   ```powershell
   npm.cmd run dev
   ```

5. Build the app:

   ```powershell
   npm.cmd run build
   ```

6. Package Windows installer:

   ```powershell
   npm.cmd run dist
   ```

   The installer will be created in `release/`.

## Keyboard Controls

- Scan card: card reader types `cardId` then Enter.
- Ctrl+D: show or hide hidden debug panel.
- Ctrl+R: reload Canva background.
- F11: toggle fullscreen/kiosk for testing.
- Press ESC 3 times quickly: close the app for maintenance.

## Canva Notes

The app first tries to render Canva in an iframe inside React. If the iframe does not finish loading quickly, it switches to Electron `webview`, which is usually more tolerant for embedded websites. Canva always stays inside the same kiosk window, behind the React overlay.
