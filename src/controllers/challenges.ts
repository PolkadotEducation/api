import { Request, Response } from "express";
import { ChallengeModel } from "@/models/Challenge";

export const createChallenge = async (req: Request, res: Response) => {
  const { question, choices, correctChoice } = req.body;

  if (!question || !choices || correctChoice === undefined) {
    return res.status(400).send({ error: { message: "Missing required parameters" } });
  }

  try {
    const newChallenge = await ChallengeModel.create({
      question,
      choices,
      correctChoice,
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
  const { id } = req.params;
  const { question, choices, correctChoice } = req.body;

  if (!id || !question || !choices || correctChoice === undefined) {
    return res.status(400).send({ error: { message: "Missing required parameters" } });
  }

  try {
    const updatedChallenge = await ChallengeModel.findOneAndUpdate(
      { _id: id },
      { question, choices, correctChoice },
      { new: true, runValidators: true },
    );

    if (updatedChallenge) {
      return res.status(200).send(updatedChallenge);
    } else {
      return res.status(404).send({ error: { message: "Challenge not found" } });
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
    const { id } = req.params;
    if (!id) {
      return res.status(400).send({ error: { message: "Missing challenge ID" } });
    }

    const challenge = await ChallengeModel.findById(id);
    if (challenge) {
      return res.status(200).send(challenge);
    }
    return res.status(404).send({ error: { message: "Challenge not found" } });
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
    const { id } = req.params;
    if (!id) {
      return res.status(400).send({ error: { message: "Missing challenge ID" } });
    }

    const result = await ChallengeModel.deleteOne({ _id: id });
    if (result?.deletedCount > 0) {
      return res.status(200).send({ message: `Challenge '${id}' deleted` });
    }
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
