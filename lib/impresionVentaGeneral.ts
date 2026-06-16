export type TipoImpresionVenta = "formal" | "checklist";

export type LineaProductoVenta = {
  producto?: string;
  descripcion?: string;
  modelo?: string;
  marca?: string;
  categoria?: string;
  color?: string;
  codigo?: string;
  cantidad?: number;
  precioUnitario?: number;
  moneda?: string;
};

export type VentaImpresion = {
  id?: string;
  nroVenta?: string;
  fecha?: string;
  cliente?: string;
  estado?: string;
  productos?: LineaProductoVenta[];
  pagos?: { formaPago?: string; monto?: number; moneda?: string; observaciones?: string }[];
  telefonoComoPago?: {
    marca?: string;
    modelo?: string;
    valorPago?: number;
  };
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Al cargar desde stock: un solo nombre si producto y modelo son iguales. */
export function normalizarProductoModelo(
  producto?: string,
  modelo?: string
): { producto: string; modelo: string } {
  const prod = String(producto ?? "").trim();
  const mod = String(modelo ?? "").trim();
  const p = prod || mod;
  let m = mod;
  if (!m || (p && m.toLowerCase() === p.toLowerCase())) m = "";
  return { producto: p, modelo: m };
}

export function modeloDistintoDeProducto(p: LineaProductoVenta): string | null {
  const producto = String(p.producto ?? p.descripcion ?? "").trim();
  const modelo = String(p.modelo ?? "").trim();
  if (!modelo) return null;
  if (producto.length > 0 && producto.toLowerCase() === modelo.toLowerCase()) return null;
  return modelo;
}

/** Evita repetir producto y modelo cuando son el mismo texto. */
export function descripcionProductoVenta(p: LineaProductoVenta): string {
  const producto = String(p.producto ?? p.descripcion ?? "").trim();
  const modelo = String(p.modelo ?? "").trim();
  const marca = String(p.marca ?? "").trim();
  const cat = String(p.categoria ?? "").trim();

  const mismo =
    producto.length > 0 &&
    modelo.length > 0 &&
    producto.toLowerCase() === modelo.toLowerCase();

  const partes: string[] = [];
  if (marca && !producto.toLowerCase().includes(marca.toLowerCase())) {
    partes.push(marca);
  }
  if (producto && !mismo) {
    partes.push(producto);
    if (modelo) partes.push(modelo);
  } else {
    partes.push(producto || modelo || cat || "—");
  }

  return partes.join(" ").trim() || "—";
}

function totalesVenta(venta: VentaImpresion) {
  const subtotal =
    venta.productos?.reduce(
      (acc, p) => acc + Number(p.precioUnitario || 0) * Number(p.cantidad || 0),
      0
    ) || 0;
  const descuentos =
    (venta.pagos?.reduce((acc, p) => acc + Number(p.monto || 0), 0) || 0) +
    (venta.telefonoComoPago ? Number(venta.telefonoComoPago.valorPago || 0) : 0);
  const totalFinal = Math.max(0, subtotal - descuentos);
  const cantItems =
    venta.productos?.reduce((a, p) => a + Number(p.cantidad || 0), 0) || 0;
  return { subtotal, descuentos, totalFinal, cantItems };
}

export function htmlImpresionVentaFormal(
  venta: VentaImpresion,
  negocio: { nombre?: string; direccion?: string; telefono?: string }
): string {
  const { subtotal, descuentos, totalFinal } = totalesVenta(venta);
  const nro = venta.nroVenta || venta.id?.slice(-6) || "—";

  const filas =
    venta.productos
      ?.map((p, i) => {
        const desc = descripcionProductoVenta(p);
        const color = String(p.color ?? "").trim();
        const cod = String(p.codigo ?? "").trim();
        const cant = Number(p.cantidad) || 0;
        const pu = Number(p.precioUnitario) || 0;
        const sub = pu * cant;
        return `<tr style="background:${i % 2 ? "#f8f9fa" : "#fff"}">
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600">${cant}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:11px">${esc(cod || "—")}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${esc(desc)}${color ? `<span style="color:#6b7280;font-size:10px"> · ${esc(color)}</span>` : ""}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">$${pu.toLocaleString("es-AR")}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">$${sub.toLocaleString("es-AR")}</td>
      </tr>`;
      })
      .join("") || "";

  const pagosHTML =
    venta.pagos?.length || venta.telefonoComoPago
      ? `<div style="margin-top:16px;padding:12px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;font-size:12px">
        <strong style="color:#166534">Pagos:</strong>
        ${(venta.pagos || [])
          .map(
            (p) =>
              `<div>${esc(String(p.formaPago ?? ""))} — $${Number(p.monto || 0).toLocaleString("es-AR")} ${esc(String(p.moneda ?? ""))}</div>`
          )
          .join("")}
        ${
          venta.telefonoComoPago
            ? `<div>Teléfono parte de pago — $${Number(venta.telefonoComoPago.valorPago || 0).toLocaleString("es-AR")}</div>`
            : ""
        }
      </div>`
      : "";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Remito ${esc(nro)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;padding:24px;font-size:13px}
  @media print{body{padding:12px}}
  table{width:100%;border-collapse:collapse}
</style></head><body>
  <div style="text-align:center;border-bottom:2px solid #3498db;padding-bottom:14px;margin-bottom:18px">
    <h1 style="font-size:22px;font-weight:700">${esc(negocio.nombre || "—")}</h1>
    ${negocio.direccion ? `<p style="color:#64748b;font-size:11px">${esc(negocio.direccion)}</p>` : ""}
    ${negocio.telefono ? `<p style="color:#64748b;font-size:11px">Tel: ${esc(negocio.telefono)}</p>` : ""}
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px">
    <div style="background:#f1f5f9;border-radius:8px;padding:12px">
      <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">Comprobante de venta</div>
      <p><strong>N°:</strong> ${esc(nro)}</p>
      <p><strong>Fecha:</strong> ${esc(venta.fecha || "—")}</p>
      <p><strong>Estado:</strong> ${venta.estado === "pagado" ? "PAGADO" : "PENDIENTE"}</p>
    </div>
    <div style="background:#eff6ff;border-radius:8px;padding:12px">
      <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">Cliente</div>
      <p style="font-size:15px;font-weight:600">${esc(venta.cliente || "—")}</p>
      <p style="font-size:11px;color:#64748b;margin-top:4px">Emisión: ${new Date().toLocaleDateString("es-AR")}</p>
    </div>
  </div>
  <table>
    <thead>
      <tr style="background:#334155;color:#fff;font-size:11px">
        <th style="padding:8px;text-align:center;width:40px">Cant.</th>
        <th style="padding:8px;text-align:left;width:72px">Cód.</th>
        <th style="padding:8px;text-align:left">Descripción</th>
        <th style="padding:8px;text-align:right;width:72px">P. unit.</th>
        <th style="padding:8px;text-align:right;width:80px">Subtotal</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>
  ${pagosHTML}
  <div style="margin-top:16px;display:flex;justify-content:flex-end">
    <div style="width:260px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Subtotal</span><strong>$${subtotal.toLocaleString("es-AR")}</strong></div>
      ${descuentos > 0 ? `<div style="display:flex;justify-content:space-between;color:#16a34a;margin-bottom:6px"><span>Descuentos</span><strong>-$${descuentos.toLocaleString("es-AR")}</strong></div>` : ""}
      <div style="display:flex;justify-content:space-between;border-top:2px solid #3498db;padding-top:8px;font-size:16px"><span><strong>Total</strong></span><strong style="color:#7c3aed">$${totalFinal.toLocaleString("es-AR")}</strong></div>
    </div>
  </div>
  <p style="text-align:center;margin-top:20px;color:#64748b;font-size:11px">Gracias por su compra · Documento válido como comprobante</p>
</body></html>`;
}

export function htmlImpresionVentaChecklist(
  venta: VentaImpresion,
  negocio: { nombre?: string }
): string {
  const { cantItems, subtotal, descuentos, totalFinal } = totalesVenta(venta);
  const nro = venta.nroVenta || venta.id?.slice(-6) || "—";

  const lineas =
    venta.productos
      ?.map((p) => {
        const desc = descripcionProductoVenta(p);
        const cod = String(p.codigo ?? "").trim();
        const cant = Number(p.cantidad) || 0;
        const pu = Number(p.precioUnitario) || 0;
        const sub = pu * cant;
        const codTxt = cod ? `<span style="font-family:monospace;color:#475569">${esc(cod)}</span> ` : "";
        return `<div class="linea">
        <span class="chk">☐</span>
        <span class="qty">${cant}×</span>
        <span class="txt">${codTxt}${esc(desc)}</span>
        <span class="precio"><span class="pu">$${pu.toLocaleString("es-AR")}</span> <strong>$${sub.toLocaleString("es-AR")}</strong></span>
      </div>`;
      })
      .join("") || "";

  const totalesHTML = `
    <div class="totales">
      <div class="tot-row"><span>Subtotal</span><strong>$${subtotal.toLocaleString("es-AR")}</strong></div>
      ${descuentos > 0 ? `<div class="tot-row desc"><span>Descuentos</span><strong>-$${descuentos.toLocaleString("es-AR")}</strong></div>` : ""}
      <div class="tot-row tot-final"><span>Total</span><strong>$${totalFinal.toLocaleString("es-AR")}</strong></div>
    </div>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Pedido ${esc(nro)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:10mm 12mm;font-size:10.5pt;line-height:1.25}
  @page{size:A4 portrait;margin:8mm}
  @media print{body{padding:0}}
  .hdr{border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:8px}
  .hdr h1{font-size:13pt;font-weight:700}
  .meta{display:flex;justify-content:space-between;gap:8px;font-size:9.5pt;margin-bottom:10px}
  .meta strong{font-weight:700}
  .linea{display:flex;align-items:flex-start;gap:6px;padding:3px 0;border-bottom:0.5px solid #ddd;page-break-inside:avoid}
  .chk{flex-shrink:0;width:14px;font-size:12pt;line-height:1}
  .qty{flex-shrink:0;width:28px;font-weight:700;text-align:right}
  .txt{flex:1;min-width:0}
  .precio{flex-shrink:0;text-align:right;white-space:nowrap;font-size:9.5pt;min-width:88px}
  .precio .pu{color:#555;font-weight:400}
  .precio strong{font-weight:700}
  .totales{margin-top:8px;padding-top:6px;border-top:1px solid #111;max-width:220px;margin-left:auto;font-size:10pt}
  .tot-row{display:flex;justify-content:space-between;gap:12px;padding:2px 0}
  .tot-row.desc{color:#166534}
  .tot-final{border-top:1px solid #111;margin-top:4px;padding-top:4px;font-size:11pt;font-weight:700}
  .foot{margin-top:10px;padding-top:6px;border-top:0.5px solid #ccc;font-size:9pt;display:flex;justify-content:space-between;color:#555}
</style></head><body>
  <div class="hdr">
    <h1>${esc(negocio.nombre || "Pedido")} — Checklist preparación</h1>
  </div>
  <div class="meta">
    <div><strong>Pedido:</strong> ${esc(nro)} · <strong>Cliente:</strong> ${esc(venta.cliente || "—")}</div>
    <div><strong>Fecha:</strong> ${esc(venta.fecha || "—")} · <strong>Ítems:</strong> ${cantItems}</div>
  </div>
  <div class="items">${lineas}</div>
  ${totalesHTML}
  <div class="foot">
    <span>Marcá ☐ al preparar · precio unit. y subtotal por línea</span>
    <span>Impreso: ${new Date().toLocaleString("es-AR")}</span>
  </div>
</body></html>`;
}

export function imprimirHtmlVenta(html: string): boolean {
  const ventana = window.open("", "_blank", "width=900,height=700");
  if (!ventana) return false;
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  setTimeout(() => {
    ventana.print();
    ventana.close();
  }, 400);
  return true;
}

export function htmlImpresionVenta(
  venta: VentaImpresion,
  tipo: TipoImpresionVenta,
  negocio: { nombre?: string; direccion?: string; telefono?: string }
): string {
  return tipo === "checklist"
    ? htmlImpresionVentaChecklist(venta, negocio)
    : htmlImpresionVentaFormal(venta, negocio);
}
