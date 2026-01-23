// src/services/catalogo.ts
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function publicarEnCatalogo({
  negocioID,
  repuestoID,
  stockRepuesto,
  mostrarPrecios = "UNO",
}: {
  negocioID: string;
  repuestoID: string;
  stockRepuesto: any;
  mostrarPrecios?: "UNO" | "DOS";
}) {
  const catalogoRef = doc(
    db,
    "negocios",
    negocioID,
    "catalogo",
    "productos",
    repuestoID
  );

  const precios: any = {
    p1: stockRepuesto.precioVenta1,
  };

  if (mostrarPrecios === "DOS") {
    precios.p2 = stockRepuesto.precioVenta2;
  }

  await setDoc(
    catalogoRef,
    {
      nombre: stockRepuesto.nombre,
      categoria: stockRepuesto.categoria,
      stock: stockRepuesto.stock,
      visible: true,
      precios,
      mostrarPrecios,
      actualizadoEn: serverTimestamp(),
    },
    { merge: true }
  );
}
