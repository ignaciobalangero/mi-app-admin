"use client";

import { useMemo, useState } from "react";

const COLORES_CONOCIDOS = new Set([
  "black",
  "white",
  "blue",
  "red",
  "green",
  "pink",
  "purple",
  "yellow",
  "gold",
  "silver",
  "navy",
  "midnight",
  "starlight",
  "gray",
  "grey",
  "orange",
  "rose",
  "coral",
  "graphite",
  "lavender",
  "sage",
  "mist",
  "natural",
  "titane",
  "cosmic",
  "negro",
  "blanco",
  "azul",
  "rojo",
  "verde",
  "rosa",
  "amarillo",
  "dorado",
  "plateado",
  "gris",
  "naranja",
]);

// Obtiene la base del producto (sin precio ni color final) para mostrar.
// (Misma lógica base que BuscadorComparativo, para mantener consistencia.)
const obtenerBaseProducto = (linea: string): { base: string; color: string | null } => {
  const sinPrecio = linea
    .replace(/\$\s*[\d.,]+/g, "")
    .replace(/u\$\s*[\d.,]+/gi, "")
    .replace(/USD\s*[\d.,]+/gi, "")
    .replace(/\d{4,}/g, "") // números de 4+ dígitos (precio)
    .replace(/\s+/g, " ")
    .trim();

  const partes = sinPrecio.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return { base: linea, color: null };

  const ultima = partes[partes.length - 1].toLowerCase().replace(/[()]/g, "");
  if (COLORES_CONOCIDOS.has(ultima)) {
    const base = partes.slice(0, -1).join(" ").trim();
    return { base: base || sinPrecio, color: ultima };
  }

  // Color entre paréntesis al final: "256GB (blue)"
  const matchParen = sinPrecio.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (matchParen) {
    const posibleColor = matchParen[2].trim().toLowerCase();
    if (COLORES_CONOCIDOS.has(posibleColor)) {
      return { base: matchParen[1].trim(), color: posibleColor };
    }
  }

  return { base: sinPrecio, color: null };
};

// Extrae el precio de una línea (misma lógica que BuscadorComparativo).
const extraerPrecio = (linea: string): number | null => {
  const patrones = [
    /u\$\s*(\d+)/i, // u$1380
    /\$\s*(\d+[.,]?\d*)/, // $350000 o $350.000
    /(\d+[.,]\d{3}[.,]?\d*)/, // 350.000 o 350,000
    /USD\s*(\d+[.,]?\d*)/i, // USD 500
    /U\$S\s*(\d+[.,]?\d*)/i, // U$S 500
    /(\d{3,})/, // Cualquier número de 3+ dígitos
  ];

  for (const patron of patrones) {
    const match = linea.match(patron);
    if (match) {
      const precioStr = match[1].replace(/[.,]/g, "");
      const precio = parseInt(precioStr);
      if (!isNaN(precio) && precio > 0) return precio;
    }
  }
  return null;
};

// Función de coincidencia (misma lógica que BuscadorComparativo).
const calcularCoincidencia = (linea: string, termino: string): number => {
  const lineaLower = linea.toLowerCase();
  const terminoLower = termino.toLowerCase();

  const palabras = terminoLower.split(/\s+/).filter((p) => p.length > 0);
  if (palabras.length === 0) return 0;

  let coincidencias = 0;
  const totalPalabras = palabras.length;

  const gbTermino = termino.match(/(\d+)\s*gb/i);
  const gbLinea = linea.match(/(\d+)\s*gb/i);

  const modeloNumeroTermino = termino.match(
    /(?:iphone|galaxy|redmi|poco|note|moto)\s+(\d+)/i
  );
  if (modeloNumeroTermino) {
    const numeroModelo = modeloNumeroTermino[1];
    const tieneNumeroModelo = linea.match(
      new RegExp(
        `(?:iphone|galaxy|redmi|poco|note|moto)\\s+${numeroModelo}`,
        "i"
      )
    );
    if (!tieneNumeroModelo) return 0;
  }

  if (gbTermino) {
    const gbBuscado = gbTermino[1];
    if (!gbLinea || gbLinea[1] !== gbBuscado) return 0;
  }

  palabras.forEach((palabra) => {
    if (/^\d+$/.test(palabra)) {
      coincidencias++;
    } else if (lineaLower.includes(palabra)) {
      coincidencias++;
    }
  });

  if (lineaLower.includes(terminoLower)) coincidencias += 2;

  return Math.min(100, (coincidencias / totalPalabras) * 100);
};

