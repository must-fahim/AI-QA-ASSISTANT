import { Alert } from "antd";

const ERRORS: Record<string, string> = {
  not_configured: "Google sign-in is not configured yet. Add the Google client id and secret on the server.",
  google: "Google did not complete sign-in. Try again.",
  database: "Accounts are not ready. Run the latest database migration, then try again.",
};

export function LoginView({ error, nextPath }: { error?: string; nextPath: string }) {
  const message = error ? ERRORS[error] ?? ERRORS.google : null;
  const href = `/api/auth/google?next=${encodeURIComponent(nextPath)}`;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-[#e5e7eb] bg-white px-8 py-10 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#712DC8] text-sm font-bold text-white">
            QA
          </span>
          <div>
            <p className="m-0 text-base font-semibold text-[#1c1c1c]">AI QA Assistant</p>
            <p className="m-0 text-sm text-[#6b7280]">Test case studio</p>
          </div>
        </div>
        <h1 className="m-0 text-2xl font-semibold text-[#1c1c1c]">Sign in</h1>
        <p className="mt-2 mb-6 text-sm leading-6 text-[#6b7280]">
          Use your Google account. A new visitor is registered automatically, and saved tests stay with that account.
        </p>
        {message ? <Alert className="mb-4" type="error" showIcon title={message} /> : null}
        <a
          href={href}
          className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-[#e5e7eb] bg-white text-sm font-medium hover:bg-[#faf7fd]"
          style={{ color: "#1c1c1c" }}
        >
          <GoogleMark />
          Continue with Google
        </a>
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.16.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}
