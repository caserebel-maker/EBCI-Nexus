const net = require('net');

const LISTEN_PORT = 5543;
const TARGET_HOST = '192.168.10.121';
const TARGET_PORT = 554;
const LOCAL_ADDR = '192.168.0.104';

const server = net.createServer((inbound) => {
    const outbound = net.createConnection({
        host: TARGET_HOST,
        port: TARGET_PORT,
        localAddress: LOCAL_ADDR
    });

    inbound.pipe(outbound);
    outbound.pipe(inbound);

    inbound.on('error', (err) => {});
    outbound.on('error', (err) => {});
});

server.listen(LISTEN_PORT, '127.0.0.1', () => {
    console.log(`[Cam3 RTSP Relay] 127.0.0.1:${LISTEN_PORT} -> ${TARGET_HOST}:${TARGET_PORT} via ${LOCAL_ADDR}`);
});
