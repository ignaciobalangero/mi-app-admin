export type LineaReciboCompra = {
  nombre: string;
  imei?: string;
  precio: number;
  moneda: string;
};

export type PagoReciboCompra = {
  fecha?: string;
  forma?: string;
  monto?: number;
  montoUSD?: number;
  moneda?: string;
  observaciones?: string;
};

export type ReciboCompraDatos = {
  fecha: string;
  cliente: string;
  dni?: string;
  telefonoCliente?: string;
  domicilioCliente?: string;
  lineas: LineaReciboCompra[];
  partePago: LineaReciboCompra[];
  pagos?: PagoReciboCompra[];
  negocio: {
    nombre?: string;
    logoUrl?: string;
    domicilioComercial?: string;
    telefonoEmpresarial?: string;
    fechaInicioActividad?: string;
    leyendaComprobante?: string;
    textoConformidad?: string;
    textoGarantia?: string;
  };
};

const CONFORMIDAD_DEFAULT =
  "El cliente declara haber recibido el equipo a su entera satisfacción.";

const LEYENDA_DEFAULT = "Documento interno — no válido como factura";

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMonto(n: number): string {
  const v = Number(n) || 0;
  const entero = Math.abs(v - Math.round(v)) < 0.001;
  return entero
    ? Math.round(v).toLocaleString("es-AR")
    : v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function precioCelda(linea: LineaReciboCompra): string {
  const moneda = String(linea.moneda || "USD").toUpperCase();
  return `${moneda} ${fmtMonto(linea.precio)}`;
}

function filasProductos(lineas: LineaReciboCompra[], vaciaSiNoHay: boolean): string {
  if (!lineas.length) {
    if (!vaciaSiNoHay) return "";
    return `<tr><td class="prod">&nbsp;</td><td class="imei"></td><td class="precio"></td></tr>`;
  }
  return lineas
    .map(
      (l) => `<tr>
        <td class="prod">${esc(l.nombre || "")}</td>
        <td class="imei">${esc(l.imei || "")}</td>
        <td class="precio">${esc(precioCelda(l))}</td>
      </tr>`
    )
    .join("");
}

function textoTotal(lineas: LineaReciboCompra[]): string {
  const porMoneda = new Map<string, number>();
  for (const l of lineas) {
    const moneda = String(l.moneda || "USD").toUpperCase();
    porMoneda.set(moneda, (porMoneda.get(moneda) || 0) + (Number(l.precio) || 0));
  }
  if (porMoneda.size === 0) return "Importe Total: —";
  const partes = Array.from(porMoneda.entries()).map(([m, n]) => `${m} ${fmtMonto(n)}`);
  return `Importe Total: ${partes.join(" + ")}`;
}

function importePago(p: PagoReciboCompra): string {
  const partes: string[] = [];
  if (Number(p.montoUSD) > 0) partes.push(`USD ${fmtMonto(Number(p.montoUSD))}`);
  if (Number(p.monto) > 0) partes.push(`ARS ${fmtMonto(Number(p.monto))}`);
  if (partes.length) return partes.join(" + ");
  const moneda = String(p.moneda || "").toUpperCase();
  return moneda || "—";
}

function bloquePagos(pagos: PagoReciboCompra[]): string {
  if (!pagos.length) return "";
  const filas = pagos
    .map((p) => {
      const forma = [p.forma, p.observaciones].filter((s) => String(s || "").trim()).join(" — ");
      return `<tr>
        <td class="fecha">${esc(p.fecha || "")}</td>
        <td>${esc(forma || "Pago")}</td>
        <td class="precio">${esc(importePago(p))}</td>
      </tr>`;
    })
    .join("");
  return `
  <div class="seccion">Pagos</div>
  <table class="grid">
    <thead>
      <tr>
        <th class="fecha">Fecha</th>
        <th>Forma</th>
        <th class="precio">Importe</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>`;
}

export function nombreLineaTelefono(tel: {
  marca?: string;
  modelo?: string;
}): string {
  const marca = String(tel.marca || "").trim();
  const modelo = String(tel.modelo || "").trim();
  if (marca && modelo && !modelo.toLowerCase().includes(marca.toLowerCase())) {
    return `${marca} ${modelo}`;
  }
  return modelo || marca || "Teléfono";
}

export function htmlReciboCompraTelefono(datos: ReciboCompraDatos): string {
  const n = datos.negocio || {};
  const leyenda = String(n.leyendaComprobante || "").trim() || LEYENDA_DEFAULT;
  const conformidad = String(n.textoConformidad || "").trim() || CONFORMIDAD_DEFAULT;
  const garantia = String(n.textoGarantia || "").trim();
  const logo = String(n.logoUrl || "").trim();
  const inicio = String(n.fechaInicioActividad || "").trim();

  const datosNegocio = [
    n.domicilioComercial
      ? `<div><strong>Domicilio Comercial:</strong> ${esc(n.domicilioComercial)}</div>`
      : "",
    n.telefonoEmpresarial
      ? `<div><strong>Teléfono Empresarial:</strong> ${esc(n.telefonoEmpresarial)}</div>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const bloqueGarantia = garantia
    ? `

<strong>Garantía:</strong>
${esc(garantia)}`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Recibo de compra</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 100%; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #111;
    font-size: 11px;
    line-height: 1.35;
    background: #fff;
  }
  .hoja {
    width: 100%;
    margin: 0 auto;
  }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .cabecera td, .cliente td {
    border: 1px solid #111;
    padding: 7px 9px;
    vertical-align: top;
  }
  .grid th, .grid td {
    border: 1px solid #111;
    padding: 5px 8px;
    vertical-align: middle;
  }
  .grid th { text-align: left; font-weight: 700; background: #f7f7f7; }
  .sin-borde td { border: none; padding: 1px 0; }
  .logo { max-height: 42px; max-width: 140px; object-fit: contain; display: block; margin-bottom: 4px; }
  .nombre { font-size: 18px; font-weight: 700; letter-spacing: 0.4px; line-height: 1.1; }
  .titulo { font-size: 16px; font-weight: 700; letter-spacing: 0.3px; margin: 0 0 6px; }
  .meta { font-size: 11px; }
  .meta + .meta { margin-top: 4px; }
  .cliente { margin-top: 8px; }
  .seccion { margin: 12px 0 4px; font-weight: 700; font-size: 11px; }
  .prod { width: auto; }
  .imei { width: 28%; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 10px; word-break: break-all; }
  .precio { width: 18%; white-space: nowrap; text-align: right; }
  .fecha { width: 18%; }
  .total-wrap { margin-top: 12px; width: 100%; text-align: right; }
  .total {
    display: inline-block;
    border: 1px solid #111;
    min-width: 42%;
    text-align: center;
    font-size: 13px;
    font-weight: 700;
    padding: 8px 12px;
  }
  .legal {
    margin-top: 12px;
    border: 1px solid #111;
    padding: 8px 10px;
    font-size: 10.5px;
    line-height: 1.4;
    white-space: pre-wrap;
  }

  /* En pantalla: hoja A4 centrada */
  @media screen {
    body {
      background: #d1d5db;
      min-height: 100vh;
      padding: 20px 12px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .hoja {
      width: 210mm;
      max-width: 100%;
      min-height: 297mm;
      background: #fff;
      padding: 12mm;
      box-shadow: 0 2px 16px rgba(0,0,0,.18);
    }
  }

  /* Al imprimir: ocupa todo el área útil de la hoja */
  @media print {
    html, body {
      width: 100% !important;
      height: auto !important;
      background: #fff !important;
      padding: 0 !important;
      margin: 0 !important;
      display: block !important;
    }
    .hoja {
      width: 100% !important;
      max-width: none !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
    }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="hoja">
    <table class="cabecera">
      <tr>
        <td style="width:48%">
          <table class="sin-borde"><tr><td>
            ${logo ? `<img class="logo" src="${esc(logo)}" alt=""/>` : ""}
            <div class="nombre">${esc(n.nombre || "")}</div>
            <div style="margin-top:6px">${datosNegocio || ""}</div>
          </td></tr></table>
        </td>
        <td>
          <div class="titulo">RECIBO DE COMPRA</div>
          <div class="meta"><strong>Fecha de Emisión:</strong> ${esc(datos.fecha || "—")}</div>
          <div class="meta"><strong>${esc(leyenda)}</strong></div>
          ${inicio ? `<div class="meta"><strong>Fecha de inicio de actividad:</strong> ${esc(inicio)}</div>` : ""}
        </td>
      </tr>
    </table>

    <table class="cliente">
      <tr>
        <td>
          <strong>Apellido y Nombre:</strong> ${esc(datos.cliente || "—")}
          &nbsp;&nbsp;&nbsp;
          <strong>DNI:</strong> ${esc(datos.dni || "—")}
        </td>
      </tr>
      <tr>
        <td>
          <strong>Teléfono:</strong> ${esc(datos.telefonoCliente || "—")}
          &nbsp;&nbsp;&nbsp;
          <strong>Domicilio:</strong> ${esc(datos.domicilioCliente || "—")}
        </td>
      </tr>
    </table>

    <table class="grid" style="margin-top:12px">
      <thead>
        <tr>
          <th>Producto/Servicio</th>
          <th class="imei">IMEI</th>
          <th class="precio">Precio</th>
        </tr>
      </thead>
      <tbody>
        ${filasProductos(datos.lineas, true)}
      </tbody>
    </table>

    <div class="seccion">Entrega como parte de pago:</div>
    <table class="grid">
      <thead>
        <tr>
          <th>Producto/Servicio</th>
          <th class="imei">IMEI</th>
          <th class="precio">Precio</th>
        </tr>
      </thead>
      <tbody>
        ${filasProductos(datos.partePago, true)}
      </tbody>
    </table>

    <div class="total-wrap">
      <div class="total">${esc(textoTotal(datos.lineas))}</div>
    </div>

    ${bloquePagos(datos.pagos || [])}

    <div class="legal">${esc(conformidad)}${bloqueGarantia}</div>
  </div>
  <script>
    window.onload = function () { setTimeout(function () { window.print(); }, 350); };
  </script>
</body>
</html>`;
}

export function abrirReciboCompra(html: string, ventana?: Window | null): boolean {
  const win = ventana && !ventana.closed ? ventana : null;
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    return true;
  }

  // Fallback sin popup: imprimir desde un iframe oculto
  const iframe = document.createElement("iframe");
  const iframeId = `recibo-print-${Date.now()}`;
  iframe.id = iframeId;
  iframe.setAttribute("style", "position:fixed;right:0;bottom:0;width:0;height:0;border:0");
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return false;
  }
  const htmlIframe = html.replace(
    /window\.onload\s*=\s*function\s*\(\)\s*\{\s*setTimeout\(function\s*\(\)\s*\{\s*window\.print\(\);\s*\},\s*\d+\);\s*\};/,
    `window.onload = function () { setTimeout(function () { window.print(); setTimeout(function () { try { parent.document.getElementById("${iframeId}")?.remove(); } catch (e) {} }, 800); }, 350); };`
  );
  doc.open();
  doc.write(htmlIframe);
  doc.close();
  return true;
}

