import { Request, Response } from "express";
import { ObjectId } from "mongodb";

import { Lesson, LessonModel } from "@/models/Lesson";
import { getCache, setCache } from "@/helpers/cache";

export const createLesson = async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const { title, language, body, difficulty, challenge, references } = req.body;
  if (!teamId || !title || !language || !body || !difficulty || !challenge) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  let errorMessage;
  try {
    const newLesson = await LessonModel.create({
      teamId: new ObjectId(teamId as string),
      title,
      language,
      body,
      difficulty,
      challenge,
      references,
    });
    if (newLesson) return res.status(200).send(newLesson);
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
  const { title, language, body, difficulty, challenge, references } = req.body;

  if (!id || !teamId || !title || !language || !body || !difficulty || !challenge) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  let errorMessage;
  try {
    const updatedLesson = await LessonModel.findOneAndUpdate(
      { _id: id, teamId: new ObjectId(teamId as string) },
      {
        title,
        language,
        body,
        difficulty,
        challenge,
        references,
      },
      { new: true, runValidators: true },
    );

    if (updatedLesson) {
      return res.status(200).send(updatedLesson);
    } else {
      return res.status(404).send({ error: { message: "Lesson not found" } });
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
      return res.status(400).send({ error: { message: "Missing lessonId" } });
    }

    const cachedLesson = await getCache<Lesson>(`lesson:${lessonId}`);
    if (cachedLesson) {
      return res.status(200).send(cachedLesson);
    }

    const lesson = await LessonModel.findOne({ _id: lessonId });
    if (lesson) {
      const lessonRecord = lesson.toObject();

      // Remove correct choice from lesson to prevent cheating
      const { correctChoice: _correctChoice, ...challengeWithoutCorrectChoice } = lessonRecord.challenge;

      const lessonResponse = {
        ...lessonRecord,
        challenge: challengeWithoutCorrectChoice,
      };

      await setCache(`lesson:${lessonId}`, lessonResponse);

      return res.status(200).send(lessonResponse);
    }
  } catch (e) {
    console.error(`[ERROR][getLesson] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "Lesson not found",
    },
  });
};

export const getLessons = async (req: Request, res: Response) => {
  try {
    const { teamId, language } = req.query;

    if (!teamId && !language) {
      return res.status(400).send({ error: { message: "Missing teamId or language" } });
    }

    let query = {};
    if (teamId) query = { teamId: new ObjectId(teamId as string) };
    if (language) query = { ...query, language };

    const lessons = await LessonModel.find(query);

    if (lessons.length > 0) {
      return res.status(200).send(lessons);
    } else {
      return res.status(404).send({
        error: {
          message: "No lessons found for this language",
        },
      });
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

    const lessonsSummary = await LessonModel.find(query).select("_id title language").lean();

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
      return res.status(400).send({ error: { message: "Missing teamId or lessonId" } });
    }

    const result = await LessonModel.deleteOne({ _id: lessonId, teamId: new ObjectId(teamId as string) });
    if (result?.deletedCount > 0) {
      return res.status(200).send({ message: `Lesson '${lessonId}' deleted` });
    }
  } catch (e) {
    console.error(`[ERROR][deleteLesson] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "Lesson not deleted",
    },
  });
};

export const duplicateLessons = async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const { lessons } = req.body;

  if (!lessons || lessons.length <= 0) {
    return res.status(400).send({ error: { message: "Missing lessons to duplicate" } });
  }

  try {
    const duplicatedLessonsIds = await Promise.all(
      lessons.map(async (id: string) => {
        const existingLesson = await LessonModel.findOne({ _id: id, teamId: new ObjectId(teamId as string) });

        if (!existingLesson) {
          throw new Error(`Lesson with id ${id} not found`);
        }

        const duplicatedLesson = await LessonModel.create({
          teamId: existingLesson.teamId,
          title: existingLesson.title,
          language: existingLesson.language,
          body: existingLesson.body,
          difficulty: existingLesson.difficulty,
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
