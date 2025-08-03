import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { ChallengeModel } from "@/models/Challenge";

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
      difficulty,
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
      { question, choices, correctChoice, difficulty, language },
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

export const getChallenges = async (req: Request, res: Response) => {
  try {
    const totalRows = await ChallengeModel.countDocuments({});

    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const dailyIndex = (dayOfYear * 31 + 17) % totalRows;
    const dailyChallenge = await ChallengeModel.findOne().skip(dailyIndex).exec();

    const randomChallenges = await ChallengeModel.aggregate([{ $sample: { size: 5 } }]);

    const challenges = {
      daily: dailyChallenge,
      random: randomChallenges,
    };

    return res.status(200).send({ challenges });
  } catch (e) {
    console.error(`[ERROR][getChallenges] ${e}`);
    return res.status(400).send({
      error: {
        message: "Challenges not found",
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

export const getChallengesSummary = async (req: Request, res: Response) => {
  try {
    const { language } = req.query;
    let query = {};
    if (language) {
      query = { language };
    }

    const challengesSummary = await ChallengeModel.find(query)
      .select("_id questionb difficulty language updatedAt")
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
