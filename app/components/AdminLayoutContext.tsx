"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

type AdminLayoutContextValue = {
  mobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
  desktopExpanded: boolean;
  setDesktopExpanded: (open: boolean) => void;
  toggleDesktopExpanded: () => void;
};

const AdminLayoutContext = createContext<AdminLayoutContextValue | null>(null);

export function AdminLayoutProvider({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(true);

  const openMobileNav = useCallback(() => setMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const toggleMobileNav = useCallback(() => setMobileNavOpen((v) => !v), []);
  const toggleDesktopExpanded = useCallback(() => setDesktopExpanded((v) => !v), []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobileNav();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeMobileNav]);

  return (
    <AdminLayoutContext.Provider
      value={{
        mobileNavOpen,
        openMobileNav,
        closeMobileNav,
        toggleMobileNav,
        desktopExpanded,
        setDesktopExpanded,
        toggleDesktopExpanded,
      }}
    >
      {children}
    </AdminLayoutContext.Provider>
  );
}

export function useAdminLayout() {
  const ctx = useContext(AdminLayoutContext);
  if (!ctx) {
    return {
      mobileNavOpen: false,
      openMobileNav: () => {},
      closeMobileNav: () => {},
      toggleMobileNav: () => {},
      desktopExpanded: true,
      setDesktopExpanded: () => {},
      toggleDesktopExpanded: () => {},
    };
  }
  return ctx;
}
