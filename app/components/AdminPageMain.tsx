"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  maxWidthClass?: string;
};

/** Contenedor estándar de páginas admin: padding y ancho responsivos. */
export default function AdminPageMain({
  children,
  className = "",
  maxWidthClass = "max-w-[1600px]",
}: Props) {
  return (
    <main
      className={`min-h-screen w-full overflow-x-hidden bg-[#f8f9fa] pt-16 text-black ${className}`}
    >
      <div className={`mx-auto w-full px-2 sm:px-4 md:px-6 ${maxWidthClass}`}>{children}</div>
    </main>
  );
}
