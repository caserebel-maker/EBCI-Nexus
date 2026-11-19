const net = require('net');
const os = require('os');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { spawn } = require('child_process');

const GATEWAY_SECRET = process.env.CARD_SCAN_WEBHOOK_SECRET || 'ebci_card_webhook_secret_production_2026';
const NEXUS_TUNNEL_ENDPOINT = 'https://ebci-nexus.vercel.app/api/cctv/tunnel';
const SINGLETON_PORT = 19850;

const DIR = __dirname;
const GO2RTC_BIN = path.join(DIR, 'go2rtc.exe');
const GO2RTC_CFG = path.join(DIR, 'go2rtc.yaml');
const CLOUDFLARED_BIN = path.join(DIR, 'cloudflared.exe');
const CLOUDFLARE_LOG = path.join(DIR, 'cloudflare.log');
const SUPERVISOR_LOG = path.join(DIR, 'supervisor.log');

// Camera MAC signatures
const MAC_CAM1 = 'ec-b9-31-8d-9d-1d'; // Front (หน้าอาคาร)
const MAC_CAM2 = 'ec-b9-31-8d-9e-0b'; // Side (ข้างอาคาร)
const MAC_CAM3 = 'ec-b9-31-d0-a9-29'; // Spirit house / Courtyard (ศาลพระภูมิ/ลานจอด)

// Dynamic camera targets
const cameras = {
    cam1: { listenPort: 5541, host: '192.168.0.19', port: 554, mac: MAC_CAM1, name: 'Cam 1 (Front)' },
    cam2: { listenPort: 5542, host: '192.168.0.80', port: 554, mac: MAC_CAM2, name: 'Cam 2 (Side)' },
    cam3: { listenPort: 5543, host: '192.168.10.101', port: 554, mac: MAC_CAM3, name: 'Cam 3 (Courtyard)' },
};

let logWriteCount = 0;
function log(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [PID:${process.pid}] ${msg}`;
    console.log(line);
    try {
        // Rotate supervisor.log periodically if > 1MB
        if (++logWriteCount % 100 === 0 && fs.existsSync(SUPERVISOR_LOG)) {
            const stat = fs.statSync(SUPERVISOR_LOG);
            if (stat.size > 1024 * 1024) {
                const lines = fs.readFileSync(SUPERVISOR_LOG, 'utf8').split('\n');
                fs.writeFileSync(SUPERVISOR_LOG, lines.slice(-1500).join('\n'), 'utf8');
            }
        }
        fs.appendFileSync(SUPERVISOR_LOG, line + '\n', 'utf8');
    } catch (_) {}
}

// 1. Dynamic Local Wi-Fi IP Detection & Auto-Reconnect
function getWifiLocalIp() {
    const ifaces = os.networkInterfaces();
    for (const name in ifaces) {
        for (const iface of ifaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168.0.')) {
                return iface.address;
            }
        }
    }
    return null;
}

let isReconnectingWifi = false;
function ensureWifiConnected() {
    const currentIp = getWifiLocalIp();
    if (currentIp) return currentIp;

    if (isReconnectingWifi) return null;
    isReconnectingWifi = true;
    try {
        log('[Wi-Fi Guard] Wi-Fi disconnected or not on 192.168.0.x. Checking WLAN interface...');
        const out = cp.execSync('netsh wlan show interfaces', { encoding: 'utf8', timeout: 5000, windowsHide: true });
        if (out.includes('disconnected') || !out.includes('SSID                   : EBCI')) {
            log('[Wi-Fi Guard] Reconnecting to SSID "EBCI"...');
            cp.execSync('netsh wlan connect name="EBCI"', { timeout: 8000, windowsHide: true });
        }
    } catch (e) {
        log(`[Wi-Fi Guard Error] ${e.message}`);
    } finally {
        setTimeout(() => { isReconnectingWifi = false; }, 5000);
    }
    return getWifiLocalIp();
}

// Probe port helper
function probePort(ip, localIp, timeout = 700) {
    return new Promise((resolve) => {
        const opts = { host: ip, port: 554 };
        if (localIp) opts.localAddress = localIp;
        const socket = new net.Socket();
        socket.setTimeout(timeout);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.connect(opts);
    });
}

// Probe RTSP Options to verify Tapo device
function probeTapoRtsp(ip, localIp) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let resp = '';
        socket.setTimeout(1200);
        socket.on('connect', () => {
            socket.write(`OPTIONS rtsp://${ip}:554/stream2 RTSP/1.0\r\nCSeq: 1\r\n\r\n`);
        });
        socket.on('data', (d) => {
            resp += d.toString();
            socket.destroy();
            const isTapo = (resp.includes('RTSP/1.0 200 OK') && resp.includes('DESCRIBE')) || resp.includes('401 Unauthorized') || resp.includes('WWW-Authenticate') || resp.includes('realm=');
            resolve(isTapo);
        });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.connect({ host: ip, port: 554, localAddress: localIp });
    });
}

