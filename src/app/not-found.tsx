import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-[#e5e7eb] bg-white p-6 text-center">
      <h2 className="text-lg font-semibold">Page not found</h2>
      <p className="mt-2 text-sm text-[#6b7280]">That route is not part of AI QA Assistant.</p>
      <Link
        href="/dashboard"
        className="mt-4 inline-flex h-9 items-center rounded-md bg-[#712DC8] px-4 text-sm font-medium text-white"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
