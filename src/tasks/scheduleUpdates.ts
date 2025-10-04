// eslint-disable-next-line @typescript-eslint/no-require-imports
const cron = require("node-cron");

import { calculateRanking } from "@/services/ranking";
import { setDailyChallenge } from "@/services/challenge";

export const scheduleUpdates = () => {
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        await setDailyChallenge("english");
        await setDailyChallenge("portuguese");
        await setDailyChallenge("spanish");

        await calculateRanking("weekly");
        await calculateRanking("general");
      } catch (error) {
        console.error("[UpdateRankError]:", error);
      }
    },
    {
      timezone: "Europe/Paris",
    },
  );
};
