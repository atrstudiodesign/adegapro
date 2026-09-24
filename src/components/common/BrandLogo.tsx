import React, { useState } from 'react';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'full' | 'badge' | 'hero' | 'minimal' | 'mono';
  showSubtitle?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'full',
  showSubtitle = true,
  className = ''
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    xs: { badge: 'w-7 h-7', text: 'text-xs', sub: 'text-[8px]', heroW: 'w-24' },
    sm: { badge: 'w-9 h-9', text: 'text-sm', sub: 'text-[9px]', heroW: 'w-36' },
    md: { badge: 'w-11 h-11', text: 'text-base', sub: 'text-[10px]', heroW: 'w-48' },
    lg: { badge: 'w-16 h-16', text: 'text-xl', sub: 'text-xs', heroW: 'w-64' },
    xl: { badge: 'w-24 h-24', text: 'text-2xl', sub: 'text-sm', heroW: 'w-80' },
    '2xl': { badge: 'w-32 h-32', text: 'text-3xl', sub: 'text-base', heroW: 'w-96' }
  };

  const dim = sizeMap[size];

  // Thermal Receipt Monochrome Version
  if (variant === 'mono') {
    return (
      <div className={`flex flex-col items-center justify-center text-black ${className}`}>
        <div className="font-black text-lg tracking-wider border-b-2 border-black pb-0.5">
          ADEGA PRO
        </div>
        <div className="text-[10px] font-mono tracking-tight text-neutral-800">
          GESTÃO &amp; CONVENIÊNCIA
        </div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex items-center select-none ${className}`}>
        <img
          src="/adega-pro-logo.jpg"
          alt="ADEGA PRO — Sistema para Adegas"
          className={`${dim.heroW} h-auto object-contain`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
        {imgError && <div className={`font-black tracking-tight text-white uppercase ${dim.text}`}>ADEGA <span className="text-amber-400">PRO</span></div>}
      </div>
    );
  }

  // Hero / Full Artwork Mode
  if (variant === 'hero') {
    return (
      <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
        <div className={`relative ${dim.heroW} aspect-square rounded-3xl overflow-hidden shadow-2xl border border-amber-500/20 bg-neutral-950 group`}>
          <img
            src="/adega-pro-logo.jpg"
            alt="ADEGA PRO"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-amber-400/20 rounded-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-30 pointer-events-none" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Visual Seal Badge */}
      <div
        className={`relative ${dim.badge} shrink-0 rounded-2xl overflow-hidden shadow-lg border border-amber-500/30 bg-neutral-950 flex items-center justify-center transition-transform hover:scale-105`}
      >
        {!imgError ? (
          <img
            src="/adega-pro-icon.jpg"
            alt="ADEGA PRO Icon"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-neutral-950 font-black text-xs">
            AP
          </div>
        )}
        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />
      </div>

      {/* Brand Typography */}
      {variant !== 'badge' && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-white uppercase ${dim.text}`}>
              ADEGA <span className="text-amber-400 font-extrabold bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">PRO</span>
            </span>
          </div>
          {showSubtitle && (
            <span className={`font-bold text-neutral-400 tracking-wider uppercase ${dim.sub}`}>
              Sistema para Adegas
            </span>
          )}
        </div>
      )}
    </div>
  );
};
