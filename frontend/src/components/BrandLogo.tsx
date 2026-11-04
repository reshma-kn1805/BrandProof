import React from "react";

interface BrandLogoProps {
  variant?: "full" | "icon" | "wordmark";
  theme?: "dark" | "light";
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  className?: string;
}

export const BrandSymbol: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = "",
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer Verification Hex-Shield Foundation */}
      <path
        d="M24 4L42 12V24C42 34.5 34.3 43.8 24 46C13.7 43.8 6 34.5 6 24V12L24 4Z"
        fill="#172E35"
      />
      {/* Precision Inner Geometric Shield */}
      <path
        d="M24 7L39 13.7V23.5C39 32.4 32.7 40.5 24 42.6C15.3 40.5 9 32.4 9 23.5V13.7L24 7Z"
        fill="#205E65"
      />
      {/* Primary Teal Calibrated Wing / Accent */}
      <path
        d="M24 7L39 13.7V23.5C39 27.5 37.6 31.4 35.2 34.6L24 23.5V7Z"
        fill="#328C91"
      />
      {/* Precision Proof Checkmark Monogram (Forms 'P' and Verified Check) */}
      <path
        d="M17 23.5L22.5 29L32 17"
        stroke="#FFFFFF"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Central Calibration Point (The 'Evidence Dot' - Citation anchor) */}
      <circle cx="24" cy="37" r="1.8" fill="#328C91" />
    </svg>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "full",
  theme = "dark",
  size = "md",
  showTagline = true,
  className = "",
}) => {
  const symbolSizes = {
    sm: 26,
    md: 34,
    lg: 44,
    xl: 56,
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const isDark = theme === "dark";

  if (variant === "icon") {
    return <BrandSymbol size={symbolSizes[size]} className={className} />;
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <BrandSymbol size={symbolSizes[size]} />
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-tight">
          <span
            className={`font-bold tracking-tight ${textSizes[size]} ${
              isDark ? "text-white" : "text-[#172C32]"
            }`}
          >
            Brand<span className="text-[#328C91]">Proof</span>
          </span>
          <span
            className={`text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded uppercase font-semibold ${
              isDark
                ? "bg-[#205E65] text-[#EAF2F3]"
                : "bg-[#EAF2F3] text-[#205E65] border border-[#DCE7E8]"
            }`}
          >
            Gov
          </span>
        </div>
        {showTagline && (
          <span
            className={`text-[11px] tracking-wide font-medium ${
              isDark ? "text-[#DCE7E8]/70" : "text-[#63777C]"
            }`}
          >
            No citation, no flag.
          </span>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;

