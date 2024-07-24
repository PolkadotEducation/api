import cors from "cors";
import { env } from "@/environment";

export default function () {
  const allowedOrigins = [String(env.APP_URL), /\.polkadot\.education$/];
  return cors({
    credentials: true,
    origin: allowedOrigins,
  });
}
