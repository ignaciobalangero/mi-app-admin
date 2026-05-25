import TiendaCuentaCliente from "./TiendaCuentaCliente";

export default async function Page({ params }: { params: Promise<{ negocioID: string }> }) {
  const { negocioID } = await params;
  return <TiendaCuentaCliente negocioID={negocioID} />;
}
