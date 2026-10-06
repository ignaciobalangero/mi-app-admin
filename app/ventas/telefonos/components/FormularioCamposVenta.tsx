import SelectorTelefonoStock from "./SelectorTelefonoStock";
import { Combobox } from "@headlessui/react";
import { useState } from "react";

/** DD/MM/YYYY (o similar) → YYYY-MM-DD para input type="date". */
function fechaAInputDate(fecha: string): string {
  const raw = String(fecha || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const partes = raw.split(/[\/\-]/);
  if (partes.length === 3) {
    const [dd, mm, yyyy] = partes;
    if (yyyy?.length === 4) {
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
  }
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, "0");
  const d = String(hoy.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD → DD/MM/YYYY (formato que guarda la venta). */
function inputDateAFecha(value: string): string {
  const [yyyy, mm, dd] = String(value || "").split("-");
  if (!yyyy || !mm || !dd) return value;
  return `${dd}/${mm}/${yyyy}`;
}

interface Props {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>; 
  clientes: { id: string; nombre: string }[];
  stock: any[];
  setStock: React.Dispatch<React.SetStateAction<any[]>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onAgregarCliente: () => void;
  rol: { tipo: string } | null;
  stockIdsExcluidos?: string[];
}

export default function FormularioCamposVenta({
  form,
  setForm,
  clientes,
  stock,
  setStock,
  handleChange,
  onAgregarCliente,
  rol,
  stockIdsExcluidos = [],
}: Props) {
  const [queryCliente, setQueryCliente] = useState("");
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <input
        type="date"
        name="fecha"
        value={fechaAInputDate(form.fecha)}
        onChange={(e) => {
          const fecha = inputDateAFecha(e.target.value);
          setForm((prev: any) => ({ ...prev, fecha }));
        }}
        className="p-2 border rounded w-full"
      />
      <input
        type="text"
        name="proveedor"
        value={form.proveedor}
        onChange={handleChange}
        placeholder="Proveedor"
        className="p-2 border rounded w-full"
      />

      <div className="flex items-start gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <Combobox
            value={
              clientes.find((c) => c.id === form.clienteId) ??
              (form.cliente
                ? ({ id: form.clienteId || "", nombre: form.cliente } as {
                    id: string;
                    nombre: string;
                  })
                : null)
            }
            onChange={(c: { id: string; nombre: string } | null) => {
              if (c) {
                setForm((prev) => ({
                  ...prev,
                  cliente: c.nombre,
                  clienteId: c.id,
                }));
              } else {
                setForm((prev) => ({ ...prev, cliente: "", clienteId: "" }));
              }
              setQueryCliente("");
            }}
          >
            <div className="relative">
              <Combobox.Input
                className={`p-2 border rounded w-full ${
                  form.cliente && !form.clienteId
                    ? "border-orange-400"
                    : "border-gray-400"
                }`}
                onChange={(e) => {
                  setQueryCliente(e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    cliente: e.target.value,
                    clienteId: "",
                  }));
                }}
                displayValue={() => form.cliente || ""}
                placeholder="Buscar cliente de la lista..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <Combobox.Options className="absolute z-10 w-full bg-white border border-gray-400 rounded mt-1 max-h-60 overflow-y-auto text-sm shadow-lg">
                {clientes
                  .filter((c) =>
                    c.nombre.toLowerCase().includes(queryCliente.toLowerCase())
                  )
                  .map((c) => (
                    <Combobox.Option
                      key={c.id}
                      value={c}
                      className={({ active }) =>
                        `px-4 py-2 cursor-pointer ${active ? "bg-blue-600 text-white" : "text-black"}`
                      }
                    >
                      {c.nombre}
                    </Combobox.Option>
                  ))}
              </Combobox.Options>
            </div>
          </Combobox>
          {form.cliente && !form.clienteId ? (
            <p className="mt-1 text-xs text-orange-600">
              Elegí el cliente de la lista (no solo escribir el nombre).
            </p>
          ) : null}
        </div>
        <button
          onClick={onAgregarCliente}
          type="button"
          title="Agregar cliente"
          className="shrink-0 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded border border-blue-500 flex items-center justify-center leading-none"
        >
          +
        </button>
      </div>


      <SelectorTelefonoStock
        stock={stock}
        form={form}
        setForm={setForm}
        stockIdsExcluidos={stockIdsExcluidos}
      />

      <select 
        name="estado"
        value={form.estado}
        onChange={handleChange}
        className="p-2 border rounded w-full"
      >
        <option value="nuevo">Nuevo</option>
        <option value="usado">Usado</option>
      </select>

      <input
        type="text"
        name="color"
        value={form.color}
        onChange={handleChange}
        placeholder="Color"
        className="p-2 border rounded w-full"
      />

      {form.estado === "usado" && (
        <input
          type="text"
          name="bateria"
          value={form.bateria}
          onChange={handleChange}
          placeholder="% Batería"
          className="p-2 border rounded w-full"
        />
      )}

      <input
        type="text"
        name="gb"
        value={form.gb}
        onChange={handleChange}
        placeholder="GB"
        className="p-2 border rounded w-full"
      />
      <input
        type="text"
        name="imei"
        value={form.imei}
        onChange={handleChange}
        placeholder="IMEI"
        className="p-2 border rounded w-full"
      />
      <input
        type="text"
        name="serie"
        value={form.serie}
        onChange={handleChange}
        placeholder="Serie"
        className="p-2 border rounded w-full"
      />
      
  <input
    type="number"
    name="precioCosto"
    value={form.precioCosto}
    onChange={handleChange}
    placeholder="Precio Costo"
    className="p-2 border rounded w-full"
  />

      <input
        type="number"
        name="precioVenta"
        value={form.precioVenta}
        onChange={handleChange}
        placeholder="Precio Venta"
        className="p-2 border rounded w-full"
      />
      {rol?.tipo === "admin" && (
  <p className="text-green-600 font-semibold">
    Ganancia: ${form.precioVenta - form.precioCosto}
  </p>
)}
    </div>
  );
}
