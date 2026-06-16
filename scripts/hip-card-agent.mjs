#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import ZKLib from 'node-zklib'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function loadEnvFile(fileName) {
    const filePath = path.join(repoRoot, fileName)
    if (!fs.existsSync(filePath)) return
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
        const [rawKey, ...rawValueParts] = trimmed.split('=')
        const key = rawKey.trim()
        if (process.env[key]) continue
        let value = rawValueParts.join('=').trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
        }
        process.env[key] = value
    }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

function parseArgs(argv) {
    const args = { _: [] }
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i]
        if (!token.startsWith('--')) {
            args._.push(token)
            continue
        }
        const eq = token.indexOf('=')
        if (eq > -1) {
            args[token.slice(2, eq)] = token.slice(eq + 1)
        } else {
            const key = token.slice(2)
            const next = argv[i + 1]
            if (next && !next.startsWith('--')) {
                args[key] = next
                i++
            } else {
                args[key] = true
            }
        }
    }
    return args
}

const args = parseArgs(process.argv.slice(2))
const command = args._[0] ?? 'probe'

const config = {
    host: String(args.host ?? process.env.HIP_HOST ?? '192.168.1.40'),
    port: Number(args.port ?? process.env.HIP_PORT ?? 5005),
    listenPort: Number(args.listenPort ?? args['listen-port'] ?? process.env.HIP_LISTEN_PORT ?? 7005),
    inport: Number(args.inport ?? process.env.HIP_INPORT ?? 4000),
    timeoutMs: Number(args.timeout ?? process.env.HIP_TIMEOUT_MS ?? 10000),
    webhookUrl: String(
        args.webhook ??
        process.env.NEXUS_CARD_SCAN_WEBHOOK ??
        `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://ebci-nexus.vercel.app'}/api/webhooks/card-scan`,
    ),
    secret: String(args.secret ?? process.env.CARD_SCAN_WEBHOOK_SECRET ?? ''),
    deviceId: String(args.deviceId ?? process.env.HIP_DEVICE_ID ?? 'HIPCI100S'),
    stateFile: String(args.stateFile ?? process.env.HIP_STATE_FILE ?? path.join(repoRoot, '.hip-card-agent-state.json')),
    dryRun: Boolean(args.dryRun ?? args['dry-run']),
    once: Boolean(args.once),
    verbose: Boolean(args.verbose),
    limit: Number(args.limit ?? process.env.HIP_SQL_LIMIT ?? 200),
    sinceMinutes: args.sinceMinutes ? Number(args.sinceMinutes) : null,
    codeMapPath: String(args.codeMap ?? process.env.HIP_CODE_MAP_PATH ?? ''),
    captureDir: String(args.captureDir ?? args['capture-dir'] ?? process.env.HIP_CAPTURE_DIR ?? path.join(repoRoot, 'hip-captures')),
    ackHex: String(args.ackHex ?? args['ack-hex'] ?? process.env.HIP_ACK_HEX ?? ''),
    sqlcmdPath: String(args.sqlcmd ?? process.env.SQLCMD_PATH ?? 'sqlcmd'),
    sqlServer: String(args.sqlServer ?? args['sql-server'] ?? process.env.HIP_SQL_SERVER ?? '.\\SQLEXPRESS'),
    sqlDatabase: String(args.sqlDatabase ?? args['sql-database'] ?? process.env.HIP_SQL_DATABASE ?? 'Synctime'),
    sqlUser: String(args.sqlUser ?? args['sql-user'] ?? process.env.HIP_SQL_USER ?? ''),
    sqlPassword: String(args.sqlPassword ?? args['sql-password'] ?? process.env.HIP_SQL_PASSWORD ?? ''),
    commKey: Number(args['comm-key'] ?? args.commKey ?? process.env.HIP_COMM_KEY ?? 0),
    protocol: args.protocol ?? process.env.HIP_PROTOCOL ?? undefined,
}

