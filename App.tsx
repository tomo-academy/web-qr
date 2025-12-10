import React, { useState, useRef, useCallback, useEffect } from 'react';
import QRCode from 'qrcode';
import * as htmlToImage from 'html-to-image';
import { Download, Share2, Sparkles, Wand2, RefreshCw, Moon, Sun, Code, Monitor, Smartphone, Tablet, ArrowUp, Link, Palette, FileImage, FileCode } from 'lucide-react';
import { CardData, GenerationStatus, Theme } from './types';
import { fetchMetadataWithGemini } from './services/gemini';
import { SmartCard } from './components/SmartCard';
import { Button } from './components/ui/Button';
import { SocialPreview } from './components/SocialPreview';

// Default placeholder state
const INITIAL_CARD: CardData | null = null;

// Viewport configurations for screenshot generation
const VIEWPORT_OPTIONS = [
  { id: 'desktop', label: 'Desktop', width: 1280, height: 800, icon: Monitor },
  { id: 'mobile', label: 'Mobile', width: 375, height: 812, icon: Smartphone },
  { id: 'tablet', label: 'Tablet', width: 768, height: 1024, icon: Tablet },
];

const App: React.FC = () => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [cardData, setCardData] = useState<CardData | null>(INITIAL_CARD);
  const [status, setStatus] = useState<GenerationStatus>({ step: 'idle' });
  const [theme, setTheme] = useState<Theme>(Theme.Light);
  const [websiteTheme, setWebsiteTheme] = useState<'light' | 'dark'>('light');
  const [showSocialPreview, setShowSocialPreview] = useState(false);
  const [socialImage, setSocialImage] = useState<string>('');
  const [selectedViewport, setSelectedViewport] = useState(VIEWPORT_OPTIONS[0]);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sync theme with HTML element for global styling
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === Theme.Dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === Theme.Light ? Theme.Dark : Theme.Light);
  };

  const toggleWebsiteTheme = () => {
    setWebsiteTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Robust image generation helper
  const generateImage = async (node: HTMLElement, options: any, format: 'png' | 'svg' = 'png') => {
    const config = {
        ...options,
        useCORS: true, // Forces XHR fetch for external images to bypass tainted canvas issues
        preferredFontFormat: 'woff2', // Helps with font loading stability
    };

    try {
        // First attempt with full settings
        if (format === 'svg') {
            return await htmlToImage.toSvg(node, config);
        }
        return await htmlToImage.toPng(node, config);
    } catch (error) {
        console.warn(`Initial ${format} generation failed (likely CORS/Font issue), retrying with skipFonts...`, error);
        // Fallback: Skip fonts to prevent crash
        try {
            const fallbackConfig = { ...config, skipFonts: true };
             if (format === 'svg') {
                return await htmlToImage.toSvg(node, fallbackConfig);
            }
            return await htmlToImage.toPng(node, fallbackConfig);
        } catch (err2) {
            console.error('Final generation attempt failed:', err2);
            throw err2;
        }
    }
  };

  // Helper to proxy URLs via wsrv.nl to ensure CORS headers are present
  const getProxiedUrl = (url: string) => {
    // wsrv.nl is a reliable image proxy that adds CORS headers
    // We add a timestamp to prevent stale caching if the user regenerates
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png&n=${Date.now()}`;
  };

  // Robust Fetcher: Tries multiple high-quality sources and returns Base64
  const fetchFaviconBase64 = async (domain: string, originalUrl: string): Promise<string> => {
    // Priority list of favicon services
    const services = [
      // 1. Google T2 (High Res, Social optimized)
      `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(originalUrl)}&size=128`,
      // 2. Google S2 (Standard)
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      // 3. DuckDuckGo (Good fallback for niche sites)
      `https://icons.duckduckgo.com/ip3/${domain}.ico`
    ];

    for (const serviceUrl of services) {
        try {
            // Use proxy to avoid CORS blocks on the fetch itself
            const proxiedUrl = getProxiedUrl(serviceUrl);
            const response = await fetch(proxiedUrl);
            
            if (!response.ok) continue;
            
            const blob = await response.blob();
            
            // Basic validation: ensure it's an image and has some size
            if (blob.size < 100 || blob.type.includes('text') || blob.type.includes('html')) {
                continue;
            }

            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    // Double check it's a valid data URI
                    if (result && result.startsWith('data:image')) {
                        resolve(result);
                    } else {
                        resolve(''); // Failed conversion
                    }
                };
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.warn(`Favicon fetch failed for ${serviceUrl}`, e);
            continue;
        }
    }
    
    return ''; // Return empty string if all sources fail (SmartCard will show Globe icon)
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    let processedUrl = urlInput.trim();
    if (!/^https?:\/\//i.test(processedUrl)) {
        processedUrl = 'https://' + processedUrl;
    }

    try {
      setStatus({ step: 'fetching_metadata', message: 'Analyzing URL with Gemini...' });

      // 1. Basic URL parsing
      const urlObj = new URL(processedUrl);
      const domain = urlObj.hostname.replace('www.', '');

      // 2. Parallel Fetching: Gemini Metadata + QR Code + Favicon (Base64)
      const [metadata, qrDataUrl, faviconBase64] = await Promise.all([
        fetchMetadataWithGemini(processedUrl),
        QRCode.toDataURL(processedUrl, { 
            width: 400, 
            margin: 1, 
            color: { dark: '#111827', light: '#ffffff00' }, // Dark Gray & Transparent
            errorCorrectionLevel: 'M'
        }),
        fetchFaviconBase64(domain, processedUrl)
      ]);

      // 3. Construct Screenshot URL (Using Microlink)
      // Enhanced params for Quality:
      // - screenshot.type=png: Crisper text/lines than JPEG
      // - screenshot.deviceScaleFactor=2: Retina/High-DPI capture
      // - waitFor=2s: Ensures fonts and JS are loaded before capture
      // - colorScheme: Request Light or Dark mode of the website
      const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(processedUrl)}&screenshot=true&meta=false&embed=screenshot.url&screenshot.type=png&screenshot.deviceScaleFactor=2&waitFor=2s&screenshot.fullPage=false&screenshot.bg=true&viewport.width=${selectedViewport.width}&viewport.height=${selectedViewport.height}&colorScheme=${websiteTheme}`;
      const primaryScreenshotUrl = getProxiedUrl(microlinkUrl);

      // 4. Construct Backup Screenshot URL (Using WordPress mShots)
      // Very reliable fallback if Microlink times out or fails
      const mshotsUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(processedUrl)}?w=${selectedViewport.width}&h=${selectedViewport.height}`;
      const backupScreenshotUrl = getProxiedUrl(mshotsUrl);

      const newCard: CardData = {
        url: processedUrl,
        domain,
        title: metadata.title,
        description: metadata.description,
        screenshotUrl: primaryScreenshotUrl,
        backupScreenshotUrl: backupScreenshotUrl,
        faviconUrl: faviconBase64, // Now fully Base64 or empty
        qrCodeDataUrl: qrDataUrl,
        timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };

      setCardData(newCard);
      setStatus({ step: 'completed' });

    } catch (error) {
      console.error(error);
      setStatus({ step: 'error', message: 'Failed to generate card. Please try again.' });
    }
  };

  const triggerDownload = (dataUrl: string, extension: string) => {
    if (!cardData) return;
    const link = document.createElement('a');
    link.download = `smart-card-${cardData.domain}-${theme}.${extension}`;
    link.href = dataUrl;
    link.click();
  };

  const handleDownloadPng = useCallback(async () => {
    if (!cardRef.current || !cardData) return;
    
    try {
        // Double render pre-warm (common html-to-image quirk)
        try {
            await htmlToImage.toPng(cardRef.current, { cacheBust: true, skipFonts: true });
        } catch (e) {
            // Ignore pre-warm error
        }
        
        // We do NOT set a backgroundColor here. 
        // This ensures the rounded corners remain transparent in the exported PNG.
        const dataUrl = await generateImage(cardRef.current, { 
            quality: 1.0, 
            pixelRatio: 3, // Ultra High Res (3x)
            cacheBust: true,
            backgroundColor: null, 
        }, 'png');
        
        triggerDownload(dataUrl, 'png');
    } catch (err: any) {
        handleDownloadError(err);
    }
  }, [cardData, theme]);

  const handleDownloadSvg = useCallback(async () => {
    if (!cardRef.current || !cardData) return;
    try {
        const dataUrl = await generateImage(cardRef.current, { 
            cacheBust: true,
            backgroundColor: null, 
        }, 'svg');
        
        triggerDownload(dataUrl, 'svg');
    } catch (err: any) {
        handleDownloadError(err);
    }
  }, [cardData, theme]);

  const handleDownloadError = (err: any) => {
    console.error('Download failed', err);
    let errorMessage = 'Unknown error occurred';
    if (err instanceof Error) {
        errorMessage = err.message;
    } else if (typeof err === 'object') {
        try {
            errorMessage = JSON.stringify(err);
        } catch {
            errorMessage = 'Event or Network Error';
        }
    }
    alert(`Could not generate image. Error: ${errorMessage}. \n\nThis is often due to browser security blocking the image download.`);
  };

  const handleShare = async () => {
    if (navigator.share && cardData) {
        try {
             await navigator.share({
                 title: cardData.title,
                 text: cardData.description,
                 url: cardData.url
             });
        } catch (err) {
            console.log('Share canceled');
        }
    } else {
        alert('Web Share API not supported on this device/browser.');
    }
  };

  const handleSocialPreview = useCallback(async () => {
    if (!cardRef.current || !cardData) return;
    
    try {
        // Generate image for preview
        const dataUrl = await generateImage(cardRef.current, { 
            quality: 0.9, 
            pixelRatio: 1.5,
            cacheBust: true,
            backgroundColor: null, // Transparent background for preview too
        }, 'png');
        
        setSocialImage(dataUrl);
        setShowSocialPreview(true);
    } catch (err) {
        console.error('Preview generation failed', err);
        alert('Could not generate social preview.');
    }
  }, [cardData, theme]);

  const isGenerating = status.step === 'fetching_metadata' || status.step === 'generating_qr';

  return (
    <div className="min-h-screen relative overflow-x-hidden font-sans selection:bg-purple-500/30">
      
      {/* 
        Background System 
        Layer 1: Vibrant Mesh Gradient (Visible in Light Mode)
        Layer 2: Deep Dark Solid (Visible in Dark Mode)
      */}
      <div 
        className="fixed inset-0 bg-[conic-gradient(at_bottom_left,_var(--tw-gradient-stops))] from-pink-500 via-violet-600 to-blue-500 z-0 transition-opacity duration-700 ease-in-out opacity-100 dark:opacity-0"
      ></div>
      
      <div 
        className="fixed inset-0 bg-[#0F1117] z-0 transition-opacity duration-700 ease-in-out opacity-0 dark:opacity-100"
      ></div>

      {/* Overlay: Vignette/Texture for depth (Visible in both, slightly adjusted) */}
      <div className="fixed inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/40 z-0 pointer-events-none"></div>

      {/* Main Content Wrapper */}
      <div className="relative z-10 flex flex-col min-h-screen">
        
        {/* Header Section */}
        <header className="pt-12 pb-6 px-4 flex flex-col items-center">
            
            {/* Theme Toggle - Floating Top Right */}
            <div className="absolute top-6 right-6">
                <button 
                    onClick={toggleTheme}
                    className="p-2.5 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 transition-all shadow-lg active:scale-95"
                    aria-label="Toggle theme"
                >
                    {theme === Theme.Light ? <Moon className="w-5 h-5 fill-white/50" /> : <Sun className="w-5 h-5 fill-white/50" />}
                </button>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/10 shadow-lg mb-6 animate-fade-in-up">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span className="text-[11px] font-bold text-white/90 tracking-widest uppercase">Smart Generator</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white text-center drop-shadow-sm mb-3">
                Ready to create?
            </h1>
            <p className="text-lg text-white/70 max-w-2xl text-center font-medium">
                Transform any URL into a stunning card instantly.
            </p>
        </header>

        {/* Floating Input Bar Section */}
        <div className="w-full max-w-[700px] mx-auto px-4 mt-8 sm:mt-12 relative z-20">
            <form 
                onSubmit={handleGenerate} 
                className="
                  group relative flex items-center p-2 
                  bg-[#1C1C1C] dark:bg-[#15171e] rounded-[32px] 
                  border border-white/10 dark:border-gray-700
                  shadow-2xl shadow-purple-900/20 dark:shadow-black/50
                  transition-all duration-300 focus-within:border-white/20 focus-within:shadow-glow
                "
            >
                {/* Controls Group: Viewport + Theme */}
                <div className="flex items-center gap-1 pl-2 pr-3 border-r border-white/10 mr-2">
                    {/* Viewport Selectors */}
                    {VIEWPORT_OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSelectedViewport(opt)}
                            className={`
                                p-2 rounded-full transition-all duration-200
                                ${selectedViewport.id === opt.id 
                                    ? 'bg-white/10 text-white' 
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                }
                            `}
                            title={`Viewport: ${opt.label}`}
                        >
                            <opt.icon className="w-4 h-4" />
                        </button>
                    ))}
                    
                    {/* Website Theme Toggle (Divider) */}
                    <div className="w-px h-5 bg-white/10 mx-1"></div>

                    {/* Website Theme Toggle (Button) */}
                    <button
                        type="button"
                        onClick={toggleWebsiteTheme}
                        className={`
                            p-2 rounded-full transition-all duration-200 relative
                            ${websiteTheme === 'dark'
                                ? 'bg-indigo-500/20 text-indigo-300' 
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                            }
                        `}
                        title={`Website Capture: ${websiteTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}`}
                    >
                         {websiteTheme === 'dark' ? <Moon className="w-4 h-4" /> : <Palette className="w-4 h-4" />}
                    </button>
                </div>

                {/* Main Input */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                    <Link className="w-5 h-5 text-gray-500 flex-shrink-0 ml-1" />
                    <input
                        type="text"
                        placeholder="Paste website URL..."
                        className="
                          w-full bg-transparent border-none outline-none 
                          text-white text-lg placeholder-gray-500 font-medium
                          selection:bg-purple-500/30
                          truncate
                        "
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                    />
                </div>

                {/* Generate Button - Circular 'Submit' style */}
                <div className="pl-2 flex-shrink-0">
                    <Button 
                        type="submit" 
                        variant="icon-only"
                        isLoading={isGenerating}
                        className="w-10 h-10 rounded-full bg-white hover:bg-gray-200 text-black flex items-center justify-center transition-transform active:scale-95"
                        disabled={!urlInput.trim()}
                    >
                        {isGenerating ? null : <ArrowUp className="w-5 h-5 stroke-[3]" />}
                    </Button>
                </div>
            </form>

            {/* Hint Text */}
            <div className="mt-3 text-center opacity-0 animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
                 <p className="text-xs font-medium text-white/40 tracking-wide">
                    {websiteTheme === 'dark' ? '✨ Capturing in Dark Mode' : '📸 Capturing in Light Mode'} 
                    <span className="mx-2">•</span> 
                    {selectedViewport.label} View
                 </p>
            </div>

            {/* Error Message */}
            {status.step === 'error' && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-100 text-sm text-center backdrop-blur-md animate-fade-in">
                    {status.message}
                </div>
            )}
        </div>

        {/* Results Section */}
        <section className="flex-1 w-full max-w-5xl mx-auto px-4 mt-12 mb-20">
            {status.step !== 'idle' && (
                <div className="flex flex-col items-center animate-fade-in-up">
                    <SmartCard 
                        data={cardData} 
                        cardRef={cardRef} 
                        isLoading={isGenerating} 
                    />

                    {/* Actions - Only visible when done */}
                    {cardData && status.step === 'completed' && (
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-fade-in">
                            <Button 
                                onClick={handleDownloadPng} 
                                className="bg-white text-black hover:bg-gray-100 border-none shadow-lg"
                                icon={<FileImage className="w-4 h-4" />}
                            >
                                PNG
                            </Button>
                             <Button 
                                onClick={handleDownloadSvg} 
                                className="bg-white/10 text-white hover:bg-white/20 border border-white/10 backdrop-blur-md"
                                icon={<FileCode className="w-4 h-4" />}
                            >
                                SVG
                            </Button>
                            <Button 
                                onClick={handleSocialPreview}
                                className="bg-white/10 text-white hover:bg-white/20 border border-white/10 backdrop-blur-md"
                                icon={<Code className="w-4 h-4" />}
                            >
                                Meta Tags
                            </Button>
                            <Button 
                                onClick={handleShare}
                                className="bg-white/10 text-white hover:bg-white/20 border border-white/10 backdrop-blur-md"
                                icon={<Share2 className="w-4 h-4" />}
                            >
                                Share
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </section>

      </div>

      <SocialPreview 
            isOpen={showSocialPreview} 
            onClose={() => setShowSocialPreview(false)} 
            data={cardData}
            cardImage={socialImage}
        />
    </div>
  );
};

export default App;