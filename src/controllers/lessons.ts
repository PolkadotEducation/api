import { Request, Response } from "express";
import { ObjectId } from "mongodb";

import { LessonModel } from "@/models/Lesson";
import { ChallengeModel } from "@/models/Challenge";

export const createLesson = async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const { title, language, slug, body, challenge, references } = req.body;
  if (!teamId || !title || !language || !slug || !body || !challenge) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  let errorMessage;
  try {
    const challengeExists = await ChallengeModel.findById(challenge);
    if (!challengeExists) {
      const error = { error: { message: "Challenge not found" } };
      console.error(error);
      return res.status(400).send(error);
    }

    if (challengeExists.language !== language) {
      const error = { error: { message: "Challenge language does not match lesson language" } };
      console.error(error);
      return res.status(400).send(error);
    }

    const newLesson = await LessonModel.create({
      teamId: new ObjectId(teamId as string),
      title,
      language,
      slug,
      body,
      challenge,
      references,
    });
    if (newLesson) {
      const populatedLesson = await LessonModel.findById(newLesson._id).populate("challenge");
      const lessonRecord = populatedLesson?.toObject();

      // Remove correct choice from challenge to prevent cheating
      if (
        lessonRecord?.challenge &&
        typeof lessonRecord.challenge === "object" &&
        "correctChoice" in lessonRecord.challenge
      ) {
        const challenge = lessonRecord.challenge as unknown as { correctChoice?: number };
        delete challenge.correctChoice;
      }

      return res.status(200).send(lessonRecord);
    }
  } catch (e) {
    errorMessage = (e as Error).message;
    console.error(`[ERROR][createLesson] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: errorMessage ? errorMessage : "Lesson not created",
    },
  });
};

export const updateLesson = async (req: Request, res: Response) => {
  const { teamId, id } = req.params;
  const { title, language, body, challenge, references } = req.body;

  if (!id || !teamId || !title || !language || !body || !challenge) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  let errorMessage;
  try {
    const challengeExists = await ChallengeModel.findById(challenge);
    if (!challengeExists) {
      const error = { error: { message: "Challenge not found" } };
      console.error(error);
      return res.status(400).send(error);
    }

    if (challengeExists.language !== language) {
      const error = { error: { message: "Challenge language does not match lesson language" } };
      console.error(error);
      return res.status(400).send(error);
    }

    const updatedLesson = await LessonModel.findOneAndUpdate(
      { _id: id, teamId: new ObjectId(teamId as string) },
      {
        title,
        language,
        body,
        challenge,
        references,
      },
      { new: true, runValidators: true },
    ).populate("challenge");

    if (updatedLesson) {
      const lessonRecord = updatedLesson.toObject();

      // Remove correct choice from challenge to prevent cheating
      if (
        lessonRecord.challenge &&
        typeof lessonRecord.challenge === "object" &&
        "correctChoice" in lessonRecord.challenge
      ) {
        const challenge = lessonRecord.challenge as unknown as { correctChoice?: number };
        delete challenge.correctChoice;
      }

      return res.status(200).send(lessonRecord);
    } else {
      const error = { error: { message: "Lesson not found" } };
      console.error(error);
      return res.status(404).send(error);
    }
  } catch (e) {
    errorMessage = (e as Error).message;
    console.error(`[ERROR][updateLesson] ${e}`);
  }

  return res.status(500).send({
    error: {
      message: errorMessage ? errorMessage : "Lesson not updated",
    },
  });
};

export const getLesson = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.query;
    if (!lessonId) {
      const error = { error: { message: "Missing lessonId" } };
      console.error(error);
      return res.status(400).send(error);
    }
    const lesson = await LessonModel.findOne({ _id: lessonId }).populate("challenge");
    if (lesson) {
      const lessonRecord = lesson.toObject();

      // Remove correct choice from challenge to prevent cheating
      if (
        lessonRecord.challenge &&
        typeof lessonRecord.challenge === "object" &&
        "correctChoice" in lessonRecord.challenge
      ) {
        const challenge = lessonRecord.challenge as unknown as { correctChoice?: number };
        delete challenge.correctChoice;
      }

      return res.status(200).send(lessonRecord);
    }
  } catch (e) {
    console.error(`[ERROR][getLesson] ${e}`);
  }

  const error = { error: { message: "Lesson not found" } };
  console.error(error);
  return res.status(400).send(error);
};

export const getLessons = async (req: Request, res: Response) => {
  try {
    const { teamId, language } = req.query;

    if (!teamId && !language) {
      const error = { error: { message: "Missing teamId or language" } };
      console.error(error);
      return res.status(400).send(error);
    }

    let query = {};
    if (teamId) query = { teamId: new ObjectId(teamId as string) };
    if (language) query = { ...query, language };

    const lessons = await LessonModel.find(query).populate("challenge");

    if (lessons.length > 0) {
      return res.status(200).send(lessons);
    } else {
      const error = { error: { message: "No lessons found for this language" } };
      console.error(error);
      return res.status(404).send(error);
    }
  } catch (e) {
    console.error(`[ERROR][getLessons] ${e}`);
    return res.status(500).send({
      error: {
        message: JSON.stringify(e),
      },
    });
  }
};

export const getLessonsSummary = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.query;

    let query = {};
    if (teamId) query = { teamId: new ObjectId(teamId as string) };

    const lessonsSummary = await LessonModel.find(query).select("_id title language updatedAt").lean();

    if (lessonsSummary.length > 0) {
      return res.status(200).send(lessonsSummary);
    } else {
      return res.status(204).send();
    }
  } catch (e) {
    console.error(`[ERROR][getLessonsSummary] ${e}`);
    return res.status(500).send({
      error: {
        message: JSON.stringify(e),
      },
    });
  }
};

export const deleteLesson = async (req: Request, res: Response) => {
  try {
    const { teamId, id: lessonId } = req.params;
    if (!teamId || !lessonId) {
      const error = { error: { message: "Missing teamId or lessonId" } };
      console.error(error);
      return res.status(400).send(error);
    }

    const result = await LessonModel.deleteOne({ _id: lessonId, teamId: new ObjectId(teamId as string) });
    if (result?.deletedCount > 0) {
      return res.status(200).send({ message: `Lesson '${lessonId}' deleted` });
    }
  } catch (e) {
    console.error(`[ERROR][deleteLesson] ${e}`);
  }

  const error = { error: { message: "Lesson not deleted" } };
  console.error(error);
  return res.status(400).send(error);
};

export const duplicateLessons = async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const { lessons } = req.body;

  if (!lessons || lessons.length <= 0) {
    const error = { error: { message: "Missing lessons to duplicate" } };
    console.error(error);
    return res.status(400).send(error);
  }

  try {
    const duplicatedLessonsIds = await Promise.all(
      lessons.map(async (id: string) => {
        const existingLesson = await LessonModel.findOne({ _id: id, teamId: new ObjectId(teamId as string) }).populate(
          "challenge",
        );

        if (!existingLesson) {
          throw new Error(`Lesson with id ${id} not found`);
        }

        // Generate new slug by incrementing number or adding "-1"
        const originalSlug = existingLesson.slug;
        const numberMatch = originalSlug.match(/^(.*?)(\d+)$/);
        const newSlug = numberMatch ? `${numberMatch[1]}${parseInt(numberMatch[2]) + 1}` : `${originalSlug}-1`;

        const duplicatedLesson = await LessonModel.create({
          teamId: existingLesson.teamId,
          title: existingLesson.title,
          language: existingLesson.language,
          slug: newSlug,
          body: existingLesson.body,
          challenge: existingLesson.challenge,
          references: existingLesson.references,
        });

        return duplicatedLesson._id;
      }),
    );

    return res.status(200).send(duplicatedLessonsIds);
  } catch (e) {
    console.error(`[ERROR][duplicateLesson] ${JSON.stringify(e)}`);
    return res.status(500).send({
      error: {
        message: (e as Error).message || "Lesson not duplicated",
      },
    });
  }
};
