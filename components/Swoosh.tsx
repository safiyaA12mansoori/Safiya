type SwooshProps = {
  className?: string;
};

export function Swoosh({ className = "swoosh" }: SwooshProps) {
  return (
    <svg className={className} viewBox="0 0 220 18" aria-hidden="true" focusable="false">
      <path
        d="M4 12c26-1 40-9 68-8 24 1 36 8 60 7 30-1 50-9 84-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
