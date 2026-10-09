const net = require('net');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const GATEWAY_SECRET = process.env.CARD_SCAN_WEBHOOK_SECRET || 'ebci_card_webhook_secret_production_2026';
const NEXUS_TUNNEL_ENDPOINT = 'https://ebci-nexus.vercel.app/api/cctv/tunnel';

const DIR = __dirname;
const GO2RTC_BIN = path.join(DIR, 'go2rtc.exe');
const GO2RTC_CFG = path.join(DIR, 'go2rtc.yaml');
const CLOUDFLARED_BIN = path.join(DIR, 'cloudflared.exe');
const CLOUDFLARE_LOG = path.join(DIR, 'cloudflare.log');

// Camera targets (auto-healing defaults)
const cameras = {
    cam1: { listenPort: 5541, host: '192.168.0.28', port: 554, needsWifiBind: false },
    cam2: { listenPort: 5542, host: '192.168.10.109', port: 554, needsWifiBind: true },
    cam3: { listenPort: 5543, host: '192.168.10.108', port: 554, needsWifiBind: true },
};

function log(msg) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${msg}`);
}

// 1. Dynamic Local Wi-Fi IP Detection
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

// 2. Camera TCP Relays
function startCameraRelays() {
    for (const [camKey, config] of Object.entries(cameras)) {
        const server = net.createServer((inbound) => {
            const wifiIp = getWifiLocalIp();
            const connectOpts = {
                host: config.host,
                port: config.port,
            };
            if (config.needsWifiBind && wifiIp) {
                connectOpts.localAddress = wifiIp;
            }

            const outbound = net.createConnection(connectOpts);

            inbound.pipe(outbound);
            outbound.pipe(inbound);

            inbound.on('error', () => {});
            outbound.on('error', () => {});
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
let registrationTimer = null;

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

// 4. Cloudflared Subprocess Management
let cloudflaredProc = null;

function checkCloudflareLog() {
    if (!fs.existsSync(CLOUDFLARE_LOG)) return;
    try {
        const content = fs.readFileSync(CLOUDFLARE_LOG, 'utf8');
        const match = content.match(/https:\/\/[a-zA-Z0-9\-]+\.trycloudflare\.com/);
        if (match && match[0] !== currentTunnelUrl) {
            currentTunnelUrl = match[0];
            log(`>>> NEW CLOUDFLARE TUNNEL DETECTED: ${currentTunnelUrl}`);
            registerTunnelUrl(currentTunnelUrl);
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
    });

    cloudflaredProc.on('exit', (code) => {
        log(`Cloudflared exited (code ${code}). Restarting in 5s...`);
        cloudflaredProc = null;
        setTimeout(startCloudflared, 5000);
    });

    // Check log frequently for tunnel URL
    const checkInterval = setInterval(() => {
        checkCloudflareLog();
        if (currentTunnelUrl) {
            clearInterval(checkInterval);
        }
    }, 1000);
}

// 5. Go2rtc Subprocess Management
let go2rtcProc = null;

function startGo2rtc() {
    log('Starting go2rtc daemon...');
    go2rtcProc = spawn(GO2RTC_BIN, ['-config', GO2RTC_CFG], {
        cwd: DIR,
        stdio: 'ignore',
    });

    go2rtcProc.on('exit', (code) => {
        log(`go2rtc exited (code ${code}). Restarting in 3s...`);
        go2rtcProc = null;
        setTimeout(startGo2rtc, 3000);
    });
}

// Main Supervisor Bootstrap
log('=== EBCI NEXUS CCTV GATEWAY SUPERVISOR STARTING ===');
const wifiIp = getWifiLocalIp();
log(`Detected Wi-Fi Adapter IP: ${wifiIp || 'None (will check on demand)'}`);

startCameraRelays();
startGo2rtc();
startCloudflared();

// Periodic Cloudflare log check (in case tunnel reconnects silently)
setInterval(checkCloudflareLog, 10000);

// Heartbeat ping every 30 seconds
setInterval(() => {
    if (currentTunnelUrl) {
        registerTunnelUrl(currentTunnelUrl);
    }
}, 30000);

// Keep alive
process.on('SIGINT', () => {
    log('Shutting down supervisor...');
    if (go2rtcProc) go2rtcProc.kill();
    if (cloudflaredProc) cloudflaredProc.kill();
    process.exit(0);
});