function usage() {
    console.log(`Usage:
  npm run hip:probe -- [--host 192.168.1.40] [--port 5005] [--comm-key 0] [--protocol tcp|udp]
  npm run hip:sync -- [--dry-run] [--since-minutes 1440]
  npm run hip:watch -- [--dry-run] [--once]
  npm run hip:capture -- [--listen-port 7005] [--once] [--ack-hex 010203]
  npm run hip:sql-sync -- [--dry-run] [--once] [--limit 200]

Environment:
  HIP_HOST=192.168.1.40
  HIP_PORT=5005
  HIP_LISTEN_PORT=7005
  HIP_COMM_KEY=0
  HIP_PROTOCOL=tcp
  CARD_SCAN_WEBHOOK_SECRET=...
  NEXUS_CARD_SCAN_WEBHOOK=https://ebci-nexus.vercel.app/api/webhooks/card-scan
  HIP_CODE_MAP_PATH=./hip-code-map.json  # optional device user id -> employee_code map
  HIP_CAPTURE_DIR=./hip-captures
  HIP_ACK_HEX=...                         # optional raw ack bytes, only after packet capture confirms it
  HIP_SQL_SERVER=.\\SQLEXPRESS
  HIP_SQL_DATABASE=Synctime
  HIP_SQL_USER=sa                          # optional; omit to use Windows auth
  HIP_SQL_PASSWORD=...
  SQLCMD_PATH=sqlcmd
`)
}

function tcpProbe() {
    return new Promise((resolve) => {
        const socket = net.createConnection({ host: config.host, port: config.port, timeout: 3000 })
        socket.once('connect', () => {
            socket.end()
            resolve({ ok: true })
        })
        socket.once('timeout', () => {
            socket.destroy()
            resolve({ ok: false, error: `TCP timeout to ${config.host}:${config.port}` })
        })
        socket.once('error', (err) => resolve({ ok: false, error: err.message }))
    })
}

async function createDevice(onErr, onClose) {
    const zk = new ZKLib(config.host, config.port, config.timeoutMs, config.inport, config.commKey, config.protocol)
    await zk.createSocket(onErr, onClose)
    return zk
}

function loadState() {
    try {
        return JSON.parse(fs.readFileSync(config.stateFile, 'utf8'))
    } catch {
        return { posted: [] }
    }
}

function saveState(state) {
    const dir = path.dirname(config.stateFile)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(config.stateFile, JSON.stringify(state, null, 2) + '\n')
}

function loadCodeMap() {
    if (!config.codeMapPath) return new Map()
    const fullPath = path.isAbsolute(config.codeMapPath)
        ? config.codeMapPath
        : path.join(repoRoot, config.codeMapPath)
    const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
    return new Map(Object.entries(raw).map(([k, v]) => [String(k), String(v)]))
}

function pad(n) {
    return String(n).padStart(2, '0')
}

function formatBangkokWallClock(value) {
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) return null
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function normalizeScan(record, codeMap) {
    const rawCode = String(record.deviceUserId ?? record.userId ?? '').trim()
    const employeeCode = codeMap.get(rawCode) ?? rawCode
    const scanTime = formatBangkokWallClock(record.recordTime ?? record.attTime)
    if (!employeeCode || !scanTime) return null
    return {
        device_id: config.deviceId,
        employee_code: employeeCode,
        scan_time: scanTime,
        raw_data: {
            source: 'hip-card-agent',
            hip_host: config.host,
            hip_port: config.port,
            raw_user_id: rawCode,
            record,
        },
    }
}

function normalizeHipEmployeeCode(row, codeMap) {
    const enroll = String(row.enrollnumber || '').trim()
    const studentCode = String(row.studentcode || '').trim()
    const rawCode = enroll || studentCode
    const mapped = codeMap.get(rawCode) ?? codeMap.get(enroll) ?? codeMap.get(studentCode)
    if (mapped) return { employeeCode: mapped, rawCode }

    const specialMapped = mapSpecialHipCode(rawCode) ?? mapSpecialHipCode(enroll) ?? mapSpecialHipCode(studentCode)
    if (specialMapped) return { employeeCode: specialMapped, rawCode }

    // HIP Ci100S enroll numbers are imported as 6 digits where the first
    // digit is a device prefix and the remaining 5 digits are the EBCI
    // employee code without a hyphen.
    // Example: 715359 -> 153-59, 750669 -> 506-69, 704845 -> 048-45.
    if (/^7\d{5}$/.test(enroll)) {
        const code = enroll.slice(1)
        return { employeeCode: `${code.slice(0, 3)}-${code.slice(3)}`, rawCode }
    }
    if (/^\d{5}$/.test(studentCode)) {
        return { employeeCode: `${studentCode.slice(0, 3)}-${studentCode.slice(3)}`, rawCode }
    }
    return { employeeCode: rawCode, rawCode }
}

