"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoguinzRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/zingueria/login");
  }, [router]);
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#94a3b8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      Redirigiendo…
    </div>
  );
}
