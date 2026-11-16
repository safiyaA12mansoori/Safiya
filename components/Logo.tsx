type LogoProps = {
  className?: string;
  alt: string;
};

export function Logo({ className, alt }: LogoProps) {
  return (
    <img
      className={className}
      src="/lerniqo-logo.png"
      alt={alt}
      width={403}
      height={110}
    />
  );
}
