import { calculateRanking } from "@/services/ranking";

(async () => {
  try {
    await calculateRanking("weekly");
    await calculateRanking("general");
  } catch (error) {
    console.error("Error updating ranking:", error);
  }
})();