function mapSpecialHipCode(raw) {
    const value = String(raw || '').trim()
    const compact = value.replace(/[\s-]/g, '')
    // Arunee "Annie" Nilbanjong has two physical card IDs from HIP.
    // Numeric SQL exports can drop the leading zero, so support both shapes.
    if (['010466', '010464', '10466', '10464', '0466', '0464', '466', '464'].includes(compact)) {
        return '466-64'
    }
    return null
}

function normalizeHipSqlDate(raw) {
    const value = String(raw ?? '').trim()
    const match = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2}):(\d{2})(?:\s*(AM|PM))?$/i)
    if (!match) return value.replace(' ', 'T')

    const [, date, rawHour, minute, second, meridiem] = match
    let hour = Number(rawHour)
    if (meridiem) {
        const upper = meridiem.toUpperCase()
        if (upper === 'AM' && hour === 12) hour = 0
        if (upper === 'PM' && hour < 12) hour += 12
    }
    return `${date}T${pad(hour)}:${minute}:${second}`
}

function normalizeSqlScan(row, codeMap) {
    const { employeeCode } = normalizeHipEmployeeCode(row, codeMap)
    const scanTime = normalizeHipSqlDate(row.datetimescan)
    if (!employeeCode || !scanTime) return null
    const scanType = String(row.timetype ?? '').trim().toLowerCase()
    return {
        device_id: `HIP-${row.machineno || config.deviceId}`,
        employee_code: employeeCode,
        scan_time: scanTime,
        scan_type: scanType === 'in' || scanType === 'out' ? scanType : undefined,
        raw_data: {
            source: 'hip-sql-sync',
            sql_server: config.sqlServer,
            sql_database: config.sqlDatabase,
            transcantime_id: row.id,
            enrollnumber: row.enrollnumber,
            studentcode: row.studentcode,
            machineno: row.machineno,
            verifymode: row.verifymode,
            verifymodestr: row.verifymodestr,
            adddate: row.adddate,
            timetype: row.timetype,
        },
    }
}

function scanKey(scan) {
    return `${scan.employee_code}|${scan.scan_time}`
}

async function queryHipSql(lastId) {
    const query = `
SET NOCOUNT ON;
SELECT TOP (${Math.max(1, Math.min(500, config.limit))})
    CAST(t.id AS nvarchar(30)) AS id,
    CAST(t.enrollnumber AS nvarchar(50)) AS enrollnumber,
    ISNULL(CAST(s.studentcode AS nvarchar(100)), '') AS studentcode,
    ISNULL(CAST(t.machineno AS nvarchar(50)), '') AS machineno,
    ISNULL(CAST(t.verifymode AS nvarchar(50)), '') AS verifymode,
    ISNULL(CAST(t.verifymodestr AS nvarchar(100)), '') AS verifymodestr,
    ISNULL(CAST(t.datetimescan AS nvarchar(100)), '') AS datetimescan,
    ISNULL(CONVERT(nvarchar(30), t.adddate, 126), '') AS adddate,
    ISNULL(CAST(t.timetype AS nvarchar(20)), '') AS timetype
FROM dbo.Transcantime t
LEFT JOIN dbo.Student s ON s.enrollnumber = t.enrollnumber
WHERE t.id > ${Number(lastId) || 0}
ORDER BY t.id ASC;
`
    const authArgs = config.sqlUser
        ? ['-U', config.sqlUser, '-P', config.sqlPassword]
        : ['-E']
    const { stdout } = await execFileAsync(config.sqlcmdPath, [
        '-S', config.sqlServer,
        ...authArgs,
        '-d', config.sqlDatabase,
        '-h', '-1',
        '-W',
        '-s', '|',
        '-Q', query,
    ], {
        cwd: repoRoot,
        windowsHide: true,
        maxBuffer: 1024 * 1024 * 5,
    })

    return stdout
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !/^\(\d+ rows? affected\)$/i.test(line))
        .map(line => {
            const [
                id, enrollnumber, studentcode, machineno, verifymode,
                verifymodestr, datetimescan, adddate, timetype,
            ] = line.split('|')
            return {
                id: Number(id),
                enrollnumber,
                studentcode,
                machineno,
                verifymode,
                verifymodestr,
                datetimescan,
                adddate,
                timetype,
            }
        })
        .filter(row => Number.isFinite(row.id))
}

function sanitizeHex(input) {
    return String(input ?? '').replace(/[^a-fA-F0-9]/g, '')
}

function decodeOptionalAck() {
    const hex = sanitizeHex(config.ackHex)
    if (!hex) return null
    if (hex.length % 2 !== 0) {
        throw new Error('HIP_ACK_HEX / --ack-hex must contain an even number of hex digits')
    }
    return Buffer.from(hex, 'hex')
}

