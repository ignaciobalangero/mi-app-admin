"use client";

import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/auth";
import type { ClienteTiendaPerfil } from "@/lib/tiendaClienteTypes";

export function useTiendaCliente(negocioId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<ClienteTiendaPerfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [esClienteTienda, setEsClienteTienda] = useState(false);

  const cargarPerfil = useCallback(async (u: User) => {
    try {
      const token = await u.getIdToken();
      const res = await fetch(`/api/tienda/cuenta?negocioId=${encodeURIComponent(negocioId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setEsClienteTienda(false);
        setPerfil(null);
        return;
      }
      const json = await res.json();
      setEsClienteTienda(true);
      setPerfil(json.perfil ?? null);
    } catch {
      setEsClienteTienda(false);
      setPerfil(null);
    }
  }, [negocioId]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setCargando(true);
      if (!u) {
        setPerfil(null);
        setEsClienteTienda(false);
        setCargando(false);
        return;
      }
      await cargarPerfil(u);
      setCargando(false);
    });
    return () => unsub();
  }, [cargarPerfil]);

  const getToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  return { user, perfil, cargando, esClienteTienda, recargarPerfil: () => user && cargarPerfil(user), getToken };
}
