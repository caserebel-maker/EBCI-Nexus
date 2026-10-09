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
    cam3: { listenPort: 5543, host: '192.168.10.113', port: 554, mac: MAC_CAM3, name: 'Cam 3 (Courtyard)' },
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
            // Tapo cameras respond with 200 OK and Public: OPTIONS, DESCRIBE...
            const isTapo = resp.includes('RTSP/1.0 200 OK') && resp.includes('DESCRIBE');
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
        const wifiIp = getWifiLocalIp();

        // Check if any camera is down
        const c1Ok = await probePort(cameras.cam1.host, wifiIp);
        const c2Ok = await probePort(cameras.cam2.host, wifiIp);
        const c3Ok = await probePort(cameras.cam3.host, wifiIp);

        if (c1Ok && c2Ok && c3Ok) {
            isHealing = false;
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
            cp.exec('arp -a', (err, stdout) => r(stdout || ''));
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
                    // If Cam 3 is not healthy and not assigned to this IP
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
            const wifiIp = getWifiLocalIp();
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
                // If outbound connection fails, trigger healing
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

// Periodic Cloudflare log check
setInterval(checkCloudflareLog, 10000);

// Heartbeat ping every 30 seconds
setInterval(() => {
    if (currentTunnelUrl) {
        registerTunnelUrl(currentTunnelUrl);
    }
}, 30000);

// Auto-Heal camera check every 60 seconds
setInterval(healCameras, 60000);

// Keep alive
process.on('SIGINT', () => {
    log('Shutting down supervisor...');
    if (go2rtcProc) go2rtcProc.kill();
    if (cloudflaredProc) cloudflaredProc.kill();
    process.exit(0);
});
