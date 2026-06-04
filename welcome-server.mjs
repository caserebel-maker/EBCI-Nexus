/**
 * welcome-server.mjs
 * ─────────────────────────────────────────────────────────────────────
 * Lightweight SSE server for the TV Welcome Display.
 *
 * How it works:
 *   1. Polls SQL Server (Synctime.Transcantime) every 2 seconds for new
 *      card scans that happened in the last 10 seconds.
 *   2. Looks up the employee name from Employees table.
 *   3. Pushes a Server-Sent Event to all connected browsers.
 *   4. The browser (welcome-display.html) shows a welcome message + plays sound.
 *
 * Run: node welcome-server.mjs
 * Then open: http://localhost:3999/welcome
 */

import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables from .env.local and .env
const repoRoot = __dirname
for (const f of ['.env.local', '.env']) {
    const p = path.join(repoRoot, f)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
        const t = line.trim()
        if (!t || t.startsWith('#') || !t.includes('=')) continue
        const [k, ...v] = t.split('=')
        const val = v.join('=').trim().replace(/^["']|["']$/g,'')
        if (!process.env[k.trim()]) process.env[k.trim()] = val
    }
}
// Initialize Supabase Client if env keys exist
let supabase = null
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (supabaseUrl && supabaseServiceRoleKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })
        console.log('[welcome] Direct Supabase connection initialized.')
    } catch (err) {
        console.error('[welcome] Failed to initialize direct Supabase connection:', err.message)
    }
}

// ─── Config ──────────────────────────────────────────────────────────
const PORT = 3999
const POLL_INTERVAL_MS = 250    // poll faster (4 times a second) for real-time reaction
const SCAN_WINDOW_SECS = 300    // look back 5 minutes for new scans (robust to HIP sync delay)
const SQLCMD = process.env.SQLCMD_PATH
    || 'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\SQLCMD.EXE'
const SQL_SERVER = process.env.SQL_SERVER || '.\\SQLEXPRESS'

// ─── SSE clients ─────────────────────────────────────────────────────
const clients = new Set()

function broadcast(data) {
    const payload = `data: ${JSON.stringify(data)}\n\n`
    for (const res of clients) {
        try { res.write(payload) } catch { clients.delete(res) }
    }
}

// ─── SQL helpers ─────────────────────────────────────────────────────
function runSql(query) {
    try {
        const cmd = `"${SQLCMD}" -S ${SQL_SERVER} -d Synctime -E -W -s "|" -Q "${query.replace(/"/g, '\\"')}"`
        const out = execSync(cmd, { timeout: 8000 }).toString()
        return out
    } catch {
        return ''
    }
}

function parseRows(raw, minPipes = 1) {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
    // Skip separator rows (------|------)
    // For single-column queries, minPipes = 0 (no pipe needed)
    return lines.filter(l => !l.startsWith('-') && (minPipes === 0 ? true : l.includes('|')))
}

// Track last seen scan id so we don't show the same person twice
let lastSeenId = 0