// Auto-Heal camera IPs when they change or reboot
let isHealing = false;
async function healCameras() {
    if (isHealing) return;
    isHealing = true;
    try {
        const wifiIp = ensureWifiConnected();
        if (!wifiIp) {
            log('[Auto-Heal] Skipped: Wi-Fi interface not ready yet.');
            return;
        }

        // Check if any camera is down
        const c1Ok = await probePort(cameras.cam1.host, wifiIp);
        const c2Ok = await probePort(cameras.cam2.host, wifiIp);
        const c3Ok = await probePort(cameras.cam3.host, wifiIp);

        if (c1Ok && c2Ok && c3Ok) {
            return; // All cameras healthy!
        }

        log(`[Auto-Heal Triggered] Health check: Cam 1=${c1Ok}, Cam 2=${c2Ok}, Cam 3=${c3Ok}`);

        // 1. Scan 192.168.0.x and resolve ARP table for MACs
        const pingPromises = [];
        for (let i = 1; i <= 254; i++) {
            const ip = `192.168.0.${i}`;
            const s = new net.Socket();
            s.setTimeout(150);
            pingPromises.push(new Promise(r => {
                s.on('connect', () => { s.destroy(); r(); });
                s.on('timeout', () => { s.destroy(); r(); });
                s.on('error', () => { s.destroy(); r(); });
                s.connect({ host: ip, port: 80, localAddress: wifiIp });
            }));
        }
        await Promise.all(pingPromises);

        const arpOutput = await new Promise(r => {
            cp.exec('arp -a', { windowsHide: true }, (err, stdout) => r(stdout || ''));
        });

        // Match MAC addresses on 192.168.0.x
        for (const line of arpOutput.split('\n')) {
            const lower = line.toLowerCase();
            const ipMatch = lower.match(/(192\.168\.0\.\d+)/);
            if (!ipMatch) continue;
            const foundIp = ipMatch[1];

            if (lower.includes(MAC_CAM1) && cameras.cam1.host !== foundIp) {
                cameras.cam1.host = foundIp;
                log(`[Auto-Healed] Cam 1 matched MAC ${MAC_CAM1} at ${foundIp}`);
            }
            if (lower.includes(MAC_CAM2) && cameras.cam2.host !== foundIp) {
                cameras.cam2.host = foundIp;
                log(`[Auto-Healed] Cam 2 matched MAC ${MAC_CAM2} at ${foundIp}`);
            }
            if (lower.includes(MAC_CAM3) && cameras.cam3.host !== foundIp) {
                cameras.cam3.host = foundIp;
                log(`[Auto-Healed] Cam 3 matched MAC ${MAC_CAM3} at ${foundIp}`);
            }
        }

        // 2. If any camera is still down, scan 192.168.10.x
        const recheck2 = await probePort(cameras.cam2.host, wifiIp);
        const recheck3 = await probePort(cameras.cam3.host, wifiIp);

        if (!recheck2 || !recheck3) {
            log('[Auto-Heal] Scanning 192.168.10.x for Tapo RTSP devices...');
            const scan10Promises = [];
            const active10 = [];
            for (let i = 1; i <= 254; i++) {
                const ip = `192.168.10.${i}`;
                scan10Promises.push(
                    probePort(ip, wifiIp, 500).then(ok => {
                        if (ok) active10.push(ip);
                    })
                );
            }
            await Promise.all(scan10Promises);

            for (const ip of active10) {
                const isTapo = await probeTapoRtsp(ip, wifiIp);
                if (isTapo) {
                    if (!recheck3 && cameras.cam3.host !== ip && cameras.cam2.host !== ip) {
                        cameras.cam3.host = ip;
                        log(`[Auto-Healed] Cam 3 assigned Tapo RTSP stream at ${ip}`);
                    } else if (!recheck2 && cameras.cam2.host !== ip && cameras.cam3.host !== ip) {
                        cameras.cam2.host = ip;
                        log(`[Auto-Healed] Cam 2 assigned Tapo RTSP stream at ${ip}`);
                    }
                }
            }
        }
    } catch (e) {
        log(`[Auto-Heal Error] ${e.message}`);
    } finally {
        isHealing = false;
    }
}

