import mongoose from "mongoose";
import { env } from "./environment";

export const setupMongoDB = async (uri: string = env.MONGODB_URI) => {
  try {
    // eslint-disable-next-line no-console
    console.info(`MONGODB_URI: ${uri}`);
    await mongoose.connect(uri);
  } catch (e) {
    console.error(e);
  }
};
