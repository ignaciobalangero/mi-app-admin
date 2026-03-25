"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { signOut } from "firebase/auth";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  collection,
  getDoc,
  doc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import CheckInForm from "@/app/ingreso/CheckInForm";

const ITEMS_POR_PAGINA = 40;
const ESTADOS_PENDIENTES = ["PENDIENTE", "REPARADO", "PENDIENTE ACEPTACION"] as const;
const ESTADOS_HISTORIAL = ["ENTREGADO", "PAGADO"] as const;

function normalizarNombre(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

async function resolverNombreCliente(
  negocioID: string,
  nombreUsuarioDoc: string
): Promise<string> {
  const snap = await getDocs(collection(db, `negocios/${negocioID}/clientes`));
  const target = normalizarNombre(nombreUsuarioDoc);
  const hit = snap.docs.find(
    (d) => normalizarNombre(String(d.data()?.nombre || "")) === target
  );
  if (hit) return String(hit.data().nombre || "").trim();
  return nombreUsuarioDoc.trim();
}

export type TrabajoCliente = {
  id: string;
  fecha: string;
  modelo: string;
  trabajo: string;
  precio?: number | string;
  estado: string;
  fechaEntrega?: string;
  moneda?: string;
  imei?: string;
  /** Para ordenar (creadoEn de Firestore) */
  creadoMillis?: number;
};

export type LineaVenta = {
  categoria?: string;
  descripcion?: string;
  producto?: string;
  marca?: string;
  modelo?: string;
  color?: string;
  cantidad?: number;
  precioUnitario?: number;
  moneda?: string;
  total?: number;
};

export type VentaCliente = {
  id: string;
  fecha?: string;
  total?: number;
  totalARS?: number;
  totalUSD?: number;
  moneda?: string;
  tipo?: string;
  estado?: string;
  productos: LineaVenta[];
  observaciones?: string;
  nroVenta?: string | number;
  /** Orden cronológico en listados (Firestore) */
  timestamp?: Timestamp | null;
};

interface Pago {
  fecha: string | Timestamp;
  monto?: number;
  montoUSD?: number;
  forma?: string;
  destino?: string;
  timestamp?: Timestamp;
  fechaCompleta?: Timestamp;
}

function parseFechaTrabajo(f: string | undefined): number {
  if (!f) return 0;
  const [dia, mes, año] = f.split("/");
  if (!año || !mes || !dia) return 0;
  return new Date(`${año}-${mes}-${dia}`).getTime();
}

/** Para ordenar pagos: más reciente primero. */
function ordenPagoMillis(p: Pago): number {
  const ts = p.timestamp;
  if (ts && typeof ts === "object" && "seconds" in ts) return ts.seconds * 1000;
  const fc = p.fechaCompleta;
  if (fc && typeof fc === "object" && "seconds" in fc) return fc.seconds * 1000;
  if (p.fecha && typeof p.fecha === "object" && "seconds" in p.fecha) {
    return (p.fecha as Timestamp).seconds * 1000;
  }
  if (typeof p.fecha === "string") {
    const t = parseFechaTrabajo(p.fecha);
    if (t) return t;
  }
  return 0;
}

function formatearFechaPago(p: Pago): string {
  if (typeof p.fecha === "string") return p.fecha;
  if (p.fecha && typeof p.fecha === "object" && "seconds" in p.fecha) {
    return new Date((p.fecha as Timestamp).seconds * 1000).toLocaleDateString("es-AR");
  }
  return "—";
}

function trabajoCoincideBusqueda(t: TrabajoCliente, q: string): boolean {
  const n = q.trim().toLowerCase().replace(/\s/g, "");
  if (!n) return true;
  const hayEspacios = q.trim().includes(" ");
  const needle = hayEspacios ? q.trim().toLowerCase() : n;
  const modelo = String(t.modelo || "").toLowerCase();
  const trabajo = String(t.trabajo || "").toLowerCase();
  const imei = String(t.imei || "").toLowerCase().replace(/\s/g, "");
  if (hayEspacios) {
    return modelo.includes(needle) || trabajo.includes(needle) || imei.includes(needle.replace(/\s/g, ""));
  }
  return modelo.includes(needle) || trabajo.includes(needle) || imei.includes(n);
}

function mapDocATrabajo(d: QueryDocumentSnapshot<DocumentData>): TrabajoCliente {
  const x = d.data();
  const ce = x.creadoEn as Timestamp | undefined;
  const creadoMillis =
    ce && typeof ce === "object" && "seconds" in ce ? ce.seconds * 1000 : undefined;
  return {
    id: d.id,
    fecha: String(x.fecha || ""),
    modelo: String(x.modelo || ""),
    trabajo: String(x.trabajo || ""),
    precio: x.precio,
    estado: String(x.estado || ""),
    fechaEntrega: x.fechaEntrega != null ? String(x.fechaEntrega) : undefined,
    moneda: x.moneda != null ? String(x.moneda) : undefined,
    imei: x.imei != null ? String(x.imei) : "",
    creadoMillis,
  };
}

function ordenTrabajoReciente(a: TrabajoCliente, b: TrabajoCliente): number {
  const tb = b.creadoMillis ?? parseFechaTrabajo(b.fecha);
  const ta = a.creadoMillis ?? parseFechaTrabajo(a.fecha);
  return tb - ta;
}

function mapDocAVenta(d: QueryDocumentSnapshot<DocumentData>): VentaCliente {
  const x = d.data();
  const raw = x.productos;
  const productos = Array.isArray(raw) ? (raw as LineaVenta[]) : [];
  const ts = x.timestamp;
  return {
    id: d.id,
    fecha: x.fecha != null ? String(x.fecha) : "",
    total: x.total != null ? Number(x.total) : undefined,
    totalARS: x.totalARS != null ? Number(x.totalARS) : undefined,
    totalUSD: x.totalUSD != null ? Number(x.totalUSD) : undefined,
    moneda: x.moneda != null ? String(x.moneda) : undefined,
    tipo: x.tipo != null ? String(x.tipo) : "",
    estado: x.estado != null ? String(x.estado) : "",
    productos,
    observaciones: x.observaciones != null ? String(x.observaciones) : "",
    nroVenta: x.nroVenta,
    timestamp: ts && typeof ts === "object" && "seconds" in ts ? (ts as Timestamp) : null,
  };
}

function formatoMonto(monto: number, esUsd: boolean): string {
  if (esUsd) return `US$ ${monto.toLocaleString("en-US")}`;
  return `$ ${monto.toLocaleString("es-AR")} ARS`;
}

/** Subtotal de línea: si el total guardado no coincide con unit×cant (mezcla ARS/USD), usar el cálculo coherente con la moneda de la línea. */
function subtotalLinea(p: LineaVenta): number {
  const u = Number(p.precioUnitario ?? 0);
  const c = Number(p.cantidad ?? 1);
  const calc = u * c;
  const stored = p.total != null && !Number.isNaN(Number(p.total)) ? Number(p.total) : null;
  const lineUsd = (p.moneda || "").toUpperCase() === "USD";

  if (stored == null) return calc;
  if (lineUsd && calc > 0 && stored > calc * 4) return calc;
  if (!lineUsd && calc > 0 && stored > 0 && stored < calc * 0.25) return calc;
  return stored;
}

function esLineaUsd(p: LineaVenta): boolean {
  return (p.moneda || "").toUpperCase() === "USD";
}

/**
 * Total del comprobante: priorizar totalARS / totalUSD del documento (como en el admin).
 * Evita mostrar montos en ARS con prefijo US$ cuando el doc tiene moneda USD pero el total es pesos.
 */
function totalVentaResumen(v: VentaCliente): string {
  const ars = Number(v.totalARS ?? 0);
  const usd = Number(v.totalUSD ?? 0);
  const parts: string[] = [];
  if (ars > 0) parts.push(`$${ars.toLocaleString("es-AR")} ARS`);
  if (usd > 0) parts.push(`US$${usd.toLocaleString("en-US")}`);
  if (parts.length > 0) return parts.join(" · ");

  const total = Number(v.total ?? 0);
  if (total <= 0) return "—";

  const docUsd = (v.moneda || "").toUpperCase() === "USD";
  const first = v.productos[0];
  const unit = Number(first?.precioUnitario ?? 0);
  const qty = Number(first?.cantidad ?? 1);
  const calcFirst = unit * qty;
  const lineUsd = first && esLineaUsd(first);

  if (docUsd && lineUsd && calcFirst > 0 && total > calcFirst * 4) {
    return `$${total.toLocaleString("es-AR")} ARS`;
  }
  if (docUsd) return `US$${total.toLocaleString("en-US")}`;
  return `$${total.toLocaleString("es-AR")} ARS`;
}

function slicePagina<T>(items: T[], pagina: number): T[] {
  const start = (pagina - 1) * ITEMS_POR_PAGINA;
  return items.slice(start, start + ITEMS_POR_PAGINA);
}

function rangoLabel(pagina: number, total: number | null, enPagina: number): string | null {
  if (total == null) return null;
  if (total === 0) return "Sin registros";
  const desde = (pagina - 1) * ITEMS_POR_PAGINA + 1;
  const hasta = Math.min(pagina * ITEMS_POR_PAGINA, total);
  return `Mostrando ${desde}–${hasta} de ${total}`;
}

function esErrorIndice(e: unknown): boolean {
  const msg = String((e as Error)?.message || e);
  return msg.includes("index") || msg.includes("Index");
}

export default function Cliente() {
  const [user, loadingAuth] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [nombreClienteCanon, setNombreClienteCanon] = useState("");

  const [ventasRows, setVentasRows] = useState<VentaCliente[]>([]);
  const [ventasUltimoDoc, setVentasUltimoDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [ventasPagina, setVentasPagina] = useState(1);
  const [ventasTotal, setVentasTotal] = useState<number | null>(null);
  const [ventasHayMas, setVentasHayMas] = useState(true);
  const [cargandoVentas, setCargandoVentas] = useState(false);
  const [errorVentas, setErrorVentas] = useState<string | null>(null);
  const [expandedVentaId, setExpandedVentaId] = useState<string | null>(null);

  const [pendRows, setPendRows] = useState<TrabajoCliente[]>([]);
  const [pendUltimoDoc, setPendUltimoDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [pendPagina, setPendPagina] = useState(1);
  const [pendTotal, setPendTotal] = useState<number | null>(null);
  const [pendHayMas, setPendHayMas] = useState(true);
  const [cargandoPend, setCargandoPend] = useState(false);
  const [errorPend, setErrorPend] = useState<string | null>(null);

  const [histRows, setHistRows] = useState<TrabajoCliente[]>([]);
  const [histUltimoDoc, setHistUltimoDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [histPagina, setHistPagina] = useState(1);
  const [histTotal, setHistTotal] = useState<number | null>(null);
  const [histHayMas, setHistHayMas] = useState(true);
  const [cargandoHist, setCargandoHist] = useState(false);
  const [errorHist, setErrorHist] = useState<string | null>(null);

  const [busquedaTrabajos, setBusquedaTrabajos] = useState("");
  const [debouncedBusqueda, setDebouncedBusqueda] = useState("");
  const [busqPendFull, setBusqPendFull] = useState<TrabajoCliente[]>([]);
  const [busqHistFull, setBusqHistFull] = useState<TrabajoCliente[]>([]);
  const [busqPendPagina, setBusqPendPagina] = useState(1);
  const [busqHistPagina, setBusqHistPagina] = useState(1);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [verPagos, setVerPagos] = useState(false);
  const [saldoCliente, setSaldoCliente] = useState<{ ars: number; usd: number } | null>(null);
  const [nombreMostrar, setNombreMostrar] = useState("");
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  // ==========================================
  // Precarga de trabajo (cliente -> taller)
  // ==========================================
  const [modalPrecargaAbierto, setModalPrecargaAbierto] = useState(false);
  const [precargaModelo, setPrecargaModelo] = useState("");
  const [precargaColor, setPrecargaColor] = useState("");
  const [precargaImei, setPrecargaImei] = useState("");
  const [precargaTrabajo, setPrecargaTrabajo] = useState("");
  const [precargaAccesorios, setPrecargaAccesorios] = useState("");
  const [precargaObservaciones, setPrecargaObservaciones] = useState("");
  const [precargaGuardando, setPrecargaGuardando] = useState(false);
  const [mensajeApp, setMensajeApp] = useState<{
    tipo: "ok" | "error" | "aviso";
    texto: string;
  } | null>(null);

  const [checkData, setCheckData] = useState({
    imeiEstado: "",
    pantalla: "",
    camaras: "",
    microfonos: "",
    cargaCable: "",
    cargaInalambrica: "",
    tapaTrasera: "",
  });

  const modoBusqueda = debouncedBusqueda.trim().length >= 1;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedBusqueda(busquedaTrabajos), 320);
    return () => clearTimeout(t);
  }, [busquedaTrabajos]);

  useEffect(() => {
    if (!mensajeApp) return;
    const id = window.setTimeout(() => setMensajeApp(null), 5000);
    return () => window.clearTimeout(id);
  }, [mensajeApp]);

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.replace("/login");
    }
  }, [user, loadingAuth, router]);

  useEffect(() => {
    const boot = async () => {
      if (!user) return;
      setCargando(true);
      try {
        const docSnap = await getDoc(doc(db, "usuarios", user.uid));
        if (!docSnap.exists()) return;

        const data = docSnap.data();
        if (data.rol !== "cliente") {
          router.replace("/");
          return;
        }

        const nid = data.negocioID as string;
        const nombreUsuario = String(data.nombre || "");
        if (!nid || !nombreUsuario) return;

        const nombreCanon = await resolverNombreCliente(nid, nombreUsuario);
        setNegocioID(nid);
        setNombreClienteCanon(nombreCanon);
        setNombreMostrar(nombreCanon);

        const clientesSnap = await getDocs(collection(db, `negocios/${nid}/clientes`));
        const clienteDoc = clientesSnap.docs.find(
          (d) =>
            normalizarNombre(String(d.data()?.nombre || "")) === normalizarNombre(nombreCanon)
        );
        if (clienteDoc) {
          const c = clienteDoc.data();
          setSaldoCliente({
            ars: Number(c.saldoARS ?? 0),
            usd: Number(c.saldoUSD ?? 0),
          });
        } else {
          setSaldoCliente(null);
        }

        const pagosSnap = await getDocs(
          query(collection(db, `negocios/${nid}/pagos`), where("cliente", "==", nombreCanon))
        );
        const listaPagos = pagosSnap.docs.map((d) => d.data() as Pago);
        listaPagos.sort((a, b) => ordenPagoMillis(b) - ordenPagoMillis(a));
        setPagos(listaPagos);
      } catch (e) {
        console.error("Cliente portal:", e);
      } finally {
        setCargando(false);
      }
    };

    if (!loadingAuth && user) {
      boot();
    }
  }, [user, loadingAuth, router]);

  const colTrabajosRef = useMemo(() => {
    if (!negocioID || !nombreClienteCanon) return null;
    return collection(db, `negocios/${negocioID}/trabajos`);
  }, [negocioID, nombreClienteCanon]);

  const colVentasRef = useMemo(() => {
    if (!negocioID || !nombreClienteCanon) return null;
    return collection(db, `negocios/${negocioID}/ventasGeneral`);
  }, [negocioID, nombreClienteCanon]);

  const cargarVentasPagina = useCallback(
    async (opts: { reiniciar: boolean }) => {
      if (!colVentasRef || !nombreClienteCanon) return;
      setCargandoVentas(true);
      setErrorVentas(null);
      try {
        const base = [
          where("cliente", "==", nombreClienteCanon),
          orderBy("timestamp", "desc"),
          limit(ITEMS_POR_PAGINA),
        ];
        const q =
          opts.reiniciar || !ventasUltimoDoc
            ? query(colVentasRef, ...base)
            : query(colVentasRef, ...base, startAfter(ventasUltimoDoc));

        const snap = await getDocs(q);
        if (!opts.reiniciar && snap.empty) {
          setVentasHayMas(false);
          return;
        }

        const rows = snap.docs.map(mapDocAVenta);

        if (opts.reiniciar) {
          setVentasPagina(1);
          setVentasRows(rows);
          setVentasUltimoDoc(snap.docs[snap.docs.length - 1] ?? null);
          setVentasHayMas(snap.docs.length === ITEMS_POR_PAGINA);
          try {
            const c = await getCountFromServer(
              query(colVentasRef, where("cliente", "==", nombreClienteCanon))
            );
            setVentasTotal(c.data().count);
          } catch {
            setVentasTotal(null);
          }
        } else {
          setVentasRows(rows);
          setVentasUltimoDoc(snap.docs[snap.docs.length - 1] ?? null);
          setVentasHayMas(snap.docs.length === ITEMS_POR_PAGINA);
          setVentasPagina((p) => p + 1);
        }
      } catch (e: unknown) {
        console.error(e);
        setErrorVentas(
          esErrorIndice(e)
            ? "Falta índice en Firestore para ventas (cliente + timestamp descendente). Revisá la consola para el enlace de creación."
            : String((e as Error)?.message || e)
        );
        setVentasRows([]);
      } finally {
        setCargandoVentas(false);
      }
    },
    [colVentasRef, nombreClienteCanon, ventasUltimoDoc]
  );

  const cargarPendientesPagina = useCallback(
    async (opts: { reiniciar: boolean }) => {
      if (!colTrabajosRef || !nombreClienteCanon) return;
      setCargandoPend(true);
      setErrorPend(null);
      try {
        const base = [
          where("cliente", "==", nombreClienteCanon),
          where("estado", "in", [...ESTADOS_PENDIENTES]),
          orderBy("creadoEn", "desc"),
          limit(ITEMS_POR_PAGINA),
        ];
        const q =
          opts.reiniciar || !pendUltimoDoc
            ? query(colTrabajosRef, ...base)
            : query(colTrabajosRef, ...base, startAfter(pendUltimoDoc));

        const snap = await getDocs(q);
        if (!opts.reiniciar && snap.empty) {
          setPendHayMas(false);
          return;
        }

        const rows = snap.docs.map(mapDocATrabajo);

        if (opts.reiniciar) {
          setPendPagina(1);
          setPendRows(rows);
          setPendUltimoDoc(snap.docs[snap.docs.length - 1] ?? null);
          setPendHayMas(snap.docs.length === ITEMS_POR_PAGINA);
          try {
            const c = await getCountFromServer(
              query(colTrabajosRef, where("cliente", "==", nombreClienteCanon), where("estado", "in", [...ESTADOS_PENDIENTES]))
            );
            setPendTotal(c.data().count);
          } catch {
            setPendTotal(null);
          }
        } else {
          setPendRows(rows);
          setPendUltimoDoc(snap.docs[snap.docs.length - 1] ?? null);
          setPendHayMas(snap.docs.length === ITEMS_POR_PAGINA);
          setPendPagina((p) => p + 1);
        }
      } catch (e: unknown) {
        console.error(e);
        setErrorPend(
          esErrorIndice(e)
            ? "Falta índice para trabajos pendientes (cliente + estado + creadoEn). Revisá la consola."
            : String((e as Error)?.message || e)
        );
        setPendRows([]);
      } finally {
        setCargandoPend(false);
      }
    },
    [colTrabajosRef, nombreClienteCanon, pendUltimoDoc]
  );

  const cargarHistorialPagina = useCallback(
    async (opts: { reiniciar: boolean }) => {
      if (!colTrabajosRef || !nombreClienteCanon) return;
      setCargandoHist(true);
      setErrorHist(null);
      try {
        const base = [
          where("cliente", "==", nombreClienteCanon),
          where("estado", "in", [...ESTADOS_HISTORIAL]),
          orderBy("creadoEn", "desc"),
          limit(ITEMS_POR_PAGINA),
        ];
        const q =
          opts.reiniciar || !histUltimoDoc
            ? query(colTrabajosRef, ...base)
            : query(colTrabajosRef, ...base, startAfter(histUltimoDoc));

        const snap = await getDocs(q);
        if (!opts.reiniciar && snap.empty) {
          setHistHayMas(false);
          return;
        }

        const rows = snap.docs.map(mapDocATrabajo);

        if (opts.reiniciar) {
          setHistPagina(1);
          setHistRows(rows);
          setHistUltimoDoc(snap.docs[snap.docs.length - 1] ?? null);
          setHistHayMas(snap.docs.length === ITEMS_POR_PAGINA);
          try {
            const c = await getCountFromServer(
              query(colTrabajosRef, where("cliente", "==", nombreClienteCanon), where("estado", "in", [...ESTADOS_HISTORIAL]))
            );
            setHistTotal(c.data().count);
          } catch {
            setHistTotal(null);
          }
        } else {
          setHistRows(rows);
          setHistUltimoDoc(snap.docs[snap.docs.length - 1] ?? null);
          setHistHayMas(snap.docs.length === ITEMS_POR_PAGINA);
          setHistPagina((p) => p + 1);
        }
      } catch (e: unknown) {
        console.error(e);
        setErrorHist(
          esErrorIndice(e)
            ? "Falta índice para historial (cliente + estado + creadoEn). Revisá la consola."
            : String((e as Error)?.message || e)
        );
        setHistRows([]);
      } finally {
        setCargandoHist(false);
      }
    },
    [colTrabajosRef, nombreClienteCanon, histUltimoDoc]
  );

  useEffect(() => {
    if (!colVentasRef || !colTrabajosRef || !nombreClienteCanon || modoBusqueda) return;
    cargarVentasPagina({ reiniciar: true });
    cargarPendientesPagina({ reiniciar: true });
    cargarHistorialPagina({ reiniciar: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colVentasRef, colTrabajosRef, nombreClienteCanon, modoBusqueda]);

  useEffect(() => {
    const run = async () => {
      if (!colTrabajosRef || !nombreClienteCanon || !modoBusqueda) {
        setBusqPendFull([]);
        setBusqHistFull([]);
        return;
      }
      setCargandoBusqueda(true);
      try {
        const snap = await getDocs(query(colTrabajosRef, where("cliente", "==", nombreClienteCanon)));
        const all = snap.docs.map(mapDocATrabajo);
        const filtrados = all.filter((t) => trabajoCoincideBusqueda(t, debouncedBusqueda));
        filtrados.sort((a, b) => ordenTrabajoReciente(a, b));
        setBusqPendFull(filtrados.filter((t) => (ESTADOS_PENDIENTES as readonly string[]).includes(t.estado)));
        setBusqHistFull(filtrados.filter((t) => (ESTADOS_HISTORIAL as readonly string[]).includes(t.estado)));
        setBusqPendPagina(1);
        setBusqHistPagina(1);
      } catch (e) {
        console.error(e);
        setBusqPendFull([]);
        setBusqHistFull([]);
      } finally {
        setCargandoBusqueda(false);
      }
    };
    run();
  }, [colTrabajosRef, nombreClienteCanon, modoBusqueda, debouncedBusqueda]);

  const cerrarSesion = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const reiniciarBusqueda = () => {
    setBusquedaTrabajos("");
    setDebouncedBusqueda("");
    setBusqPendFull([]);
    setBusqHistFull([]);
  };

  const pendientesMostrar = modoBusqueda ? slicePagina(busqPendFull, busqPendPagina) : pendRows;
  const historialMostrar = modoBusqueda ? slicePagina(busqHistFull, busqHistPagina) : histRows;

  const pendTotalBusq = busqPendFull.length;
  const histTotalBusq = busqHistFull.length;
  const pendHayMasBusq = busqPendPagina * ITEMS_POR_PAGINA < pendTotalBusq;
  const histHayMasBusq = busqHistPagina * ITEMS_POR_PAGINA < histTotalBusq;

  if (loadingAuth || (user && cargando)) {
    return (
      <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Cargando tu cuenta...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 antialiased [color-scheme:light]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="GestiOne" className="h-10 object-contain sm:h-11" />
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Portal cliente</p>
              {nombreMostrar && (
                <p className="text-sm font-semibold text-slate-800">
                  Hola, <span className="text-blue-700">{nombreMostrar}</span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={cerrarSesion}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Tu panel</h2>
            <p className="text-xs text-slate-500">
              Si querés, podés enviar la precarga del equipo antes de llevarlo al local.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalPrecargaAbierto(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            📲 Enviar teléfono
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo cuenta corriente</h2>
            {saldoCliente !== null ? (
              <div className="mt-3">
                <p className="text-3xl font-bold tracking-tight text-slate-900">
                  ${Math.abs(saldoCliente.ars).toLocaleString("es-AR")}{" "}
                  <span className="text-lg font-medium text-slate-500">ARS</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {saldoCliente.ars > 0 && (
                    <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-100">
                      Debe
                    </span>
                  )}
                  {saldoCliente.ars < 0 && (
                    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
                      A favor
                    </span>
                  )}
                  {saldoCliente.ars === 0 && (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                      Al día (ARS)
                    </span>
                  )}
                </div>
                {saldoCliente.usd !== 0 && (
                  <p className="mt-3 text-lg font-semibold text-slate-800">
                    US${Math.abs(saldoCliente.usd).toLocaleString("en-US")}{" "}
                    <span className="text-sm font-normal text-slate-500">USD</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                No encontramos tu ficha en clientes. Avisá al taller para alinear el nombre con tu usuario.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
            <p className="text-sm leading-relaxed text-emerald-950/80">
              <strong>1 · Ventas</strong>, <strong>2 · Trabajos pendientes</strong> y{" "}
              <strong>3 · Entregados / pagados</strong> tienen paginación propia ({ITEMS_POR_PAGINA} por página). El
              buscador aplica solo a trabajos.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <button
            type="button"
            onClick={() => setVerPagos(!verPagos)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            {verPagos ? "Ocultar pagos realizados" : "Mostrar pagos realizados"}
          </button>
        </div>

        {verPagos && (
          <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-slate-800">Pagos realizados</h3>
            {pagos.length === 0 ? (
              <p className="text-sm text-slate-500">No hay pagos registrados.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {pagos.map((p, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-baseline gap-x-2 border-b border-slate-100 pb-2 last:border-0"
                  >
                    <span className="font-medium text-slate-500">{formatearFechaPago(p)}</span>
                    {p.monto != null && p.monto !== 0 && (
                      <span className="text-slate-900">${Number(p.monto).toLocaleString("es-AR")} ARS</span>
                    )}
                    {p.montoUSD != null && p.montoUSD !== 0 && (
                      <span className="text-slate-900">US${Number(p.montoUSD).toLocaleString("en-US")}</span>
                    )}
                    <span className="text-slate-600">
                      {p.forma ? `(${p.forma})` : ""} {p.destino ? `→ ${p.destino}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* 1 · Ventas */}
        <section className="mb-10 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
          <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-white px-5 py-4">
            <h3 className="text-lg font-bold text-indigo-950">1 · Ventas</h3>
            <p className="text-sm text-indigo-900/70">Detalle de productos por venta</p>
          </div>

          <div className="border-b border-slate-100 px-5 py-4 bg-slate-50/80">
            <PaginacionSector
              etiqueta={rangoLabel(ventasPagina, ventasTotal, ventasRows.length)}
              pagina={ventasPagina}
              hayMas={ventasHayMas}
              cargando={cargandoVentas}
              onPrimera={() => cargarVentasPagina({ reiniciar: true })}
              onSiguiente={() => cargarVentasPagina({ reiniciar: false })}
              deshabilitarPrimera={ventasPagina <= 1 || cargandoVentas}
              deshabilitarSiguiente={!ventasHayMas || cargandoVentas || !ventasUltimoDoc}
            />
            {errorVentas && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{errorVentas}</p>
            )}
          </div>

          {ventasRows.length === 0 && !cargandoVentas ? (
            <p className="p-6 text-sm text-slate-500">No hay ventas a tu nombre en esta página.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {ventasRows.map((v) => {
                const abierto = expandedVentaId === v.id;
                return (
                  <div key={v.id} className="px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900">{v.fecha || "—"}</span>
                          {v.nroVenta != null && v.nroVenta !== "" && (
                            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-900">
                              #{v.nroVenta}
                            </span>
                          )}
                          <span className="capitalize text-sm text-slate-600">{v.tipo || "—"}</span>
                          <span className="capitalize text-sm text-slate-500">{v.estado || "—"}</span>
                        </div>
                        <p className="mt-1 text-lg font-bold text-slate-900">{totalVentaResumen(v)}</p>
                        {v.observaciones ? (
                          <p className="mt-1 max-w-xl text-xs text-slate-500">{v.observaciones}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedVentaId(abierto ? null : v.id)}
                        className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-50"
                      >
                        {abierto ? "Ocultar detalle" : "Ver detalle"}
                      </button>
                    </div>

                    {abierto && (
                      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50">
                        {v.productos.length === 0 ? (
                          <p className="p-4 text-sm text-slate-500">Sin líneas de producto en el registro.</p>
                        ) : (
                          <table className="w-full min-w-[560px] text-left text-sm">
                            <thead className="border-b border-slate-200 bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-3 py-2">Tipo</th>
                                <th className="px-3 py-2">Producto</th>
                                <th className="px-3 py-2">Marca</th>
                                <th className="px-3 py-2">Modelo</th>
                                <th className="px-3 py-2">Color</th>
                                <th className="px-3 py-2 text-center">Cant.</th>
                                <th className="px-3 py-2">P. unit.</th>
                                <th className="px-3 py-2">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {v.productos.map((p, idx) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2 text-slate-600">{p.categoria || "—"}</td>
                                  <td className="px-3 py-2 font-medium text-slate-900">
                                    {p.producto || p.descripcion || "—"}
                                  </td>
                                  <td className="px-3 py-2 text-slate-600">{p.marca || "—"}</td>
                                  <td className="px-3 py-2 text-slate-600">{p.modelo || "—"}</td>
                                  <td className="px-3 py-2 text-slate-600">{p.color || "—"}</td>
                                  <td className="px-3 py-2 text-center font-medium">{p.cantidad ?? 1}</td>
                                  <td className="px-3 py-2 text-slate-700">
                                    {formatoMonto(Number(p.precioUnitario ?? 0), esLineaUsd(p))}
                                  </td>
                                  <td className="px-3 py-2 font-semibold text-emerald-800">
                                    {formatoMonto(subtotalLinea(p), esLineaUsd(p))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Buscador trabajos */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label htmlFor="buscar-trabajo" className="block text-sm font-semibold text-slate-800">
            Buscar en trabajos (pendientes e historial)
          </label>
          <p className="mt-0.5 text-xs text-slate-500">Modelo, descripción del trabajo o IMEI</p>
          <div className="relative mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                id="buscar-trabajo"
                type="search"
                autoComplete="off"
                placeholder="Ej: iphone 13, pantalla, 353…"
                value={busquedaTrabajos}
                onChange={(e) => setBusquedaTrabajos(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            {modoBusqueda && (
              <button
                type="button"
                onClick={reiniciarBusqueda}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Quitar búsqueda
              </button>
            )}
          </div>
          {modoBusqueda && cargandoBusqueda && (
            <p className="mt-3 text-sm text-slate-500">Buscando…</p>
          )}
        </section>

        {/* 2 · Pendientes */}
        <div className="mb-10">
          <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50/80 px-5 py-3">
            <h3 className="text-lg font-bold text-amber-950">2 · Trabajos pendientes</h3>
            <p className="text-sm text-amber-900/75">
              En taller, pendientes de reparación o esperando aceptación
            </p>
          </div>
          <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <PaginacionSector
              etiqueta={
                modoBusqueda
                  ? rangoLabel(busqPendPagina, pendTotalBusq, pendientesMostrar.length)
                  : rangoLabel(pendPagina, pendTotal, pendientesMostrar.length)
              }
              pagina={modoBusqueda ? busqPendPagina : pendPagina}
              hayMas={modoBusqueda ? pendHayMasBusq : pendHayMas}
              cargando={modoBusqueda ? cargandoBusqueda : cargandoPend}
              onPrimera={() => {
                if (modoBusqueda) setBusqPendPagina(1);
                else cargarPendientesPagina({ reiniciar: true });
              }}
              onSiguiente={() => {
                if (modoBusqueda) setBusqPendPagina((p) => p + 1);
                else cargarPendientesPagina({ reiniciar: false });
              }}
              deshabilitarPrimera={
                modoBusqueda ? busqPendPagina <= 1 || cargandoBusqueda : pendPagina <= 1 || cargandoPend
              }
              deshabilitarSiguiente={
                modoBusqueda
                  ? !pendHayMasBusq || cargandoBusqueda
                  : !pendHayMas || cargandoPend || !pendUltimoDoc
              }
            />
            {errorPend && !modoBusqueda && (
              <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{errorPend}</p>
            )}
          </div>
          <TablaTrabajosCliente
            titulo=""
            subtitulo=""
            accent="amber"
            sinHeader
            columnas={["Fecha", "Modelo", "Trabajo", "IMEI", "Precio", "Estado"]}
            filas={pendientesMostrar}
            cols={6}
            extraCol={(t) => (
              <>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{t.imei || "—"}</td>
                <td className="px-4 py-3 text-slate-800">
                  {t.moneda === "USD" ? "US$" : "$"}
                  {t.precio ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                    {t.estado}
                  </span>
                </td>
              </>
            )}
          />
        </div>

        {/* 3 · Entregados + pagados */}
        <div className="mb-10">
          <div className="mb-3 rounded-xl border border-violet-100 bg-violet-50/80 px-5 py-3">
            <h3 className="text-lg font-bold text-violet-950">3 · Trabajos entregados y pagados</h3>
            <p className="text-sm text-violet-900/75">Un solo listado con el estado de cada uno</p>
          </div>
          <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <PaginacionSector
              etiqueta={
                modoBusqueda
                  ? rangoLabel(busqHistPagina, histTotalBusq, historialMostrar.length)
                  : rangoLabel(histPagina, histTotal, historialMostrar.length)
              }
              pagina={modoBusqueda ? busqHistPagina : histPagina}
              hayMas={modoBusqueda ? histHayMasBusq : histHayMas}
              cargando={modoBusqueda ? cargandoBusqueda : cargandoHist}
              onPrimera={() => {
                if (modoBusqueda) setBusqHistPagina(1);
                else cargarHistorialPagina({ reiniciar: true });
              }}
              onSiguiente={() => {
                if (modoBusqueda) setBusqHistPagina((p) => p + 1);
                else cargarHistorialPagina({ reiniciar: false });
              }}
              deshabilitarPrimera={
                modoBusqueda ? busqHistPagina <= 1 || cargandoBusqueda : histPagina <= 1 || cargandoHist
              }
              deshabilitarSiguiente={
                modoBusqueda
                  ? !histHayMasBusq || cargandoBusqueda
                  : !histHayMas || cargandoHist || !histUltimoDoc
              }
            />
            {errorHist && !modoBusqueda && (
              <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{errorHist}</p>
            )}
          </div>
          <TablaTrabajosCliente
            titulo=""
            subtitulo=""
            accent="violet"
            sinHeader
            columnas={["Fecha ingreso", "Modelo", "Trabajo", "IMEI", "Precio", "Estado", "Fecha entrega"]}
            filas={historialMostrar}
            cols={7}
            extraCol={(t) => (
              <>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{t.imei || "—"}</td>
                <td className="px-4 py-3 text-slate-800">
                  {t.moneda === "USD" ? "US$" : "$"}
                  {t.precio ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      t.estado === "PAGADO"
                        ? "bg-sky-100 text-sky-900"
                        : "bg-emerald-100 text-emerald-900"
                    }`}
                  >
                    {t.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{t.fechaEntrega || "—"}</td>
              </>
            )}
          />
        </div>
      </main>

      {/* Modal precarga */}
      {modalPrecargaAbierto && (
        <div className="fixed inset-0 z-[999999] bg-black/40 backdrop-blur-sm flex items-start justify-center px-4 pt-24 pb-6">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[calc(100vh-7rem)] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">Enviar teléfono (precarga)</h3>
                  <p className="text-white/90 text-sm">
                    Se crea como <strong>PENDIENTE ACEPTACION</strong> hasta que el taller lo confirme.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalPrecargaAbierto(false)}
                  className="text-white/90 hover:text-white p-2 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 bg-slate-50 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Modelo</label>
                  <input
                    value={precargaModelo}
                    onChange={(e) => setPrecargaModelo(e.target.value)}
                    placeholder="Ej: iPhone 13 128GB"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Color (opcional)</label>
                  <input
                    value={precargaColor}
                    onChange={(e) => setPrecargaColor(e.target.value)}
                    placeholder="Ej: Negro"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">IMEI (opcional)</label>
                  <input
                    value={precargaImei}
                    onChange={(e) => setPrecargaImei(e.target.value)}
                    placeholder="Ej: 123456789012345"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Accesorios (opcional)</label>
                  <input
                    value={precargaAccesorios}
                    onChange={(e) => setPrecargaAccesorios(e.target.value)}
                    placeholder="Ej: funda, cargador, cable…"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Trabajo / falla</label>
                <textarea
                  value={precargaTrabajo}
                  onChange={(e) => setPrecargaTrabajo(e.target.value)}
                  placeholder="Ej: no carga / pantalla rota / cambio de batería…"
                  className="w-full min-h-[90px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones (opcional)</label>
                <textarea
                  value={precargaObservaciones}
                  onChange={(e) => setPrecargaObservaciones(e.target.value)}
                  placeholder="Ej: tiene golpe en esquina / sin tapa / etc."
                  className="w-full min-h-[70px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Check-in (opcional)</p>
                    <p className="text-xs text-slate-500">
                      Si querés, completá un check rápido del equipo.
                    </p>
                  </div>
                </div>
                <CheckInForm checkData={checkData} setCheckData={setCheckData} />
              </div>

              <div className="flex gap-3 justify-end flex-wrap pt-2">
                <button
                  type="button"
                  onClick={() => setModalPrecargaAbierto(false)}
                  className="px-4 py-2.5 rounded-xl font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  disabled={precargaGuardando}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!negocioID || !nombreClienteCanon) return;
                    const modelo = precargaModelo.trim();
                    const trabajo = precargaTrabajo.trim();
                    if (!modelo) {
                      setMensajeApp({ tipo: "aviso", texto: "Completá el modelo del equipo." });
                      return;
                    }
                    if (!trabajo) {
                      setMensajeApp({
                        tipo: "aviso",
                        texto: "Completá la falla o el trabajo a realizar.",
                      });
                      return;
                    }

                    setPrecargaGuardando(true);
                    try {
                      const hoy = new Date().toLocaleDateString("es-AR");
                      const checkIn = {
                        ...(checkData as any),
                        color: precargaColor.trim() || null,
                      };
                      await addDoc(collection(db, `negocios/${negocioID}/trabajos`), {
                        fecha: hoy,
                        cliente: nombreClienteCanon,
                        modelo,
                        color: precargaColor.trim() || "",
                        trabajo,
                        observaciones: precargaObservaciones.trim() || "",
                        accesorios: precargaAccesorios.trim() || "",
                        clave: "",
                        imei: precargaImei.trim() || "",
                        precio: 0,
                        anticipo: 0,
                        saldo: 0,
                        moneda: "ARS",
                        estado: "PENDIENTE ACEPTACION",
                        precarga: true,
                        precargaCreadaPorUid: user?.uid || null,
                        checkIn,
                        creadoEn: serverTimestamp(),
                      });

                      setModalPrecargaAbierto(false);
                      setPrecargaModelo("");
                      setPrecargaColor("");
                      setPrecargaImei("");
                      setPrecargaTrabajo("");
                      setPrecargaAccesorios("");
                      setPrecargaObservaciones("");
                      setCheckData({
                        imeiEstado: "",
                        pantalla: "",
                        camaras: "",
                        microfonos: "",
                        cargaCable: "",
                        cargaInalambrica: "",
                        tapaTrasera: "",
                      });
                      setMensajeApp({
                        tipo: "ok",
                        texto:
                          "Enviado correctamente. El taller lo revisará y lo aceptará cuando corresponda.",
                      });
                      await cargarPendientesPagina({ reiniciar: true });
                    } catch (e: any) {
                      console.error(e);
                      setMensajeApp({
                        tipo: "error",
                        texto:
                          e?.message ||
                          "No se pudo enviar. Revisá tu conexión e intentá de nuevo.",
                      });
                    } finally {
                      setPrecargaGuardando(false);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={precargaGuardando}
                >
                  {precargaGuardando ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mensajeApp && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-[1000000] w-[min(100%-1.5rem,22rem)] -translate-x-1/2 sm:w-[min(100%-2rem,26rem)]"
        >
          <div
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-2xl ring-1 ring-black/5 ${
              mensajeApp.tipo === "ok"
                ? "border-emerald-200/90 bg-white text-emerald-950"
                : mensajeApp.tipo === "error"
                  ? "border-red-200/90 bg-white text-red-950"
                  : "border-amber-200/90 bg-white text-amber-950"
            }`}
          >
            <span className="mt-0.5 text-lg leading-none" aria-hidden>
              {mensajeApp.tipo === "ok"
                ? "✓"
                : mensajeApp.tipo === "error"
                  ? "⚠"
                  : "!"}
            </span>
            <p className="flex-1 text-sm font-semibold leading-snug">{mensajeApp.texto}</p>
            <button
              type="button"
              onClick={() => setMensajeApp(null)}
              className="-m-1 shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PaginacionSector(props: {
  etiqueta: string | null;
  pagina: number;
  hayMas: boolean;
  cargando: boolean;
  onPrimera: () => void;
  onSiguiente: () => void;
  deshabilitarPrimera: boolean;
  deshabilitarSiguiente: boolean;
}) {
  const {
    etiqueta,
    pagina,
    hayMas,
    cargando,
    onPrimera,
    onSiguiente,
    deshabilitarPrimera,
    deshabilitarSiguiente,
  } = props;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      {etiqueta && <p className="text-sm font-medium text-slate-600">{etiqueta}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={deshabilitarPrimera}
          onClick={onPrimera}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
        >
          Primera página
        </button>
        <button
          type="button"
          disabled={deshabilitarSiguiente}
          onClick={onSiguiente}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-40 hover:bg-indigo-700"
        >
          {cargando ? "Cargando…" : `Siguientes ${ITEMS_POR_PAGINA}`}
        </button>
        <span className="text-xs text-slate-500">Página {pagina}</span>
      </div>
    </div>
  );
}

function TablaTrabajosCliente(props: {
  titulo: string;
  subtitulo: string;
  accent: "amber" | "emerald" | "sky" | "violet";
  sinHeader?: boolean;
  columnas: string[];
  filas: TrabajoCliente[];
  cols: number;
  extraCol: (t: TrabajoCliente) => ReactNode;
}) {
  const { titulo, subtitulo, accent, sinHeader, columnas, filas, cols, extraCol } = props;
  const ring =
    accent === "amber"
      ? "border-amber-100"
      : accent === "emerald"
        ? "border-emerald-100"
        : accent === "violet"
          ? "border-violet-100"
          : "border-sky-100";

  return (
    <div className={`overflow-hidden rounded-2xl border ${ring} bg-white shadow-sm`}>
      {!sinHeader && (
        <div className={`border-b ${ring} px-5 py-3 bg-slate-50`}>
          <h3 className="text-lg font-bold text-slate-900">{titulo}</h3>
          <p className="text-sm text-slate-600">{subtitulo}</p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {columnas.map((c) => (
                <th key={c} className="px-4 py-3">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.length === 0 ? (
              <tr>
                <td colSpan={cols} className="px-4 py-10 text-center text-slate-500">
                  No hay ítems en esta sección.
                </td>
              </tr>
            ) : (
              filas.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{t.fecha}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{t.modelo}</td>
                  <td className="max-w-[220px] px-4 py-3 text-slate-700">{t.trabajo}</td>
                  {extraCol(t)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
