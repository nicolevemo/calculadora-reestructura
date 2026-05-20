"use client";

export function ClienteModalShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-auto bg-background animate-in slide-in-from-right duration-300"
    >
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-12">
        {children}
      </div>
    </div>
  );
}
