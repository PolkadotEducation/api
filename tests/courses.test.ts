import express from "express";
import { Server } from "http";
import BodyParser from "body-parser";
import axios from "axios";
import router from "@/routes";
import { mongoDBsetup } from "./db/setupTestMongo";
import { readFileSync } from "fs";
import { join } from "path";
import { CourseModel } from "@/models/Course";
import { Module, ModuleModel } from "@/models/Module";
import { Lesson, LessonModel } from "@/models/Lesson";

const PORT = 3013;
const API_URL = `http://0.0.0.0:${PORT}`;
const MONGODB_DATABASE_NAME = "coursesTestDB";

const loadFixture = (fixture: string) => {
  const filePath = join(__dirname, `fixtures/${fixture}`);
  return readFileSync(filePath, "utf-8");
};

describe("Setting API Server up...", () => {
  let server: Server;
  beforeAll((done) => {
    const app = express();
    app.use(BodyParser.json());

    router(app);

    server = app.listen(PORT, done);
  });

  beforeAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME);
  });

  afterAll(async () => {
    await LessonModel.deleteMany({});
    await ModuleModel.deleteMany({});
    await CourseModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME, true);
    return server && server.close();
  });

  describe("Courses", () => {
    it("Create a Course (POST /course)", async () => {
      const lesson = await LessonModel.create({
        title: "Lesson #1",
        language: "english",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of France?",
          choices: ["Berlin", "Madrid", "Paris", "Rome"],
          correctChoice: 2,
        },
      });

      const module = await ModuleModel.create({
        title: "Module #1",
        lessons: [lesson._id],
      });

      const courseTitle = "Course #1";
      const courseLanguage = "english";
      const courseSummary = "This is a summary of Course #1";

      await axios
        .post(`${API_URL}/course`, {
          title: courseTitle,
          language: courseLanguage,
          summary: courseSummary,
          modules: [module._id],
        })
        .then((r) => {
          expect(r.data.title).toEqual(courseTitle);
          expect(r.data.language).toEqual(courseLanguage);
          expect(r.data.summary).toEqual(courseSummary);
          expect(r.data.modules[0]).toEqual(module._id.toString());
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("Create a Course with invalid modules returns error (POST /course)", async () => {
      const courseTitle = "Course with invalid modules";
      const courseLanguage = "english";
      const courseSummary = "This course contains invalid modules";
      const invalidModuleId = "60e4b68f2f8fb814b56fa181";

      await axios
        .post(`${API_URL}/course`, {
          title: courseTitle,
          language: courseLanguage,
          summary: courseSummary,
          modules: [invalidModuleId],
        })
        .then(() => {})
        .catch((e) => {
          expect(e.response.data.error.message).toContain("Some modules not found");
        });
    });

    it("Update a Course (PUT /course/:id)", async () => {
      const lesson1 = await LessonModel.create({
        title: "Lesson #1",
        language: "english",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of Germany?",
          choices: ["Berlin", "Munich", "Frankfurt"],
          correctChoice: 0,
        },
      });

      const lesson2 = await LessonModel.create({
        title: "Lesson #2",
        language: "english",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of Italy?",
          choices: ["Rome", "Milan", "Naples"],
          correctChoice: 0,
        },
      });

      const module = await ModuleModel.create({
        title: "Initial Module",
        lessons: [lesson1._id, lesson2._id],
      });

      const course = await CourseModel.create({
        title: "Initial Course",
        language: "english",
        summary: "This is the initial course summary",
        modules: [module._id],
      });

      const updatedTitle = "Curso atualizado";
      const updatedLanguage = "portuguese";
      const updatedSummary = "Resumo do curso atualizado";

      await axios.put(`${API_URL}/course/${course._id}`, {
        title: updatedTitle,
        language: updatedLanguage,
        summary: updatedSummary,
        modules: [module._id],
      });

      await axios
        .get(`${API_URL}/course?courseId=${course._id}`)
        .then((r) => {
          expect(r.data.title).toEqual(updatedTitle);
          expect(r.data.language).toEqual(updatedLanguage);
          expect(r.data.summary).toEqual(updatedSummary);
          expect(r.data.modules.some((recordedModule: Module) => recordedModule._id === module._id.toString())).toBe(
            true,
          );
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Get a Course (GET /course)", async () => {
      const lesson = await LessonModel.create({
        title: "Lesson #3",
        language: "english",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of Japan?",
          choices: ["Tokyo", "Kyoto", "Osaka"],
          correctChoice: 0,
        },
      });

      const module = await ModuleModel.create({
        title: "Module with Lesson",
        lessons: [lesson._id],
      });

      const newCourse = await CourseModel.create({
        title: "Course with Module",
        language: "english",
        summary: "This course contains a module",
        modules: [module._id],
      });

      await axios
        .get(`${API_URL}/course?courseId=${newCourse._id}`)
        .then((r) => {
          expect(r.data.title).toEqual("Course with Module");
          expect(r.data.summary).toEqual("This course contains a module");
          expect(r.data.modules.some((recordedModule: Module) => recordedModule._id === module._id.toString())).toBe(
            true,
          );
          expect(
            r.data.modules[0].lessons.some((recordedLesson: Lesson) => recordedLesson._id === lesson._id.toString()),
          ).toBe(true);
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Get courses by language (GET /courses?language=english)", async () => {
      await CourseModel.deleteMany({});

      const lesson1 = await LessonModel.create({
        title: "Lesson in English #1",
        language: "english",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of the USA?",
          choices: ["Washington D.C.", "New York", "Los Angeles", "Chicago"],
          correctChoice: 0,
        },
      });

      const lesson2 = await LessonModel.create({
        title: "Aula em Português",
        language: "portuguese",
        body: loadFixture("example.md"),
        difficulty: "medium",
        challenge: {
          question: "Qual é a capital do Brasil?",
          choices: ["Brasília", "Rio de Janeiro", "São Paulo"],
          correctChoice: 0,
        },
      });

      const moduleEnglish = await ModuleModel.create({
        title: "Module in English",
        lessons: [lesson1._id],
      });

      const modulePortuguese = await ModuleModel.create({
        title: "Módulo em Português",
        lessons: [lesson2._id],
      });

      await CourseModel.create({
        title: "Course in English",
        language: "english",
        summary: "This is an English course",
        modules: [moduleEnglish._id],
      });

      await CourseModel.create({
        title: "Curso em Português",
        language: "portuguese",
        summary: "Este é um curso em Português",
        modules: [modulePortuguese._id],
      });

      await axios
        .get(`${API_URL}/courses?language=english`)
        .then((r) => {
          expect(r.data.length).toBe(1);
          expect(r.data[0].title).toEqual("Course in English");
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Get courses by language with no results (GET /courses?language=french)", async () => {
      await axios
        .get(`${API_URL}/courses?language=french`)
        .then(() => {})
        .catch((e) => {
          expect(e.response.status).toEqual(404);
          expect(e.response.data.error.message).toEqual("No courses found for this language");
        });
    });

    it("Get courses by language without specifying language (GET /courses)", async () => {
      await axios
        .get(`${API_URL}/courses`)
        .then(() => {})
        .catch((e) => {
          expect(e.response.status).toEqual(400);
          expect(e.response.data.error.message).toEqual("Missing language");
        });
    });

    it("Delete a Course (DELETE /course)", async () => {
      const lesson = await LessonModel.create({
        title: "Lesson #4",
        language: "english",
        body: loadFixture("example.md"),
        difficulty: "hard",
        challenge: {
          question: "What is the capital of Kenya?",
          choices: ["Lagos", "Cairo", "Nairobi", "Addis Ababa"],
          correctChoice: 2,
        },
      });

      const module = await ModuleModel.create({
        title: "Module to Delete",
        lessons: [lesson._id],
      });

      const newCourse = await CourseModel.create({
        title: "Course to Delete",
        language: "english",
        summary: "This course is about to be deleted",
        modules: [module._id],
      });

      const courseCountBefore = await CourseModel.countDocuments();

      await axios
        .delete(`${API_URL}/course`, { data: { courseId: newCourse._id } })
        .then((r) => {
          expect(r.data.message).toEqual(`Course '${newCourse._id}' deleted`);
        })
        .catch((e) => expect(e).toBeUndefined());

      const courseCountAfter = await CourseModel.countDocuments();
      expect(courseCountAfter).toBe(courseCountBefore - 1);
    });

    it("Duplicate a Course (POST /course/duplicate)", async () => {
      const lesson = await LessonModel.create({
        title: "Lesson #5",
        language: "english",
        body: loadFixture("example.md"),
        difficulty: "medium",
        challenge: {
          question: "What is the capital of Brazil?",
          choices: ["Rio de Janeiro", "Brasília", "São Paulo", "Salvador"],
          correctChoice: 1,
        },
      });

      const module = await ModuleModel.create({
        title: "Module to Duplicate",
        lessons: [lesson._id],
      });

      const course = await CourseModel.create({
        title: "Course to Duplicate",
        language: "english",
        summary: "This course will be duplicated",
        modules: [module._id],
      });

      await axios
        .post(`${API_URL}/course/duplicate`, { courseId: course._id })
        .then((r) => {
          expect(r.data.title).toEqual(`${course.title} (Copy)`);
          expect(r.data.summary).toEqual(course.summary);
          expect(r.data.modules.some((recordedModule: Module) => recordedModule._id === module._id.toString())).toBe(
            true,
          );
        })
        .catch((e) => expect(e).toBeUndefined());
    });
  });
});
