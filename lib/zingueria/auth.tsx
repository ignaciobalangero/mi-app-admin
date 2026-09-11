"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { onSnapshot } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import type { ZingueriaPerfil } from "./types";
import { zUserRef } from "./paths";

export interface ZingueriaSession {
  user: User | null;
  perfil: ZingueriaPerfil | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const ZingueriaSessionContext = createContext<ZingueriaSession | null>(null);

export function ZingueriaAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<ZingueriaPerfil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubPerfil: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      unsubPerfil?.();
      unsubPerfil = undefined;
      setUser(u);
      if (!u) {
        setPerfil(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      unsubPerfil = onSnapshot(
        zUserRef(u.uid),
        (snap) => {
          if (!snap.exists()) {
            setPerfil(null);
            setLoading(false);
            return;
          }
          const data = snap.data() as ZingueriaPerfil;
          if (!data.activo) {
            setPerfil(null);
          } else {
            setPerfil({ ...data, ownerUid: data.ownerUid || u.uid });
          }
          setLoading(false);
        },
        () => {
          setPerfil(null);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      unsubPerfil?.();
    };
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setPerfil(null);
  }, []);

  const value = useMemo<ZingueriaSession>(
    () => ({
      user: perfil ? user : null,
      perfil,
      loading,
      logout,
    }),
    [user, perfil, loading, logout]
  );

  return createElement(
    ZingueriaSessionContext.Provider,
    { value },
    children
  );
}

export function useZingueriaSession(): ZingueriaSession {
  const ctx = useContext(ZingueriaSessionContext);
  if (!ctx) {
    throw new Error(
      "useZingueriaSession debe usarse dentro de ZingueriaAuthProvider"
    );
  }
  return ctx;
}
