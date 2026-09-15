import {
  addDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { todayISO } from "./format";
import {
  zChapasCol,
  zConfigRef,
  zMaterialesCol,
} from "./paths";
import { defaultConfigDoc } from "./config";
import type { AcabadoChapa } from "./types";

const CHAPAS_SEED: {
  calibre: string;
  acabado: AcabadoChapa;
  anchoMm: number;
  largoMm: number;
  precioCosto: number;
}[] = [
  { calibre: "20", acabado: "galva", anchoMm: 1000, largoMm: 2000, precioCosto: 42000 },
  { calibre: "22", acabado: "galva", anchoMm: 1000, largoMm: 2000, precioCosto: 34000 },
  { calibre: "25", acabado: "galva", anchoMm: 1220, largoMm: 2440, precioCosto: 36000 },
  { calibre: "25C", acabado: "color", anchoMm: 1220, largoMm: 2440, precioCosto: 55000 },
  { calibre: "27", acabado: "galva", anchoMm: 1220, largoMm: 2440, precioCosto: 32000 },
  { calibre: "28", acabado: "galva", anchoMm: 1000, largoMm: 2000, precioCosto: 19000 },
  { calibre: "30", acabado: "galva", anchoMm: 1000, largoMm: 2000, precioCosto: 17000 },
];

/**
 * Carga inicial opcional: chapas del Excel + canaletas/cenefas 406/305 galva y color.
 * Idempotente: no duplica si ya hay chapas del owner.
 */
export async function seedCosteoInicial(ownerUid: string): Promise<{
  chapas: number;
  materiales: number;
  config: boolean;
}> {
  const existing = await getDocs(
    query(zChapasCol(), where("ownerUid", "==", ownerUid))
  );
  if (!existing.empty) {
    return { chapas: 0, materiales: 0, config: false };
  }

  await setDoc(zConfigRef(ownerUid), {
    ...defaultConfigDoc(ownerUid),
    actualizado: serverTimestamp(),
  });

  const chapaIds: Record<string, string> = {};
  for (const c of CHAPAS_SEED) {
    const ref = await addDoc(zChapasCol(), {
      ownerUid,
      calibre: c.calibre,
      acabado: c.acabado,
      anchoMm: c.anchoMm,
      largoMm: c.largoMm,
      precioCosto: c.precioCosto,
      fechaActualizacion: todayISO(),
      precioReferencia2015: null,
      stockCantidad: 0,
      activo: true,
      creado: serverTimestamp(),
    });
    chapaIds[`${c.calibre}-${c.acabado}`] = ref.id;
  }

  const id25 = chapaIds["25-galva"];
  const id25c = chapaIds["25C-color"];

  const mats: {
    codigo: string;
    nombre: string;
    categoria: "canaleta";
    desarrolloMm: number;
    chapaId: string;
    tipoDesarrollo: "estandar_406" | "estandar_305";
  }[] = [
    {
      codigo: "A406/25",
      nombre: "Canaleta 406/25/galva",
      categoria: "canaleta",
      desarrolloMm: 406,
      chapaId: id25,
      tipoDesarrollo: "estandar_406",
    },
    {
      codigo: "A305/25",
      nombre: "Canaleta 305/25/galva",
      categoria: "canaleta",
      desarrolloMm: 305,
      chapaId: id25,
      tipoDesarrollo: "estandar_305",
    },
    {
      codigo: "A406/25C",
      nombre: "Canaleta 406/25/color",
      categoria: "canaleta",
      desarrolloMm: 406,
      chapaId: id25c,
      tipoDesarrollo: "estandar_406",
    },
    {
      codigo: "A305/25C",
      nombre: "Canaleta 305/25/color",
      categoria: "canaleta",
      desarrolloMm: 305,
      chapaId: id25c,
      tipoDesarrollo: "estandar_305",
    },
  ];

  for (const m of mats) {
    await addDoc(zMaterialesCol(), {
      ownerUid,
      nombre: m.nombre,
      tipo: m.categoria,
      unidad: "metro",
      stock: 0,
      stockMinimo: 0,
      precioCosto: 0,
      precioVenta: 0,
      notas: "",
      creado: serverTimestamp(),
      tipoCalculo: "plegado",
      categoria: m.categoria,
      codigo: m.codigo,
      desarrolloMm: m.desarrolloMm,
      tipoDesarrollo: m.tipoDesarrollo,
      chapaId: m.chapaId,
      activo: true,
    });
  }

  // Referencia de colocación = canaleta 406 galva
  await setDoc(
    zConfigRef(ownerUid),
    {
      ...defaultConfigDoc(ownerUid),
      materialReferenciaColocacionId: (
        await getDocs(
          query(zMaterialesCol(), where("ownerUid", "==", ownerUid))
        )
      ).docs.find((d) => d.data().codigo === "A406/25")?.id || null,
      actualizado: serverTimestamp(),
    },
    { merge: true }
  );

  return { chapas: CHAPAS_SEED.length, materiales: mats.length, config: true };
}
