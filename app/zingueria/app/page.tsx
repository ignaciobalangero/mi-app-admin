"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/lib/zingueria/ui";

export default function ZingueriaAppIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/zingueria/app/trabajos");
  }, [router]);
  return <Spinner label="Abriendo trabajos…" />;
}
