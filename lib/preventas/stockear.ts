import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProductoPreventa } from "./modelo";

function codigoNuevo(): string {
  return `PRE${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();
}

function datosStock(p: ProductoPreventa, codigo: string, negocioID: string) {
  const precio = p.precioUnitario;
  const enPesos = p.moneda === "ARS" ? precio : 0;
  return {
    codigo,
    producto: p.nombre,
    modelo: p.nombre,
    marca: "",
    categoria: "Preventa",
    color: "",
    cantidad: p.cantidad,
    moneda: p.moneda,
    precioCosto: p.precioCosto || 0,
    precioCostoPesos: p.moneda === "ARS" ? p.precioCosto || 0 : 0,
    precio1: precio,
    precio2: 0,
    precio3: 0,
    precio1Pesos: enPesos,
    precio2Pesos: 0,
    precio3Pesos: 0,
    precioUSD: p.moneda === "USD" ? precio : 0,
    tipo: p.destinoStock === "stockAccesorios" ? "accesorio" : p.destinoStock === "stockRepuestos" ? "repuesto" : "general",
    origen: "preventa",
    negocioID,
  };
}

/** Crea la ficha de stock de las líneas que todavía no ingresaron. No toca las que ya están. */
export async function stockearProductos(
  negocioID: string,
  productos: ProductoPreventa[],
  ids: string[]
): Promise<ProductoPreventa[]> {
  const elegidos = new Set(ids);
  const siguiente: ProductoPreventa[] = [];
  for (const p of productos) {
    if (!elegidos.has(p.id) || p.stockeado || p.desdeStock) {
      siguiente.push(p);
      continue;
    }
    const codigo = codigoNuevo();
    const data = datosStock(p, codigo, negocioID);
    let stockDocId = codigo;
    if (p.destinoStock === "stockExtra") {
      await setDoc(doc(db, `negocios/${negocioID}/stockExtra/${codigo}`), data);
    } else {
      const ref = await addDoc(collection(db, `negocios/${negocioID}/${p.destinoStock}`), data);
      stockDocId = ref.id;
    }
    siguiente.push({ ...p, stockeado: true, stockDocId, codigo });
  }
  return siguiente;
}
