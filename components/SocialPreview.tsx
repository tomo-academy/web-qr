import React, { useState } from 'react';
import { X, Copy, Check, Info } from 'lucide-react';
import { CardData } from '../types';
import { Button } from './ui/Button';

interface SocialPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  data: CardData | null;
  cardImage: string;
}

export const SocialPreview: React.FC<SocialPreviewProps> = ({ isOpen, onClose, data, cardImage }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const metaTags = `<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="${data.url}">
<meta property="og:title" content="${data.title}">
<meta property="og:description" content="${data.description}">
<meta property="og:image" content="YOUR_IMAGE_URL_HERE">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="${data.url}">
<meta property="twitter:title" content="${data.title}">
<meta property="twitter:description" content="${data.description}">
<meta property="twitter:image" content="YOUR_IMAGE_URL_HERE">`;

  const handleCopy = () => {
    navigator.clipboard.writeText(metaTags);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-fade-in-up border border-gray-200 dark:border-gray-800">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-white/50 dark:bg-black/20 rounded-full backdrop-blur-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: Preview */}
        <div className="w-full md:w-1/2 bg-gray-50 dark:bg-[#0C111D] p-6 overflow-y-auto border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Social Preview</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              MOCKUP
            </span>
          </div>

          {/* Mock Social Feed Item */}
          <div className="bg-white dark:bg-[#1A1D24] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div>
                <div className="w-24 h-3 bg-gray-200 dark:bg-gray-700 rounded mb-1.5" />
                <div className="w-16 h-2 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
            </div>
            
            <div className="px-4 pb-3">
              <div className="w-3/4 h-3 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
            </div>

            {/* The Generated Image */}
            <div className="w-full bg-gray-100 dark:bg-gray-800 aspect-[4/5] relative">
               {cardImage ? (
                   <img src={cardImage} alt="Social Preview" className="w-full h-full object-contain" />
               ) : (
                   <div className="w-full h-full flex items-center justify-center text-gray-400">Loading...</div>
               )}
            </div>

            {/* Social Card Meta Area (Simulating how platforms display title below image) */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                <div className="text-xs text-gray-500 uppercase mb-1">{data.domain}</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{data.title}</div>
            </div>
          </div>
          
          <p className="mt-4 text-xs text-gray-500 text-center">
            This is how your card might look when shared on platforms like LinkedIn, Slack, or Twitter/X.
          </p>
        </div>

        {/* Right: Code & Instructions */}
        <div className="w-full md:w-1/2 p-6 flex flex-col bg-white dark:bg-gray-900">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Meta Tags</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Copy these tags into your website's <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">&lt;head&gt;</code>.
            </p>
          </div>

          <div className="flex-1 relative mb-6 group">
             <div className="absolute top-3 right-3 z-10">
                <Button 
                    variant="secondary" 
                    onClick={handleCopy} 
                    className="!py-1.5 !px-3 !text-xs bg-white/90 backdrop-blur"
                >
                    {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copied ? 'Copied' : 'Copy'}
                </Button>
             </div>
             <pre className="w-full h-full p-4 text-xs font-mono bg-gray-50 dark:bg-[#0C111D] border border-gray-200 dark:border-gray-800 rounded-xl overflow-auto text-gray-800 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {metaTags}
             </pre>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200/80">
                <strong className="block mb-1 font-semibold text-amber-900 dark:text-amber-100">Image Hosting Required</strong>
                <p>
                    Don't forget to upload your generated card image to your server or media host, then replace <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">YOUR_IMAGE_URL_HERE</code> with the actual public link.
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};