"use client";

import { Fragment, useState } from "react";
import { Combobox } from "@headlessui/react";
import { useRol } from "@/lib/useRol";


interface Telefono {
  id: string;
  modelo: string;
  color: string;
  imei?: string;
  [key: string]: any;
}

interface Props {
  stock: Telefono[];
  form: any;
  setForm: (valor: any) => void;
}

export default function SelectorTelefonoStock({ stock, form, setForm }: Props) {
  const [query, setQuery] = useState("");
  const { rol } = useRol();


  const opcionesFiltradas =
    query === ""
      ? stock
      : stock.filter((t) =>
          `${t.modelo} ${t.color} ${t.imei}`
            .toLowerCase()
            .includes(query.toLowerCase())
        );

  const seleccionar = (t: Telefono | null) => {
    if (!t) return;

    setForm((prev: any) => ({
      ...prev,
      modelo: t.modelo,
      fechaIngreso: t.fechaIngreso
        ? typeof t.fechaIngreso === "string"
          ? t.fechaIngreso
          : t.fechaIngreso.toDate?.().toLocaleDateString?.("es-AR") || new Date().toLocaleDateString("es-AR")
        : new Date().toLocaleDateString("es-AR"),
      proveedor: t.proveedor || "Sin proveedor",
      marca: t.marca,
      gb: t.gb ? Number(t.gb) : "",
      color: t.color,
      imei: t.imei,
      serie: t.serial,
      observaciones: t.observaciones || "",
      precioCosto: t.precioCompra ? Number(t.precioCompra) : "",
      precioVenta: t.precioVenta ? Number(t.precioVenta) : "",
      estado: t.estado || "nuevo",
      bateria: t.estado?.toLowerCase() === "usado" ? t.bateria : "",
      moneda: t.moneda || "ARS", 
      stockID: t.id,
    }));
  };

  return (
    <div className="w-full">
      <Combobox value={form.modelo} onChange={seleccionar} nullable>
        <div className="relative">
          <Combobox.Input
            className="w-full border border-gray-400 rounded p-2"
            onChange={(e) => setQuery(e.target.value)}
            displayValue={() => form.modelo}
            placeholder="Modelo (escribí o seleccioná del stock)"
            autoComplete="off"
            spellCheck={false}
            autoCorrect="off"

          />
          <Combobox.Options className="absolute z-10 w-full bg-white border border-gray-400 rounded mt-1 max-h-60 overflow-y-auto text-sm shadow-lg">
            {opcionesFiltradas.map((t) => (
              <Combobox.Option
                key={t.id}
                value={t}
                className={({ active }) =>
                  `px-4 py-2 cursor-pointer ${active ? "bg-blue-600 text-white" : "text-black"}`
                }
              >
                <div>
                  <p className="font-medium text-black">{`${t.modelo} | ${t.color} | IMEI: ${t.imei || "N/D"}`}</p>
                  <p className="text-xs text-gray-800">
                     {`Almacenamiento: ${t.gb || "-"} GB | Estado: ${t.estado || "-"} | Serie: ${t.serial || "-"} | Batería: ${t.estado?.toLowerCase() === "usado" ? `${t.bateria || "-"}%` : "-"}`}
                      {rol?.tipo === "admin" && (
                          <> | Compra: ${t.precioCompra || "-"} | Venta: ${t.precioVenta || "-"}</>
             )}
                  </p>
                </div>
              </Combobox.Option>
            ))}
            {opcionesFiltradas.length === 0 && (
              <div className="px-4 py-2 text-gray-500">Sin coincidencias</div>
            )}
          </Combobox.Options>
        </div>
      </Combobox>
    </div>
  );
}
