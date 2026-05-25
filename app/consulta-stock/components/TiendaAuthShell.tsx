import Link from "next/link";

type Props = {
  negocioID: string;
  titulo: string;
  children: React.ReactNode;
};

/** Layout común login / registro / cuenta — tema claro fijo. */
export default function TiendaAuthShell({ negocioID, titulo, children }: Props) {
  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 [color-scheme:light]">
      <header className="border-b border-neutral-200 bg-neutral-950 px-4 py-3 text-white">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <Link
            href={`/consulta-stock/${negocioID}`}
            className="text-xs font-medium text-neutral-300 hover:text-white"
          >
            ← Tienda
          </Link>
          <span className="truncate text-sm font-semibold">{titulo}</span>
          <span className="w-14" aria-hidden />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
