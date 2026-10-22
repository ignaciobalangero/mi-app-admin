import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VitrinaCelulares from "../VitrinaCelulares";

export const metadata: Metadata = {
  title: "Celulares",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ negocioID: string; lista: string }>;
}) {
  const { negocioID, lista } = await params;
  if (lista !== "mayorista" && lista !== "minorista") notFound();
  return <VitrinaCelulares negocioID={negocioID} listaInicial={lista} />;
}
