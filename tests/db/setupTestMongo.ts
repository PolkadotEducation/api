import mongoose from "mongoose";
import { setupMongoDB } from "../../src/database";

let isMongoSettingUp = false;
let isMongoReady = false;
export const mongoDBsetup = async (db: string, disconnect: boolean = false) => {
  if (disconnect) {
    await mongoose.disconnect();
    return;
  }
  if (!isMongoSettingUp) {
    isMongoSettingUp = true;
    await setupMongoDB(`mongodb://0.0.0.0:27777/${db}`);
    isMongoReady = true;
  }
  while (!isMongoReady) {
    await new Promise((r) => {
      setTimeout(r, 100);
    });
  }
};