// 2. Camera TCP Relays
function startCameraRelays() {
    for (const [camKey, config] of Object.entries(cameras)) {
        const server = net.createServer((inbound) => {
            const wifiIp = ensureWifiConnected();
            const connectOpts = {
                host: config.host,
                port: config.port,
            };
            if (wifiIp) {
                connectOpts.localAddress = wifiIp;
            }

            const outbound = net.createConnection(connectOpts);

            inbound.pipe(outbound);
            outbound.pipe(inbound);

            inbound.on('error', () => {
                if (!outbound.destroyed) outbound.destroy();
            });
            inbound.on('close', () => {
                if (!outbound.destroyed) outbound.destroy();
            });
            outbound.on('error', () => {
                if (!inbound.destroyed) inbound.destroy();
                healCameras();
            });
            outbound.on('close', () => {
                if (!inbound.destroyed) inbound.destroy();
            });
        });

        server.listen(config.listenPort, '127.0.0.1', () => {
            log(`[Relay Started] 127.0.0.1:${config.listenPort} -> ${config.host}:${config.port} (${camKey})`);
        });

        server.on('error', (err) => {
            log(`[Relay Error] Port ${config.listenPort}: ${err.message}`);
        });
    }
}

// 3. Register Tunnel with Nexus
let currentTunnelUrl = '';
let lastHeartbeatLoggedAt = 0;

async function registerTunnelUrl(url, force = false) {
    if (!url) return;
    try {
        const res = await fetch(NEXUS_TUNNEL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Gateway-Secret': GATEWAY_SECRET,
            },
            body: JSON.stringify({
                tunnel_url: url,
                secret: GATEWAY_SECRET,
                force,
            }),
            signal: AbortSignal.timeout(10000),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
            const now = Date.now();
            // Log every new tunnel or every 15 minutes to keep supervisor.log readable
            if (force || data.status === 'synced_to_db' || now - lastHeartbeatLoggedAt > 15 * 60_000) {
                lastHeartbeatLoggedAt = now;
                log(`[Heartbeat Success] (${data.status}) ${url}`);
            }
        } else {
            log(`[Heartbeat Warning] HTTP ${res.status}: ${JSON.stringify(data)}`);
        }
    } catch (err) {
        log(`[Heartbeat Network Error] ${err.message}`);
    }
}

// 4. Cloudflared Subprocess Management & Auto-Recovery
let cloudflaredProc = null;
let isRestartingCloudflared = false;
let cloudflaredStartedAt = 0;
let tunnelDetectedAt = 0;
let consecutiveRestarts = 0;

function killProcessSync(proc, processName) {
    try {
        if (proc && proc.pid) {
            proc.removeAllListeners();
            try {
                cp.execSync(`taskkill /F /T /PID ${proc.pid}`, { timeout: 4000, windowsHide: true, stdio: 'ignore' });
            } catch (_) {
                proc.kill('SIGKILL');
            }
        }
        if (processName) {
            cp.execSync(`taskkill /F /IM ${processName}`, { timeout: 4000, windowsHide: true, stdio: 'ignore' });
        }
    } catch (_) {}
}

function restartCloudflared(reason, customDelayMs = null) {
    if (isRestartingCloudflared) return;
    isRestartingCloudflared = true;
    consecutiveRestarts++;
    const delayMs = customDelayMs !== null
        ? customDelayMs
        : Math.min(2000 + Math.max(0, consecutiveRestarts - 1) * 5000, 30000);

    log(`[Cloudflared Recovery] Restarting in ${delayMs}ms (attempt #${consecutiveRestarts}) due to: ${reason}`);

    killProcessSync(cloudflaredProc, 'cloudflared.exe');
    cloudflaredProc = null;
    currentTunnelUrl = '';
    tunnelDetectedAt = 0;

    try {
        if (fs.existsSync(CLOUDFLARE_LOG)) fs.unlinkSync(CLOUDFLARE_LOG);
    } catch (_) {}

    setTimeout(() => {
        isRestartingCloudflared = false;
        startCloudflared();
    }, delayMs);
}

