import cors from "cors";
import { env } from "@/environment";

export default function () {
  if (env.NODE_ENV === "test") return cors();
  const allowedOrigins = [env.APP_URL, "http://localhost:3000", "http://0.0.0.0:3000"];
  return cors({
    credentials: true,
    origin: (origin, callback) => {
      if (origin && allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error(`[ERROR][CORS] Origin: ${origin} is not allowed`);
        callback(new Error("Not allowed by CORS"));
      }
    },
  });
}
