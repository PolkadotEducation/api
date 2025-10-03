import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { ChallengeModel } from "@/models/Challenge";
import { DailyChallengeModel } from "@/models/DailyChallenge";
import { setDailyChallenge } from "@/services/challenge";

export const createChallenge = async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const { question, choices, correctChoice, difficulty, language } = req.body;

  if (!teamId || !question || !choices || correctChoice === undefined || !difficulty || !language) {
    const error = { error: { message: "Missing required parameters" } };
    console.error(error);
    return res.status(400).send(error);
  }

  try {
    const newChallenge = await ChallengeModel.create({
      teamId: new ObjectId(teamId as string),
      question,
      choices,
      correctChoice,
      difficulty: difficulty.toLowerCase(),
      language,
    });

    return res.status(201).send(newChallenge);
  } catch (e) {
    console.error(`[ERROR][createChallenge] ${e}`);
    return res.status(400).send({
      error: {
        message: (e as Error).message || "Challenge not created",
      },
    });
  }
};

export const updateChallenge = async (req: Request, res: Response) => {
  const { teamId, id } = req.params;
  const { question, choices, correctChoice, difficulty, language } = req.body;

  if (!id || !teamId || !question || !choices || correctChoice === undefined || !difficulty || !language) {
    const error = { error: { message: "Missing required parameters" } };
    console.error(error);
    return res.status(400).send(error);
  }

  try {
    const updatedChallenge = await ChallengeModel.findOneAndUpdate(
      { _id: id, teamId: new ObjectId(teamId as string) },
      { question, choices, correctChoice, difficulty: difficulty.toLowerCase(), language },
      { new: true, runValidators: true },
    );

    if (updatedChallenge) {
      return res.status(200).send(updatedChallenge);
    } else {
      const error = { error: { message: "Challenge not found" } };
      console.error(error);
      return res.status(404).send(error);
    }
  } catch (e) {
    console.error(`[ERROR][updateChallenge] ${e}`);
    return res.status(500).send({
      error: {
        message: (e as Error).message || "Challenge not updated",
      },
    });
  }
};

export const getDailyChallenge = async (req: Request, res: Response) => {
  try {
    const { language } = req.body as { language?: string };
    if (!language) {
      const error = { error: { message: "Missing language" } };
      console.error(error);
      return res.status(400).send(error);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);


    let dailyChallengeEntry = await DailyChallengeModel.findOne({
      date: today,
      language,
    }).populate("challenge");


    if (!dailyChallengeEntry) {
      console.error(`Daily challenge not found for ${language} on ${today.toISOString()}, setting it now`);
      await setDailyChallenge();


      dailyChallengeEntry = await DailyChallengeModel.findOne({
        date: today,
        language,
      }).populate("challenge");
    }

    if (!dailyChallengeEntry || !dailyChallengeEntry.challenge) {
      return res.status(200).send({ daily: null });
    }

    return res.status(200).send({ daily: dailyChallengeEntry.challenge });
  } catch (e) {
    console.error(`[ERROR][getDailyChallenge] ${e}`);
    return res.status(400).send({
      error: {
        message: "Daily challenge not found",
      },
    });
  }
};

export const getRandomChallenges = async (req: Request, res: Response) => {
  try {
    const { language, size } = req.body as { language?: string; size?: number };
    if (!language) {
      const error = { error: { message: "Missing language" } };
      console.error(error);
      return res.status(400).send(error);
    }

    const sampleSize = typeof size === "number" && size > 0 ? size : 5;
    const randomChallenges = await ChallengeModel.aggregate([
      { $match: { language } },
      { $sample: { size: sampleSize } },
    ]);

    return res.status(200).send({ random: randomChallenges });
  } catch (e) {
    console.error(`[ERROR][getRandomChallenges] ${e}`);
    return res.status(400).send({
      error: {
        message: "Random challenges not found",
      },
    });
  }
};

export const getChallenge = async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.query;
    if (!challengeId) {
      const error = { error: { message: "Missing challengeId" } };
      console.error(error);
      return res.status(400).send({ error: { message: "Missing challengeId" } });
    }

    const challenge = await ChallengeModel.findById(challengeId);
    if (challenge) {
      return res.status(200).send(challenge);
    }

    const error = { error: { message: "Challenge not found" } };
    console.error(error);
    return res.status(404).send(error);
  } catch (e) {
    console.error(`[ERROR][getChallenge] ${e}`);
    return res.status(400).send({
      error: {
        message: "Challenge not found",
      },
    });
  }
};

export const deleteChallenge = async (req: Request, res: Response) => {
  try {
    const { teamId, id } = req.params;
    if (!teamId || !id) {
      const error = { error: { message: "Missing teamId or challenge ID" } };
      console.error(error);
      return res.status(400).send(error);
    }

    const result = await ChallengeModel.deleteOne({ _id: id, teamId: new ObjectId(teamId as string) });
    if (result?.deletedCount > 0) {
      return res.status(200).send({ message: `Challenge '${id}' deleted` });
    }

    const error = { error: { message: "Challenge not found" } };
    console.error(error);
    return res.status(404).send({ error: { message: "Challenge not found" } });
  } catch (e) {
    console.error(`[ERROR][deleteChallenge] ${e}`);
    return res.status(400).send({
      error: {
        message: "Challenge not deleted",
      },
    });
  }
};

export const getBackofficeChallenges = async (req: Request, res: Response) => {
  try {
    const { language } = req.query;
    let query = {};
    if (language) {
      query = { language };
    }

    const challenges = await ChallengeModel.find(query);

    if (challenges.length > 0) {
      return res.status(200).send(challenges);
    } else {
      return res.status(204).send();
    }
  } catch (e) {
    console.error(`[ERROR][getBackofficeChallenges] ${e}`);
    return res.status(500).send({
      error: {
        message: JSON.stringify(e),
      },
    });
  }
};

export const getChallengesSummary = async (req: Request, res: Response) => {
  try {
    const { language } = req.query;
    let query = {};
    if (language) {
      query = { language };
    }

    const challengesSummary = await ChallengeModel.find(query)
      .select("_id question difficulty language updatedAt")
      .lean();

    if (challengesSummary.length > 0) {
      return res.status(200).send(challengesSummary);
    } else {
      return res.status(204).send();
    }
  } catch (e) {
    console.error(`[ERROR][getChallengesSummary] ${e}`);
    return res.status(500).send({
      error: {
        message: JSON.stringify(e),
      },
    });
  }
};