function appendCapture(entry) {
    fs.mkdirSync(config.captureDir, { recursive: true })
    const date = new Date().toISOString().slice(0, 10)
    const file = path.join(config.captureDir, `hip-capture-${date}.jsonl`)
    fs.appendFileSync(file, JSON.stringify(entry) + '\n')
    return file
}

function compactHex(buffer, maxBytes = 96) {
    const clipped = buffer.subarray(0, maxBytes).toString('hex')
    return buffer.length > maxBytes ? `${clipped}...` : clipped
}

async function postScans(scans) {
    if (!scans.length) return { skipped: true, reason: 'no scans' }
    if (config.dryRun) {
        console.log(JSON.stringify(scans, null, 2))
        return { dryRun: true, count: scans.length }
    }
    if (!config.secret) {
        throw new Error('Missing CARD_SCAN_WEBHOOK_SECRET. Set it locally and on Vercel before posting.')
    }
    const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': config.secret,
        },
        body: JSON.stringify(scans),
    })
    const text = await res.text()
    let body
    try {
        body = JSON.parse(text)
    } catch {
        body = text
    }
    if (!res.ok) {
        throw new Error(`Webhook ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`)
    }
    return body
}

async function runProbe() {
    if (config.protocol !== 'udp') {
        console.log(`[hip-agent] TCP probe ${config.host}:${config.port}`)
        const tcp = await tcpProbe()
        if (!tcp.ok) {
            console.error(`[hip-agent] TCP failed: ${tcp.error}`)
            process.exitCode = 1
            return
        }
        console.log('[hip-agent] TCP ok')
    } else {
        console.log(`[hip-agent] UDP mode selected, skipping TCP probe to ${config.host}:${config.port}`)
    }

    let zk
    try {
        zk = await createDevice()
        console.log('[hip-agent] ZK/HIP protocol connected')
        console.log('[hip-agent] info:', await zk.getInfo())
    } catch (err) {
        console.error('[hip-agent] ZK/HIP protocol failed:', err?.err?.message ?? err?.message ?? err)
        console.error('[hip-agent] If HIP desktop software is open, close/disconnect it and try again. Also confirm the SDK/communication port.')
        process.exitCode = 2
    } finally {
        try {
            await zk?.disconnect()
        } catch {}
    }
}

async function runSync() {
    const codeMap = loadCodeMap()
    const state = loadState()
    const posted = new Set(state.posted ?? [])
    const cutoff = config.sinceMinutes
        ? Date.now() - config.sinceMinutes * 60 * 1000
        : null

    let zk
    try {
        zk = await createDevice()
        const logs = await zk.getAttendances((percent, total) => {
            if (total) console.log(`[hip-agent] download ${percent}/${total}`)
        })
        const scans = (logs.data ?? [])
            .map(record => normalizeScan(record, codeMap))
            .filter(Boolean)
            .filter(scan => !cutoff || new Date(scan.scan_time).getTime() >= cutoff)
            .filter(scan => !posted.has(scanKey(scan)))

        console.log(`[hip-agent] fetched=${logs.data?.length ?? 0} new=${scans.length}`)
        const result = await postScans(scans)
        console.log('[hip-agent] webhook result:', result)
        for (const scan of scans) posted.add(scanKey(scan))
        saveState({ posted: Array.from(posted).slice(-10000), updated_at: new Date().toISOString() })
    } finally {
        try {
            await zk?.disconnect()
        } catch {}
    }
}

async function runWatch() {
    const codeMap = loadCodeMap()
    const state = loadState()
    const posted = new Set(state.posted ?? [])
    const zk = await createDevice(
        (err) => {
            console.error('[hip-agent] Socket error:', err?.message ?? err)
            process.exit(1)
        },
        (type) => {
            console.error('[hip-agent] Socket closed:', type)
            process.exit(1)
        }
    )
    console.log(`[hip-agent] watching realtime logs from ${config.host}:${config.port}`)
    await zk.getRealTimeLogs(async (record) => {
        const scan = normalizeScan(record, codeMap)
        if (!scan) {
            console.warn('[hip-agent] ignored unreadable realtime record:', record)
            return
        }
        const key = scanKey(scan)
        if (posted.has(key)) {
            console.log('[hip-agent] duplicate realtime scan skipped:', key)
            return
        }
        try {
            const result = await postScans([scan])
            console.log('[hip-agent] posted realtime scan:', key, result)
            posted.add(key)
            saveState({ posted: Array.from(posted).slice(-10000), updated_at: new Date().toISOString() })
            if (config.once) {
                await zk.disconnect()
                process.exit(0)
            }
        } catch (err) {
            console.error('[hip-agent] realtime post failed:', err?.message ?? err)
        }
    })
}

