import { Request, Response } from "express";
import { ProgressModel } from "@/models/Progress";
import { Lesson, LessonModel } from "@/models/Lesson";
import { Course, CourseModel } from "@/models/Course";
import { UserModel } from "@/models/User";
import { Types } from "mongoose";
import { MongoError } from "mongodb";
import { Module } from "@/models/Module";
import { calculateExperience, calculateLevel, calculateXpToNextLevel, Difficulty } from "@/helpers/progress";
import { countCorrectAnswers } from "@/helpers/achievements";
import { ChallengeModel } from "@/models/Challenge";

export const submitAnswer = async (req: Request, res: Response) => {
  const { courseId, lessonId, choice } = req.body;

  const userId = res.locals?.populatedUser?._id;

  if (!courseId || !lessonId || (!choice && choice != 0) || !userId) {
    const error = { error: { message: "Missing params" } };
    console.error(error);
    return res.status(400).send(error);
  }

  const lesson = await LessonModel.findOne({ _id: lessonId });
  if (!lesson) {
    const error = { error: { message: "Lesson not found" } };
    console.error(error);
    return res.status(400).send(error);
  }

  const course = await CourseModel.findOne({ _id: courseId });
  if (!course) {
    const error = { error: { message: "Course not found" } };
    console.error(error);
    return res.status(400).send(error);
  }

  // prevent the user from submitting again if the lesson is already complete
  const progress = await ProgressModel.findOne({ courseId, lessonId, userId, isCorrect: true });
  if (progress) return res.status(200).send({ progress, points: 0 });

  let correctAtFirstTry = true;
  const wrongAnswer = await ProgressModel.findOne({ courseId, lessonId, userId, isCorrect: false });
  if (wrongAnswer) correctAtFirstTry = false;

  const challenge = await ChallengeModel.findOne({ _id: lesson.challenge });
  if (!challenge) {
    const error = { error: { message: "Challenge not found" } };
    console.error(error);
    return res.status(400).send(error);
  }

  const isCorrect = choice === challenge.correctChoice;
  // Update Correct Answers Counter (Achievements).
  await countCorrectAnswers(userId, isCorrect);

  const points = isCorrect ? calculateExperience(challenge.difficulty as Difficulty, correctAtFirstTry) : 0;

  let errorMessage;
  try {
    const newProgress = await ProgressModel.create({
      courseId,
      lessonId,
      userId,
      choice,
      isCorrect,
      difficulty: challenge.difficulty,
      challengeId: challenge._id,
    });
    if (newProgress)
      return res.status(201).send({
        progress: newProgress,
        points,
      });
  } catch (e) {
    if (e instanceof MongoError && e.code === 11000) {
      const error = { error: { message: "E11000 duplicate key error" } };
      console.error(error);
      return res.status(409).send(error);
    }

    errorMessage = (e as Error).message;
    console.error(`[ERROR][submitAnswer] ${e}`);
  }

  const error = { error: { message: errorMessage ? errorMessage : "Progress not created" } };
  console.error(error);
  return res.status(400).send(error);
};

export const getLessonProgress = async (req: Request, res: Response) => {
  const { courseId, lessonId } = req.params;

  const userId = res.locals?.populatedUser?._id;

  if (!courseId || !lessonId || !userId) {
    const error = { error: { message: "Missing params" } };
    console.error(error);
    return res.status(400).send(error);
  }

  try {
    const progress = await ProgressModel.find({ courseId, lessonId, userId });
    return res.status(200).send(progress);
  } catch (e) {
    console.error(`[ERROR][getLessonProgress] ${e}`);
    return res.status(500).send({ error: { message: "Internal server error" } });
  }
};

export const getCourseSummary = async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const userId = res.locals?.populatedUser;

  if (!userId || !courseId) {
    const error = { error: { message: "Missing params" } };
    console.error(error);
    return res.status(400).send(error);
  }

  try {
    const progress = await ProgressModel.aggregate([
      {
        $match: { userId: new Types.ObjectId(userId as string), courseId: new Types.ObjectId(courseId) },
      },
      {
        $group: {
          _id: {
            lessonId: "$lessonId",
            difficulty: "$difficulty",
          },
          count: { $sum: 1 },
          correctCount: { $sum: { $cond: ["$isCorrect", 1, 0] } },
        },
      },
      {
        $project: {
          lessonId: "$_id.lessonId",
          difficulty: "$_id.difficulty",
          correctAtFirstTry: { $cond: [{ $eq: ["$count", 1] }, { $eq: ["$correctCount", 1] }, false] },
          isCorrect: { $gt: ["$correctCount", 0] },
          _id: 0,
        },
      },
    ]);

    const course = (await CourseModel.findOne({ _id: courseId }).populate({
      path: "modules",
      populate: {
        path: "lessons",
        model: "Lesson",
        populate: {
          path: "challenge",
          model: "Challenge",
        },
      },
    })) as Course;

    if (!course) {
      const error = { error: { message: "Course not found" } };
      console.error(error);
      return res.status(400).send(error);
    }

    const progressMap = new Map(progress.map((p) => [String(p.lessonId), p]));

    const courseSummary = {
      id: course._id,
      title: course.title,
      modules: course.modules.map((module) => {
        const populatedModule = module as Module & { lessons: Lesson[] };

        const lessons = populatedModule.lessons.map((lesson) => {
          const populatedLesson = lesson as Lesson & { challenge: { difficulty: string } };
          const challenge = populatedLesson.challenge;

          const progressRecord = progressMap.get(String(populatedLesson._id));
          const isCompleted = progressRecord?.isCorrect || false;
          const correctAtFirstTry = progressRecord?.correctAtFirstTry || false;

          return {
            id: populatedLesson._id,
            title: populatedLesson.title,
            difficulty: challenge.difficulty,
            expEarned: isCompleted ? calculateExperience(challenge.difficulty as Difficulty, correctAtFirstTry) : 0,
          };
        });

        return {
          title: populatedModule.title,
          isCompleted: lessons.every((lesson) => lesson.expEarned > 0),
          lessons,
        };
      }),
    };

    return res.status(200).send({ courseSummary });
  } catch (e) {
    console.error(`[ERROR][getCourseSummary] ${e}`);
    return res.status(500).send({ error: { message: "Internal server error" } });
  }
};

