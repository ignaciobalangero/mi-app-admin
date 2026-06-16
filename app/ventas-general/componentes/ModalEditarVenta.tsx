"use client";

import { useState, useEffect, useMemo } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ajustarSaldoPorEdicionVenta } from "@/lib/actualizarSaldoCliente";
import {
  cotizacionDeVenta,
  importeLineaProducto,
  monedaLineaProducto,
  prepararProductoParaEdicion,
  productoEdicionAGuardar,
  recalcularProductoEnEdicion,
  totalesVentaGeneralEditada,
} from "@/app/clientes/[nombreCliente]/ventasMonedaHelpers";

interface Props {
  mostrar: boolean;
  venta: any;
  onClose: () => void;
  onVentaActualizada: () => void;
  negocioID: string;
  cotizacion: number;
}

function simboloMoneda(m: "ARS" | "USD") {
  return m === "USD" ? "USD $" : "$";
}

export default function ModalEditarVenta({
  mostrar,
  venta,
  onClose,
  onVentaActualizada,
  negocioID,
  cotizacion,
}: Props) {
  const [cliente, setCliente] = useState("");
  const [fecha, setFecha] = useState("");
  const [productos, setProductos] = useState<any[]>([]);
  const [cotizacionEdicion, setCotizacionEdicion] = useState(0);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (venta && mostrar) {
      const cot = cotizacionDeVenta(venta, cotizacion);
      setCotizacionEdicion(cot);
      setCliente(venta.cliente || "");
      setFecha(venta.fecha || "");
      setProductos(
        (venta.productos || []).map((p: any) => prepararProductoParaEdicion(p, cot))
      );
    }
  }, [venta, mostrar, cotizacion]);

  const totales = useMemo(
    () => totalesVentaGeneralEditada(productos, cotizacionEdicion),
    [productos, cotizacionEdicion]
  );

  const actualizarProducto = (index: number, campo: string, valor: string | number) => {
    setProductos((prev) => {
      const nuevos = [...prev];
      nuevos[index] = recalcularProductoEnEdicion(
        nuevos[index],
        campo,
        valor,
        cotizacionEdicion
      );
      return nuevos;
    });
  };

  const guardarCambios = async () => {
    if (!venta || !negocioID) return;

    setGuardando(true);
    try {
      const cot = cotizacionEdicion > 0 ? cotizacionEdicion : cotizacion;
      const productosParaGuardar = productos.map((p) =>
        productoEdicionAGuardar(p, cot)
      );
      const { totalARS, totalUSD, total, gananciaTotal, moneda } =
        totalesVentaGeneralEditada(productosParaGuardar, cot);

      await updateDoc(doc(db, `negocios/${negocioID}/ventasGeneral/${venta.id}`), {
        cliente,
        fecha,
        productos: productosParaGuardar,
        total,
        totalARS,
        totalUSD,
        gananciaTotal,
        moneda,
      });

      await ajustarSaldoPorEdicionVenta(
        negocioID,
        venta.cliente || "",
        cliente,
        {
          productos: venta.productos,
          total: venta.total,
          totalARS: venta.totalARS,
          totalUSD: venta.totalUSD,
          moneda: venta.moneda,
        },
        productosParaGuardar
      );

      const telefono = productosParaGuardar.find((p) => p.categoria === "Teléfono");
      if (telefono) {
        const telefonoRef = doc(db, `negocios/${negocioID}/ventaTelefonos/${venta.id}`);
        const telefonoSnap = await getDoc(telefonoRef);
        if (telefonoSnap.exists()) {
          await updateDoc(telefonoRef, {
            precioVenta: telefono.precioVenta,
            precioCosto: telefono.precioCosto,
            ganancia: telefono.ganancia,
            cliente,
            fecha,
          });
        }
      }

      onVentaActualizada();
      onClose();
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      alert("Error al guardar los cambios");
    } finally {
      setGuardando(false);
    }
  };

  if (!mostrar || !venta) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 p-0 backdrop-blur-sm sm:p-4">
      <div className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-none border-2 border-[#ecf0f1] bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-2xl">
        <div className="bg-gradient-to-r from-[#f39c12] to-[#e67e22] text-white p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
              ✏️
            </div>
            <div>
              <h2 className="text-xl font-bold">Editar Venta</h2>
              <p className="text-orange-100 text-sm">
                Venta #{venta.nroVenta || venta.id.slice(-6)}
                {cotizacionEdicion > 0 && (
                  <span className="ml-2">
                    · Cotización ${cotizacionEdicion.toLocaleString("es-AR")} ARS/USD
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                👤 Cliente
              </label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                📅 Fecha
              </label>
              <input
                type="text"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#2c3e50] flex items-center gap-2">
              <span className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center text-white">
                📦
              </span>
              Productos ({productos.length})
            </h3>

            {productos.map((producto, index) => {
              const moneda = monedaLineaProducto(producto);
              const cot = cotizacionEdicion > 0 ? cotizacionEdicion : 1;
              const lineaMoneda = importeLineaProducto(producto);
              const lineaARS =
                moneda === "USD" ? lineaMoneda * cot : lineaMoneda;

              return (
                <div
                  key={index}
                  className="bg-[#f8f9fa] rounded-lg p-4 border border-[#ecf0f1]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          producto.categoria === "Teléfono"
                            ? "bg-[#27ae60] text-white"
                            : producto.categoria === "Accesorio"
                              ? "bg-[#3498db] text-white"
                              : "bg-[#f39c12] text-white"
                        }`}
                      >
                        {producto.categoria}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          moneda === "USD"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        💰 Venta en {moneda}
                      </span>
                    </div>
                    <span className="text-sm text-[#7f8c8d]">Producto {index + 1}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#2c3e50] mb-1">
                        Producto/Descripción
                      </label>
                      <input
                        type="text"
                        value={producto.producto || ""}
                        onChange={(e) =>
                          actualizarProducto(index, "producto", e.target.value)
                        }
                        className="w-full p-2 border border-[#bdc3c7] rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2c3e50] mb-1">
                        Marca
                      </label>
                      <input
                        type="text"
                        value={producto.marca || ""}
                        onChange={(e) =>
                          actualizarProducto(index, "marca", e.target.value)
                        }
                        className="w-full p-2 border border-[#bdc3c7] rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2c3e50] mb-1">
                        Modelo
                      </label>
                      <input
                        type="text"
                        value={producto.modelo || ""}
                        onChange={(e) =>
                          actualizarProducto(index, "modelo", e.target.value)
                        }
                        className="w-full p-2 border border-[#bdc3c7] rounded text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#e74c3c] mb-1">
                        💸 Precio costo ({moneda})
                      </label>
                      <input
                        type="number"
                        value={producto.costo ?? 0}
                        onChange={(e) =>
                          actualizarProducto(index, "costo", e.target.value)
                        }
                        className="w-full p-2 border-2 border-[#e74c3c] rounded text-sm font-medium"
                        step="0.01"
                        min="0"
                      />
                      {moneda === "USD" && (
                        <p className="text-xs text-[#7f8c8d] mt-1">
                          ≈ ${((producto.costo || 0) * cot).toLocaleString("es-AR")} ARS
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#27ae60] mb-1">
                        💰 Precio venta unit. ({moneda})
                      </label>
                      <input
                        type="number"
                        value={producto.precioUnitario ?? 0}
                        onChange={(e) =>
                          actualizarProducto(index, "precioUnitario", e.target.value)
                        }
                        className="w-full p-2 border-2 border-[#27ae60] rounded text-sm font-medium"
                        step="0.01"
                        min="0"
                      />
                      {moneda === "USD" && (
                        <p className="text-xs text-[#7f8c8d] mt-1">
                          ≈ ${((producto.precioUnitario || 0) * cot).toLocaleString("es-AR")}{" "}
                          ARS c/u
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#3498db] mb-1">
                        📦 Cantidad
                      </label>
                      <input
                        type="number"
                        value={producto.cantidad ?? 1}
                        onChange={(e) =>
                          actualizarProducto(index, "cantidad", e.target.value)
                        }
                        className="w-full p-2 border-2 border-[#3498db] rounded text-sm font-medium"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#9b59b6] mb-1">
                        💵 Total línea
                      </label>
                      <div className="w-full p-2 bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] text-white rounded text-sm font-bold text-center">
                        {simboloMoneda(moneda)}{" "}
                        {lineaMoneda.toLocaleString("es-AR")}
                      </div>
                      {moneda === "USD" && (
                        <p className="text-xs text-center text-[#7f8c8d] mt-1">
                          ≈ ${lineaARS.toLocaleString("es-AR")} ARS
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border-2 ${
                      (producto.ganancia || 0) > 0
                        ? "bg-[#d5f4e6] border-[#27ae60]"
                        : (producto.ganancia || 0) < 0
                          ? "bg-[#fadbd8] border-[#e74c3c]"
                          : "bg-[#f8f9fa] border-[#7f8c8d]"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Ganancia ({moneda})</span>
                      <span className="font-bold text-lg">
                        {simboloMoneda(moneda)}{" "}
                        {(producto.ganancia || 0).toLocaleString("es-AR")}
                      </span>
                    </div>
                    {moneda === "USD" && (
                      <p className="text-xs text-[#7f8c8d] mt-1 text-right">
                        ≈ ${((producto.ganancia || 0) * cot).toLocaleString("es-AR")} ARS
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 space-y-3">
            <div className="p-4 bg-gradient-to-r from-[#3498db] to-[#2980b9] rounded-lg text-white">
              <div className="flex justify-between items-center">
                <span className="font-medium">TOTAL (aprox. ARS)</span>
                <span className="font-bold text-xl">
                  $ {totales.total.toLocaleString("es-AR")}
                </span>
              </div>
              {(totales.totalUSD > 0 || totales.totalARS > 0) && (
                <div className="text-xs text-blue-100 mt-2 space-y-0.5">
                  {totales.totalARS > 0 && (
                    <div>ARS: $ {totales.totalARS.toLocaleString("es-AR")}</div>
                  )}
                  {totales.totalUSD > 0 && (
                    <div>
                      USD: $ {totales.totalUSD.toLocaleString("es-AR")} (× cot. → ARS)
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className={`p-4 rounded-lg text-white ${
                totales.gananciaTotal > 0
                  ? "bg-gradient-to-r from-[#27ae60] to-[#2ecc71]"
                  : totales.gananciaTotal < 0
                    ? "bg-gradient-to-r from-[#e74c3c] to-[#c0392b]"
                    : "bg-gradient-to-r from-[#7f8c8d] to-[#6c7b7f]"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">Ganancia total (mixta por moneda)</span>
                <span className="font-bold text-xl">
                  {totales.gananciaTotal.toLocaleString("es-AR")}
                </span>
              </div>
              <p className="text-xs opacity-90 mt-1">
                Cada línea en su moneda; el total ARS convierte ventas USD con la cotización de
                la venta.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#f8f9fa] px-6 py-4 border-t border-[#ecf0f1] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-6 py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardarCambios}
            disabled={guardando}
            className="px-8 py-3 bg-[#f39c12] hover:bg-[#e67e22] disabled:bg-[#bdc3c7] text-white rounded-lg font-medium flex items-center gap-2"
          >
            {guardando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>💾 Guardar cambios</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
