/**
 * Quita la pista de audio de los videos ya guardados en stock de teléfonos.
 * Uso: node --env-file=.env.local scripts/quitarAudioVideos.mjs
 */
import { execFileSync } from "child_process";
import { randomUUID } from "crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Faltan credenciales de Firebase Admin");
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "ingresos-trabajos.firebasestorage.app",
  });
}

const db = getFirestore();

function parseStorageUrl(url) {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (!m) return null;
    return { bucket: m[1], path: decodeURIComponent(m[2]) };
  } catch {
    return null;
  }
}

function tieneAudio(file) {
  const out = execFileSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", file],
    { encoding: "utf8" }
  );
  return out.trim().length > 0;
}

function quitarAudio(input, output) {
  try {
    execFileSync(
      "ffmpeg",
      ["-y", "-i", input, "-map", "0:v:0", "-c:v", "copy", "-an", "-movflags", "+faststart", output],
      { stdio: "pipe" }
    );
  } catch {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        input,
        "-map",
        "0:v:0",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-an",
        "-movflags",
        "+faststart",
        output,
      ],
      { stdio: "pipe" }
    );
  }
}

async function subir(bucketName, path, buffer) {
  const bucket = getStorage().bucket(bucketName);
  const file = bucket.file(path);
  const token = randomUUID();
  await file.save(buffer, {
    contentType: "video/mp4",
    metadata: {
      cacheControl: "public,max-age=31536000",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  const encoded = encodeURIComponent(path);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;
}

const snap = await db.collectionGroup("stockTelefonos").get();
const conVideo = snap.docs.filter((d) => {
  const url = String(d.get("videoURL") || "").trim();
  return url.startsWith("https://");
});

console.log(`Teléfonos con video: ${conVideo.length}`);

let listos = 0;
let sinAudio = 0;
let fallos = 0;

for (const docu of conVideo) {
  const url = String(docu.get("videoURL")).trim();
  const parsed = parseStorageUrl(url);
  const modelo = String(docu.get("modelo") || docu.id);
  if (!parsed) {
    console.error(`URL no reconocida: ${modelo}`);
    fallos += 1;
    continue;
  }

  const dir = mkdtempSync(join(tmpdir(), "video-mudo-"));
  const input = join(dir, "in");
  const output = join(dir, "out.mp4");
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Descarga ${res.status}`);
    writeFileSync(input, Buffer.from(await res.arrayBuffer()));
    if (!tieneAudio(input)) {
      sinAudio += 1;
      console.log(`Ya sin audio: ${modelo}`);
      continue;
    }
    quitarAudio(input, output);
    if (tieneAudio(output)) throw new Error("El video nuevo todavía tiene audio");
    const buffer = readFileSync(output);
    const carpeta = parsed.path.split("/").slice(0, -1).join("/");
    const nuevoPath = `${carpeta}/video-mudo-${Date.now()}.mp4`;
    const nuevaUrl = await subir(parsed.bucket, nuevoPath, buffer);
    await docu.ref.update({ videoURL: nuevaUrl });
    listos += 1;
    console.log(`Audio quitado: ${modelo}`);
  } catch (error) {
    fallos += 1;
    console.error(`Falló ${modelo}:`, error instanceof Error ? error.message : error);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`Listos ${listos}. Ya mudos ${sinAudio}. Fallos ${fallos}.`);
if (fallos > 0) process.exit(1);
