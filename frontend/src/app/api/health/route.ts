import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://127.0.0.1:8765/health");
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({
      status: "offline",
      device: "NVIDIA GeForce RTX 4090",
      error: "GPU backend on port 8765 unreachable",
    });
  }
}