// Expande variantes (misma lógica que BuscadorComparativo).
const expandirVariantes = (lineas: string[]): string[] => {
  const lineasExpandidas: string[] = [];
  let tituloActual = "";

  for (let i = 0; i < lineas.length; i++) {
    const lineaTrim = lineas[i].trim();
    if (!lineaTrim) continue;

    const tieneMarcaModelo =
      /(?:APPLE|IPHONE|SAMSUNG|GALAXY|XIAOMI|REDMI|POCO|MOTOROLA|MOTO|INFINIX|MACBOOK|IPAD)/i.test(
        lineaTrim
      );

    const tienePrecioEnLinea = /(?:\$|u\$)/i.test(lineaTrim);
    const tieneGBconPrecio = /\d+\s*GB.+(?:\$|u\$)/i.test(lineaTrim);

    const esTitulo = tieneMarcaModelo && !tieneGBconPrecio && !tienePrecioEnLinea;

    const esLineaConSpecs = /^\d+\s*GB.+(?:\$|u\$)/i.test(lineaTrim);

    if (esTitulo) {
      tituloActual = lineaTrim
        .replace(/[📲🔸💠♦️➡️🔹🍎⌚✏🎧🔋🕹]/g, "")
        .trim();
    } else if (esLineaConSpecs) {
      if (tituloActual) {
        const coloresMatch = lineaTrim.match(/\(([^)]+)\)/);

        if (coloresMatch) {
          const coloresTexto = coloresMatch[1];
          const lineaSinColores = lineaTrim.replace(/\([^)]+\)/, "").trim();
          const colores = coloresTexto
            .split(/[-,\/]+/)
            .map((c) => c.trim())
            .filter((c) => c && c.length > 0);

          if (colores.length > 1) {
            colores.forEach((color) => {
              lineasExpandidas.push(`${tituloActual} ${lineaSinColores} (${color})`);
            });
          } else {
            lineasExpandidas.push(`${tituloActual} ${lineaTrim}`);
          }
        } else {
          lineasExpandidas.push(`${tituloActual} ${lineaTrim}`);
        }
      } else {
        lineasExpandidas.push(lineaTrim);
      }
    } else if (/(?:\$|u\$)/i.test(lineaTrim)) {
      lineasExpandidas.push(lineaTrim);
      tituloActual = "";
    }
    // Las demás líneas se ignoran (igual que BuscadorComparativo).
  }

  return lineasExpandidas;
};

