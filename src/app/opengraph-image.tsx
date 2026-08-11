import { ImageResponse } from "next/og";

export const alt = "PAMPA — Gestión comercial para tu negocio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ background: "#000000", color: "#ddffdc", display: "flex", height: "100%", padding: "72px", position: "relative", width: "100%" }}>
      <div style={{ border: "1px solid #485346", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px", width: "100%" }}>
        <div style={{ color: "#7fee64", display: "flex", fontSize: 22, letterSpacing: 4 }}>VENTAS · STOCK · CLIENTES · PAGOS</div>
        <div style={{ display: "flex", flexDirection: "column" }}><div style={{ fontSize: 112, fontWeight: 500, letterSpacing: -9 }}>PAMPA.</div><div style={{ color: "#8cab87", fontSize: 38, marginTop: 12 }}>Gestión comercial para tu negocio</div></div>
      </div>
    </div>,
    size,
  );
}
