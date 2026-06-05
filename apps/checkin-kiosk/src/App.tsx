import { useEffect, useMemo, useRef, useState } from 'react';

type Config = {
  standbyMode: 'canva' | 'image';
  canvaUrl: string;
  popupDurationMs: number;
  canvaAdvanceIntervalMs?: number;
  canvaSlideCount?: number;
  unknownCardMessage: string;
  companyName: string;
  fallbackImage: string;
};

type Employee = {
  cardId: string;
  nameTh: string;
  nameEn: string;
  position: string;
  photo: string;
};

type CanvaStatus = 'loading' | 'loaded' | 'webview' | 'fallback';

type PopupState =
  | {
      id: number;
      type: 'success';
      cardId: string;
      employee: Employee;
      closing: boolean;
    }
  | {
      id: number;
      type: 'error';
      cardId: string;
      closing: boolean;
    };

const defaultConfig: Config = {
  standbyMode: 'canva',
  canvaUrl: 'https://www.canva.com/design/xxxxx/view',
  popupDurationMs: 3000,
  canvaAdvanceIntervalMs: 8000,
  canvaSlideCount: 6,
  unknownCardMessage: 'ไม่พบข้อมูลพนักงาน',
  companyName: 'EBCI',
  fallbackImage: 'assets/fallback-standby.png',
};

const popupFadeMs = 420;
const unknownPopupDurationMs = 2500;

const thaiKeyboardToEnglishMap: Record<string, string> = {
  'ๅ': '1',
  '/': '2',
  '-': '3',
  'ภ': '4',
  'ถ': '5',
  'ุ': '6',
  'ึ': '7',
  'ค': '8',
  'ต': '9',
  'จ': '0',
  'ๆ': 'q',
  'ไ': 'w',
  'ำ': 'e',
  'พ': 'r',
  'ะ': 't',
  'ั': 'y',
  'ี': 'u',
  'ร': 'i',
  'น': 'o',
  'ย': 'p',
  'ฟ': 'a',
  'ห': 's',
  'ก': 'd',
  'ด': 'f',
  'เ': 'g',
  '้': 'h',
  '่': 'j',
  'า': 'k',
  'ส': 'l',
  'ว': ';',
  'ง': "'",
  'ผ': 'z',
  'ป': 'x',
  'แ': 'c',
  'อ': 'v',
  'ิ': 'b',
  'ื': 'n',
  'ท': 'm',
  'ม': ',',
  'ใ': '.',
  'ฝ': '/',
};

const observedThaiLayoutOverrides: Record<string, string> = {
  ท: 'e',
  ห: 'm',
  อ: 'p',
};

function mapKeyboardText(value: string, map: Record<string, string>) {
  return value
    .split('')
    .map((char) => map[char] ?? char)
    .join('');
}

function isUsableCanvaUrl(url: string) {
  if (!url || url.includes('xxxxx')) return false;

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeCanvaUrl(url: string) {
  if (!url) return url;

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.endsWith('canva.com') && parsedUrl.pathname.includes('/design/')) {
      parsedUrl.pathname = parsedUrl.pathname.replace(/\/edit\/?$/, '/view').replace(/\/edit\//, '/view/');
      if (!parsedUrl.searchParams.has('embed')) {
        parsedUrl.searchParams.set('embed', '');
      }
      return parsedUrl.toString();
    }
  } catch {
    return url;
  }

  return url;
}