export const getCourseProgress = async (req: Request, res: Response) => {
  const { courseId } = req.params;

  const userId = res.locals?.populatedUser;

  if (!userId || !courseId) {
    const error = { error: { message: "Missing params" } };
    console.error(error);
    return res.status(400).send(error);
  }

  try {
    const progress = await ProgressModel.find({ userId, courseId, isCorrect: true });
    const course = (await CourseModel.findOne({ _id: courseId }).populate({
      path: "modules",
      populate: {
        path: "lessons",
        model: "Lesson",
        populate: {
          path: "challenge",
          model: "Challenge",
        },
      },
    })) as Course;

    if (!course) {
      const error = { error: { message: "Course not found" } };
      console.error(error);
      return res.status(400).send(error);
    }

    const totalLessons = course.modules.reduce((sum, module) => {
      const populatedModule = module as Module & { lessons: Lesson[] };
      return sum + populatedModule.lessons.length;
    }, 0);
    const completedLessonsSet = new Set(progress.map((p) => p.lessonId.toString()));
    const completedLessons = completedLessonsSet.size;
    const progressPercentage = (completedLessons / totalLessons) * 100;

    const modulesProgress: Record<string, Record<string, boolean>> = {};
    (course.modules as Module[]).forEach((module) => {
      const moduleId = module?._id?.toString();
      if (!moduleId) return;
      modulesProgress[moduleId] = {};
      (module.lessons as Lesson[]).forEach((lesson) => {
        const lessonId = lesson?._id?.toString();
        if (!lessonId) return;
        modulesProgress[moduleId][lessonId] = completedLessonsSet.has(lessonId);
      });
    });

    return res.status(200).send({
      totalLessons,
      completedLessons,
      progressPercentage,
      modulesProgress,
    });
  } catch (e) {
    console.error(`[ERROR][getCourseProgress] ${e}`);
    return res.status(500).send({ error: { message: "Internal server error" } });
  }
};

export const getUserXPAndLevel = async (_req: Request, res: Response) => {
  const userId = res.locals?.populatedUser?._id;

  if (!userId) {
    const error = { error: { message: "Missing userId" } };
    console.error(error);
    return res.status(400).send(error);
  }

  try {
    const user = await UserModel.findOne({ _id: userId });

    if (!user) {
      const error = { error: { message: "User not found" } };
      console.error(error);
      return res.status(400).send(error);
    }

    const progress = await ProgressModel.aggregate([
      {
        $match: { userId: new Types.ObjectId(userId as string) },
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
        const points = calculateExperience(difficulty, p.correctAtFirstTry);
        exp += points;
      }
    }

    const level = calculateLevel(exp);
    const xpToNextLevel = calculateXpToNextLevel(exp, level);

    return res.status(200).send({ level, xp: exp, xpToNextLevel });
  } catch (e) {
    console.error(`[ERROR][getUserXPAndLevel] ${e}`);
    return res.status(500).send({ error: { message: "Internal server error" } });
  }
};

export const getCompletedCoursesByUserId = async (
  userId: string,
): Promise<Array<{ courseId: string; courseTitle: string }>> => {
  const courses = await CourseModel.find({}).populate<{
    modules: Array<Module & { lessons: Lesson[] }>;
  }>({
    path: "modules",
    populate: { path: "lessons", model: "Lesson" },
  });

  const completedCourses: Array<{ courseId: string; courseTitle: string; courseBanner: string }> = [];

  for (const course of courses) {
    const allLessonIds = (course.modules ?? []).flatMap((module) =>
      (module.lessons ?? []).map((lesson) => (typeof lesson === "string" ? lesson : lesson._id.toString())),
    );

    const userProgress = await ProgressModel.find({
      courseId: course._id,
      userId,
      isCorrect: true,
      lessonId: { $in: allLessonIds },
    }).select("lessonId");

    const completedLessonIds = userProgress.map((progress) => progress.lessonId.toString());

    const isCompleted = allLessonIds.every((lessonId) => completedLessonIds.includes(lessonId));

    if (isCompleted) {
      completedCourses.push({ courseId: course._id, courseTitle: course.title, courseBanner: course.banner });
    }
  }

  return completedCourses;
};

export const getCompletedCourses = async (_req: Request, res: Response) => {
  const userId = res.locals?.populatedUser?._id;

  if (!userId) {
    const error = { error: { message: "Missing userId" } };
    console.error(error);
    return res.status(400).send(error);
  }

  try {
    const completedCourses = await getCompletedCoursesByUserId(userId);

    return res.status(200).send(completedCourses);
  } catch (e) {
    console.error(`[ERROR][getCompletedCourses] ${JSON.stringify(e)}`);
    return res.status(500).send({ error: { message: "Internal server error" } });
  }
};
