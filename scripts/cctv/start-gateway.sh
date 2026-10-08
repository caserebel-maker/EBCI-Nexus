#!/usr/bin/env bash
# EBCI Nexus CCTV Local Media Gateway (go2rtc)
# Converts RTSP streams from TP-Link Tapo C545D cameras to ultra-low-latency WebRTC and HLS

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if [ ! -f "./go2rtc" ]; then
    echo "Downloading go2rtc for macOS arm64..."
    curl -L -o go2rtc.zip "https://github.com/AlexxIT/go2rtc/releases/download/v1.9.14/go2rtc_mac_arm64.zip"
    unzip -o go2rtc.zip
    chmod +x go2rtc
    rm -f go2rtc.zip
fi

echo "Starting go2rtc with config: $DIR/go2rtc.yaml"
./go2rtc -config "$DIR/go2rtc.yaml"
