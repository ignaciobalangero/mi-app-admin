"use client";

import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";

export default function CatalogoPublico({ params }: any) {
  const { negocioID } = params;
  const [productos, setProductos] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "negocios", negocioID, "catalogo", "productos"),
      where("visible", "==", true),
      where("stock", ">", 0)
    );

    const unsub = onSnapshot(q, (snap) => {
      setProductos(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });

    return () => unsub();
  }, [negocioID]);

  return (
    <div>
      {productos.map((p) => (
        <div key={p.id}>
          <h3>{p.nombre}</h3>

          {p.mostrarPrecios === "DOS" ? (
            <>
              <div>Precio: ${p.precios.p1.toLocaleString("es-AR")}</div>
              <div>Mayorista: ${p.precios.p2.toLocaleString("es-AR")}</div>
            </>
          ) : (
            <div>
              Precio: ${p.precios.p1.toLocaleString("es-AR")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