function assetUrl(path: string) {
  if (/^https?:\/\//i.test(path) || path.startsWith('/')) return path;
  return path.replace(/^public\//, '');
}

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

function App() {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [canvaStatus, setCanvaStatus] = useState<CanvaStatus>('loading');
  const [useWebview, setUseWebview] = useState(false);
  const [backgroundKey, setBackgroundKey] = useState(0);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [lastScan, setLastScan] = useState('');
  const [lastMatchName, setLastMatchName] = useState('-');
  const [hideCursor, setHideCursor] = useState(false);

  const inputBufferRef = useRef('');
  const popupTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const escapePressesRef = useRef<number[]>([]);
  const cursorTimerRef = useRef<number | null>(null);
  const webviewRef = useRef<
    (HTMLElement & { executeJavaScript?: (code: string) => Promise<unknown>; sendInputEvent?: (event: unknown) => void }) | null
  >(null);

  const employeeByCardId = useMemo(() => {
    return new Map(employees.map((employee) => [employee.cardId.trim().toUpperCase(), employee]));
  }, [employees]);

  useEffect(() => {
    const loadConfig = async () => {
      const runtimeConfig = window.electronAPI?.getConfig
        ? ((await window.electronAPI.getConfig()) as Config)
        : await fetchJson<Config>('/config.json', defaultConfig);
      setConfig({ ...defaultConfig, ...runtimeConfig });
    };

    const loadEmployees = async () => {
      const runtimeEmployees = window.electronAPI?.getEmployees
        ? ((await window.electronAPI.getEmployees()) as Employee[])
        : await fetchJson<Employee[]>('/employees.json', []);
      setEmployees(Array.isArray(runtimeEmployees) ? runtimeEmployees : []);
    };

    loadConfig();
    loadEmployees();
  }, []);

  useEffect(() => {
    const canUseCanva = config.standbyMode === 'canva' && isUsableCanvaUrl(config.canvaUrl);
    setCanvaStatus(canUseCanva ? 'loading' : 'fallback');
    setUseWebview(canUseCanva);

    if (!canUseCanva) return;

    const fallbackTimer = window.setTimeout(() => {
      setUseWebview(true);
      setCanvaStatus('webview');
    }, 5000);

    return () => window.clearTimeout(fallbackTimer);
  }, [config.standbyMode, config.canvaUrl, backgroundKey]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || !useWebview) return;

    const handleLoaded = () => setCanvaStatus('webview');
    const handleFailed = () => {
      setCanvaStatus('webview');
    };

    webview.addEventListener('did-finish-load', handleLoaded);
    webview.addEventListener('did-fail-load', handleFailed);

    return () => {
      webview.removeEventListener('did-finish-load', handleLoaded);
      webview.removeEventListener('did-fail-load', handleFailed);
    };
  }, [useWebview, backgroundKey]);

  useEffect(() => {
    const webview = webviewRef.current;
    const intervalMs = config.canvaAdvanceIntervalMs ?? defaultConfig.canvaAdvanceIntervalMs ?? 8000;
    const fallbackSlideCount = config.canvaSlideCount ?? defaultConfig.canvaSlideCount ?? 6;

    if (!webview || !useWebview || intervalMs <= 0 || canvaStatus === 'fallback') return;

    const advanceTimer = window.setInterval(() => {
      if (webview.executeJavaScript) {
        webview.executeJavaScript(`
        (() => {
          const pageText = document.body?.innerText || '';
          const pageMatch = pageText.match(/Page\\s+(\\d+)\\s+of\\s+(\\d+)/i);
          const hashMatch = location.hash.match(/#(\\d+)/);
          const current = Number(hashMatch?.[1] || pageMatch?.[1] || 1);
          const total = Number(pageMatch?.[2] || ${fallbackSlideCount});
          const next = current >= total ? 1 : current + 1;
          location.hash = '#' + next;
          return { current, total, next, href: location.href };
        })();
      `).catch(() => {
          webview.sendInputEvent?.({ type: 'keyDown', keyCode: 'ArrowRight' });
          webview.sendInputEvent?.({ type: 'keyUp', keyCode: 'ArrowRight' });
        });
        return;
      }

      webview.sendInputEvent?.({ type: 'keyDown', keyCode: 'ArrowRight' });
      webview.sendInputEvent?.({ type: 'keyUp', keyCode: 'ArrowRight' });
    }, intervalMs);

    return () => window.clearInterval(advanceTimer);
  }, [config.canvaAdvanceIntervalMs, config.canvaSlideCount, useWebview, canvaStatus, backgroundKey]);

  useEffect(() => {
    const resetCursorTimer = () => {
      setHideCursor(false);
      if (cursorTimerRef.current) window.clearTimeout(cursorTimerRef.current);
      cursorTimerRef.current = window.setTimeout(() => setHideCursor(true), 3200);
    };

    resetCursorTimer();
    window.addEventListener('mousemove', resetCursorTimer);
    window.addEventListener('mousedown', resetCursorTimer);

    return () => {
      window.removeEventListener('mousemove', resetCursorTimer);
      window.removeEventListener('mousedown', resetCursorTimer);
      if (cursorTimerRef.current) window.clearTimeout(cursorTimerRef.current);
    };
  }, []);

  const clearPopupTimers = () => {
    if (popupTimerRef.current) window.clearTimeout(popupTimerRef.current);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  };

  const showPopup = (nextPopup: Omit<PopupState, 'id' | 'closing'>, durationMs: number) => {
    clearPopupTimers();
    const id = Date.now();
    setPopup({ ...nextPopup, id, closing: false } as PopupState);

    popupTimerRef.current = window.setTimeout(() => {
      setPopup((current) => (current?.id === id ? ({ ...current, closing: true } as PopupState) : current));
      closeTimerRef.current = window.setTimeout(() => {
        setPopup((current) => (current?.id === id ? null : current));
      }, popupFadeMs);
    }, durationMs);
  };

  const handleCardId = (rawCardId: string) => {
    const cardId = rawCardId.trim();
    if (!cardId) return;

    const cardIdCandidates = [
      cardId,
      mapKeyboardText(cardId, thaiKeyboardToEnglishMap),
      mapKeyboardText(cardId, observedThaiLayoutOverrides),
    ];
    const employee = cardIdCandidates
      .map((candidate) => employeeByCardId.get(candidate.trim().toUpperCase()))
      .find(Boolean);
    setLastScan(cardId);

    if (employee) {
      setLastMatchName(employee.nameTh);
      showPopup({ type: 'success', cardId, employee }, config.popupDurationMs);
      return;
    }

    setLastMatchName('-');
    showPopup({ type: 'error', cardId }, unknownPopupDurationMs);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        setDebugOpen((current) => !current);
        return;
      }

      if (event.key === 'F11') {
        event.preventDefault();
        window.electronAPI?.toggleFullscreen();
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        setBackgroundKey((current) => current + 1);
        return;
      }

      if (event.key === 'Escape') {
        const now = Date.now();
        escapePressesRef.current = [...escapePressesRef.current.filter((time) => now - time < 1600), now];
        if (escapePressesRef.current.length >= 3) {
          window.electronAPI?.quitApp();
        }
        inputBufferRef.current = '';
        return;
      }

      if (event.ctrlKey || event.altKey || event.metaKey) return;

      if (event.key === 'Enter') {
        const bufferedCardId = inputBufferRef.current;
        inputBufferRef.current = '';
        handleCardId(bufferedCardId);
        return;
      }

      if (event.key === 'Backspace') {
        inputBufferRef.current = inputBufferRef.current.slice(0, -1);
        return;
      }

      if (event.key.length === 1) {
        inputBufferRef.current += event.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearPopupTimers();
    };
  }, [config.popupDurationMs, employeeByCardId]);

  return (
    <main className={`kiosk-shell ${hideCursor ? 'hide-cursor' : ''}`}>
      <CanvaBackground
        config={config}
        status={canvaStatus}
        useWebview={useWebview}
        webviewRef={webviewRef}
        backgroundKey={backgroundKey}
        onIframeLoaded={() => setCanvaStatus('loaded')}
        onIframeError={() => setCanvaStatus('fallback')}
      />

      {popup ? <CheckinPopup config={config} popup={popup} /> : null}

      {debugOpen ? (
        <aside className="debug-panel">
          <div>Last card: {lastScan || '-'}</div>
          <div>Matched: {lastMatchName}</div>
          <div>Canva: {canvaStatus}</div>
          <div>Employees: {employees.length}</div>
        </aside>
      ) : null}
    </main>
  );
}

