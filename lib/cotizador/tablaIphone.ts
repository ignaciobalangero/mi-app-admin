import type { ModeloCotizacion } from "@/lib/cotizador/telefonos";

/** Precio +90% y precio -90%, en USD. */
const FILAS: [string, number, number][] = [
  ["iPhone 11 64GB", 100, 80],
  ["iPhone 11 128GB", 130, 100],
  ["iPhone 11 Pro 64GB", 150, 120],
  ["iPhone 11 Pro 256GB", 170, 140],
  ["iPhone 11 Pro Max 64GB", 180, 150],
  ["iPhone 11 Pro Max 256GB", 200, 170],
  ["iPhone 12 64GB", 150, 120],
  ["iPhone 12 128GB", 180, 150],
  ["iPhone 12 Pro 128GB", 220, 190],
  ["iPhone 12 Pro 256GB", 240, 210],
  ["iPhone 12 Pro Max 128GB", 240, 210],
  ["iPhone 12 Pro Max 256GB", 260, 230],
  ["iPhone 13 128GB", 250, 220],
  ["iPhone 13 256GB", 280, 240],
  ["iPhone 13 Pro 128GB", 320, 290],
  ["iPhone 13 Pro 256GB", 360, 320],
  ["iPhone 13 Pro Max 128GB", 360, 320],
  ["iPhone 13 Pro Max 256GB", 380, 340],
  ["iPhone 14 128GB", 300, 270],
  ["iPhone 14 256GB", 320, 290],
  ["iPhone 14 Pro 128GB", 370, 330],
  ["iPhone 14 Pro 256GB", 400, 370],
  ["iPhone 14 Pro Max 128GB", 450, 420],
  ["iPhone 14 Pro Max 256GB", 480, 450],
  ["iPhone 15 128GB", 420, 390],
  ["iPhone 15 256GB", 440, 410],
  ["iPhone 15 Pro 128GB", 500, 470],
  ["iPhone 15 Pro 256GB", 530, 500],
  ["iPhone 15 Pro Max 256GB", 580, 530],
  ["iPhone 16 128GB", 580, 550],
  ["iPhone 16 256GB", 600, 570],
  ["iPhone 16 Pro 128GB", 650, 600],
  ["iPhone 16 Pro 256GB", 700, 650],
  ["iPhone 16 Pro Max 256GB", 750, 700],
  ["iPhone 17 256GB", 700, 660],
  ["iPhone 17 Pro 256GB", 1000, 950],
  ["iPhone 17 Pro 512GB", 1050, 1000],
  ["iPhone 17 Pro Max 256GB", 1050, 1000],
  ["iPhone 17 Pro Max 512GB", 1150, 1100],
];

export function tablaIphoneInicial(): ModeloCotizacion[] {
  return FILAS.map(([modelo, mas90, menos90]) => ({
    id: modelo.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    modelo,
    moneda: "USD" as const,
    precioMas90: mas90,
    precioMenos90: menos90,
  }));
}
