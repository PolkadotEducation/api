import { ChallengeModel } from "@/models/Challenge";
import { DailyChallengeModel } from "@/models/DailyChallenge";

export const setDailyChallenge = async (language: string) => {
  const normalizedDate = new Date();
  normalizedDate.setHours(0, 0, 0, 0);

  const startOfYear = new Date(normalizedDate.getFullYear(), 0, 0);
  const diff = normalizedDate.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  try {
    const existing = await DailyChallengeModel.findOne({
      date: normalizedDate,
      language,
    });

    if (existing) {
      console.error(`Daily challenge for ${language} on ${normalizedDate.toISOString()} already exists`);
      return { language, status: "exists", challenge: existing };
    }

    const totalRows = await ChallengeModel.countDocuments({ language });

    if (totalRows === 0) {
      console.error(`No challenges found for language: ${language}`);
      return { language, status: "no_challenges", challenge: null };
    }

    const dailyIndex = (dayOfYear * 31 + 17) % totalRows;
    const selectedChallenge = await ChallengeModel.findOne({ language }).skip(dailyIndex).exec();

    if (!selectedChallenge) {
      console.error(`Failed to select challenge for language: ${language}`);
      return { language, status: "selection_failed", challenge: null };
    }

    const dailyChallenge = await DailyChallengeModel.create({
      challenge: selectedChallenge._id,
      date: normalizedDate,
      language,
    });

    return { language, status: "created", challenge: dailyChallenge };
  } catch (error) {
    console.error(`Error setting daily challenge for ${language}:`, error);
    return { language, status: "error", error, challenge: null };
  }
};
