const net = require('net');
const os = require('os');

// Discover local Wi-Fi IP dynamically
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

// Camera targets (auto-healing defaults)
const cameras = {
    cam1: { listenPort: 5541, host: '192.168.0.28', port: 554, needsWifiBind: false },
    cam2: { listenPort: 5542, host: '192.168.10.109', port: 554, needsWifiBind: true },
    cam3: { listenPort: 5543, host: '192.168.10.108', port: 554, needsWifiBind: true },
};

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

// Scan subnet for RTSP devices
async function scanSubnet(subnetPrefix, localIp) {
    const active = [];
    const promises = [];
    for (let i = 1; i <= 254; i++) {
        const ip = `${subnetPrefix}.${i}`;
        promises.push(
            probePort(ip, localIp).then(isOpen => {
                if (isOpen) active.push(ip);
            })
        );
    }
    await Promise.all(promises);
    return active;
}

// Verify and auto-heal camera targets
async function checkAndHealTargets() {
    const wifiIp = getWifiLocalIp();
    if (!wifiIp) {
        console.warn('[Relay Warning] Wi-Fi adapter not detected on 192.168.0.x yet.');
        return;
    }

    // Check Cam 1
    const cam1Ok = await probePort(cameras.cam1.host, null, 1000);
    if (!cam1Ok) {
        console.log('[Relay] Cam 1 at ' + cameras.cam1.host + ' not responding. Scanning 192.168.0.x...');
        const found = await scanSubnet('192.168.0', wifiIp);
        console.log('[Relay] Active RTSP on 192.168.0.x:', found);
        if (found.length > 0 && !found.includes(cameras.cam1.host)) {
            cameras.cam1.host = found[0];
            console.log('[Relay] Cam 1 target auto-updated to:', cameras.cam1.host);
        }
    }

    // Check Cam 2 & Cam 3
    const cam2Ok = await probePort(cameras.cam2.host, wifiIp, 1000);
    const cam3Ok = await probePort(cameras.cam3.host, wifiIp, 1000);

    if (!cam2Ok || !cam3Ok) {
        console.log('[Relay] Checking subnet 192.168.10.x for Tapo cameras...');
        const found10 = await scanSubnet('192.168.10', wifiIp);
        console.log('[Relay] Active RTSP on 192.168.10.x:', found10);
        // Exclude known non-Tapo devices (e.g. 10.100, 10.102) if possible
        const tapoCandidates = found10.filter(ip => ip !== '192.168.10.100' && ip !== '192.168.10.102');
        if (tapoCandidates.length >= 2) {
            // Sort to ensure stable assignment: 10.108 -> Cam 3, 10.109 -> Cam 2
            tapoCandidates.sort();
            cameras.cam3.host = tapoCandidates[0];
            cameras.cam2.host = tapoCandidates[1];
            console.log(`[Relay] Subnet 10 cameras healed -> Cam 3: ${cameras.cam3.host}, Cam 2: ${cameras.cam2.host}`);
        } else if (tapoCandidates.length === 1) {
            if (!cam3Ok) cameras.cam3.host = tapoCandidates[0];
            else if (!cam2Ok) cameras.cam2.host = tapoCandidates[0];
        }
    }
}

// Start TCP relay for a camera
function startRelay(camKey, config) {
    const server = net.createServer((inbound) => {
        const wifiIp = getWifiLocalIp();
        const connectOpts = {
            host: config.host,
            port: config.port,
        };
        // Always bind to Wi-Fi adapter if targeting 192.168.10.x or needsWifiBind
        if (config.needsWifiBind && wifiIp) {
            connectOpts.localAddress = wifiIp;
        }

        const outbound = net.createConnection(connectOpts);

        inbound.pipe(outbound);
        outbound.pipe(inbound);

        inbound.on('error', () => {});
        outbound.on('error', (err) => {
            // Suppress connection errors during camera reboots
        });
    });

    server.listen(config.listenPort, '127.0.0.1', () => {
        console.log(`[Relay Started] 127.0.0.1:${config.listenPort} -> ${config.host}:${config.port} (${camKey})`);
    });

    return server;
}

// Initial launch
const wifiIp = getWifiLocalIp();
console.log(`[Relay] Local Wi-Fi IP: ${wifiIp || 'Not found'}`);
startRelay('cam1', cameras.cam1);
startRelay('cam2', cameras.cam2);
startRelay('cam3', cameras.cam3);

// Background auto-healing scan every 10 minutes
setInterval(checkAndHealTargets, 10 * 60 * 1000);
