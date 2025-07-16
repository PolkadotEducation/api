import { Request, Response } from "express";
import { ObjectId } from "mongodb";

import { CourseModel } from "@/models/Course";
import { ModuleModel } from "@/models/Module";
import { LessonModel } from "@/models/Lesson";

export const createCourse = async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const { title, language, summary, modules, banner } = req.body;

  if (!teamId || !title || !language || !summary || !modules || !banner) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  try {
    const createdModules = await Promise.all(
      modules.map(async (module: { title: string; lessons: { _id: string; title: string }[] }) => {
        if (!module.title || !Array.isArray(module.lessons)) {
          throw new Error("Each module must have a title and a valid lessons array");
        }

        const lessonIds = await Promise.all(
          module.lessons.map(async (lesson) => {
            if (!lesson._id) {
              throw new Error(`Lesson ${lesson.title || "unknown"} is missing an ID`);
            }
            const existingLesson = await LessonModel.findById(lesson._id);
            if (!existingLesson) {
              throw new Error(`Lesson with ID ${lesson._id} not found`);
            }
            return existingLesson._id;
          }),
        );

        const newModule = await ModuleModel.create({
          teamId: new ObjectId(teamId as string),
          title: module.title,
          lessons: lessonIds,
        });

        return newModule._id;
      }),
    );

    const newCourse = await CourseModel.create({
      teamId: new ObjectId(teamId as string),
      title,
      language,
      summary,
      modules: createdModules,
      banner,
    });

    if (newCourse) {
      return res.status(200).send(newCourse);
    }
  } catch (e) {
    console.error(`[ERROR][createCourse] ${e}`);
    return res.status(400).send({
      error: {
        message: (e as Error).message || "Course not created",
      },
    });
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  const { teamId, id } = req.params;
  const { title, language, summary, modules, banner } = req.body;

  if (!teamId || !id || !title || !language || !summary || !modules || !banner) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  try {
    const existingCourse = await CourseModel.findById(id);
    if (!existingCourse) {
      return res.status(404).send({ error: { message: "Course not found" } });
    }

    const updatedModuleIds: string[] = [];

    const updatedModules = await Promise.all(
      modules.map(async (module: { _id?: string; title: string; lessons: { _id: string; title: string }[] }) => {
        if (!module.title || !Array.isArray(module.lessons)) {
          throw new Error("Each module must have a title and a valid lessons array");
        }

        const lessonIds = await Promise.all(
          module.lessons.map(async (lesson) => {
            if (!lesson._id) {
              throw new Error(`Lesson ${lesson.title || "unknown"} is missing an ID`);
            }
            const existingLesson = await LessonModel.findById(lesson._id);
            if (!existingLesson) {
              throw new Error(`Lesson with ID ${lesson._id} not found`);
            }
            return existingLesson._id;
          }),
        );

        if (!module._id?.startsWith("module")) {
          const updatedModule = await ModuleModel.findByIdAndUpdate(
            module._id,
            { title: module.title, lessons: lessonIds },
            { new: true },
          );
          if (!updatedModule) {
            throw new Error(`Failed to update module with ID ${module._id}`);
          }
          updatedModuleIds.push(updatedModule._id.toString());
          return updatedModule._id;
        } else {
          const newModule = await ModuleModel.create({
            teamId: new ObjectId(teamId as string),
            title: module.title,
            lessons: lessonIds,
          });
          updatedModuleIds.push(newModule._id.toString());
          return newModule._id;
        }
      }),
    );

    const existingModuleIds = existingCourse.modules.map((moduleRef) => {
      if (typeof moduleRef === "string") {
        return moduleRef;
      }
      return moduleRef._id.toString();
    });
    const modulesToDelete = existingModuleIds.filter((moduleId) => !updatedModuleIds.includes(moduleId));

    await Promise.all(
      modulesToDelete.map(async (moduleId) => {
        await ModuleModel.findByIdAndDelete(moduleId);
      }),
    );

    const updatedCourse = await CourseModel.findByIdAndUpdate(
      id,
      {
        title,
        language,
        summary,
        modules: updatedModules,
        banner,
      },
      { new: true },
    );

    if (updatedCourse) {
      return res.status(200).send(updatedCourse);
    }
  } catch (e) {
    console.error(`[ERROR][updateCourse] ${e}`);
    return res.status(400).send({
      error: {
        message: (e as Error).message || "Course not updated",
      },
    });
  }
};

