import { NextResponse } from "next/server";
import { db as adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_ARCHIVO = 45 * 1024 * 1024;

function idValido(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

function fotos(d: Record<string, unknown>): string[] {
  const crudas: unknown[] = [];
  if (Array.isArray(d.fotosURLs)) crudas.push(...d.fotosURLs);
  crudas.push(d.fotoURL);
  const urls: string[] = [];
  for (const c of crudas) {
    if (typeof c !== "string") continue;
    const t = c.trim();
    if (!t.startsWith("https://")) continue;
    if (!urls.includes(t)) urls.push(t);
  }
  return urls.slice(0, 12);
}

function video(d: Record<string, unknown>): string {
  const t = typeof d.videoURL === "string" ? d.videoURL.trim() : "";
  return t.startsWith("https://") ? t : "";
}

function nombreBase(d: Record<string, unknown>): string {
  const modelo = String(d.modelo || d.marca || "equipo").trim();
  const limpio = modelo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return limpio || "equipo";
}

function extensionDe(url: string, contentType: string): string {
  const tipo = contentType.split(";")[0].trim().toLowerCase();
  if (tipo === "image/png") return "png";
  if (tipo === "image/webp") return "webp";
  if (tipo === "image/jpeg") return "jpg";
  if (tipo === "video/mp4") return "mp4";
  if (tipo === "video/webm") return "webm";
  if (tipo === "video/quicktime") return "mov";
  const path = url.split("?")[0].toLowerCase();
  const m = path.match(/\.([a-z0-9]{2,4})$/);
  return m ? m[1] : "bin";
}

async function bajar(url: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const len = Number(res.headers.get("content-length") || 0);
  if (len > MAX_ARCHIVO) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_ARCHIVO) return null;
  return {
    bytes: buf,
    contentType: res.headers.get("content-type") || "application/octet-stream",
  };
}

function crc32(data: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < data.length; i++) {
    c ^= data[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function zipSinComprimir(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = new TextEncoder().encode(f.name);
    const crc = crc32(f.data);
    const local = new Uint8Array(30 + name.length + f.data.length);
    const v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, f.data.length, true);
    v.setUint32(22, f.data.length, true);
    v.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(f.data, 30 + name.length);
    locales.push(local);

    const central = new Uint8Array(46 + name.length);
    const c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, f.data.length, true);
    c.setUint32(24, f.data.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.set(name, 46);
    centrales.push(central);
    offset += local.length;
  }
  const centralSize = centrales.reduce((n, b) => n + b.length, 0);
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, files.length, true);
  e.setUint16(10, files.length, true);
  e.setUint32(12, centralSize, true);
  e.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralSize + 22);
  let p = 0;
  for (const l of locales) {
    out.set(l, p);
    p += l.length;
  }
  for (const c of centrales) {
    out.set(c, p);
    p += c.length;
  }
  out.set(end, p);
  return out;
}

function respuestaArchivo(bytes: Uint8Array, contentType: string, filename: string) {
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const negocioId = String(searchParams.get("negocioId") || "").trim();
  const id = String(searchParams.get("id") || "").trim();
  const tipo = String(searchParams.get("tipo") || "").trim();
  const indice = Number(searchParams.get("i") || 0);

  if (!idValido(negocioId) || !idValido(id)) {
    return NextResponse.json({ error: "Link inválido" }, { status: 400 });
  }
  if (tipo !== "foto" && tipo !== "video" && tipo !== "paquete") {
    return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
  }

  try {
    const snap = await adminDb.doc(`negocios/${negocioId}/stockTelefonos/${id}`).get();
    if (!snap.exists) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    const d = (snap.data() || {}) as Record<string, unknown>;
    if (d.enServicio === true || d.ocultoLista === true) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const listaFotos = fotos(d);
    const videoUrl = video(d);
    const base = nombreBase(d);

    if (tipo === "foto") {
      const url = listaFotos[indice];
      if (!url) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      const archivo = await bajar(url);
      if (!archivo) return NextResponse.json({ error: "No se pudo bajar la foto" }, { status: 502 });
      const ext = extensionDe(url, archivo.contentType);
      return respuestaArchivo(archivo.bytes, archivo.contentType, `${base}-${indice + 1}.${ext}`);
    }

    if (tipo === "video") {
      if (!videoUrl) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      const archivo = await bajar(videoUrl);
      if (!archivo) return NextResponse.json({ error: "No se pudo bajar el video" }, { status: 502 });
      const ext = extensionDe(videoUrl, archivo.contentType);
      return respuestaArchivo(archivo.bytes, archivo.contentType, `${base}.${ext}`);
    }

    const archivos: { name: string; data: Uint8Array }[] = [];
    for (let i = 0; i < listaFotos.length; i++) {
      const archivo = await bajar(listaFotos[i]);
      if (!archivo) continue;
      archivos.push({
        name: `${base}-${i + 1}.${extensionDe(listaFotos[i], archivo.contentType)}`,
        data: archivo.bytes,
      });
    }
    if (videoUrl) {
      const archivo = await bajar(videoUrl);
      if (archivo) {
        archivos.push({
          name: `${base}.${extensionDe(videoUrl, archivo.contentType)}`,
          data: archivo.bytes,
        });
      }
    }
    if (archivos.length === 0) {
      return NextResponse.json({ error: "Este equipo no tiene archivos" }, { status: 404 });
    }
    return respuestaArchivo(zipSinComprimir(archivos), "application/zip", `${base}.zip`);
  } catch (error) {
    console.error("celulares-publicos descarga", error);
    return NextResponse.json({ error: "No se pudo descargar" }, { status: 500 });
  }
}
