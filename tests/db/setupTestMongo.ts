import mongoose from "mongoose";
import { setupMongoDB } from "../../src/database";

let isMongoSettingUp = false;
let isMongoReady = false;
export const mongoDBsetup = async (db: string, disconnect: boolean = false) => {
  if (disconnect) {
    await mongoose.disconnect();
    isMongoSettingUp = false;
    isMongoReady = false;
    return;
  }
  if (!isMongoSettingUp) {
    isMongoSettingUp = true;
    await setupMongoDB(db);
    isMongoReady = true;
  }
  while (!isMongoReady) {
    await new Promise((r) => {
      setTimeout(r, 100);
    });
  }
};
