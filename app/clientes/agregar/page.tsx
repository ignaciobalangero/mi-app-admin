export const dynamic = "force-dynamic"; // 👈🏽 esto es clave para evitar el error de build

import AgregarClienteForm from "./AgregarClienteForm";

export default function Page() {
  return <AgregarClienteForm />;
}