async function pollForNewScans() {
    // Find scans in the last SCAN_WINDOW_SECS seconds that are newer than lastSeenId
    // Join with Student table to get employee name (studentnamee = English name)
    const query = [
        'SELECT TOP 5',
        'CAST(t.id AS nvarchar(30)) AS id,',
        'CAST(t.enrollnumber AS nvarchar(50)) AS enrollnumber,',
        "ISNULL(CONVERT(nvarchar(50), t.datetimescan, 126), '') AS datetimescan,",
        "ISNULL(CAST(s.studentnamee AS nvarchar(100)), '') AS empname_en,",
        "ISNULL(CAST(s.studentname AS nvarchar(100)), '') AS empname_th,",
        "ISNULL(CAST(s.levelcode AS nvarchar(50)), '') AS dept",
        'FROM dbo.Transcantime t',
        'LEFT JOIN dbo.Student s ON CAST(s.enrollnumber AS nvarchar(50)) = CAST(t.enrollnumber AS nvarchar(50))',
        `WHERE t.id > ${lastSeenId}`,
        `AND t.datetimescan >= DATEADD(SECOND, -${SCAN_WINDOW_SECS}, GETDATE())`,
        'ORDER BY t.id ASC',
    ].join(' ')

    const raw = runSql(query)
    const rows = parseRows(raw)

    for (const row of rows) {
        const parts = row.split('|').map(p => p.trim())
        if (parts.length < 3) continue

        const [id, enrollnumber, scantime, empname_en, empname_th, dept] = parts
        const idNum = parseInt(id, 10)
        if (isNaN(idNum) || idNum <= lastSeenId) continue

        lastSeenId = idNum

        // Prefer English name (no encoding issues); fallback to Thai if available and not all '?'
        const hasThai = empname_th && empname_th !== '' && !empname_th.match(/^\?+$/)
        const hasEnglish = empname_en && empname_en !== ''
        let name = hasEnglish ? empname_en : (hasThai ? empname_th : `ID ${enrollnumber}`)
        let department = (dept && dept !== '') ? dept : null
        let nickname = null
        let photo_url = null

        // Derive employee code
        let empCode = String(enrollnumber || '').trim()
        if (/^7\d{5}$/.test(empCode)) {
            const code = empCode.slice(1)
            empCode = `${code.slice(0, 3)}-${code.slice(3)}`
        } else if (/^\d{5}$/.test(empCode)) {
            empCode = `${empCode.slice(0, 3)}-${empCode.slice(3)}`
        }

        // Try direct Supabase lookup first
        if (supabase) {
            console.log(`[welcome] Fetching profile for code ${empCode} directly from Supabase...`)
            try {
                const { data, error } = await supabase
                    .from('employees')
                    .select('first_name_th, last_name_th, nickname, photo_url, department')
                    .eq('employee_code', empCode)
                    .maybeSingle()

                if (error) throw error
                if (data) {
                    name = `${data.first_name_th ?? ''} ${data.last_name_th ?? ''}`.trim() || name
                    nickname = data.nickname || null
                    photo_url = data.photo_url || null
                    department = data.department || department
                    console.log(`[welcome] Direct Supabase profile loaded: ${name} (${nickname})`)
                } else {
                    console.log(`[welcome] Direct Supabase profile not found for code ${empCode}`)
                }
            } catch (err) {
                console.log(`[welcome] Direct Supabase query failed for ${empCode}: ${err.message}`)
            }
        }

        // If direct lookup didn't yield results, fallback to Vercel API
        if (!nickname && !photo_url && process.env.CARD_SCAN_WEBHOOK_SECRET) {
            const webhookUrl = process.env.NEXUS_CARD_SCAN_WEBHOOK || 'https://ebci-nexus.vercel.app/api/webhooks/card-scan'
            const appUrl = new URL(webhookUrl).origin
            const profileApiUrl = `${appUrl}/api/employees/profile-by-code?code=${encodeURIComponent(empCode)}`
            const secret = process.env.CARD_SCAN_WEBHOOK_SECRET

            console.log(`[welcome] Fetching profile for code ${empCode} from Vercel...`)
            try {
                const res = await fetch(profileApiUrl, {
                    headers: {
                        'x-webhook-secret': secret
                    },
                    signal: AbortSignal.timeout(2000)
                })
                if (res.ok) {
                    const profile = await res.json()
                    if (profile.name) name = profile.name
                    if (profile.nickname) nickname = profile.nickname
                    if (profile.photo_url) photo_url = profile.photo_url
                    if (profile.department) department = profile.department
                    console.log(`[welcome] Vercel profile loaded: ${name} (${nickname || 'no-nick'}) - Photo: ${photo_url ? 'Yes' : 'No'}`)
                } else {
                    console.log(`[welcome] Vercel profile fetch returned status ${res.status}`)
                }
            } catch (err) {
                console.log(`[welcome] Failed to fetch profile from Vercel for ${empCode}: ${err.message}`)
            }
        }

        console.log(`[welcome] 🎉 Scan detected: ${name}${department ? ` (${department})` : ''} at ${scantime}`)

        broadcast({
            type: 'scan',
            id: idNum,
            enrollnumber,
            scantime,
            name,
            nickname,
            photo_url,
            department,
        })
    }
}

// Initialize lastSeenId to current max so we only show NEW scans after server starts
function initLastSeenId() {
    const raw = runSql('SELECT ISNULL(MAX(id), 0) FROM Transcantime')
    // Result is a single value — no pipe separator. Just find the first numeric line.
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('-') && !l.startsWith('('))
    for (const line of lines) {
        const stripped = line.replace(/\|/g, '').trim()
        const val = parseInt(stripped, 10)
        if (!isNaN(val)) {
            lastSeenId = val
            console.log(`[welcome] Starting from scan id ${lastSeenId}`)
            break
        }
    }
    if (lastSeenId === 0) {
        console.log('[welcome] Could not read max id from SQL Server — starting from 0')
    }
}

