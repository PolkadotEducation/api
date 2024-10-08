import { Request, Response } from "express";
import { ModuleModel } from "@/models/Module";
import { LessonModel } from "@/models/Lesson";

export const createModule = async (req: Request, res: Response) => {
  const { title, lessons } = req.body;

  if (!title || !lessons) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  try {
    const lessonRecords = await LessonModel.find({ _id: { $in: lessons } });

    if (lessonRecords.length !== lessons.length) {
      return res.status(400).send({ error: { message: "Some lessons not found" } });
    }

    const newModule = await ModuleModel.create({
      title,
      lessons,
    });

    if (newModule) {
      return res.status(200).send(newModule);
    }
  } catch (e) {
    console.error(`[ERROR][createModule] ${JSON.stringify(e)}`);
    return res.status(400).send({
      error: {
        message: (e as Error).message || "Module not created",
      },
    });
  }
};

export const updateModule = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, lessons } = req.body;

  if (!id || !title || !lessons) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  try {
    const lessonRecords = await LessonModel.find({ _id: { $in: lessons } });

    if (lessonRecords.length !== lessons.length) {
      return res.status(400).send({ error: { message: "Some lessons not found" } });
    }

    const updatedModule = await ModuleModel.findByIdAndUpdate(
      id,
      { title, lessons },
      { new: true, runValidators: true },
    );

    if (updatedModule) {
      return res.status(200).send(updatedModule);
    } else {
      return res.status(404).send({ error: { message: "Module not found" } });
    }
  } catch (e) {
    console.error(`[ERROR][updateModule] ${JSON.stringify(e)}`);
    return res.status(500).send({
      error: {
        message: (e as Error).message || "Module not updated",
      },
    });
  }
};

export const getModule = async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.query;
    if (!moduleId) {
      return res.status(400).send({ error: { message: "Missing moduleId" } });
    }

    const module = await ModuleModel.findOne({ _id: moduleId }).populate("lessons");
    if (module) {
      return res.status(200).send(module);
    }
  } catch (e) {
    console.error(`[ERROR][getModule] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "Module not found",
    },
  });
};

export const deleteModule = async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.body;
    if (!moduleId) {
      return res.status(400).send({ error: { message: "Missing moduleId" } });
    }

    const result = await ModuleModel.deleteOne({ _id: moduleId });
    if (result?.deletedCount > 0) {
      return res.status(200).send({ message: `Module '${moduleId}' deleted` });
    }
  } catch (e) {
    console.error(`[ERROR][deleteModule] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "Module not deleted",
    },
  });
};
