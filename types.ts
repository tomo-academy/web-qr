export interface CardData {
  url: string;
  domain: string;
  title: string;
  description: string;
  screenshotUrl: string;
  backupScreenshotUrl?: string;
  faviconUrl: string;
  qrCodeDataUrl: string;
  timestamp: string;
}

export interface GenerationStatus {
  step: 'idle' | 'fetching_metadata' | 'generating_qr' | 'completed' | 'error';
  message?: string;
}

export enum Theme {
  Light = 'light',
  Dark = 'dark' // Future proofing, currently focusing on light/premium
}