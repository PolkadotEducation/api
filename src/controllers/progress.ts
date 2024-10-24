import { Request, Response } from "express";
import { ProgressModel } from "@/models/Progress";
import { LessonModel } from "@/models/Lesson";
import { Course, CourseModel } from "@/models/Course";
import { UserModel } from "@/models/User";
import { Types } from "mongoose";
import { MongoError } from "mongodb";

export const submitAnswer = async (req: Request, res: Response) => {
  const { courseId, lessonId, choice, userId } = req.body;

  if (!courseId || !lessonId || (!choice && choice != 0) || !userId) {
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
      userId,
      choice,
      isCorrect,
      difficulty: lesson.difficulty,
    });
    if (newProgress) return res.status(200).send(newProgress);
  } catch (e) {
    if (e instanceof MongoError && e.code === 11000) {
      return res.status(409).send({
        error: {
          message: "E11000 duplicate key error",
        },
      });
    }

    errorMessage = (e as Error).message;
    console.error(`[ERROR][submitAnswer] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: errorMessage ? errorMessage : "Progress not created",
    },
  });
};

export const getLessonProgress = async (req: Request, res: Response) => {
  const { courseId, lessonId, userId } = req.params;

  if (!courseId || !lessonId || !userId) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  try {
    const progress = await ProgressModel.find({ courseId, lessonId, userId });
    return res.status(200).send(progress);
  } catch (e) {
    console.error(`[ERROR][getLessonProgress] ${JSON.stringify(e)}`);
    return res.status(500).send({ error: { message: "Internal server error" } });
  }
};

export const getCourseProgress = async (req: Request, res: Response) => {
  const { userId, courseId } = req.params;

  if (!userId || !courseId) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  try {
    const progress = await ProgressModel.find({ userId, courseId, isCorrect: true });
    const course = (await CourseModel.findOne({ _id: courseId }).populate({
      path: "modules",
      populate: {
        path: "lessons",
        model: "Lesson",
      },
    })) as Course;

    if (!course) {
      return res.status(400).send({ error: { message: "Course not found" } });
    }

    // not ideal, but it avoids complex type casting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalLessons = (course.modules as any[]).reduce((sum, module) => sum + (module.lessons as any[]).length, 0);
    const completedLessons = new Set(progress.map((p) => p.lessonId.toString())).size;
    const progressPercentage = (completedLessons / totalLessons) * 100;

    return res.status(200).send({
      totalLessons,
      completedLessons,
      progressPercentage,
    });
  } catch (e) {
    console.error(`[ERROR][getCourseProgress] ${JSON.stringify(e)}`);
    return res.status(500).send({ error: { message: "Internal server error" } });
  }
};

const EXP_POINTS = {
  hard: { perfect: 200, withMistakes: 100 },
  medium: { perfect: 100, withMistakes: 50 },
  easy: { perfect: 50, withMistakes: 25 },
};

type Difficulty = keyof typeof EXP_POINTS;

const calculateLevel = (exp: number): number => {
  let level = 0;
  while (10 * Math.pow(level, 2) + 100 * level + 150 < exp) {
    level++;
  }
  return level;
};

export const getUserXPAndLevel = async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).send({ error: { message: "Missing userId" } });
  }

  try {
    const user = await UserModel.findOne({ _id: userId });

    if (!user) {
      return res.status(400).send({ error: { message: "User not found" } });
    }

    const progress = await ProgressModel.aggregate([
      {
        $match: { userId: new Types.ObjectId(userId) },
      },
      {
        $group: {
          _id: {
            courseId: "$courseId",
            lessonId: "$lessonId",
            difficulty: "$difficulty",
          },
          count: { $sum: 1 },
          correctCount: { $sum: { $cond: ["$isCorrect", 1, 0] } },
        },
      },
      {
        $project: {
          courseId: "$_id.courseId",
          lessonId: "$_id.lessonId",
          difficulty: "$_id.difficulty",
          correctAtFirstTry: { $cond: [{ $eq: ["$count", 1] }, { $eq: ["$correctCount", 1] }, false] },
          isCorrect: { $gt: ["$correctCount", 0] },
          _id: 0,
        },
      },
    ]);

    let exp = 0;
    for (const p of progress) {
      if (p.isCorrect) {
        const difficulty = p.difficulty as Difficulty;
        const points = p.correctAtFirstTry ? EXP_POINTS[difficulty].perfect : EXP_POINTS[difficulty].withMistakes;
        exp += points;
      }
    }

    const level = calculateLevel(exp);

    return res.status(200).send({ exp, level });
  } catch (e) {
    console.error(`[ERROR][getUserXPAndLevel] ${JSON.stringify(e)}`);
    return res.status(500).send({ error: { message: "Internal server error" } });
  }
};
