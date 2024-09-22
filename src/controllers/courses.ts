import { Request, Response } from "express";
import { CourseModel } from "@/models/Course";
import { ModuleModel } from "@/models/Module";

export const createCourse = async (req: Request, res: Response) => {
  const { title, summary, modules } = req.body;

  if (!title || !summary || !modules) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  try {
    const moduleRecords = await ModuleModel.find({ _id: { $in: modules } });

    if (moduleRecords.length !== modules.length) {
      return res.status(400).send({ error: { message: "Some modules not found" } });
    }

    const newCourse = await CourseModel.create({
      title,
      summary,
      modules,
    });

    if (newCourse) {
      return res.status(200).send(newCourse);
    }
  } catch (e) {
    console.error(`[ERROR][createCourse] ${JSON.stringify(e)}`);
    return res.status(400).send({
      error: {
        message: (e as Error).message || "Course not created",
      },
    });
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, summary, modules } = req.body;

  if (!id || !title || !summary || !modules) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  try {
    const moduleRecords = await ModuleModel.find({ _id: { $in: modules } });

    if (moduleRecords.length !== modules.length) {
      return res.status(400).send({ error: { message: "Some modules not found" } });
    }

    const updatedCourse = await CourseModel.findByIdAndUpdate(
      id,
      { title, summary, modules },
      { new: true, runValidators: true },
    );

    if (updatedCourse) {
      return res.status(200).send(updatedCourse);
    } else {
      return res.status(404).send({ error: { message: "Course not found" } });
    }
  } catch (e) {
    console.error(`[ERROR][updateCourse] ${JSON.stringify(e)}`);
    return res.status(500).send({
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

    const course = await CourseModel.findOne({ _id: courseId }).populate("modules");
    if (course) {
      return res.status(200).send(course);
    }
  } catch (e) {
    console.error(`[ERROR][getCourse] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "Course not found",
    },
  });
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).send({ error: { message: "Missing courseId" } });
    }

    const result = await CourseModel.deleteOne({ _id: courseId });
    if (result?.deletedCount > 0) {
      return res.status(200).send({ message: `Course '${courseId}' deleted` });
    }
  } catch (e) {
    console.error(`[ERROR][deleteCourse] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "Course not deleted",
    },
  });
};

export const duplicateCourse = async (req: Request, res: Response) => {
  const { courseId } = req.body;

  if (!courseId) {
    return res.status(400).send({ error: { message: "Missing courseId" } });
  }

  try {
    const existingCourse = await CourseModel.findById(courseId).populate("modules");

    if (!existingCourse) {
      return res.status(404).send({ error: { message: "Course not found" } });
    }

    const duplicatedCourse = await CourseModel.create({
      title: `${existingCourse.title} (Copy)`,
      summary: existingCourse.summary,
      modules: existingCourse.modules,
    });

    return res.status(200).send(duplicatedCourse);
  } catch (e) {
    console.error(`[ERROR][duplicateCourse] ${JSON.stringify(e)}`);
    return res.status(500).send({
      error: {
        message: (e as Error).message || "Course not duplicated",
      },
    });
  }
};
