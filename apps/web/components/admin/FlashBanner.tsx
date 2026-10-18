/** Server-rendered flash banner for admin form results (error= / ok= query params). */
export function FlashBanner({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (!error && !ok) return null;
  return (
    <div
      className={`mt-4 rounded-lg border px-4 py-2.5 text-sm ${
        error
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
      role={error ? "alert" : "status"}
    >
      {error ?? ok}
    </div>
  );
}
