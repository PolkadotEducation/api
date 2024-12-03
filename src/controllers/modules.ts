import { Request, Response } from "express";
import { ObjectId } from "mongodb";

import { ModuleModel } from "@/models/Module";
import { LessonModel } from "@/models/Lesson";

export const createModule = async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const { title, lessons } = req.body;

  if (!teamId || !title || !lessons) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  try {
    const lessonRecords = await LessonModel.find({ _id: { $in: lessons } });

    if (lessonRecords.length !== lessons.length) {
      return res.status(400).send({ error: { message: "Some lessons not found" } });
    }

    const newModule = await ModuleModel.create({
      teamId: new ObjectId(teamId as string),
      title,
      lessons,
    });

    if (newModule) {
      return res.status(200).send(newModule);
    }
  } catch (e) {
    console.error(`[ERROR][createModule] ${e}`);
    return res.status(400).send({
      error: {
        message: (e as Error).message || "Module not created",
      },
    });
  }
};

export const updateModule = async (req: Request, res: Response) => {
  const { teamId, id } = req.params;
  const { title, lessons } = req.body;

  if (!id || !teamId || !title || !lessons) {
    return res.status(400).send({ error: { message: "Missing params" } });
  }

  try {
    const lessonRecords = await LessonModel.find({ _id: { $in: lessons } });

    if (lessonRecords.length !== lessons.length) {
      return res.status(400).send({ error: { message: "Some lessons not found" } });
    }

    const updatedModule = await ModuleModel.findOneAndUpdate(
      { _id: id, teamId: new ObjectId(teamId as string) },
      { title, lessons },
      { new: true, runValidators: true },
    );

    if (updatedModule) {
      return res.status(200).send(updatedModule);
    } else {
      return res.status(404).send({ error: { message: "Module not found" } });
    }
  } catch (e) {
    console.error(`[ERROR][updateModule] ${e}`);
    return res.status(500).send({
      error: {
        message: (e as Error).message || "Module not updated",
      },
    });
  }
};

export const getModules = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.query;
    if (!teamId) {
      return res.status(400).send({ error: { message: "Missing teamId" } });
    }

    const module = await ModuleModel.findOne({ teamId: new ObjectId(teamId as string) }).populate("lessons");
    if (module) {
      return res.status(200).send(module);
    }
  } catch (e) {
    console.error(`[ERROR][getModules] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "Modules not found",
    },
  });
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
    console.error(`[ERROR][getModule] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "Module not found",
    },
  });
};

export const deleteModule = async (req: Request, res: Response) => {
  try {
    const { teamId, id: moduleId } = req.params;
    if (!teamId || !moduleId) {
      return res.status(400).send({ error: { message: "Missing teamId or moduleId" } });
    }

    const result = await ModuleModel.deleteOne({ _id: moduleId, teamId: new ObjectId(teamId as string) });
    if (result?.deletedCount > 0) {
      return res.status(200).send({ message: `Module '${moduleId}' deleted` });
    }
  } catch (e) {
    console.error(`[ERROR][deleteModule] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "Module not deleted",
    },
  });
};
