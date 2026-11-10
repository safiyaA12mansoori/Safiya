"use client";

export default function ConsoleError({ error }: { error: Error & { digest?: string } }) {
  return (
    <p role="alert" className="text-sm text-bad">
      {error.message || "The page could not be loaded."}
    </p>
  );
}
