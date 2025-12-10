import React, { useState, useEffect } from 'react';
import { CardData } from '../types';
import { ExternalLink, ImageOff, Globe } from 'lucide-react';

interface SmartCardProps {
  data: CardData | null;
  cardRef: React.RefObject<HTMLDivElement>;
  isLoading?: boolean;
}

export const SmartCard: React.FC<SmartCardProps> = ({ data, cardRef, isLoading = false }) => {
  const [imageError, setImageError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [currentScreenshotUrl, setCurrentScreenshotUrl] = useState<string>('');

  // Reset states and initialize URL when data changes
  useEffect(() => {
    if (data) {
      setImageError(false);
      setFaviconError(false);
      setImageLoading(true); // Start loading the new screenshot
      setCurrentScreenshotUrl(data.screenshotUrl);
    }
  }, [data]);

  // Loading Skeleton (used when generating metadata)
  if (isLoading) {
    return (
      <div className="w-full flex justify-center py-8 animate-fade-in-up">
        <div 
          className="relative bg-white dark:bg-[#1A1D24] w-full max-w-[480px] rounded-[24px] shadow-premium border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col"
          style={{ aspectRatio: '4/5' }}
        >
           {/* Shimmer Overlay - Global for Skeleton */}
           <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent animate-shimmer" style={{ transform: 'skewX(-20deg) translateX(-10%)' }} />
           </div>
           
           <div className="w-full h-full flex flex-col">
              {/* Top: Image Placeholder */}
              <div className="h-[55%] bg-gray-100 dark:bg-gray-800/80 w-full relative overflow-hidden">
                 <div className="absolute inset-0 bg-gray-200/50 dark:bg-gray-700/50 animate-pulse" />
              </div>
              
              {/* Bottom: Content Placeholder */}
              <div className="flex-1 p-6 flex flex-col justify-between">
                 <div>
                    <div className="flex gap-4 mb-4">
                       <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-800 shrink-0 animate-pulse" />
                       <div className="flex-1 space-y-3 pt-1">
                          <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-3/4 animate-pulse" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 animate-pulse" />
                       </div>
                    </div>
                    <div className="space-y-2 pl-16">
                       <div className="h-3 bg-gray-100 dark:bg-gray-800/60 rounded w-5/6 animate-pulse" />
                    </div>
                 </div>
                 
                 <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex items-end justify-between gap-4">
                    <div className="space-y-2 flex-1">
                       <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-24 animate-pulse" />
                       <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-32 animate-pulse" />
                    </div>
                    <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-800 shrink-0 animate-pulse" />
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const handleScreenshotError = () => {
    // If we have a backup and haven't tried it yet
    if (data.backupScreenshotUrl && currentScreenshotUrl === data.screenshotUrl) {
      console.log('Primary screenshot failed, attempting fallback...');
      setCurrentScreenshotUrl(data.backupScreenshotUrl);
      // Keep loading true as we fetch the backup
    } else {
      console.error('All screenshot sources failed.');
      setImageLoading(false);
      setImageError(true);
    }
  };

  // Determine if favicon is a Data URI (Base64) or a remote URL
  const isFaviconBase64 = data.faviconUrl?.startsWith('data:');

  return (
    <div className="w-full flex justify-center py-8">
      
      {/* 
         Capture Wrapper:
         This padded container is what we actually capture with html-to-image.
         The padding ensures the shadow (shadow-premium) is visible and not clipped.
         The transparent background of this wrapper combined with null backgroundColor in export
         ensures the rounded corners of the inner card are preserved in the PNG.
      */}
      <div ref={cardRef} className="p-8 md:p-10 inline-block">
          <div 
            className="relative bg-white dark:bg-[#1A1D24] w-full max-w-[480px] rounded-[24px] shadow-premium border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col transition-colors duration-300 mx-auto"
            style={{ aspectRatio: '4/5' }} // Enforce a nice vertical aspect ratio
          >
            
            {/* Top: Screenshot Area */}
            <div className="relative w-full h-[55%] bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 overflow-hidden group">
                
                {/* Image Loading Shimmer Overlay - Specific to screenshot area */}
                {imageLoading && !imageError && (
                  <div className="absolute inset-0 z-20 bg-gray-100 dark:bg-gray-800">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200/50 dark:via-gray-700/50 to-transparent animate-shimmer" />
                  </div>
                )}

                {!imageError && currentScreenshotUrl ? (
                    <img 
                        src={currentScreenshotUrl} 
                        alt="Website Preview" 
                        crossOrigin="anonymous" 
                        className={`w-full h-full object-cover object-top transition-all duration-700 group-hover:scale-105 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                        onLoad={() => setImageLoading(false)}
                        onError={handleScreenshotError}
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 gap-2 bg-gray-50/50 dark:bg-gray-800/50">
                        <ImageOff className="w-8 h-8 opacity-50" />
                        <span className="text-sm font-medium opacity-70">Preview Unavailable</span>
                    </div>
                )}
                
                {/* Overlay Gradient for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
            </div>

            {/* Bottom: Content Area */}
            <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between bg-white dark:bg-[#1A1D24] relative transition-colors duration-300">
                
                {/* Header: Icon + Title */}
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 flex items-center justify-center shadow-sm">
                        {!faviconError && data.faviconUrl ? (
                            <img 
                                src={data.faviconUrl} 
                                alt="Favicon" 
                                // Only use crossOrigin="anonymous" if it's NOT a base64 string
                                // Base64 strings don't need CORS checks and sometimes fail if it's set
                                crossOrigin={isFaviconBase64 ? undefined : "anonymous"}
                                className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                                onError={() => setFaviconError(true)}
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 group/link">
                            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">
                                {data.title}
                            </h2>
                            <a 
                                href={data.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex-shrink-0 text-gray-300 hover:text-blue-600 dark:text-gray-600 dark:hover:text-blue-400 transition-colors duration-200"
                                title="Open Original URL"
                            >
                                <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </a>
                        </div>
                        <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {data.description}
                        </p>
                    </div>
                </div>

                {/* Footer: QR + Info */}
                <div className="mt-5 pt-5 border-t border-gray-50 dark:border-gray-800 flex items-end justify-between gap-4">
                    <div className="flex flex-col min-w-0 flex-1">
                        {/* Domain */}
                        <div className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight truncate mb-1">
                            {data.domain}
                        </div>
                        
                        {/* URL */}
                        <div className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate opacity-90 leading-tight">
                            {data.url}
                        </div>
                        
                        {/* Timestamp */}
                        <div className="flex items-center gap-2 mt-3">
                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                {data.timestamp}
                            </span>
                        </div>
                    </div>
                    
                    {/* QR Code Container */}
                    <div className="flex-shrink-0 bg-white p-2 rounded-xl border border-gray-300 dark:border-gray-600 shadow-md ring-1 ring-black/5 dark:ring-white/10">
                        {data.qrCodeDataUrl && (
                            <img 
                                src={data.qrCodeDataUrl} 
                                alt="QR Code" 
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg mix-blend-multiply opacity-90" 
                            />
                        )}
                    </div>
                </div>
                
                {/* Decorative Noise/Texture */}
                <div className="absolute inset-0 bg-gray-50 opacity-[0.02] dark:opacity-[0.05] pointer-events-none mix-blend-multiply dark:mix-blend-overlay" />
            </div>
          </div>
      </div>
    </div>
  );
};