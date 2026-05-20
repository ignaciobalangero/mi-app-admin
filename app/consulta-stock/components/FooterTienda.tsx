"use client";

import type { ReactNode } from "react";
import {
  ShoppingCart,
  Package,
  Shield,
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Instagram,
  Facebook,
  Youtube,
} from "lucide-react";
import type { TiendaPublicaInfo } from "@/lib/tiendaPublicaTypes";

type Props = {
  info: TiendaPublicaInfo;
  onIrInicio: () => void;
};

function enlaceSocial(url: string | null, label: string, children: ReactNode) {
  if (!url?.trim()) return null;
  const href = url.startsWith("http") ? url : `https://${url.replace(/^\/\//, "")}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="text-white/90 transition hover:scale-110 hover:text-white"
    >
      {children}
    </a>
  );
}

export default function FooterTienda({ info, onIrInicio }: Props) {
  const wa = info.whatsapp || info.telefono?.replace(/\D/g, "") || "";
  const tieneRedes = [info.instagram, info.facebook, info.youtube, info.tiktok].some(Boolean);

  return (
    <footer className="mt-10 bg-[#1a2433] text-neutral-300">
      {tieneRedes && (
        <div className="flex justify-center gap-6 bg-[#2bb8b8] px-4 py-3">
          {enlaceSocial(info.instagram, "Instagram", <Instagram className="h-5 w-5" strokeWidth={2} />)}
          {enlaceSocial(info.facebook, "Facebook", <Facebook className="h-5 w-5" strokeWidth={2} />)}
          {enlaceSocial(info.youtube, "YouTube", <Youtube className="h-5 w-5" strokeWidth={2} />)}
          {info.tiktok &&
            enlaceSocial(
              info.tiktok,
              "TikTok",
              <span className="text-xs font-bold tracking-wide">TikTok</span>
            )}
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-3">
        <section>
          <h3 className="mb-4 border-b border-white/15 pb-2 text-sm font-bold uppercase tracking-wide text-white">
            Información
          </h3>
          <ul className="space-y-3 text-sm leading-relaxed">
            <li className="flex gap-2.5">
              <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0 text-[#2bb8b8]" />
              <span>{info.comoComprar}</span>
            </li>
            <li className="flex gap-2.5">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-[#2bb8b8]" />
              <span>{info.pagoEnvios}</span>
            </li>
            <li className="flex gap-2.5">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#2bb8b8]" />
              <span>{info.productosGarantia}</span>
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-4 border-b border-white/15 pb-2 text-sm font-bold uppercase tracking-wide text-white">
            Contactanos
          </h3>
          <ul className="space-y-3 text-sm">
            {info.telefono && (
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#2bb8b8]" />
                {wa.length >= 10 ? (
                  <a href={`https://wa.me/${wa}`} className="hover:text-white hover:underline">
                    {info.telefono}
                  </a>
                ) : (
                  <span>{info.telefono}</span>
                )}
              </li>
            )}
            {info.horarios && (
              <li className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#2bb8b8]" />
                <span className="whitespace-pre-line">{info.horarios}</span>
              </li>
            )}
            {info.email && (
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#2bb8b8]" />
                <a href={`mailto:${info.email}`} className="break-all hover:text-white hover:underline">
                  {info.email}
                </a>
              </li>
            )}
            {info.direccion && (
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2bb8b8]" />
                <span>{info.direccion}</span>
              </li>
            )}
          </ul>
        </section>

        <section>
          <h3 className="mb-4 border-b border-white/15 pb-2 text-sm font-bold uppercase tracking-wide text-white">
            Pedidos
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-neutral-400">
            Armá tu carrito en la tienda y envianos el pedido por WhatsApp. Confirmamos stock y precio al instante.
          </p>
          {wa.length >= 10 && (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#20bd5a]"
            >
              <MessageCircle className="h-5 w-5" />
              Escribinos por WhatsApp
            </a>
          )}
        </section>
      </div>

      {(info.mediosPago || info.mediosEnvio) && (
        <div className="border-t border-white/10 bg-[#151d28] px-4 py-6 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:gap-10">
            {info.mediosPago && (
              <div className="flex-1">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/80">Medios de pago</p>
                <p className="text-sm text-neutral-400">{info.mediosPago}</p>
              </div>
            )}
            {info.mediosEnvio && (
              <div className="flex-1">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/80">Medios de envío</p>
                <p className="text-sm text-neutral-400">{info.mediosEnvio}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-white/10 px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <button
            type="button"
            onClick={onIrInicio}
            className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg"
          >
            {info.logoUrl ? (
              <img
                src={info.logoUrl}
                alt={info.nombre}
                className="h-8 max-w-[140px] object-contain object-left"
              />
            ) : (
              <span className="text-sm font-bold text-white">{info.nombre}</span>
            )}
          </button>
          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} {info.nombre}. Precios y stock sujetos a confirmación.
          </p>
        </div>
      </div>
    </footer>
  );
}
