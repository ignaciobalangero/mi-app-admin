"use client";

import Sidebar from "./Sidebar";
import { AdminLayoutProvider, useAdminLayout } from "./AdminLayoutContext";

function SidebarLayoutInner({ children }: { children: React.ReactNode }) {
  const { mobileNavOpen, closeMobileNav, desktopExpanded } = useAdminLayout();

  return (
    <div className="flex min-h-screen min-w-0">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px] lg:hidden"
          onClick={closeMobileNav}
        />
      )}

      <Sidebar />

      <div
        className={`flex min-w-0 flex-1 flex-col transition-[margin] duration-300 ml-0 ${
          desktopExpanded ? "lg:ml-64" : "lg:ml-16"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayoutProvider>
      <SidebarLayoutInner>{children}</SidebarLayoutInner>
    </AdminLayoutProvider>
  );
}