function checkCloudflareLog() {
    if (isRestartingCloudflared) return;

    // Guard against cloudflared hanging on startup without issuing a URL
    if (cloudflaredProc && !currentTunnelUrl && cloudflaredStartedAt > 0) {
        const waitMs = Date.now() - cloudflaredStartedAt;
        if (waitMs > 45000) {
            restartCloudflared(`Timed out waiting ${Math.round(waitMs / 1000)}s for trycloudflare URL`);
            return;
        }
    }

    if (!fs.existsSync(CLOUDFLARE_LOG)) return;
    try {
        const content = fs.readFileSync(CLOUDFLARE_LOG, 'utf8');

        // Check for rate limit / API rejection
        if (content.includes('429 Too Many Requests') || content.includes('failed to request quick Tunnel')) {
            restartCloudflared('Cloudflare Quick Tunnel API error/rate-limit in cloudflare.log', 20000);
            return;
        }

        // Check if tunnel expired on Cloudflare side
        if (content.includes('Unauthorized: Tunnel not found') || content.includes('Register tunnel error from server side')) {
            restartCloudflared('Unauthorized / Expired quick tunnel detected in cloudflare.log');
            return;
        }

        // Extract latest trycloudflare URL from log
        const matches = [...content.matchAll(/https:\/\/[a-zA-Z0-9\-]+\.trycloudflare\.com/g)];
        if (matches.length > 0) {
            const latestUrl = matches[matches.length - 1][0];
            if (latestUrl !== currentTunnelUrl) {
                currentTunnelUrl = latestUrl;
                tunnelDetectedAt = Date.now();
                consecutiveRestarts = 0;
                tunnelFailCount = 0;
                log(`>>> NEW CLOUDFLARE TUNNEL DETECTED: ${currentTunnelUrl}`);
                registerTunnelUrl(currentTunnelUrl, true);
            }
        }
    } catch (_) {}
}

function startCloudflared() {
    if (isRestartingCloudflared || cloudflaredProc) return;
    log('Starting Cloudflare Tunnel daemon...');
    try {
        if (fs.existsSync(CLOUDFLARE_LOG)) fs.unlinkSync(CLOUDFLARE_LOG);
    } catch (_) {}

    cloudflaredStartedAt = Date.now();
    currentTunnelUrl = '';
    tunnelDetectedAt = 0;

    cloudflaredProc = spawn(CLOUDFLARED_BIN, [
        'tunnel',
        '--no-autoupdate',
        '--url',
        'http://127.0.0.1:1984',
        '--logfile',
        CLOUDFLARE_LOG,
    ], {
        cwd: DIR,
        stdio: 'ignore',
        windowsHide: true,
    });

    cloudflaredProc.on('exit', (code) => {
        log(`Cloudflared exited (code ${code}). Restarting in 5s...`);
        cloudflaredProc = null;
        currentTunnelUrl = '';
        tunnelDetectedAt = 0;
        if (!isRestartingCloudflared) {
            setTimeout(startCloudflared, 5000);
        }
    });

    let attempts = 0;
    const checkInterval = setInterval(() => {
        checkCloudflareLog();
        attempts++;
        if (currentTunnelUrl || attempts > 30 || !cloudflaredProc) {
            clearInterval(checkInterval);
        }
    }, 1000);
}

