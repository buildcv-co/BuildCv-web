interface IconProps {
  readonly className?: string;
}

const baseProps = {
  "aria-hidden": true as const,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function DocumentIcon({ className = "h-8 w-8 text-accent" }: IconProps) {
  return (
    <svg {...baseProps} className={className} data-testid="icon-document">
      <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

export function UserIcon({ className = "h-8 w-8 text-accent" }: IconProps) {
  return (
    <svg {...baseProps} className={className} data-testid="icon-user">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}