import { ImageResponse } from "next/og";

export const alt = "Gen-z AI affordable personal AI tutor for Indian students";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "72px", background: "linear-gradient(135deg, #f7f5ff 0%, #e8e2ff 48%, #d8f6ee 100%)", color: "#17132f" }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: "#6c4cff", marginBottom: 24 }}>GEN-Z AI · INDIA-FIRST LEARNING</div>
        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.08, maxWidth: 1000 }}>Your affordable personal AI tutor</div>
        <div style={{ fontSize: 32, marginTop: 30, maxWidth: 980, lineHeight: 1.35 }}>Guided Tuition · Photo Solve · PDF Study · Smart Revision · Multilingual support</div>
        <div style={{ fontSize: 28, marginTop: 52, fontWeight: 700 }}>genzstudy.in</div>
      </div>
    ),
    size
  );
}
