#!/usr/bin/env python3
import os
import sys
import json
import socket
import urllib.request
import urllib.error
from datetime import datetime, timedelta

# Try to import zk, print friendly error if missing
try:
    from zk import ZK, const
except ImportError:
    print("[hip-agent] Error: 'pyzk' library is not installed.")
    print("Please install it using: pip install pyzk")
    sys.exit(1)

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def load_env_file(file_name):
    file_path = os.path.join(REPO_ROOT, file_name)
    if not os.path.exists(file_path):
        return
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip()
            if key not in os.environ:
                if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                    val = val[1:-1]
                os.environ[key] = val

load_env_file(".env.local")
load_env_file(".env")

def parse_args():
    args = {
        "command": "probe",
        "host": os.environ.get("HIP_HOST", "192.168.1.40"),
        "port": int(os.environ.get("HIP_PORT", "5005")),
        "timeout": int(os.environ.get("HIP_TIMEOUT_MS", "10000")) // 1000,
        "comm_key": int(os.environ.get("HIP_COMM_KEY", "0")),
        "force_udp": os.environ.get("HIP_PROTOCOL", "").lower() == "udp",
        "webhook": os.environ.get("NEXUS_CARD_SCAN_WEBHOOK", ""),
        "secret": os.environ.get("CARD_SCAN_WEBHOOK_SECRET", ""),
        "device_id": os.environ.get("HIP_DEVICE_ID", "HIPCI100S"),
        "state_file": os.environ.get("HIP_STATE_FILE", os.path.join(REPO_ROOT, ".hip-card-agent-state.json")),
        "dry_run": False,
        "once": False,
        "since_minutes": None,
        "code_map": os.environ.get("HIP_CODE_MAP_PATH", "")
    }

    # Find position arguments
    pos_args = []
    i = 0
    argv = sys.argv[1:]
    while i < len(argv):
        token = argv[i]
        if not token.startswith("--"):
            pos_args.append(token)
            i += 1
            continue
        
        key = token[2:].replace("-", "_")
        if i + 1 < len(argv) and not argv[i+1].startswith("--"):
            val = argv[i+1]
            i += 2
        else:
            val = True
            i += 1
            
        if key in ["port", "timeout", "comm_key", "since_minutes"]:
            args[key] = int(val) if val is not True else val
        elif key in ["force_udp", "dry_run", "once"]:
            args[key] = bool(val)
        else:
            args[key] = val

    if pos_args:
        args["command"] = pos_args[0]
        
    if not args["webhook"]:
        app_url = os.environ.get("NEXT_PUBLIC_APP_URL", "https://ebci-nexus.vercel.app")
        args["webhook"] = f"{app_url}/api/webhooks/card-scan"

    return args

config = parse_args()

def usage():
    print("""Usage:
  python scripts/hip-card-agent.py [probe|sync|watch] [options]

Options:
  --host <ip>          Device IP address (default: 192.168.1.40)
  --port <port>        Device communication port (default: 5005)
  --timeout <sec>      Timeout in seconds (default: 10)
  --comm-key <key>     Device communication password/Comm Key (default: 0)
  --force-udp          Force UDP connection mode
  --webhook <url>      Nexus card-scan webhook URL
  --secret <secret>    Webhook authentication secret (CARD_SCAN_WEBHOOK_SECRET)
  --device-id <id>     ID of the device (default: HIPCI100S)
  --state-file <path>  JSON file for storing posted scan records
  --dry-run            Print card scan records instead of posting them
  --once               (For watch) stop after receiving the first event
  --since-minutes <m>  (For sync) only sync records from the last N minutes
  --code-map <path>    Path to JSON mapping device user ID to employee code
""")

def tcp_probe(host, port):
    print(f"[hip-agent] TCP probe {host}:{port}")
    try:
        s = socket.create_connection((host, port), timeout=3.0)
        s.close()
        return True, None
    except Exception as e:
        return False, str(e)

