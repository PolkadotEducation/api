import { ProgressModel } from "@/models/Progress";
import { UserModel } from "@/models/User";
import { RankingModel } from "@/models/Ranking";

export const calculateRanking = async (type: "weekly" | "general") => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  let matchCondition = {};
  if (type === "weekly") {
    matchCondition = { createdAt: { $gte: startOfWeek } };
  }

  const xpByDifficulty = {
    easy: 50,
    medium: 100,
    hard: 200,
  };

  const aggregationPipeline = [
    { $match: { ...matchCondition, isCorrect: true } },
    {
      $group: {
        _id: "$userId",
        totalXP: {
          $sum: {
            $switch: {
              branches: [
                { case: { $eq: ["$difficulty", "easy"] }, then: xpByDifficulty.easy },
                { case: { $eq: ["$difficulty", "medium"] }, then: xpByDifficulty.medium },
                { case: { $eq: ["$difficulty", "hard"] }, then: xpByDifficulty.hard },
              ],
              default: 0,
            },
          },
        },
      },
    },
  ];

  const results = await ProgressModel.aggregate(aggregationPipeline);

  const ranking = await Promise.all(
    results.map(async (result) => {
      const user = await UserModel.findById(result._id).select("name picture");
      return {
        userId: result._id.toString(),
        name: user?.name || "Unknown",
        picture: user?.picture || "",
        xp: result.totalXP,
      };
    }),
  );

  ranking.sort((a, b) => b.xp - a.xp);

  await RankingModel.updateOne({ type }, { type, lastUpdated: new Date(), ranking }, { upsert: true });
};
