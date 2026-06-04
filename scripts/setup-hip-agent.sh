#!/bin/bash

# setup-hip-agent.sh
# Automates the setup of the HIP Card Scan Agent as a macOS LaunchAgent.
# Run this script from the project root.

set -e

APP_DIR="$(pwd)"
SCRIPT_PATH="$APP_DIR/scripts/hip-card-agent.mjs"
PLIST_PATH="$HOME/Library/LaunchAgents/com.ebci.nexus.hip-agent.plist"
LOG_DIR="$APP_DIR/logs"

echo "=== EBCI Nexus HIP Card Agent Setup ==="
echo "Working Directory: $APP_DIR"

# 1. Verify script exists
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Error: hip-card-agent.mjs not found at $SCRIPT_PATH"
    echo "Please run this script from the EBCI-Nexus-App root directory."
    exit 1
fi

# 2. Get Node.js path
NODE_PATH=$(which node || echo "/usr/local/bin/node")
if [ ! -x "$NODE_PATH" ]; then
    echo "Error: Node.js binary not found or not executable at $NODE_PATH"
    exit 1
fi
echo "Node.js Path: $NODE_PATH"

# 3. Create logs directory
if [ ! -d "$LOG_DIR" ]; then
    echo "Creating logs directory: $LOG_DIR"
    mkdir -p "$LOG_DIR"
fi

# 4. Generate the launchd plist file
echo "Generating LaunchAgent plist..."
cat <<EOF > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ebci.nexus.hip-agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$SCRIPT_PATH</string>
        <string>watch</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    <key>WorkingDirectory</key>
    <string>$APP_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/hip-agent.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/hip-agent.log</string>
</dict>
</plist>
EOF

chmod 644 "$PLIST_PATH"
echo "Plist file generated at: $PLIST_PATH"

echo ""
echo "=== Setup Completed Successfully ==="
echo "To start the background service:"
echo "  launchctl load \"$PLIST_PATH\""
echo ""
echo "To stop the background service:"
echo "  launchctl unload \"$PLIST_PATH\""
echo ""
echo "To view live logs:"
echo "  tail -f \"$LOG_DIR/hip-agent.log\""
echo "===================================="
