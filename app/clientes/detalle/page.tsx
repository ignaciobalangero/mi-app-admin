import dynamic from "next/dynamic";

const ClienteDetalle = dynamic(() => import("./ClienteDetalle"), {
  ssr: false,
});

export default function DetalleWrapper() {
  return <ClienteDetalle />;
}
