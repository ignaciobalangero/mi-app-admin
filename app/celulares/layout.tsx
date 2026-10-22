export default function CelularesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-vitrina-celulares className="min-h-screen bg-neutral-100 text-neutral-900">
      {children}
    </div>
  );
}
