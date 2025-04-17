"use client";

import React, { useEffect, useState } from "react";

interface Props {
  totalUSD: number;
  totalPesos: number;
}

export default function ResumenCapital({ totalUSD, totalPesos }: Props) {
  const [valorDolarBlue, setValorDolarBlue] = useState(0);

  useEffect(() => {
    fetch("https://dolarapi.com/v1/dolares/blue")
      .then((res) => res.json())
      .then((data) => setValorDolarBlue(data.venta))
      .catch(() => setValorDolarBlue(0));
  }, []);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 px-2 gap-2">
      <div className="text-lg font-semibold">Capital en USD: ${totalUSD.toFixed(2)}</div>
      <div className="text-lg font-semibold">Capital en pesos: ${totalPesos.toLocaleString("es-AR")}</div>
      <div className="text-sm text-gray-700">💱 Dólar Blue: ${valorDolarBlue}</div>
    </div>
  );
}
