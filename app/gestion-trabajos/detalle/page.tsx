"use client";

import dynamic from "next/dynamic";

const DetalleTrabajo = dynamic(() => import("./DetalleTrabajo"), {
  ssr: false,
});

export default function Page() {
  return <DetalleTrabajo />;
}
