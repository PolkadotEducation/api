import { Request, Response } from "express";
import { LessonModel } from "@/models/Lesson";

export const createLesson = async (req: Request, res: Response) => {
  const { title, language, body, difficulty, challenge, references } = req.body;
  if (!title || !language || !body || !difficulty || !challenge) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  let errorMessage;
  try {
    const newLesson = await LessonModel.create({
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
    console.error(`[ERROR][createLesson] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: errorMessage ? errorMessage : "Lesson not created",
    },
  });
};

export const updateLesson = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, language, body, difficulty, challenge, references } = req.body;

  if (!id || !title || !language || !body || !difficulty || !challenge) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  let errorMessage;
  try {
    const updatedLesson = await LessonModel.findByIdAndUpdate(
      id,
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
    console.error(`[ERROR][updateLesson] ${JSON.stringify(e)}`);
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
    const lesson = await LessonModel.findOne({ _id: lessonId });
    if (lesson) return res.status(200).send(lesson);
  } catch (e) {
    console.error(`[ERROR][getLesson] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "Lesson not found",
    },
  });
};

export const getLessonsByLanguage = async (req: Request, res: Response) => {
  try {
    const { language } = req.query;

    if (!language) {
      return res.status(400).send({ error: { message: "Missing language" } });
    }

    const lessons = await LessonModel.find({ language: language });

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
    console.error(`[ERROR][getLessonsByLanguage] ${JSON.stringify(e)}`);
    return res.status(500).send({
      error: {
        message: JSON.stringify(e),
      },
    });
  }
};

export const deleteLesson = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.body;
    if (!lessonId) {
      return res.status(400).send({ error: { message: "Missing lessonId" } });
    }

    const result = await LessonModel.deleteOne({ _id: lessonId });
    if (result?.deletedCount > 0) {
      return res.status(200).send({ message: `Lesson '${lessonId}' deleted` });
    }
  } catch (e) {
    console.error(`[ERROR][deleteLesson] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "Lesson not deleted",
    },
  });
};