/** Abrí la ventana en el mismo clic del usuario (antes de awaits) para evitar el bloqueo. */
export function abrirVentanaReciboPendiente(): Window | null {
  const win = window.open("", "_blank", "width=860,height=1000");
  if (!win) return null;
  win.document.open();
  win.document.write(`<!DOCTYPE html><html><head><title>Recibo</title></head>
<body style="font-family:Arial,sans-serif;padding:24px;color:#333">
  <p>Generando recibo…</p>
</body></html>`);
  win.document.close();
  return win;
}

export function esVentaTelefonoParaRecibo(venta: any): boolean {
  if (!venta) return false;
  if (String(venta.tipo || "").toLowerCase() === "telefono") return true;
  if (venta.modelo && (venta.precioVenta != null || venta.imei) && !venta.productos) {
    return true;
  }
  return (venta.productos || []).some(
    (p: any) =>
      String(p.tipo || "").toLowerCase() === "telefono" ||
      String(p.categoria || "").toLowerCase().includes("tel") ||
      String(p.origenStock || "") === "stockTelefonos"
  );
}

function lineaDesdeProducto(p: any): LineaReciboCompra {
  const completo = p?.datosTelefonoCompletos || {};
  return {
    nombre: nombreLineaTelefono({
      marca: p?.marca || completo.marca,
      modelo: p?.modelo || completo.modelo || p?.producto || p?.descripcion,
    }),
    imei: String(p?.imei || completo.imei || ""),
    precio: Number(p?.precioUnitario ?? p?.precioVenta ?? completo.precioVenta ?? 0) || 0,
    moneda: String(p?.moneda || completo.moneda || "USD"),
  };
}

