const net = require('net');
const os = require('os');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { spawn } = require('child_process');

const GATEWAY_SECRET = process.env.CARD_SCAN_WEBHOOK_SECRET || 'ebci_card_webhook_secret_production_2026';
const NEXUS_TUNNEL_ENDPOINT = 'https://ebci-nexus.vercel.app/api/cctv/tunnel';

const DIR = __dirname;
const GO2RTC_BIN = path.join(DIR, 'go2rtc.exe');
const GO2RTC_CFG = path.join(DIR, 'go2rtc.yaml');
const CLOUDFLARED_BIN = path.join(DIR, 'cloudflared.exe');
const CLOUDFLARE_LOG = path.join(DIR, 'cloudflare.log');

// Camera MAC signatures
const MAC_CAM1 = 'ec-b9-31-8d-9d-1d'; // Front (หน้าอาคาร)
const MAC_CAM2 = 'ec-b9-31-8d-9e-0b'; // Side (ข้างอาคาร)
const MAC_CAM3 = 'ec-b9-31-d0-a9-29'; // Spirit house / Courtyard (ศาลพระภูมิ/ลานจอด)

// Dynamic camera targets
const cameras = {
    cam1: { listenPort: 5541, host: '192.168.0.28', port: 554, mac: MAC_CAM1, name: 'Cam 1 (Front)' },
    cam2: { listenPort: 5542, host: '192.168.0.90', port: 554, mac: MAC_CAM2, name: 'Cam 2 (Side)' },
    cam3: { listenPort: 5543, host: '192.168.10.101', port: 554, mac: MAC_CAM3, name: 'Cam 3 (Courtyard)' },
};

function log(msg) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${msg}`);
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

            inbound.on('error', () => {});
            outbound.on('error', (err) => {
                healCameras();
            });
        });

        server.listen(config.listenPort, '127.0.0.1', () => {
            log(`[Relay Started] 127.0.0.1:${config.listenPort} -> ${config.host}:${config.port} (${camKey})`);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                log(`[Relay] Port ${config.listenPort} already in use, continuing.`);
            } else {
                log(`[Relay Error] ${err.message}`);
            }
        });
    }
}

// 3. Register Tunnel with Nexus
let currentTunnelUrl = '';

async function registerTunnelUrl(url) {
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
            }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
            log(`[Heartbeat Success] Registered active tunnel with Nexus: ${url}`);
        } else {
            log(`[Heartbeat Warning] Failed to register: ${JSON.stringify(data)}`);
        }
    } catch (err) {
        log(`[Heartbeat Network Error] ${err.message}`);
    }
}

// 4. Cloudflared Subprocess Management & Auto-Recovery
let cloudflaredProc = null;
let isRestartingCloudflared = false;

function restartCloudflared(reason) {
    if (isRestartingCloudflared) return;
    isRestartingCloudflared = true;
    log(`[Cloudflared Recovery] Restarting cloudflared due to: ${reason}`);

    try {
        if (cloudflaredProc) {
            cloudflaredProc.removeAllListeners();
            cloudflaredProc.kill();
        }
        cp.execSync('Stop-Process -Name cloudflared -Force -ErrorAction SilentlyContinue', { shell: 'powershell', timeout: 5000, windowsHide: true });
    } catch (e) {}

    cloudflaredProc = null;
    currentTunnelUrl = '';

    try {
        if (fs.existsSync(CLOUDFLARE_LOG)) fs.unlinkSync(CLOUDFLARE_LOG);
    } catch (e) {}

    setTimeout(() => {
        startCloudflared();
        isRestartingCloudflared = false;
    }, 2000);
}

function checkCloudflareLog() {
    if (!fs.existsSync(CLOUDFLARE_LOG)) return;
    try {
        const content = fs.readFileSync(CLOUDFLARE_LOG, 'utf8');

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
                log(`>>> NEW CLOUDFLARE TUNNEL DETECTED: ${currentTunnelUrl}`);
                registerTunnelUrl(currentTunnelUrl);
            }
        }
    } catch (e) {}
}

function startCloudflared() {
    log('Starting Cloudflare Tunnel daemon...');
    try {
        if (fs.existsSync(CLOUDFLARE_LOG)) fs.unlinkSync(CLOUDFLARE_LOG);
    } catch (e) {}

    cloudflaredProc = spawn(CLOUDFLARED_BIN, [
        'tunnel',
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
        if (!isRestartingCloudflared) {
            setTimeout(startCloudflared, 5000);
        }
    });

    let attempts = 0;
    const checkInterval = setInterval(() => {
        checkCloudflareLog();
        attempts++;
        if (currentTunnelUrl || attempts > 20) {
            clearInterval(checkInterval);
        }
    }, 1000);
}

// Active verification of tunnel reachability
let tunnelFailCount = 0;
async function verifyTunnelReachable() {
    if (!currentTunnelUrl || isRestartingCloudflared) return;

    try {
        const res = await fetch(`${currentTunnelUrl}/api/streams`, {
            signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
            tunnelFailCount = 0;
            return;
        }
        tunnelFailCount++;
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

function startGo2rtc() {
    log('Starting go2rtc daemon...');
    go2rtcProc = spawn(GO2RTC_BIN, ['-config', GO2RTC_CFG], {
        cwd: DIR,
        stdio: 'ignore',
        windowsHide: true,
    });

    go2rtcProc.on('exit', (code) => {
        log(`go2rtc exited (code ${code}). Restarting in 3s...`);
        go2rtcProc = null;
        setTimeout(startGo2rtc, 3000);
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
        if (!go2rtcProc) {
            startGo2rtc();
        }
    }
}

// Main Supervisor Bootstrap
log('=== EBCI NEXUS CCTV GATEWAY SUPERVISOR STARTING ===');
const wifiIp = ensureWifiConnected();
log(`Detected Wi-Fi Adapter IP: ${wifiIp || 'None (will check on demand)'}`);

startCameraRelays();
startGo2rtc();
startCloudflared();

// Watchdogs & Timers:
// 1. Wi-Fi connection check every 15 seconds
setInterval(ensureWifiConnected, 15000);

// 2. Periodic Cloudflare log check every 10 seconds
setInterval(checkCloudflareLog, 10000);

// 3. Heartbeat ping to Nexus every 5 minutes (reduced from 30s to stay well within free tier limits)
// Note: When a new tunnel is detected, registerTunnelUrl is already called immediately on detection.
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

// Graceful shutdown
process.on('SIGINT', () => {
    log('Shutting down supervisor...');
    if (go2rtcProc) go2rtcProc.kill();
    if (cloudflaredProc) cloudflaredProc.kill();
    process.exit(0);
});
