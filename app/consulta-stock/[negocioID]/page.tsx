import type { Metadata } from "next";
import ConsultaStockCliente from "./ConsultaStockCliente";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ negocioID: string }>;
}): Promise<Metadata> {
  const { negocioID } = await params;
  return {
    title: `Consulta stock · ${negocioID}`,
    description: "Consulta pública de stock de repuestos y precio de venta.",
    robots: "noindex, nofollow",
  };
}

export default async function ConsultaStockPage({
  params,
}: {
  params: Promise<{ negocioID: string }>;
}) {
  const { negocioID } = await params;
  return <ConsultaStockCliente negocioID={negocioID} />;
}