// Active verification of tunnel reachability
let tunnelFailCount = 0;
async function verifyTunnelReachable() {
    if (!currentTunnelUrl || isRestartingCloudflared) return;

    // Allow 20s DNS propagation grace period after a brand-new tunnel URL appears
    if (tunnelDetectedAt && Date.now() - tunnelDetectedAt < 20000) {
        return;
    }

    try {
        const res = await fetch(`${currentTunnelUrl}/api/streams`, {
            signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
            tunnelFailCount = 0;
            return;
        }
        tunnelFailCount++;
        log(`[Tunnel Health Check] Non-OK HTTP ${res.status} (${tunnelFailCount}/3)`);
    } catch (err) {
        tunnelFailCount++;
        log(`[Tunnel Health Check] Public ping failed (${tunnelFailCount}/3): ${err.message}`);
    }

    if (tunnelFailCount >= 3) {
        tunnelFailCount = 0;
        restartCloudflared('Tunnel URL failed public reachability check 3 times');
    }
}

// 5. Go2rtc Subprocess Management & Health Check
let go2rtcProc = null;
let isShuttingDown = false;

function startGo2rtc() {
    if (isShuttingDown || go2rtcProc) return;
    log('Starting go2rtc daemon...');
    go2rtcProc = spawn(GO2RTC_BIN, ['-config', GO2RTC_CFG], {
        cwd: DIR,
        stdio: 'ignore',
        windowsHide: true,
    });

    go2rtcProc.on('exit', (code) => {
        log(`go2rtc exited (code ${code}). Restarting in 3s...`);
        go2rtcProc = null;
        if (!isShuttingDown) {
            setTimeout(startGo2rtc, 3000);
        }
    });
}

async function verifyGo2rtcReachable() {
    try {
        const res = await fetch('http://127.0.0.1:1984/api/streams', {
            signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
        log(`[go2rtc Health Warning] Local API not responding: ${e.message}`);
        if (go2rtcProc) {
            killProcessSync(go2rtcProc, 'go2rtc.exe');
            go2rtcProc = null;
        }
        startGo2rtc();
    }
}

// 6. Enforce Atomic Single-Instance Lock on 127.0.0.1:19850 before touching anything
const lockServer = net.createServer((sock) => {
    sock.end(JSON.stringify({
        pid: process.pid,
        tunnel_url: currentTunnelUrl || null,
        uptime_sec: Math.round(process.uptime()),
    }));
});

lockServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        log(`[Singleton] Another gateway-supervisor is already running on port ${SINGLETON_PORT}. Exiting cleanly.`);
        process.exit(0);
    }
    log(`[Singleton Lock Error] ${err.message}`);
    process.exit(1);
});

lockServer.listen(SINGLETON_PORT, '127.0.0.1', () => {
    log(`=== EBCI NEXUS CCTV GATEWAY SUPERVISOR STARTING (Lock port ${SINGLETON_PORT} acquired) ===`);

    // Prevent sleep and ensure EBCI Wi-Fi auto-connects (non-blocking)
    try {
        cp.exec('powercfg /change standby-timeout-ac 0 & powercfg /change hibernate-timeout-ac 0 & netsh wlan set profileparameter name="EBCI" connectionmode=auto', { windowsHide: true, timeout: 5000 }, () => {});
    } catch (_) {}

    // Clean up any orphaned child binaries left from a crashed prior supervisor
    killProcessSync(null, 'cloudflared.exe');
    killProcessSync(null, 'go2rtc.exe');

    const wifiIp = ensureWifiConnected();
    log(`Detected Wi-Fi Adapter IP: ${wifiIp || 'None (will check on demand)'}`);

    startCameraRelays();
    startGo2rtc();
    startCloudflared();

    // Watchdogs & Timers:
    // 1. Wi-Fi connection check every 15 seconds + Hibernation/Wake detector
    let lastTick = Date.now();
    setInterval(async () => {
        const now = Date.now();
        const gapMs = now - lastTick;
        lastTick = now;

        ensureWifiConnected();

        // Detect sleep/hibernation resume (>2 minute jump between 15s ticks)
        if (gapMs > 120_000) {
            log(`[Wake Detected] System resumed after ${Math.round(gapMs / 1000)}s pause. Re-syncing Wi-Fi, cameras, and tunnel...`);
            await healCameras();
            setTimeout(async () => {
                if (currentTunnelUrl) {
                    try {
                        const res = await fetch(`${currentTunnelUrl}/api/streams`, {
                            signal: AbortSignal.timeout(6000),
                        });
                        if (res.ok) {
                            await registerTunnelUrl(currentTunnelUrl, true);
                            return;
                        }
                    } catch (_) {}
                }
                restartCloudflared('Refreshing quick tunnel after system sleep/hibernation');
            }, 5000);
        }
    }, 15000);

    // 2. Periodic Cloudflare log & startup-timeout check every 10 seconds
    setInterval(checkCloudflareLog, 10000);

    // 3. Heartbeat ping to Nexus every 60 seconds (well within 10-min online window)
    setInterval(() => {
        if (currentTunnelUrl) {
            registerTunnelUrl(currentTunnelUrl);
        }
    }, 60000);

    // 4. Verify public reachability of tunnel every 30 seconds
    setInterval(verifyTunnelReachable, 30000);

    // 5. Auto-Heal camera IPs every 60 seconds
    setInterval(healCameras, 60000);

    // 6. Verify local go2rtc every 60 seconds
    setInterval(verifyGo2rtcReachable, 60000);
});

// Graceful shutdown
function shutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    log('Shutting down supervisor...');
    killProcessSync(go2rtcProc, null);
    killProcessSync(cloudflaredProc, null);
    try { lockServer.close(); } catch (_) {}
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
