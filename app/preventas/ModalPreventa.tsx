"use client";

import { useEffect, useState } from "react";
import { Combobox } from "@headlessui/react";
import { cargarClientesLista, type ClienteLista } from "@/lib/clientes/listaClientes";
import useCotizacion from "@/lib/hooks/useCotizacion";
import SelectorStockPreventa from "./SelectorStockPreventa";
import {
  destinoDe,
  etiquetaDestino,
  gananciasPreventa,
  gananciaLinea,
  monedaDe,
  nuevaLineaId,
  saldosPreventa,
  textoMoneda,
  textoSaldo,
  totalesPreventa,
  type DestinoStockPreventa,
  type MonedaPreventa,
  type Preventa,
  type ProductoPreventa,
} from "@/lib/preventas/modelo";

type Borrador = {
  nombre: string;
  cantidad: string;
  precio: string;
  costo: string;
  moneda: MonedaPreventa;
  destinoStock: DestinoStockPreventa;
  ingresa: boolean;
};

function borradorVacio(): Borrador {
  return {
    nombre: "",
    cantidad: "1",
    precio: "",
    costo: "",
    moneda: "ARS",
    destinoStock: "stockExtra",
    ingresa: false,
  };
}

function numero(valor: string): number {
  return Math.round(Math.max(0, Number(String(valor).replace(",", ".")) || 0) * 100) / 100;
}

