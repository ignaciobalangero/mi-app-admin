"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";

type ProveedorAgenda = { id: string; nombre: string };

function normalizar(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export default function CampoProveedor({
  value,
  onChange,
  className,
  placeholder = "Elegí de Proveedores o escribí el nombre",
}: {
  value: string;
  onChange: (nombre: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const { rol } = useRol();
  const caja = useRef<HTMLDivElement>(null);
  const [agenda, setAgenda] = useState<ProveedorAgenda[]>([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!rol?.negocioID) return;
    let vigente = true;
    getDocs(query(collection(db, `negocios/${rol.negocioID}/proveedores`), orderBy("nombre", "asc")))
      .then((snap) => {
        if (!vigente) return;
        setAgenda(
          snap.docs
            .map((item) => ({ id: item.id, nombre: String(item.data().nombre || "").trim() }))
            .filter((item) => item.nombre)
        );
      })
      .catch(() => {
        if (vigente) setAgenda([]);
      });
    return () => {
      vigente = false;
    };
  }, [rol?.negocioID]);

  const filtro = normalizar(value);
  const sugeridos = useMemo(() => {
    const lista = filtro ? agenda.filter((item) => normalizar(item.nombre).includes(filtro)) : agenda;
    return lista.slice(0, 30);
  }, [agenda, filtro]);

  const enAgenda = agenda.some((item) => normalizar(item.nombre) === filtro);

  const cerrarSiCorresponde = (destino: Node | null) => {
    if (!caja.current?.contains(destino)) setAbierto(false);
  };

  const alSalir = () => {
    const canonico = agenda.find((item) => normalizar(item.nombre) === normalizar(value));
    if (canonico && canonico.nombre !== value) onChange(canonico.nombre);
  };

  return (
    <div ref={caja} className="relative">
      <input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setAbierto(true)}
        onBlur={(e) => {
          alSalir();
          cerrarSiCorresponde(e.relatedTarget);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setAbierto(true);
        }}
        className={className}
      />
      {abierto && sugeridos.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-[#bdc3c7] bg-white shadow-lg">
          {sugeridos.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-[#2c3e50] hover:bg-[#ecf0f1]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(item.nombre);
                  setAbierto(false);
                }}
              >
                {item.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.trim() && agenda.length > 0 && !enAgenda && (
        <p className="mt-1 text-[10px] text-[#e67e22]">
          Este nombre no está en Proveedores. Elegilo de la lista para que no cambie por un error de tipeo.
        </p>
      )}
    </div>
  );
}
