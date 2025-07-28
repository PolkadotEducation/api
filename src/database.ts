import mongoose from "mongoose";
import { env } from "./environment";

export const setupMongoDB = async (db: string) => {
  try {
    const uri = `${env.MONGODB_URI}/${db}`;
    // eslint-disable-next-line no-console
    console.info(`MONGODB_URI: ${uri}`);
    await mongoose.connect(uri);
  } catch (e) {
    console.error(e);
  }
};
