"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useZingueriaSession } from "@/lib/zingueria/auth";
import { Spinner } from "@/lib/zingueria/ui";

export default function ZingueriaIndexPage() {
  const { user, loading } = useZingueriaSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/zingueria/login");
    else router.replace("/zingueria/app");
  }, [user, loading, router]);

  return <Spinner label="Entrando a Zinguería…" />;
}