async function runSqlSync() {
    const codeMap = loadCodeMap()
    const state = loadState()
    const lastSqlId = Number(state.last_sql_transcantime_id ?? 0)
    const rows = await queryHipSql(lastSqlId)
    const scans = rows
        .map(row => normalizeSqlScan(row, codeMap))
        .filter(Boolean)

    console.log(`[hip-sql-sync] fetched=${rows.length} scans=${scans.length} last_id=${lastSqlId}`)
    const result = await postScans(scans)
    if (result?.summary) {
        console.log('[hip-sql-sync] webhook summary:', result.summary)
        if (config.verbose && result.outcomes) {
            console.log('[hip-sql-sync] webhook outcomes:', result.outcomes)
        }
    } else {
        console.log('[hip-sql-sync] webhook result:', result)
    }

    const maxId = rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), lastSqlId)
    if (!config.dryRun && maxId > lastSqlId) {
        saveState({
            ...state,
            last_sql_transcantime_id: maxId,
            updated_at: new Date().toISOString(),
        })
    }

    if (!config.once) {
        console.log('[hip-sql-sync] done. Run again, or schedule this command every 1-5 minutes.')
    }
}

async function runCapture() {
    const ack = decodeOptionalAck()
    let connectionCount = 0

    const server = net.createServer((socket) => {
        connectionCount += 1
        const connectionId = `${Date.now()}-${connectionCount}`
        const remote = `${socket.remoteAddress ?? 'unknown'}:${socket.remotePort ?? 'unknown'}`
        const startedAt = new Date().toISOString()
        const chunks = []

        console.log(`[hip-capture] connection ${connectionId} from ${remote}`)
        socket.setTimeout(config.timeoutMs)

        socket.on('data', (chunk) => {
            chunks.push(chunk)
            console.log(`[hip-capture] ${connectionId} chunk bytes=${chunk.length} hex=${compactHex(chunk)}`)
            if (ack) {
                socket.write(ack)
                console.log(`[hip-capture] ${connectionId} wrote ack bytes=${ack.length}`)
            }
        })

        socket.on('timeout', () => {
            console.warn(`[hip-capture] ${connectionId} timeout after ${config.timeoutMs}ms`)
            socket.end()
        })

        socket.on('error', (err) => {
            console.error(`[hip-capture] ${connectionId} socket error:`, err.message)
        })

        socket.on('close', () => {
            const raw = Buffer.concat(chunks)
            const entry = {
                captured_at: new Date().toISOString(),
                connection_id: connectionId,
                remote,
                local_port: config.listenPort,
                started_at: startedAt,
                bytes: raw.length,
                hex: raw.toString('hex'),
                base64: raw.toString('base64'),
                chunks: chunks.map((chunk, index) => ({
                    index,
                    bytes: chunk.length,
                    hex: chunk.toString('hex'),
                    base64: chunk.toString('base64'),
                })),
            }
            const file = appendCapture(entry)
            console.log(`[hip-capture] ${connectionId} saved bytes=${raw.length} file=${file}`)
            if (config.once) {
                server.close()
            }
        })
    })

    await new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(config.listenPort, '0.0.0.0', resolve)
    })

    console.log(`[hip-capture] listening on 0.0.0.0:${config.listenPort}`)
    console.log('[hip-capture] Set HIP ServerIP to this machine IP, ServerPort to this port, then tap one card.')
    console.log(`[hip-capture] Writing JSONL captures to ${config.captureDir}`)
}

try {
    if (args.help || args.h) {
        usage()
    } else if (command === 'probe') {
        await runProbe()
    } else if (command === 'sync') {
        await runSync()
    } else if (command === 'watch') {
        await runWatch()
    } else if (command === 'capture' || command === 'listen') {
        await runCapture()
    } else if (command === 'sql-sync' || command === 'sqlsync') {
        await runSqlSync()
    } else {
        usage()
        process.exitCode = 1
    }
} catch (err) {
    console.error('[hip-agent] failed:', err?.err?.message ?? err?.message ?? err)
    process.exitCode = 1
}