export const getCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.query;
    if (!courseId) {
      return res.status(400).send({ error: { message: "Missing courseId" } });
    }

    const course = await CourseModel.findOne({ _id: courseId }).populate({
      path: "modules",
      populate: {
        path: "lessons",
        model: "Lesson",
      },
    });
    if (course) {
      return res.status(200).send(course);
    }
  } catch (e) {
    console.error(`[ERROR][getCourse] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "Course not found",
    },
  });
};

export const getCourses = async (req: Request, res: Response) => {
  try {
    const { teamId, language } = req.query;
    if (!teamId && !language) {
      return res.status(400).send({ error: { message: "Missing teamId or language" } });
    }

    let query = {};
    if (teamId) query = { teamId: new ObjectId(teamId as string) };
    if (language) query = { ...query, language };

    const courses = await CourseModel.find(query).populate("modules");
    if (courses.length > 0) {
      return res.status(200).send(courses);
    } else {
      return res.status(404).send({
        error: {
          message: "No courses found for this team and/or language",
        },
      });
    }
  } catch (e) {
    console.error(`[ERROR][getCourses] ${e}`);
    return res.status(500).send({
      error: {
        message: e,
      },
    });
  }
};

export const getCoursesSummary = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.query;
    if (!teamId) {
      return res.status(400).send({ error: { message: "Missing teamId" } });
    }

    const query = { teamId: new ObjectId(teamId as string) };

    const courses = await CourseModel.find(query);
    if (courses.length > 0) {
      return res.status(200).send(courses);
    } else {
      return res.status(404).send({
        error: {
          message: "No courses found for this team",
        },
      });
    }
  } catch (e) {
    console.error(`[ERROR][getCoursesSummary] ${e}`);
    return res.status(500).send({
      error: {
        message: e,
      },
    });
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { teamId, id: courseId } = req.params;
    if (!teamId || !courseId) {
      return res.status(400).send({ error: { message: "Missing teamId or courseId" } });
    }

    const result = await CourseModel.deleteOne({ _id: courseId, teamId: new ObjectId(teamId as string) });
    if (result?.deletedCount > 0) {
      return res.status(200).send({ message: `Course '${courseId}' deleted` });
    }
  } catch (e) {
    console.error(`[ERROR][deleteCourse] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "Course not deleted",
    },
  });
};

export const duplicateCourses = async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const { courses } = req.body;

  if (!teamId || !courses) {
    return res.status(400).send({ error: { message: "Missing teamId or courses" } });
  }

  try {
    const duplicatedCoursesIds = await Promise.all(
      courses.map(async (id: string) => {
        const existingCourse = await CourseModel.findOne({
          _id: id,
          teamId: new ObjectId(teamId as string),
        }).populate("modules");

        if (!existingCourse) {
          return res.status(404).send({ error: { message: "Course not found" } });
        }

        const duplicatedCourse = await CourseModel.create({
          teamId: existingCourse.teamId,
          title: existingCourse.title,
          language: existingCourse.language,
          summary: existingCourse.summary,
          modules: existingCourse.modules,
          banner: existingCourse.banner,
        });

        return duplicatedCourse._id;
      }),
    );

    return res.status(200).send(duplicatedCoursesIds);
  } catch (e) {
    console.error(`[ERROR][duplicateCourse] ${e}`);
    return res.status(500).send({
      error: {
        message: (e as Error).message || "Course not duplicated",
      },
    });
  }
};
