import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const size = request.nextUrl.searchParams.get("size") === "192" ? 192 : 512;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#4f46e5", borderRadius: size * 0.19 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#ffffff", fontSize: size * 0.24, fontWeight: 900, letterSpacing: -size * 0.012 }}>
        <span>Gen-Z</span><span style={{ fontSize: size * 0.18 }}>AI</span>
      </div>
    </div>,
    { width: size, height: size }
  );
}
