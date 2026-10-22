import { redirect } from "next/navigation";

/** El link viejo con ?lista= sigue andando y pasa a la dirección corta. */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ negocioID: string }>;
  searchParams: Promise<{ lista?: string }>;
}) {
  const { negocioID } = await params;
  const { lista } = await searchParams;
  const segmento = lista === "mayorista" ? "mayorista" : "minorista";
  redirect(`/celulares/${negocioID}/${segmento}`);
}
