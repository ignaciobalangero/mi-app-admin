"use client";

import { useState, useMemo } from "react";

interface Proveedor {
  id: string;
  nombre: string;
  lista: string;
  fechaActualizacion: string;
}

interface Resultado {
  proveedor: string;
  linea: string;
  precio: number;
  coincidencia: number;
  /** Colores unidos para filas agrupadas (ej. "white, blue, black") */
  colores?: string[];
}

interface Props {
  proveedores: Proveedor[];
}

export default function BuscadorComparativo({ proveedores }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [ordenarPor, setOrdenarPor] = useState<"precio" | "coincidencia">("precio");

  // Colores conocidos para agrupar variantes del mismo modelo (EN + ES)
  const COLORES_CONOCIDOS = new Set([
    "black", "white", "blue", "red", "green", "pink", "purple", "yellow", "gold", "silver",
    "navy", "midnight", "starlight", "gray", "grey", "orange", "rose", "coral", "graphite",
    "lavender", "sage", "mist", "natural", "titane", "cosmic",
    "negro", "blanco", "azul", "rojo", "verde", "rosa", "amarillo", "dorado", "plateado",
    "gris", "naranja"
  ]);

  // Obtiene la base del producto (sin precio ni color final) para agrupar
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

  // Función para extraer el precio de una línea
  const extraerPrecio = (linea: string): number | null => {
    // Buscar patrones de precio: $350000, 350.000, 350,000, USD 500, u$1380, etc.
    const patrones = [
      /u\$\s*(\d+)/i,                  // u$1380
      /\$\s*(\d+[.,]?\d*)/,           // $350000 o $350.000
      /(\d+[.,]\d{3}[.,]?\d*)/,       // 350.000 o 350,000
      /USD\s*(\d+[.,]?\d*)/i,         // USD 500
      /U\$S\s*(\d+[.,]?\d*)/i,        // U$S 500
      /(\d{3,})/,                      // Cualquier número de 3+ dígitos
    ];

    for (const patron of patrones) {
      const match = linea.match(patron);
      if (match) {
        const precioStr = match[1].replace(/[.,]/g, "");
        const precio = parseInt(precioStr);
        if (!isNaN(precio) && precio > 0) {
          return precio;
        }
      }
    }
    return null;
  };

  // Función mejorada para calcular coincidencia
  const calcularCoincidencia = (linea: string, termino: string): number => {
    const lineaLower = linea.toLowerCase();
    const terminoLower = termino.toLowerCase();
    
    // Dividir el término de búsqueda en palabras
    const palabras = terminoLower.split(/\s+/).filter(p => p.length > 0);
    
    let coincidencias = 0;
    const totalPalabras = palabras.length;

    // Extraer específicamente GB del término si existe
    const gbTermino = termino.match(/(\d+)\s*gb/i);
    const gbLinea = linea.match(/(\d+)\s*gb/i);

    // CRÍTICO: Si el término tiene un modelo numérico (ej: iPhone 17), validar
    const modeloNumeroTermino = termino.match(/(?:iphone|galaxy|redmi|poco|note|moto)\s+(\d+)/i);
    if (modeloNumeroTermino) {
      const numeroModelo = modeloNumeroTermino[1];
      const tieneNumeroModelo = linea.match(new RegExp(`(?:iphone|galaxy|redmi|poco|note|moto)\\s+${numeroModelo}`, 'i'));
      
      if (!tieneNumeroModelo) {
        return 0; // No coincide el modelo
      }
    }

    // Si el término especifica GB, la línea DEBE tener ese GB
    if (gbTermino) {
      const gbBuscado = gbTermino[1];
      if (!gbLinea || gbLinea[1] !== gbBuscado) {
        return 0; // No coincide el almacenamiento
      }
    }

    // Contar cuántas palabras coinciden
    palabras.forEach(palabra => {
      if (/^\d+$/.test(palabra)) {
        coincidencias++;
      } else if (lineaLower.includes(palabra)) {
        coincidencias++;
      }
    });

    // Bonus si la línea contiene el término exacto
    if (lineaLower.includes(terminoLower)) {
      coincidencias += 2;
    }

    // Calcular porcentaje de coincidencia
    return Math.min(100, (coincidencias / totalPalabras) * 100);
  };

  // Función CORREGIDA para expandir variantes (ahora sí detecta todo)
  const expandirVariantes = (lineas: string[]): string[] => {
    const lineasExpandidas: string[] = [];
    let tituloActual = "";

    for (let i = 0; i < lineas.length; i++) {
      const lineaTrim = lineas[i].trim();
      if (!lineaTrim) continue;

      // DETECCIÓN DE TÍTULO: Línea que tiene marca/modelo pero SIN precio en la misma línea
      // Si la línea ya tiene $ o u$ es un producto completo (ej. "IPHONE 17 256 GB WHITE $900") y no un título
      const tieneMarcaModelo = 
        /(?:APPLE|IPHONE|SAMSUNG|GALAXY|XIAOMI|REDMI|POCO|MOTOROLA|MOTO|INFINIX|MACBOOK|IPAD)/i.test(lineaTrim);
      
      const tienePrecioEnLinea = /(?:\$|u\$)/i.test(lineaTrim);
      const tieneGBconPrecio = /\d+\s*GB.+(?:\$|u\$)/i.test(lineaTrim); // acepta "256 GB" o "256GB"
      
      const esTitulo = tieneMarcaModelo && !tieneGBconPrecio && !tienePrecioEnLinea;

      // DETECCIÓN DE LÍNEA CON SPECS: Empieza con X GB y tiene precio (ej. "256GB $..." o "256 GB $...")
      const esLineaConSpecs = /^\d+\s*GB.+(?:\$|u\$)/i.test(lineaTrim);

      if (esTitulo) {
        // Guardar título (limpiando emojis)
        tituloActual = lineaTrim.replace(/[📲🔸💠♦️➡️🔹🍎⌚✏🎧🔋🕹]/g, '').trim();
        
      } else if (esLineaConSpecs) {
        if (tituloActual) {
          // Tiene título activo: combinar
          // Verificar si tiene colores en paréntesis
          const coloresMatch = lineaTrim.match(/\(([^)]+)\)/);
          
          if (coloresMatch) {
            // Expandir colores
            const coloresTexto = coloresMatch[1];
            const lineaSinColores = lineaTrim.replace(/\([^)]+\)/, '').trim();
            const colores = coloresTexto.split(/[-,\/]+/).map(c => c.trim()).filter(c => c && c.length > 0);
            
            if (colores.length > 1) {
              // Múltiples colores: crear una línea por cada color
              colores.forEach(color => {
                lineasExpandidas.push(`${tituloActual} ${lineaSinColores} (${color})`);
              });
            } else {
              // Un solo color o no se pudo separar: agregar tal cual
              lineasExpandidas.push(`${tituloActual} ${lineaTrim}`);
            }
          } else {
            // Sin colores en paréntesis: agregar tal cual
            lineasExpandidas.push(`${tituloActual} ${lineaTrim}`);
          }
        } else {
          // No hay título activo: es una línea independiente con precio
          lineasExpandidas.push(lineaTrim);
        }
        
      } else if (/(?:\$|u\$)/i.test(lineaTrim)) {
        // Línea con precio pero no es specs (ej: línea completa con todo)
        lineasExpandidas.push(lineaTrim);
        tituloActual = ""; // Resetear título
      }
      // Las demás líneas (colores sueltos, descripciones) las ignoramos
    }

    return lineasExpandidas;
  };

  // Buscar en todas las listas
  const resultados = useMemo(() => {
    if (!busqueda.trim()) return [];

    const resultadosEncontrados: Resultado[] = [];

    proveedores.forEach((proveedor) => {
      if (!proveedor.lista) return;

      const lineas = proveedor.lista.split("\n");
      
      // Expandir variantes
      const lineasExpandidas = expandirVariantes(lineas);

      lineasExpandidas.forEach((linea) => {
        const lineaTrim = linea.trim();
        if (!lineaTrim) return;

        const coincidencia = calcularCoincidencia(lineaTrim, busqueda);
        
        // Solo incluir si hay al menos 60% de coincidencia
        if (coincidencia >= 60) {
          const precio = extraerPrecio(lineaTrim);
          
          resultadosEncontrados.push({
            proveedor: proveedor.nombre,
            linea: lineaTrim,
            precio: precio || 0,
            coincidencia,
          });
        }
      });
    });

    // Ordenar: por precio = primero por coincidencia (mejor match primero), luego por precio
    const ordenados = resultadosEncontrados.sort((a, b) => {
      if (ordenarPor === "precio") {
        const diffCoincidencia = b.coincidencia - a.coincidencia;
        if (diffCoincidencia !== 0) return diffCoincidencia;
        if (a.precio === 0 && b.precio === 0) return 0;
        if (a.precio === 0) return 1;
        if (b.precio === 0) return -1;
        return a.precio - b.precio;
      } else {
        return b.coincidencia - a.coincidencia;
      }
    });

    // Agrupar por proveedor + base producto: unir colores en una sola fila
    const agrupados = new Map<string, Resultado>();
    ordenados.forEach((r) => {
      const { base, color } = obtenerBaseProducto(r.linea);
      const key = `${r.proveedor}|${base.toLowerCase().trim()}`;
      const existente = agrupados.get(key);
      if (!existente) {
        agrupados.set(key, {
          ...r,
          colores: color ? [color] : undefined,
        });
        return;
      }
      if (color && !existente.colores?.includes(color)) {
        existente.colores = [...(existente.colores || []), color];
      }
      if (r.precio > 0 && (existente.precio === 0 || r.precio < existente.precio)) {
        existente.precio = r.precio;
      }
      if (r.coincidencia > existente.coincidencia) existente.coincidencia = r.coincidencia;
    });

    return Array.from(agrupados.values()).map((r) => {
      if (r.colores && r.colores.length > 0) {
        const { base } = obtenerBaseProducto(r.linea);
        const lineaUnida = `${base} ${r.colores.join(", ")}`;
        return { ...r, linea: lineaUnida };
      }
      return r;
    });
  }, [busqueda, proveedores, ordenarPor]);

  const copiarAlPortapapeles = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      alert("📋 Copiado al portapapeles");
    } catch (error) {
      console.error("Error al copiar:", error);
    }
  };

  const proveedoresConListas = proveedores.filter((p) => p.lista);

  return (
    <div className="space-y-6">
      {/* Información de proveedores disponibles */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 shadow-lg border-2 border-blue-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <span className="text-blue-600 text-2xl">ℹ️</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-blue-800">
              Proveedores con listas cargadas
            </h3>
            <p className="text-blue-600 text-sm mt-1">
              {proveedoresConListas.length === 0 ? (
                "No hay listas cargadas. Primero cargá las listas de tus proveedores."
              ) : (
                <>
                  {proveedoresConListas.map((p, i) => (
                    <span key={p.id}>
                      <strong>{p.nombre}</strong>
                      {p.fechaActualizacion && (
                        <span className="text-xs"> ({p.fechaActualizacion})</span>
                      )}
                      {i < proveedoresConListas.length - 1 && ", "}
                    </span>
                  ))}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {proveedoresConListas.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-lg border border-[#ecf0f1]">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 bg-[#ecf0f1] rounded-2xl flex items-center justify-center">
              <span className="text-4xl">📋</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#2c3e50] mb-2">
                No hay listas para buscar
              </h3>
              <p className="text-[#7f8c8d] mb-6">
                Primero tenés que cargar las listas de precios de tus proveedores
                en la sección "Cargar Listas"
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Buscador */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-[#3498db] rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl">🔍</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#2c3e50]">
                  Buscar en Todas las Listas
                </h2>
                <p className="text-[#7f8c8d] mt-1">
                  Buscá un producto y comparará los precios de todos tus proveedores
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Escribí: modelo, GB, color... (ej: iPhone 17 256, Samsung S21 128GB, etc.)"
                className="flex-1 px-6 py-4 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] font-medium text-lg"
              />
              
              <select
                value={ordenarPor}
                onChange={(e) => setOrdenarPor(e.target.value as "precio" | "coincidencia")}
                className="px-6 py-4 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] font-medium"
              >
                <option value="precio">💰 Ordenar por Precio</option>
                <option value="coincidencia">🎯 Ordenar por Coincidencia</option>
              </select>
            </div>

            {busqueda && (
              <div className="mt-4 space-y-2">
                <div className="text-sm text-[#7f8c8d]">
                  💡 <strong>Tip:</strong> Podés buscar por modelo + almacenamiento + color
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                    Ejemplo: "iPhone 17 256"
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                    Ejemplo: "Samsung S25 512"
                  </span>
                  <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                    Ejemplo: "MacBook Air M4"
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Resultados */}
          {busqueda && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1]">
              <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Resultados de Búsqueda</h3>
                    <p className="text-blue-100 mt-1">
                      {resultados.length === 0
                        ? "No se encontraron resultados"
                        : `${resultados.length} ${
                            resultados.length === 1 ? "resultado encontrado" : "resultados encontrados"
                          }`}
                    </p>
                  </div>
                </div>
              </div>

              {resultados.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-[#ecf0f1] rounded-2xl flex items-center justify-center">
                      <span className="text-4xl">🔍</span>
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-[#2c3e50] mb-2">
                        No se encontraron resultados
                      </p>
                      <p className="text-sm text-[#7f8c8d]">
                        Intentá con otros términos de búsqueda o verificá que las
                        listas estén cargadas correctamente
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
                      <tr>
                        <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🏪</span>
                            Proveedor
                          </div>
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                          <div className="flex items-center gap-2">
                            <span className="text-base">📱</span>
                            Producto
                          </div>
                        </th>
                        <th className="p-4 text-right text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-base">💰</span>
                            Precio
                          </div>
                        </th>
                        <th className="p-4 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-base">🎯</span>
                            Coincidencia
                          </div>
                        </th>
                        <th className="p-4 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-base">⚙️</span>
                            Acciones
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((resultado, index) => {
                        const isEven = index % 2 === 0;
                        const esMejorPrecio =
                          resultado.precio > 0 &&
                          resultado.precio ===
                            Math.min(
                              ...resultados
                                .filter((r) => r.precio > 0)
                                .map((r) => r.precio)
                            );

                        return (
                          <tr
                            key={`${resultado.proveedor}-${index}`}
                            className={`transition-all duration-200 hover:bg-[#ebf3fd] ${
                              esMejorPrecio
                                ? "bg-green-50"
                                : isEven
                                ? "bg-white"
                                : "bg-[#f8f9fa]"
                            }`}
                          >
                            <td className="p-4 border border-[#bdc3c7]">
                              <span className="font-semibold text-[#2c3e50] bg-blue-100 px-3 py-1 rounded-lg">
                                {resultado.proveedor}
                              </span>
                            </td>
                            <td className="p-4 border border-[#bdc3c7]">
                              <span className="text-[#2c3e50]">
                                {resultado.linea}
                              </span>
                            </td>
                            <td className="p-4 border border-[#bdc3c7] text-right">
                              {resultado.precio > 0 ? (
                                <span
                                  className={`font-bold text-lg ${
                                    esMejorPrecio
                                      ? "text-green-700 bg-green-100"
                                      : "text-[#2c3e50] bg-gray-100"
                                  } px-4 py-2 rounded-lg inline-block`}
                                >
                                  ${resultado.precio.toLocaleString("es-AR")}
                                  {esMejorPrecio && (
                                    <span className="ml-2 text-xs">🏆</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-[#95a5a6] italic text-sm">
                                  Sin precio detectado
                                </span>
                              )}
                            </td>
                            <td className="p-4 border border-[#bdc3c7] text-center">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                  resultado.coincidencia >= 80
                                    ? "bg-green-100 text-green-700"
                                    : resultado.coincidencia >= 60
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-orange-100 text-orange-700"
                                }`}
                              >
                                {Math.round(resultado.coincidencia)}%
                              </span>
                            </td>
                            <td className="p-4 border border-[#bdc3c7] text-center">
                              <button
                                onClick={() =>
                                  copiarAlPortapapeles(resultado.linea)
                                }
                                className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105"
                              >
                                📋 Copiar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {resultados.length > 0 && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm text-gray-600">
                    <span>
                      Se encontraron {resultados.length}{" "}
                      {resultados.length === 1 ? "resultado" : "resultados"}
                    </span>
                    {resultados.some((r) => r.precio > 0) && (
                      <div className="flex gap-6">
                        <span>
                          💰 <strong>Precio más bajo:</strong> $
                          {Math.min(
                            ...resultados
                              .filter((r) => r.precio > 0)
                              .map((r) => r.precio)
                          ).toLocaleString("es-AR")}
                        </span>
                        <span>
                          💸 <strong>Precio más alto:</strong> $
                          {Math.max(
                            ...resultados
                              .filter((r) => r.precio > 0)
                              .map((r) => r.precio)
                          ).toLocaleString("es-AR")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}