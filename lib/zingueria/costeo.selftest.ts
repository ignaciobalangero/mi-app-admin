/**
 * Autotest de costeo (sin vitest).
 * Ejecutar: npx --yes tsx lib/zingueria/costeo.selftest.ts
 */
import assert from "node:assert/strict";
import {
  calcularAccesorio,
  calcularPlegado,
  colocacionBase,
  colocacionSugerida,
  round2,
} from "./costeo";

const CHAPA_25 = {
  anchoMm: 1220,
  largoMm: 2440,
  precioCosto: 36000,
  acabado: "galva" as const,
  calibre: "25",
};

const CHAPA_25C = {
  anchoMm: 1220,
  largoMm: 2440,
  precioCosto: 55000,
  acabado: "color" as const,
  calibre: "25C",
};

function close(a: number, b: number, tol = 0.02) {
  assert.ok(
    Math.abs(a - b) <= tol,
    `expected ${a} ≈ ${b} (tol ${tol})`
  );
}

const c406 = calcularPlegado({
  chapa: CHAPA_25,
  desarrolloMm: 406,
  categoria: "canaleta",
});
assert.equal(c406.ok, true);
assert.equal(c406.cortesPorChapa, 3.0049);
assert.equal(c406.costoTira, 11980.33);
assert.equal(c406.costoMetro, 4909.97);
assert.equal(c406.diseno, 4909.97);
assert.equal(c406.manoObra, 3927.98);
assert.equal(c406.precioNeto, 13747.92);
assert.equal(c406.precioPublico, 15122.71);
assert.equal(c406.precioRioCuarto, 24049.64);
assert.equal(c406.coeficienteGanancia, 3.08);

const c305 = calcularPlegado({
  chapa: CHAPA_25,
  desarrolloMm: 305,
  categoria: "canaleta",
});
assert.equal(c305.costoTira, 9000);
assert.equal(c305.costoMetro, 3688.52);
assert.equal(c305.precioNeto, 10327.87);
assert.equal(c305.precioPublico, 11360.66);
assert.equal(c305.precioRioCuarto, 18066.85);

const col406 = calcularPlegado({
  chapa: CHAPA_25C,
  desarrolloMm: 406,
  categoria: "canaleta",
});
assert.equal(col406.costoTira, 18303.28);
assert.equal(col406.costoMetro, 7501.34);
assert.equal(col406.precioNeto, 21003.76);
assert.equal(col406.precioPublico, 23104.14);
assert.equal(col406.precioRioCuarto, 36742.51);

const col305 = calcularPlegado({
  chapa: CHAPA_25C,
  desarrolloMm: 305,
  categoria: "canaleta",
});
assert.equal(col305.costoTira, 13750);
assert.equal(col305.costoMetro, 5635.25);
assert.equal(col305.precioNeto, 15778.69);
assert.equal(col305.precioPublico, 17356.56);
assert.equal(col305.precioRioCuarto, 27602.13);

const bab = calcularPlegado({
  chapa: CHAPA_25,
  desarrolloMm: 305,
  categoria: "babeta",
});
assert.equal(bab.manoObra, 1475.41);
assert.equal(bab.precioNeto, 8852.46);
assert.equal(bab.precioPublico, 9737.7);
assert.equal(bab.coeficienteGanancia, 2.64);

const tapa = calcularAccesorio({
  chapa: CHAPA_25C,
  desarrolloMm: 100,
  factorLargo: 0.5,
  multMaterial: 18,
  multManoObra: 3,
});
assert.equal(tapa.base, 923.81);
close(tapa.precioNeto, 19769.55);
close(tapa.precioPublico, 21746.51);

const base = colocacionBase(15122.71);
assert.equal(round2(base), 9073.63);
const col = colocacionSugerida("canaleta", base);
assert.equal(col.plantaBaja, 9073.63);
assert.equal(col.plantaAlta, 18147.25);

assert.equal(round2(11980.327868), 11980.33);

console.log("costeo.selftest OK — todos los casos Excel pasaron");
