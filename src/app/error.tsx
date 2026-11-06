"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-[#e5e7eb] bg-white p-6 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm text-[#6b7280]">{error.message || "The page could not be displayed."}</p>
      <button
        type="button"
        className="mt-4 inline-flex h-9 items-center rounded-md bg-[#712DC8] px-4 text-sm font-medium text-white"
        onClick={reset}
      >
        Try again
      </button>
    </div>
  );
}