def load_state():
    try:
        with open(config["state_file"], "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"posted": []}

def save_state(state):
    try:
        os.makedirs(os.path.dirname(config["state_file"]), exist_ok=True)
        with open(config["state_file"], "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
            f.write("\n")
    except Exception as e:
        print(f"[hip-agent] Failed to save state file: {e}")

def load_code_map():
    if not config["code_map"]:
        return {}
    full_path = config["code_map"] if os.path.isabs(config["code_map"]) else os.path.join(REPO_ROOT, config["code_map"])
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[hip-agent] Warning: Failed to load code map from {full_path}: {e}")
        return {}

def format_bangkok_wall_clock(dt):
    if not dt:
        return None
    return dt.strftime("%Y-%m-%dT%H:%M:%S")

def map_special_hip_code(raw_code):
    compact = str(raw_code or "").strip().replace("-", "").replace(" ", "")
    if compact in {"010466", "010464", "10466", "10464", "0466", "0464", "466", "464"}:
        return "466-64"
    return None

def normalize_scan(record, code_map):
    raw_code = str(record.user_id).strip()
    employee_code = code_map.get(raw_code) or map_special_hip_code(raw_code) or raw_code
    scan_time = format_bangkok_wall_clock(record.timestamp)
    if not employee_code or not scan_time:
        return None
    return {
        "device_id": config["device_id"],
        "employee_code": employee_code,
        "scan_time": scan_time,
        "raw_data": {
            "source": "hip-card-agent-py",
            "hip_host": config["host"],
            "hip_port": config["port"],
            "raw_user_id": raw_code,
            "punch": record.punch,
            "status": record.status
        }
    }

def scan_key(scan):
    return f"{scan['employee_code']}|{scan['scan_time']}"

def post_scans(scans):
    if not scans:
        return {"skipped": True, "reason": "no scans"}
    if config["dry_run"]:
        print(json.dumps(scans, indent=2))
        return {"dryRun": True, "count": len(scans)}
    if not config["secret"]:
        raise ValueError("Missing CARD_SCAN_WEBHOOK_SECRET. Set it in .env or pass --secret")
    
    req = urllib.request.Request(
        config["webhook"],
        data=json.dumps(scans).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Secret": config["secret"]
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10.0) as response:
            res_body = response.read().decode("utf-8")
            try:
                return json.loads(res_body)
            except Exception:
                return res_body
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        raise RuntimeError(f"Webhook {e.code}: {err_body}")
    except Exception as e:
        raise RuntimeError(f"Failed to connect to webhook: {e}")

def run_probe():
    # Only run TCP probe if force_udp is false
    if not config["force_udp"]:
        ok, err = tcp_probe(config["host"], config["port"])
        if not ok:
            print(f"[hip-agent] TCP failed: {err}")
            sys.exit(1)
        print("[hip-agent] TCP ok")

    print(f"[hip-agent] ZK params: IP={config['host']}, port={config['port']}, timeout={config['timeout']}, comm_key={config['comm_key']}, force_udp={config['force_udp']}")
    zk = ZK(config["host"], port=config["port"], timeout=config["timeout"], password=config["comm_key"], force_udp=config["force_udp"])
    conn = None
    try:
        conn = zk.connect()
        print("[hip-agent] ZK protocol connected successfully")
        firmware = conn.get_firmware_version()
        name = conn.get_device_name()
        print(f"[hip-agent] Device Name: {name}")
        print(f"[hip-agent] Device Firmware: {firmware}")
    except Exception as e:
        print(f"[hip-agent] ZK protocol failed: {e}")
        print("[hip-agent] If HIP desktop software is open, close/disconnect it and try again. Also confirm Comm Key.")
        sys.exit(2)
    finally:
        if conn:
            try:
                conn.disconnect()
            except Exception:
                pass

def run_sync():
    code_map = load_code_map()
    state = load_state()
    posted = set(state.get("posted", []))
    
    cutoff = None
    if config["since_minutes"]:
        cutoff = datetime.now() - timedelta(minutes=config["since_minutes"])

    print(f"[hip-agent] Connecting to device {config['host']}:{config['port']} for sync...")
    zk = ZK(config["host"], port=config["port"], timeout=config["timeout"], password=config["comm_key"], force_udp=config["force_udp"])
    conn = None
    try:
        conn = zk.connect()
        print("[hip-agent] Connected. Disabling device interface during download...")
        conn.disable_device()
        
        print("[hip-agent] Downloading attendance logs...")
        logs = conn.get_attendance()
        
        scans = []
        for record in logs:
            scan = normalize_scan(record, code_map)
            if not scan:
                continue
            # Filter by cutoff time
            if cutoff and record.timestamp < cutoff:
                continue
            # Filter by already posted
            if scan_key(scan) in posted:
                continue
            scans.append(scan)

        print(f"[hip-agent] Total logs downloaded: {len(logs)}. New logs to post: {len(scans)}")
        
        if scans:
            result = post_scans(scans)
            print("[hip-agent] Webhook response:", result)
            for scan in scans:
                posted.add(scan_key(scan))
            
            # Save state (keep last 10,000 to avoid infinite growth)
            state["posted"] = list(posted)[-10000:]
            state["updated_at"] = datetime.now().isoformat()
            save_state(state)
        else:
            print("[hip-agent] No new logs to upload.")
            
    except Exception as e:
        print(f"[hip-agent] Sync failed: {e}")
        sys.exit(1)
    finally:
        if conn:
            try:
                conn.enable_device()
                conn.disconnect()
            except Exception:
                pass

def run_watch():
    code_map = load_code_map()
    state = load_state()
    posted = set(state.get("posted", []))
    
    print(f"[hip-agent] Connecting to device {config['host']}:{config['port']} for real-time watch...")
    zk = ZK(config["host"], port=config["port"], timeout=config["timeout"], password=config["comm_key"], force_udp=config["force_udp"])
    conn = None
    try:
        conn = zk.connect()
        print("[hip-agent] Connected. Listening to real-time events...")
        
        for record in conn.live_capture():
            if record is None:
                continue
            
            scan = normalize_scan(record, code_map)
            if not scan:
                print(f"[hip-agent] Warning: Ignored unreadable record: {record}")
                continue
                
            key = scan_key(scan)
            if key in posted:
                print(f"[hip-agent] Duplicate scan skipped: {key}")
                continue
                
            try:
                result = post_scans([scan])
                print(f"[hip-agent] Posted realtime scan {key}: {result}")
                posted.add(key)
                state["posted"] = list(posted)[-10000:]
                state["updated_at"] = datetime.now().isoformat()
                save_state(state)
                
                if config["once"]:
                    break
            except Exception as ex:
                print(f"[hip-agent] Failed to post realtime scan {key}: {ex}")
                
    except KeyboardInterrupt:
        print("\n[hip-agent] Stopped by user.")
    except Exception as e:
        print(f"[hip-agent] Real-time watch failed: {e}")
        sys.exit(1)
    finally:
        if conn:
            try:
                conn.disconnect()
            except Exception:
                pass

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ["--help", "-h"]:
        usage()
        sys.exit(0)
        
    cmd = config["command"]
    if cmd == "probe":
        run_probe()
    elif cmd == "sync":
        run_sync()
    elif cmd == "watch":
        run_watch()
    else:
        usage()
        sys.exit(1)
