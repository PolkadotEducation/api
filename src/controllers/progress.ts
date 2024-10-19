import { Request, Response } from "express";
import { ProgressModel } from "@/models/Progress";
import { LessonModel } from "@/models/Lesson";
import { CourseModel } from "@/models/Course";

export const submitAnswer = async (req: Request, res: Response) => {
  const { courseId, lessonId, choice } = req.body;
  if (!courseId || !lessonId || !choice) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  const lesson = await LessonModel.findOne({ _id: lessonId });
  if (!lesson) {
    return res.status(400).send({ error: { message: "Lesson not found" } });
  }

  const course = await CourseModel.findOne({ _id: courseId });
  if (!course) {
    return res.status(400).send({ error: { message: "Course not found" } });
  }

  const isCorrect = choice === lesson.challenge.correctChoice;

  let errorMessage;
  try {
    const newProgress = await ProgressModel.create({
      courseId,
      lessonId,
      choice,
      isCorrect,
    });
    if (newProgress) return res.status(200).send(newProgress);
  } catch (e) {
    errorMessage = (e as Error).message;
    console.error(`[ERROR][submitAnswer] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: errorMessage ? errorMessage : "Progress not created",
    },
  });
};