const parseNumero = (valor: string): number => {
  const v = valor.trim().replace(/\./g, "").replace(",", ".");
  if (!v) return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const formatNumeroAR = (n: number): string => {
  if (!isFinite(n)) return "0";
  return Math.round(n).toLocaleString("es-AR", { maximumFractionDigits: 0 });
};

const reemplazarPrecioEnLinea = (linea: string, nuevoPrecio: number): string => {
  const nuevo = formatNumeroAR(nuevoPrecio);

  // Reemplaza el primer match de precio en prioridad (misma intención que extraerPrecio).
  const patrones: Array<{ regex: RegExp; tipo: "prefix" | "valor" }> = [
    { regex: /(u\$\s*)(\d+[.,]?\d*)/i, tipo: "prefix" },
    { regex: /(\$\s*)(\d+[.,]?\d*)/, tipo: "prefix" },
    { regex: /(USD\s*)(\d+[.,]?\d*)/i, tipo: "prefix" },
    { regex: /(U\$S\s*)(\d+[.,]?\d*)/i, tipo: "prefix" },
    { regex: /(\d{3,})/, tipo: "valor" },
  ];

  for (const { regex, tipo } of patrones) {
    if (!regex.test(linea)) continue;

    const replaced =
      tipo === "prefix"
        ? linea.replace(regex, (_m, prefix: string) => `${prefix}${nuevo}`)
        : linea.replace(regex, nuevo);

    if (replaced !== linea) return replaced;
  }

  return linea;
};

export default function FormadorPrecios() {
  const [listaTexto, setListaTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [porcentajeStr, setPorcentajeStr] = useState("0");
  const [sumaStr, setSumaStr] = useState("0");

  const porcentaje = parseNumero(porcentajeStr);
  const sumaFija = parseNumero(sumaStr);

  const itemsTransformados = useMemo(() => {
    const raw = listaTexto.trim();
    if (!raw) return [];

    const lineas = raw.split("\n");
    const lineasExpandidas = expandirVariantes(lineas);

    const busq = busqueda.trim();

    const out: Array<{
      base: string;
      lineaOriginal: string;
      lineaTransformada: string;
      precioBase: number;
      precioNuevo: number;
      coincidencia: number;
    }> = [];

    for (const linea of lineasExpandidas) {
      const lineaTrim = linea.trim();
      if (!lineaTrim) continue;

      const precioBase = extraerPrecio(lineaTrim);
      if (!precioBase || precioBase <= 0) continue;

      let coincidencia = 100;
      if (busq) {
        coincidencia = calcularCoincidencia(lineaTrim, busq);
        if (coincidencia < 60) continue;
      }

      const precioNuevo = Math.round(precioBase * (1 + porcentaje / 100) + sumaFija);
      const lineaTransformada = reemplazarPrecioEnLinea(lineaTrim, precioNuevo);

      const { base } = obtenerBaseProducto(lineaTrim);
      out.push({
        base,
        lineaOriginal: lineaTrim,
        lineaTransformada,
        precioBase,
        precioNuevo,
        coincidencia,
      });
    }

    return out;
  }, [listaTexto, busqueda, porcentaje, sumaFija]);

  const outputText = useMemo(() => {
    if (!itemsTransformados.length) return "";
    return itemsTransformados.map((it) => it.lineaTransformada).join("\n");
  }, [itemsTransformados]);

  const copiarResultado = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      alert("📋 Lista formadora copiada al portapapeles");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1]">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-[#f39c12] rounded-xl flex items-center justify-center">
            <span className="text-white text-2xl">🧮</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#2c3e50]">Formador de Precios</h2>
            <p className="text-[#7f8c8d] mt-1">
              Pegá una lista y aplicá un ajuste por porcentaje y/o suma fija.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder='Filtrar (misma lógica del buscador). Ej: "iPhone 17 256"'
            className="flex-1 px-5 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all text-[#2c3e50] font-medium text-base"
          />

          <div className="flex gap-4">
            <div className="min-w-[170px]">
              <div className="inline-flex bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg px-3 py-1 text-sm font-bold mb-2">
                %
              </div>
              <input
                inputMode="decimal"
                type="text"
                value={porcentajeStr}
                onChange={(e) => setPorcentajeStr(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all text-[#2c3e50] font-medium"
              />
            </div>

            <div className="min-w-[170px]">
              <div className="inline-flex bg-orange-50 text-orange-800 border border-orange-200 rounded-lg px-3 py-1 text-sm font-bold mb-2">
                $
              </div>
              <input
                inputMode="decimal"
                type="text"
                value={sumaStr}
                onChange={(e) => setSumaStr(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all text-[#2c3e50] font-medium"
              />
            </div>
          </div>
        </div>

        <textarea
          value={listaTexto}
          onChange={(e) => setListaTexto(e.target.value)}
          placeholder="Pegá la lista completa (Excel/WhatsApp/texto plano...)\nEjemplo:\n iPhone 11 64GB Negro - $350.000\n iPhone 12 128GB Blanco - $480.000\n Samsung S21 256GB Azul - $420.000"
          className="w-full h-80 px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all text-[#2c3e50] font-mono text-sm resize-none"
        />

        <div className="flex gap-4 mt-5 justify-between flex-wrap">
          <button
            onClick={() => setListaTexto("")}
            className="bg-[#95a5a6] hover:bg-[#7f8c8d] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            🗑️ Limpiar
          </button>

          <div className="flex gap-3">
            <button
              onClick={copiarResultado}
              disabled={!outputText}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg ${
                outputText
                  ? "bg-gradient-to-r from-[#f39c12] to-[#d35400] text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              📋 Copiar lista resultante
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1]">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-[#ecf0f1] rounded-xl flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#2c3e50]">Salida</h3>
            <p className="text-[#7f8c8d] text-sm">
              {itemsTransformados.length
                ? `${itemsTransformados.length} líneas formadas${busqueda.trim() ? " (filtradas)" : ""}`
                : "Pegá una lista para ver el resultado."}
            </p>
          </div>
        </div>

        <textarea
          value={outputText}
          readOnly
          className="w-full h-64 px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-[#f8f9fa] text-[#2c3e50] font-mono text-sm resize-none"
          placeholder="—"
        />

        {itemsTransformados.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse min-w-[560px]">
              <thead>
                <tr className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
                  <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                    Producto
                  </th>
                  <th className="p-3 text-right text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                    Precio base
                  </th>
                  <th className="p-3 text-right text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                    Precio nuevo
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                    Coincidencia
                  </th>
                </tr>
              </thead>
              <tbody>
                {itemsTransformados.slice(0, 40).map((it, idx) => (
                  <tr
                    key={`${it.lineaOriginal}-${idx}`}
                    className={idx % 2 === 0 ? "bg-white" : "bg-[#f8f9fa]"}
                  >
                    <td className="p-3 border border-[#bdc3c7] text-sm text-[#2c3e50]">
                      {it.base || it.lineaOriginal}
                    </td>
                    <td className="p-3 border border-[#bdc3c7] text-right text-sm text-[#2c3e50]">
                      ${formatNumeroAR(it.precioBase)}
                    </td>
                    <td className="p-3 border border-[#bdc3c7] text-right text-sm font-bold text-[#8e44ad]">
                      ${formatNumeroAR(it.precioNuevo)}
                    </td>
                    <td className="p-3 border border-[#bdc3c7] text-sm text-[#2c3e50]">
                      {Math.round(it.coincidencia)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {itemsTransformados.length > 40 && (
              <p className="text-xs text-[#7f8c8d] mt-2">
                Mostrando las primeras 40 líneas (para evitar tablas pesadas).
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