function lineaDesdeEquipoRecibido(t: any): LineaReciboCompra {
  return {
    nombre: nombreLineaTelefono(t),
    imei: String(t?.imei || ""),
    precio: Number(t?.precioCompra ?? t?.precioEstimado ?? t?.valorPago ?? 0) || 0,
    moneda: String(t?.moneda || "USD"),
  };
}

/** Arma e imprime el recibo de compra de una venta de teléfono (ventaTelefonos o ventasGeneral). */
export async function imprimirReciboCompraDesdeVenta(
  negocioID: string,
  venta: any,
  opciones?: { ventasMismoNro?: any[]; ventana?: Window | null }
): Promise<boolean> {
  if (!negocioID || !venta) return false;

  // Abrir YA (gesto del usuario). Si viene abierta desde afuera, reutilizarla.
  const ventana =
    opciones?.ventana && !opciones.ventana.closed
      ? opciones.ventana
      : abrirVentanaReciboPendiente();

  const { collection, doc, getDoc, getDocs, query, where } = await import(
    "firebase/firestore"
  );
  const { db } = await import("@/lib/firebase");
  const { listarPagosDeVenta } = await import("@/lib/actualizarSaldoCliente");

  const nro = String(venta?.nroVenta || "").trim();
  let grupo: any[] =
    opciones?.ventasMismoNro && opciones.ventasMismoNro.length > 0
      ? [...opciones.ventasMismoNro].sort(
          (a, b) => Number(a.indiceEnVenta || 0) - Number(b.indiceEnVenta || 0)
        )
      : [];

  if (grupo.length === 0 && nro) {
    const snap = await getDocs(
      query(
        collection(db, `negocios/${negocioID}/ventaTelefonos`),
        where("nroVenta", "==", nro)
      )
    );
    if (!snap.empty) {
      grupo = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort(
          (a: any, b: any) =>
            Number(a.indiceEnVenta || 0) - Number(b.indiceEnVenta || 0)
        );
    }
  }

  if (grupo.length === 0 && venta.modelo && venta.precioVenta != null) {
    grupo = [venta];
  }

  const base = grupo[0] || venta;
  const nombreCliente = String(base.cliente || venta.cliente || "").trim();

  const cfgSnap = await getDoc(doc(db, `negocios/${negocioID}/configuracion/datos`));
  const cfg = cfgSnap.exists() ? cfgSnap.data() : {};
  const recibo = cfg.reciboCompra || {};

  let dni = "";
  let telefonoCliente = "";
  let domicilioCliente = "";
  if (nombreCliente) {
    const clientesSnap = await getDocs(
      query(
        collection(db, `negocios/${negocioID}/clientes`),
        where("nombre", "==", nombreCliente)
      )
    );
    if (!clientesSnap.empty) {
      const c = clientesSnap.docs[0].data();
      dni = String(c.dni || "");
      telefonoCliente = String(c.telefono || "");
      domicilioCliente = String(c.direccion || "");
    }
  }

  let lineas: LineaReciboCompra[] = [];
  if (grupo.length > 0 && (grupo[0].precioVenta != null || grupo[0].imei != null || grupo[0].modelo)) {
    lineas = grupo.map((t) => ({
      nombre: nombreLineaTelefono(t),
      imei: String(t.imei || ""),
      precio: Number(t.precioVenta) || 0,
      moneda: String(t.moneda || "USD"),
    }));
  } else {
    lineas = (venta.productos || [])
      .filter(
        (p: any) =>
          String(p.tipo || "").toLowerCase() === "telefono" ||
          String(p.categoria || "").toLowerCase().includes("tel") ||
          String(p.origenStock || "") === "stockTelefonos" ||
          !venta.productos?.some((x: any) =>
            String(x.tipo || "").toLowerCase() === "telefono"
          )
      )
      .map(lineaDesdeProducto);
    if (!lineas.length && venta.productos?.length) {
      lineas = venta.productos.map(lineaDesdeProducto);
    }
  }

  const recibidosRaw = Array.isArray(base.telefonosRecibidos)
    ? base.telefonosRecibidos
    : base.telefonoRecibido
      ? [base.telefonoRecibido]
      : Array.isArray(venta.telefonosComoPago)
        ? venta.telefonosComoPago
        : venta.telefonoComoPago
          ? [venta.telefonoComoPago]
          : Array.isArray(venta.telefonosRecibidos)
            ? venta.telefonosRecibidos
            : venta.telefonoRecibido
              ? [venta.telefonoRecibido]
              : [];

  const partePago = recibidosRaw
    .map(lineaDesdeEquipoRecibido)
    .filter((t: LineaReciboCompra) => t.nombre || t.precio);

  const pagosVinculados = await listarPagosDeVenta(
    negocioID,
    base.nroVenta || venta.nroVenta || nro,
    nombreCliente,
    base.id || venta.id
  );
  const pagos = pagosVinculados
    .filter((p) => {
      const forma = String(p.forma || "");
      const esEntrega =
        p.tipoPago === "entrega_equipo" || /entrega equipo/i.test(forma);
      return !esEntrega && (p.monto > 0 || p.montoUSD > 0);
    })
    .map((p) => ({
      fecha: p.fecha,
      forma: p.forma,
      monto: p.monto,
      montoUSD: p.montoUSD,
      moneda: p.moneda,
      observaciones: p.observaciones,
    }));

  const html = htmlReciboCompraTelefono({
    fecha: String(base.fecha || venta.fecha || ""),
    cliente: nombreCliente,
    dni,
    telefonoCliente,
    domicilioCliente,
    lineas,
    partePago,
    pagos,
    negocio: {
      nombre: cfg.nombreNegocio || "",
      logoUrl: cfg.logoUrl || cfg.logoURL || "",
      domicilioComercial: recibo.domicilioComercial || "",
      telefonoEmpresarial: recibo.telefonoEmpresarial || "",
      fechaInicioActividad: recibo.fechaInicioActividad || "",
      leyendaComprobante: recibo.leyendaComprobante || "",
      textoConformidad: recibo.textoConformidad || "",
      textoGarantia: cfg.textoGarantiaTelefonos || "",
    },
  });

  return abrirReciboCompra(html, ventana);
}
