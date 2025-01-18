import { Request, Response } from "express";
import { RankingModel } from "@/models/Ranking";
import { calculateRanking } from "@/services/ranking";

export const getRanking = async (req: Request, res: Response) => {
  const type = req.query.type as "weekly" | "general";

  if (!type || !["weekly", "general"].includes(type)) {
    return res.status(400).send({ error: { message: "Invalid ranking type. Valid types are 'weekly' or 'general'." } });
  }

  try {
    let ranking = await RankingModel.findOne({ type }).select("ranking lastUpdated").lean();

    if (!ranking) {
      await calculateRanking(type);
      ranking = await RankingModel.findOne({ type }).select("ranking lastUpdated").lean();

      if (!ranking) {
        return res.status(500).send({ error: { message: "Failed to calculate ranking. Please try again." } });
      }
    }

    return res.status(200).send({
      type,
      lastUpdated: ranking.lastUpdated,
      ranking: ranking.ranking,
    });
  } catch (error) {
    console.error(`[ERROR][getRanking] Failed to fetch ranking for type '${type}':`, error);
    return res.status(500).send({ error: { message: "Internal server error. Please try again later." } });
  }
};
