/// <reference types="vite/client" />

interface ElectronAPI {
  getConfig: () => Promise<unknown>;
  getEmployees: () => Promise<unknown>;
  toggleFullscreen: () => Promise<void>;
  quitApp: () => Promise<void>;
}

interface Window {
  electronAPI?: ElectronAPI;
}

declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string;
        partition?: string;
        allowpopups?: string;
      },
      HTMLElement
    >;
  }
}
