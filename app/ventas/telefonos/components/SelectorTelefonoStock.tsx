"use client";

import { Fragment, useState } from "react";
import { Combobox } from "@headlessui/react";
import { useRol } from "@/lib/useRol";

interface Telefono {
  id: string;
  modelo: string;
  color: string;
  imei?: string;
  enServicio?: boolean; // Agregamos esta propiedad
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

  // Filtrar primero los teléfonos que NO están en servicio técnico
  const stockDisponible = stock.filter(telefono => !telefono.enServicio);

  const opcionesFiltradas =
    query === ""
      ? stockDisponible // Usar el stock filtrado en lugar del stock completo
      : stockDisponible.filter((t) => {
          // Crear una cadena de búsqueda completa con todos los campos relevantes
          const textoBusqueda = `${t.modelo} ${t.color} ${t.gb || ""} ${t.marca || ""} ${t.imei || ""} ${t.serial || ""} ${t.estado || ""}`
            .toLowerCase()
            .replace(/\s+/g, ' ') // Normalizar espacios múltiples
            .trim();
          
          // Permitir búsqueda por palabras separadas (no necesariamente consecutivas)
          const palabrasBusqueda = query.toLowerCase().trim().split(/\s+/);
          
          // Verificar que todas las palabras estén presentes en el texto de búsqueda
          return palabrasBusqueda.every(palabra => 
            textoBusqueda.includes(palabra)
          );
        });

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
      precioMayorista: t.precioMayorista ? Number(t.precioMayorista) : "",
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
            placeholder="Ej: iphone 13 128 celeste, samsung galaxy 256 negro, etc."
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
                  `px-4 py-2 cursor-pointer transition-colors ${
                    active 
                      ? "bg-blue-50 border-l-4 border-blue-400" 
                      : "hover:bg-gray-50"
                  }`
                }
              >
                {({ active }) => (
                  <div>
                    <p className={`font-medium ${active ? "text-blue-800" : "text-gray-900"}`}>
                      {`${t.modelo} | ${t.gb ? t.gb + 'GB' : 'N/D'} | ${t.color} | IMEI: ${t.imei || "N/D"}`}
                    </p>
                    <p className={`text-xs ${active ? "text-blue-600" : "text-gray-600"}`}>
                       {`Marca: ${t.marca || "-"} | Estado: ${t.estado || "-"} | Serie: ${t.serial || "-"} | Batería: ${t.estado?.toLowerCase() === "usado" ? `${t.bateria || "-"}%` : "-"}`}
                        { (
                            <> | Venta: ${t.precioVenta || "-"} | Mayorista: ${t.precioMayorista || "-"}</>
               )}
                    </p>
                  </div>
                )}
              </Combobox.Option>
            ))}
            {opcionesFiltradas.length === 0 && query !== "" && (
              <div className="px-4 py-2 text-gray-500">Sin coincidencias en stock disponible</div>
            )}
            {stockDisponible.length === 0 && query === "" && (
              <div className="px-4 py-2 text-orange-600 font-medium">
                📱 No hay teléfonos disponibles para venta
                <br />
                <span className="text-xs text-gray-500">(Los teléfonos en servicio técnico no aparecen)</span>
              </div>
            )}
          </Combobox.Options>
        </div>
      </Combobox>
      
      {/* Mostrar información adicional */}
      <div className="mt-1 text-xs text-gray-600">
        📱 Stock disponible: {stockDisponible.length} teléfonos
        {stock.length - stockDisponible.length > 0 && (
          <span className="text-orange-600 ml-2">
            🔧 {stock.length - stockDisponible.length} en servicio técnico (ocultos)
          </span>
        )}
        <div className="text-xs text-blue-600 mt-1">
          💡 Podés buscar por: modelo, almacenamiento, color, marca, estado, IMEI
        </div>
      </div>
    </div>
  );
}