export function Loading({ label = "Loading" }: { label?: string }) {
  return <div className="rounded-md border border-line bg-white px-4 py-3 text-sm text-steel shadow-sm">{label}...</div>;
}
