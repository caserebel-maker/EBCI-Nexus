# EBCI Welcome TV Runbook

The Welcome TV display polls the HIP Time SQL Server database for new card
scans, looks up the employee profile, and broadcasts a welcome overlay to the
TV browser through Server-Sent Events (SSE).

## Requirements

- Windows with HIP Time 4.0 and SQL Server Express
- Database: `Synctime`
- Scan table: `dbo.Transcantime`
- Node.js LTS
- SQL Server command-line tool (`SQLCMD.EXE`)

## Environment

Create `.env.local` in the repository root:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
CARD_SCAN_WEBHOOK_SECRET=...
NEXUS_CARD_SCAN_WEBHOOK=https://ebci-nexus.vercel.app/api/webhooks/card-scan
SQLCMD_PATH=C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE
```

Never commit `.env.local`.

## Start Welcome TV

```powershell
npm install
npm run welcome:server
```

Open:

- Live display: `http://localhost:3999/welcome`
- Overlay preview: `http://localhost:3999/welcome?preview=1`
- Health check: `http://localhost:3999/health`
- Trigger test scan: `http://localhost:3999/test`

To keep the server running and restart it after failure:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\run-welcome-server-loop.ps1
```

## HIP SQL Sync

Run one sync:

```powershell
npm run hip:sql-sync -- --once --limit 50
```

Run the repeating Windows loop:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\run-hip-sql-sync-loop.ps1
```

## Assets

- `public/mascot.png`: static idle mascot
- `public/mascot.webm` or `public/mascot.mp4`: optional animated mascot
- `public/bg-idle.png`: optional final idle background
- `public/bg-welcome.png`: optional final welcome background

The display automatically falls back to the static mascot when no video is
available.

## Architecture

```text
HIP card reader
  -> HIP Time 4.0
  -> SQL Server Express / Synctime / Transcantime
  -> welcome-server.mjs
  -> SSE /events
  -> welcome-display.html
```

The HIP reader accepts only one active connection at a time. Keep HIP Time
connected to the reader and let the Welcome TV poll SQL Server instead of
connecting directly to the reader.
