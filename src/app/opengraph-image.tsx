import { ImageResponse } from "next/og";

export const alt = "PAMPA — ERP inteligente para empresas argentinas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ background: "#0b0d0a", color: "#f2f1e8", display: "flex", height: "100%", padding: "72px", position: "relative", width: "100%" }}>
      <div style={{ border: "1px solid rgba(255,255,255,.12)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px", width: "100%" }}>
        <div style={{ color: "#b8e26b", display: "flex", fontSize: 22, letterSpacing: 4 }}>EN DESARROLLO · BETA PRIVADA 28.08.2026</div>
        <div style={{ display: "flex", flexDirection: "column" }}><div style={{ fontSize: 112, fontWeight: 700, letterSpacing: -9 }}>PAMPA.</div><div style={{ color: "#a7aa9d", fontSize: 38, marginTop: 12 }}>ERP inteligente para empresas argentinas</div></div>
      </div>
    </div>,
    size,
  );
}