// ─── HTTP Server ──────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`)

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*')

    // Serve the HTML display page
    if (url.pathname === '/' || url.pathname === '/welcome') {
        const htmlPath = path.join(__dirname, 'welcome-display.html')
        if (fs.existsSync(htmlPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end(fs.readFileSync(htmlPath))
        } else {
            res.writeHead(404)
            res.end('welcome-display.html not found')
        }
        return
    }

    // Serve public static assets
    if (url.pathname.startsWith('/public/')) {
        const filePath = path.join(__dirname, url.pathname)
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase()
            const mimeTypes = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.webm': 'video/webm',
                '.mp4': 'video/mp4',
                '.webp': 'image/webp'
            }
            const contentType = mimeTypes[ext] || 'application/octet-stream'
            const stat = fs.statSync(filePath)
            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': stat.size,
                'Cache-Control': 'public, max-age=3600'
            })
            fs.createReadStream(filePath).pipe(res)
        } else {
            res.writeHead(404)
            res.end('Asset not found')
        }
        return
    }

    // SSE endpoint for real-time events
    if (url.pathname === '/events') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        })
        res.write(': connected\n\n')

        clients.add(res)
        console.log(`[welcome] Client connected. Total: ${clients.size}`)

        // Send current status
        res.write(`data: ${JSON.stringify({ type: 'status', message: 'connected', lastSeenId })}\n\n`)

        req.on('close', () => {
            clients.delete(res)
            console.log(`[welcome] Client disconnected. Total: ${clients.size}`)
        })
        return
    }

    // Test endpoint — simulate a scan (for debugging)
    if (url.pathname === '/test') {
        const empCode = '506-69'
        const webhookUrl = process.env.NEXUS_CARD_SCAN_WEBHOOK || 'https://ebci-nexus.vercel.app/api/webhooks/card-scan'
        const appUrl = new URL(webhookUrl).origin
        const profileApiUrl = `${appUrl}/api/employees/profile-by-code?code=${encodeURIComponent(empCode)}`
        const secret = process.env.CARD_SCAN_WEBHOOK_SECRET

        let name = 'พนักงาน ทดสอบ'
        let nickname = 'เทสต์'
        let photo_url = null
        let department = 'IT'

        const sendScan = () => {
            broadcast({
                type: 'scan',
                id: 999999,
                enrollnumber: '750669',
                scantime: new Date().toISOString(),
                name,
                nickname,
                photo_url,
                department,
            })
        }

        const runTest = async () => {
            // Try direct Supabase lookup first
            if (supabase) {
                console.log(`[welcome] [Test] Fetching profile for code ${empCode} directly from Supabase...`)
                try {
                    const { data, error } = await supabase
                        .from('employees')
                        .select('first_name_th, last_name_th, nickname, photo_url, department')
                        .eq('employee_code', empCode)
                        .maybeSingle()
                    if (error) throw error
                    if (data) {
                        name = `${data.first_name_th ?? ''} ${data.last_name_th ?? ''}`.trim() || name
                        nickname = data.nickname || nickname
                        photo_url = data.photo_url || photo_url
                        department = data.department || department
                        console.log(`[welcome] [Test] Direct Supabase profile loaded successfully: ${name}`)
                        sendScan()
                        return
                    }
                } catch (err) {
                    console.log(`[welcome] [Test] Direct Supabase query failed: ${err.message}`)
                }
            }

            // Fallback to Vercel API lookup
            if (secret) {
                console.log(`[welcome] [Test] Fetching profile for code ${empCode} from Vercel...`)
                try {
                    const res = await fetch(profileApiUrl, {
                        headers: {
                            'x-webhook-secret': secret
                        },
                        signal: AbortSignal.timeout(3000)
                    })
                    if (res.ok) {
                        const profile = await res.json()
                        if (profile.name) name = profile.name
                        if (profile.nickname) nickname = profile.nickname
                        if (profile.photo_url) photo_url = profile.photo_url
                        if (profile.department) department = profile.department
                        console.log(`[welcome] [Test] Vercel profile loaded successfully: ${name}`)
                    } else {
                        console.log(`[welcome] [Test] Vercel API returned status ${res.status}`)
                    }
                } catch (err) {
                    console.log(`[welcome] [Test] Fallback to mock profile due to error: ${err.message}`)
                }
            }
            sendScan()
        }

        runTest()

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, message: 'Test scan triggered!' }))
        return
    }

    // Health check
    if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, lastSeenId, clients: clients.size }))
        return
    }

    res.writeHead(404)
    res.end('Not found')
})

server.listen(PORT, () => {
    console.log(`╔══════════════════════════════════════════════════╗`)
    console.log(`║   EBCI Welcome Display Server                    ║`)
    console.log(`╠══════════════════════════════════════════════════╣`)
    console.log(`║   http://localhost:${PORT}/welcome               ║`)
    console.log(`║   Test: http://localhost:${PORT}/test            ║`)
    console.log(`╚══════════════════════════════════════════════════╝`)

    initLastSeenId()
    setInterval(pollForNewScans, POLL_INTERVAL_MS)
    console.log(`[welcome] Polling every ${POLL_INTERVAL_MS}ms...`)
})
