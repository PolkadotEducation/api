// eslint-disable-next-line @typescript-eslint/no-require-imports
const cron = require("node-cron");

import { calculateRanking } from "@/services/ranking";

export const scheduleRankingUpdate = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      await calculateRanking("weekly");
      await calculateRanking("general");
    } catch (error) {
      console.error("[UpdateRankError]:", error);
    }
  });
};
