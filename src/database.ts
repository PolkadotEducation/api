import mongoose from "mongoose";
import { env } from "./environment";

export const setupMongoDB = async (db: string) => {
  try {
    const url = new URL(env.MONGODB_URI);
    url.pathname = `${url.pathname.replace(/\/$/, "")}/${db}`;
    const uri = url.toString();
    // eslint-disable-next-line no-console
    console.info(`MONGODB_URI: ${uri}`);
    await mongoose.connect(uri);
  } catch (e) {
    console.error(e);
  }
};
