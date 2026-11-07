import type { CSSProperties } from "react";

type YouFitLogoProps = {
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function YouFitLogo({ compact = false, className, style }: YouFitLogoProps) {
  return (
    <span
      className={["youfit-logo", compact && "youfit-logo--compact", className]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <svg
        aria-label="YouFit"
        className="youfit-logo__mark"
        role="img"
        viewBox="0 0 52 52"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9.5 27.5c1.8 9.6 8 15 16.5 15s14.7-5.4 16.5-15h-33Z"
          fill="currentColor"
        />
        <path
          d="M18 24.5c.7-8.9 7.2-14.1 16.3-14.8-.4 8.6-6.2 14.6-16.3 14.8Z"
          fill="var(--logo-leaf, #cddd72)"
        />
        <path
          d="M18.3 24.1c4.8-1.9 9-5.2 12.3-9.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.2"
        />
        <path
          d="M10.7 27.5h30.6"
          fill="none"
          stroke="var(--logo-cream, #fffaf0)"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
      {!compact && (
        <span aria-hidden="true" className="youfit-logo__wordmark">
          You<span>Fit</span>
        </span>
      )}
    </span>
  );
}