export default function ModalPreventa({
  negocioID,
  inicial,
  guardando,
  onClose,
  onGuardar,
}: {
  negocioID: string;
  inicial: Preventa | null;
  guardando: boolean;
  onClose: () => void;
  onGuardar: (datos: {
    clienteId: string;
    clienteNombre: string;
    productos: ProductoPreventa[];
    ingresarIds: string[];
    sena: number;
    senaMoneda: MonedaPreventa;
    notas: string;
  }) => void;
}) {
  const [clientes, setClientes] = useState<ClienteLista[]>([]);
  const [clienteId, setClienteId] = useState(inicial?.clienteId || "");
  const [clienteNombre, setClienteNombre] = useState(inicial?.clienteNombre || "");
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<ProductoPreventa[]>(inicial?.productos || []);
  const [ingresarIds, setIngresarIds] = useState<string[]>([]);
  const [sena, setSena] = useState(inicial?.sena ? String(inicial.sena) : "");
  const [senaMoneda, setSenaMoneda] = useState<MonedaPreventa>(inicial?.senaMoneda || "ARS");
  const [notas, setNotas] = useState(inicial?.notas || "");
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [buscarStock, setBuscarStock] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    void cargarClientesLista(negocioID, (lista) => setClientes(lista.filter((c) => c.nombre)));
  }, [negocioID]);

  const { cotizacion } = useCotizacion(negocioID);
  const tot = totalesPreventa(productos);
  const gan = gananciasPreventa(productos);
  const senaNum = Math.round(Math.max(0, Number(String(sena).replace(",", ".")) || 0) * 100) / 100;
  const saldo = saldosPreventa(productos, senaNum, senaMoneda);
  const clienteOk = clientes.some((c) => c.id === clienteId);

  const agregar = () => {
    if (!borrador) return;
    const nombre = borrador.nombre.trim();
    const cantidad = Math.round(Number(String(borrador.cantidad).replace(",", ".")) || 0);
    const precio = numero(borrador.precio);
    const costo = numero(borrador.costo);
    if (!nombre) {
      setAviso("Escribí el producto.");
      return;
    }
    if (cantidad < 1) {
      setAviso("La cantidad tiene que ser al menos 1.");
      return;
    }
    if (!(precio > 0)) {
      setAviso("El precio tiene que ser mayor a 0.");
      return;
    }
    const id = nuevaLineaId();
    setProductos((prev) => [
      ...prev,
      {
        id,
        nombre,
        cantidad,
        precioUnitario: precio,
        precioCosto: costo,
        moneda: borrador.moneda,
        destinoStock: borrador.destinoStock,
        desdeStock: false,
        stockeado: false,
      },
    ]);
    if (borrador.ingresa) setIngresarIds((prev) => [...prev, id]);
    setBorrador(null);
    setAviso("");
  };

  const guardar = () => {
    if (!clienteOk) {
      setAviso("Elegí el cliente de la lista.");
      return;
    }
    if (productos.length === 0) {
      setAviso("Agregá al menos un producto.");
      return;
    }
    onGuardar({
      clienteId,
      clienteNombre,
      productos,
      ingresarIds,
      sena: senaNum,
      senaMoneda,
      notas: notas.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:max-w-3xl sm:rounded-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#2c3e50]">{inicial ? "Editar preventa" : "Nueva preventa"}</h2>
            <p className="mt-1 text-sm text-[#7f8c8d]">
              Reserva aparte. No mueve la cuenta corriente ni genera una venta hasta que la pases a Ventas general.
            </p>
          </div>
          <button type="button" onClick={onClose} className="h-10 w-10 rounded-full bg-gray-100 text-lg font-bold" aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-[#2c3e50]">Cliente</label>
          <Combobox
            value={clientes.find((c) => c.id === clienteId) ?? null}
            onChange={(c: ClienteLista | null) => {
              setClienteId(c?.id || "");
              setClienteNombre(c?.nombre || "");
            }}
            disabled={inicial?.estado === "migrada"}
          >
            <div className="relative mt-1">
              <Combobox.Input
                className="w-full rounded-xl border px-3 py-2"
                displayValue={(c: ClienteLista | null) => c?.nombre || clienteNombre}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Escribí el nombre y elegilo de la lista"
                autoComplete="off"
              />
              <Combobox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border bg-white shadow-lg">
                {busqueda.trim().length < 2 ? (
                  <p className="px-3 py-2 text-sm text-[#7f8c8d]">Escribí al menos 2 letras.</p>
                ) : (
                  clientes
                    .filter((c) => c.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))
                    .slice(0, 25)
                    .map((c) => (
                      <Combobox.Option
                        key={c.id}
                        value={c}
                        className={({ active }) =>
                          `cursor-pointer px-3 py-2 text-sm ${active ? "bg-[#8e44ad] text-white" : "text-[#2c3e50]"}`
                        }
                      >
                        {c.nombre}
                      </Combobox.Option>
                    ))
                )}
              </Combobox.Options>
            </div>
          </Combobox>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-[#2c3e50]">Productos</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAviso("");
                  setBuscarStock(false);
                  setBorrador(borradorVacio());
                }}
                className="rounded-xl bg-[#8e44ad] px-3 py-2 text-sm font-semibold text-white"
              >
                A mano
              </button>
              <button
                type="button"
                onClick={() => {
                  setAviso("");
                  setBorrador(null);
                  setBuscarStock(true);
                }}
                className="rounded-xl border border-[#8e44ad] px-3 py-2 text-sm font-semibold text-[#8e44ad]"
              >
                Del stock
              </button>
            </div>
          </div>
          {productos.length === 0 ? (
            <p className="text-sm text-[#7f8c8d]">Todavía no hay productos.</p>
          ) : (
            productos.map((p) => {
              const linea = Math.round(p.precioUnitario * p.cantidad * 100) / 100;
              const marcado = ingresarIds.includes(p.id);
              return (
                <div key={p.id} className="rounded-xl border border-[#ecf0f1] p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#2c3e50]">{p.nombre}</p>
                      <p className="text-[#7f8c8d]">
                        {p.cantidad} × {textoMoneda(p.moneda, p.precioUnitario)}
                        {p.precioCosto > 0 ? ` · costo ${textoMoneda(p.moneda, p.precioCosto)}` : ""}
                        {" · "}
                        {p.desdeStock ? "Del stock" : etiquetaDestino(p.destinoStock)}
                      </p>
                      <GananciaLinea producto={p} cotizacion={cotizacion || 0} />
                    </div>
                    <p className="font-bold text-[#2c3e50]">{textoMoneda(p.moneda, linea)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {p.desdeStock ? (
                      <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">Ya está en stock</span>
                    ) : p.stockeado ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Ingresado</span>
                    ) : (
                      <label className="flex items-center gap-2 text-xs font-medium text-[#2c3e50]">
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={(e) =>
                            setIngresarIds((prev) =>
                              e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                            )
                          }
                        />
                        Ya ingresó, stockear al guardar
                      </label>
                    )}
                    {!p.stockeado ? (
                      <button
                        type="button"
                        onClick={() => {
                          setProductos((prev) => prev.filter((x) => x.id !== p.id));
                          setIngresarIds((prev) => prev.filter((id) => id !== p.id));
                        }}
                        className="text-xs font-semibold text-red-700"
                      >
                        Quitar
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-[#2c3e50]">
            Seña
            <div className="mt-1 flex gap-2">
              <input
                value={sena}
                onChange={(e) => setSena(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="w-full rounded-xl border px-3 py-2"
              />
              <select
                value={senaMoneda}
                onChange={(e) => setSenaMoneda(monedaDe(e.target.value))}
                className="rounded-xl border bg-white px-2 py-2"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </label>
          <div className="rounded-xl bg-[#f8f4fc] p-3 text-sm">
            <p>Total pesos: <strong>{textoMoneda("ARS", tot.ars)}</strong></p>
            <p>Total dólares: <strong>{textoMoneda("USD", tot.usd)}</strong></p>
            <p className="mt-1">Saldo pesos: <strong>{textoSaldo(saldo.ars, "ARS")}</strong></p>
            <p>Saldo dólares: <strong>{textoSaldo(saldo.usd, "USD")}</strong></p>
            <p className="mt-1">
              Ganancia: <strong className={claseGanancia(gan.ars)}>{textoMoneda("ARS", gan.ars)}</strong>
              {" · "}
              <strong className={claseGanancia(gan.usd)}>{textoMoneda("USD", gan.usd)}</strong>
            </p>
            {gan.usd !== 0 && (cotizacion || 0) > 0 ? (
              <p className="text-xs text-[#7f8c8d]">
                Dólares ≈ {textoMoneda("ARS", Math.round(gan.usd * (cotizacion || 0)))}
              </p>
            ) : null}
          </div>
        </div>

        <label className="mt-3 block text-sm font-medium text-[#2c3e50]">
          Notas
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="Color, fecha de llegada, cómo seña..."
          />
        </label>

        {aviso ? <p className="mt-2 text-sm text-red-700">{aviso}</p> : null}

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-gray-200 py-2 font-semibold">
            Cerrar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="flex-1 rounded-xl bg-[#8e44ad] py-2 font-bold text-white disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar preventa"}
          </button>
        </div>
      </div>

      {borrador ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full rounded-t-2xl bg-white p-4 sm:max-w-md sm:rounded-2xl">
            <h3 className="text-lg font-bold text-[#2c3e50]">Producto</h3>
            <label className="mt-3 block text-sm font-medium">
              Nombre
              <input
                value={borrador.nombre}
                onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ej. iPhone 15 128GB"
              />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-sm font-medium">
                Cantidad
                <input
                  value={borrador.cantidad}
                  onChange={(e) => setBorrador({ ...borrador, cantidad: e.target.value })}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                Precio de venta
                <input
                  value={borrador.precio}
                  onChange={(e) => setBorrador({ ...borrador, precio: e.target.value })}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </label>
            </div>
            <label className="mt-3 block text-sm font-medium">
              Precio de costo
              <input
                value={borrador.costo}
                onChange={(e) => setBorrador({ ...borrador, costo: e.target.value })}
                inputMode="decimal"
                placeholder="Opcional"
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
              <span className="mt-1 block text-xs font-normal text-[#7f8c8d]">
                En la misma moneda. Sirve mientras el producto todavía no está cargado en el stock.
              </span>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-sm font-medium">
                Moneda
                <select
                  value={borrador.moneda}
                  onChange={(e) => setBorrador({ ...borrador, moneda: monedaDe(e.target.value) })}
                  className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Al ingresar va a
                <select
                  value={borrador.destinoStock}
                  onChange={(e) => setBorrador({ ...borrador, destinoStock: destinoDe(e.target.value) })}
                  className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                >
                  <option value="stockExtra">Stock general</option>
                  <option value="stockAccesorios">Accesorios</option>
                  <option value="stockRepuestos">Repuestos</option>
                </select>
              </label>
            </div>
            <p className="mt-2 text-sm text-[#2c3e50]">
              Total:{" "}
              <strong>
                {textoMoneda(
                  borrador.moneda,
                  Math.round(
                    (Number(String(borrador.precio).replace(",", ".")) || 0) *
                      (Number(String(borrador.cantidad).replace(",", ".")) || 0) *
                      100
                  ) / 100
                )}
              </strong>
            </p>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={borrador.ingresa}
                onChange={(e) => setBorrador({ ...borrador, ingresa: e.target.checked })}
              />
              Ya ingresó, stockear al guardar
            </label>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setBorrador(null)} className="flex-1 rounded-xl bg-gray-200 py-2 font-semibold">
                Cancelar
              </button>
              <button type="button" onClick={agregar} className="flex-1 rounded-xl bg-[#27ae60] py-2 font-bold text-white">
                Agregar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {buscarStock ? (
        <SelectorStockPreventa
          negocioID={negocioID}
          onClose={() => setBuscarStock(false)}
          onElegir={(producto) => {
            setProductos((prev) => [...prev, producto]);
            setBuscarStock(false);
            setAviso("");
          }}
        />
      ) : null}
    </div>
  );
}

function claseGanancia(monto: number): string {
  if (monto > 0) return "text-[#27ae60]";
  if (monto < 0) return "text-[#e74c3c]";
  return "text-[#7f8c8d]";
}

function GananciaLinea({ producto, cotizacion }: { producto: ProductoPreventa; cotizacion: number }) {
  const g = gananciaLinea(producto);
  if (g == null) return <p className="text-xs text-[#95a5a6]">Ganancia: cargá el costo</p>;
  return (
    <p className={`text-xs font-semibold ${claseGanancia(g)}`}>
      Ganancia {textoMoneda(producto.moneda, g)}
      {producto.moneda === "USD" && cotizacion > 0 ? ` · ≈ ${textoMoneda("ARS", Math.round(g * cotizacion))}` : ""}
    </p>
  );
}
