#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import ZKLib from 'node-zklib'

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
    sinceMinutes: args.sinceMinutes ? Number(args.sinceMinutes) : null,
    codeMapPath: String(args.codeMap ?? process.env.HIP_CODE_MAP_PATH ?? ''),
}

function usage() {
    console.log(`Usage:
  npm run hip:probe -- [--host 192.168.1.40] [--port 5005]
  npm run hip:sync -- [--dry-run] [--since-minutes 1440]
  npm run hip:watch -- [--dry-run] [--once]

Environment:
  HIP_HOST=192.168.1.40
  HIP_PORT=5005
  CARD_SCAN_WEBHOOK_SECRET=...
  NEXUS_CARD_SCAN_WEBHOOK=https://ebci-nexus.vercel.app/api/webhooks/card-scan
  HIP_CODE_MAP_PATH=./hip-code-map.json  # optional device user id -> employee_code map
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

async function createDevice() {
    const zk = new ZKLib(config.host, config.port, config.timeoutMs, config.inport)
    await zk.createSocket()
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

function scanKey(scan) {
    return `${scan.employee_code}|${scan.scan_time}`
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
    console.log(`[hip-agent] TCP probe ${config.host}:${config.port}`)
    const tcp = await tcpProbe()
    if (!tcp.ok) {
        console.error(`[hip-agent] TCP failed: ${tcp.error}`)
        process.exitCode = 1
        return
    }
    console.log('[hip-agent] TCP ok')

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
    const zk = await createDevice()
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

try {
    if (args.help || args.h) {
        usage()
    } else if (command === 'probe') {
        await runProbe()
    } else if (command === 'sync') {
        await runSync()
    } else if (command === 'watch') {
        await runWatch()
    } else {
        usage()
        process.exitCode = 1
    }
} catch (err) {
    console.error('[hip-agent] failed:', err?.err?.message ?? err?.message ?? err)
    process.exitCode = 1
}
