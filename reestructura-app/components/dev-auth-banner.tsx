export function DevAuthBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
      <strong>DEV:</strong> login desactivado (
      <code className="rounded bg-amber-100/80 px-1">NEXT_PUBLIC_DEV_AUTH_BYPASS=1</code>
      ). Sin sesión de Supabase, las APIs con RLS pueden fallar. Para volver al login: borrá esa
      variable o ponela en <code className="rounded bg-amber-100/80 px-1">0</code> y reiniciá{" "}
      <code className="rounded bg-amber-100/80 px-1">npm run dev</code>.
    </div>
  );
}
