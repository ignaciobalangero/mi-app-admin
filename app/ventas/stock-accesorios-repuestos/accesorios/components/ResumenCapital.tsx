"use client";

interface Props {
  totalUSD: number;
  totalPesos: number;
}

export default function ResumenCapital({ totalUSD, totalPesos }: Props) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 px-2 gap-2">
      <div className="text-lg font-semibold">
        💵 Capital en USD:<br />
        ${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </div>
      <div className="text-lg font-semibold">
        💰 Capital en pesos:<br />
        ${totalPesos.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
      </div>
    </div>
  );
}
