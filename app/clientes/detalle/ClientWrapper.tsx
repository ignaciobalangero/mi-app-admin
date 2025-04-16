"use client";

import dynamic from "next/dynamic";

const ClienteDetalle = dynamic(() => import("./ClienteDetalle"), {
  ssr: false,
});

export default function ClientWrapper() {
  return <ClienteDetalle />;
}
