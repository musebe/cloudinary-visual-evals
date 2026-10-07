import { io } from "next/cache";

import { createHealthResponse } from "@/lib/cloudinary/health";

export async function GET() {
  await io();

  return createHealthResponse(process.env, new Date());
}