type CanvaBackgroundProps = {
  config: Config;
  status: CanvaStatus;
  useWebview: boolean;
  webviewRef: React.MutableRefObject<
    (HTMLElement & { executeJavaScript?: (code: string) => Promise<unknown>; sendInputEvent?: (event: unknown) => void }) | null
  >;
  backgroundKey: number;
  onIframeLoaded: () => void;
  onIframeError: () => void;
};

function CanvaBackground({
  config,
  status,
  useWebview,
  webviewRef,
  backgroundKey,
  onIframeLoaded,
  onIframeError,
}: CanvaBackgroundProps) {
  const canUseCanva = config.standbyMode === 'canva' && isUsableCanvaUrl(config.canvaUrl);
  const showFallback = !canUseCanva;
  const fallbackImage = assetUrl(config.fallbackImage);
  const canvaUrl = normalizeCanvaUrl(config.canvaUrl);

  return (
    <section className="background-layer" aria-label="Standby Canva presentation">
      {showFallback ? (
        <div className="fallback-standby" style={{ backgroundImage: `url("${fallbackImage}")` }}>
          <div className="fallback-brand">{config.companyName}</div>
        </div>
      ) : useWebview ? (
        <webview
          key={`webview-${backgroundKey}`}
          ref={(element) => {
            webviewRef.current = element;
          }}
          className="canva-frame"
          src={canvaUrl}
          partition="persist:canva-standby"
          allowpopups="true"
        />
      ) : (
        <iframe
          key={`iframe-${backgroundKey}`}
          className="canva-frame"
          src={canvaUrl}
          title="EBCI Canva standby"
          allow="fullscreen; autoplay; encrypted-media"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={onIframeLoaded}
          onError={onIframeError}
        />
      )}
    </section>
  );
}

function CheckinPopup({ config, popup }: { config: Config; popup: PopupState }) {
  if (popup.type === 'error') {
    return (
      <section className={`overlay-layer ${popup.closing ? 'is-closing' : ''}`}>
        <div className="error-popup">
          <div className="error-title">{config.unknownCardMessage}</div>
          <div className="error-card">Card ID: {popup.cardId}</div>
        </div>
      </section>
    );
  }

  const employee = popup.employee;
  const now = new Date();

  return (
    <section className={`overlay-layer ${popup.closing ? 'is-closing' : ''}`}>
      <article className="hud-popup" aria-live="polite">
        <header className="hud-topbar">
          <div className="brand-mark">{config.companyName}</div>
          <div className="time-stack">
            <div className="hud-time">{now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="hud-date">
              {now.toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </header>

        <div className="welcome-copy">
          <div className="welcome-kicker">ยินดีต้อนรับกลับมา</div>
          <h1>{employee.nameTh}</h1>
          <p>{employee.position}</p>
        </div>

        <div className="photo-frame">
          <div className="photo-corners" />
          <img src={assetUrl(employee.photo)} alt={employee.nameTh} />
        </div>

        <footer className="success-panel">
          <div className="check-icon" aria-hidden="true">✓</div>
          <div>
            <div className="success-th">บันทึกเวลาเข้างานเรียบร้อยแล้ว</div>
            <div className="success-en">Check-in successful</div>
          </div>
        </footer>
      </article>
    </section>
  );
}

export default App;
