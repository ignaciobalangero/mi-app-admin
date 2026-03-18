// app/api/emitir-factura/route.ts
// Emite factura electrónica AFIP usando Afip SDK. Requiere CUIT y punto de venta en config del negocio.

import { NextResponse } from "next/server";
import "@/lib/firebaseAdmin";
import { db } from "@/lib/firebaseAdmin";

// @ts-ignore - módulo CommonJS
const Afip = require("@afipsdk/afip.js").default || require("@afipsdk/afip.js");

const CBTE_TIPO = { A: 1, B: 6 } as const;
const DOC_TIPO = { CUIT: 80, DNI: 96, CONSUMIDOR_FINAL: 99 } as const;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      negocioID,
      origen,
      tipoComprobante,
      cliente,
      total,
      moneda = "ARS",
      descripcion,
      ventaId,
      trabajoId,
    } = body;

    if (!negocioID || !origen || !tipoComprobante || total == null) {
      return NextResponse.json(
        { error: "Faltan datos: negocioID, origen, tipoComprobante, total" },
        { status: 400 }
      );
    }

    const token = process.env.AFIP_SDK_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "No está configurado AFIP_SDK_ACCESS_TOKEN en el servidor" },
        { status: 500 }
      );
    }

    // Afip.js requiere certificado X.509 (cert + key) para producción.
    const certPem = process.env.AFIP_SDK_CERT_PEM?.replace(/\\n/g, "\n");
    const privateKeyPem = process.env.AFIP_SDK_PRIVATE_KEY_PEM?.replace(/\\n/g, "\n");
    if (!certPem || !privateKeyPem) {
      return NextResponse.json(
        {
          error:
            "AFIP requiere certificado X.509. Configurá AFIP_SDK_CERT_PEM y AFIP_SDK_PRIVATE_KEY_PEM en el servidor.",
        },
        { status: 500 }
      );
    }

    // Leer configuración del negocio usando la API de firebase-admin
    const configSnap = await db
      .collection("negocios")
      .doc(String(negocioID))
      .collection("configuracion")
      .doc("datos")
      .get();
    const config = configSnap.exists ? configSnap.data() : {};
    const cuit = config?.cuit ? Number(config.cuit) : null;
    const puntoVenta = config?.puntoVenta != null ? Number(config.puntoVenta) : 1;

    if (!cuit) {
      return NextResponse.json(
        {
          error:
            "El negocio no tiene configurado el CUIT para facturación. Configuralo en Configuraciones > Facturación electrónica.",
        },
        { status: 400 }
      );
    }

    const tipo = tipoComprobante === "A" ? "A" : "B";
    const cbteTipo = CBTE_TIPO[tipo];

    let docTipo: number = DOC_TIPO.CONSUMIDOR_FINAL;
    let docNro: number = 0;
    if (cliente?.docNro) {
      const n = Number(cliente.docNro);
      if (!isNaN(n) && n > 0) {
        docNro = Math.floor(n);
        docTipo = tipo === "A" ? DOC_TIPO.CUIT : DOC_TIPO.DNI;
      }
    }

    const impTotal = Number(total);
    if (isNaN(impTotal) || impTotal <= 0) {
      return NextResponse.json({ error: "Total inválido" }, { status: 400 });
    }

    const isPesos = (moneda || "ARS").toUpperCase() !== "USD";
    const impNeto = isPesos ? impTotal : impTotal;
    const impIVA = 0;
    const impTotConc = 0;
    const impOpEx = 0;
    const impTrib = 0;

    const now = new Date();
    const cbtFch =
      now.getFullYear() * 10000 +
      (now.getMonth() + 1) * 100 +
      now.getDate();

    const afip = new Afip({
      CUIT: cuit,
      access_token: token,
      cert: certPem,
      key: privateKeyPem,
      production: true,
    });

    const voucherData: Record<string, unknown> = {
      CantReg: 1,
      PtoVta: puntoVenta,
      CbteTipo: cbteTipo,
      Concepto: descripcion ? 2 : 1,
      DocTipo: docTipo,
      DocNro: docNro,
      CbteFch: cbtFch,
      ImpTotal: impTotal,
      ImpTotConc: impTotConc,
      ImpNeto: impNeto,
      ImpOpEx: impOpEx,
      ImpTrib: impTrib,
      ImpIVA: impIVA,
      MonId: isPesos ? "PES" : "DOL",
      MonCotiz: 1,
    };

    if (descripcion && (voucherData.Concepto === 2 || voucherData.Concepto === 3)) {
      voucherData.FchServDesde = cbtFch;
      voucherData.FchServHasta = cbtFch;
    }

    const result = await afip.ElectronicBilling.createNextVoucher(voucherData);

    const response: {
      ok: true;
      CAE: string;
      CAEFchVto: string;
      numero: number;
      puntoVenta: number;
      tipoComprobante: string;
      ventaId?: string;
      trabajoId?: string;
    } = {
      ok: true,
      CAE: result.CAE,
      CAEFchVto: result.CAEFchVto,
      numero: result.voucherNumber,
      puntoVenta,
      tipoComprobante: tipo,
    };
    if (ventaId) response.ventaId = ventaId;
    if (trabajoId) response.trabajoId = trabajoId;

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("Error emitir-factura:", err);
    // En la mayoría de casos el SDK tira un Axios error con response.data.
    // Queremos devolver el detalle real para poder ver el motivo (AFIP valida y responde 400).
    const baseMsg =
      err?.message ||
      err?.data?.message ||
      (typeof err?.data === "string" ? err.data : null) ||
      "Error al emitir la factura";

    const details = err?.response?.data ?? err?.data;
    let detailsMsg = "";
    if (details) {
      try {
        detailsMsg = typeof details === "string" ? details : JSON.stringify(details);
      } catch {
        detailsMsg = String(details);
      }
    }

    const msg = detailsMsg ? `${baseMsg} - ${detailsMsg}` : baseMsg;

    const statusCode = err?.response?.status ?? err?.status ?? (String(baseMsg).includes("400") ? 400 : 500);

    return NextResponse.json({ error: msg }, { status: statusCode });
  }
}
