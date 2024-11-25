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
import { UserModel } from "@/models/User";
import { getAuthHeaders } from "./helpers";
import { Team, TeamModel } from "@/models/Team";
import { UserTeamModel } from "@/models/UserTeam";

const PORT = 3013;
const API_URL = `http://0.0.0.0:${PORT}`;
const MONGODB_DATABASE_NAME = "coursesTestDB";

const loadFixture = (fixture: string) => {
  const filePath = join(__dirname, `fixtures/${fixture}`);
  return readFileSync(filePath, "utf-8");
};

describe("Setting API Server up...", () => {
  let team: Team;
  let headers: { authorization: string; code: string };
  let adminHeaders: { authorization: string; code: string };

  let server: Server;
  beforeAll((done) => {
    const app = express();
    app.use(BodyParser.json());

    router(app);

    server = app.listen(PORT, done);
  });

  beforeAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME);
    const email = "new.user@polkadot.education";
    const password = "password";
    await UserModel.createUser({
      email,
      password,
      name: "New User",
      language: "english",
      company: "company",
      picture: "Base64OrLink",
      isAdmin: false,
      signInType: "Email",
    });
    const adminEmail = "admin@polkadot.education";
    await UserModel.createUser({
      email: adminEmail,
      password,
      name: "New User",
      language: "english",
      company: "company",
      picture: "Base64OrLink",
      isAdmin: true,
      signInType: "Email",
    });

    team = await TeamModel.create({
      owner: adminEmail,
      name: "Admin Team",
      description: "Admin Team Description",
      picture: "...",
    });
    await UserTeamModel.create({ email: adminEmail, teamId: team });

    headers = await getAuthHeaders(email, password);
    adminHeaders = await getAuthHeaders(adminEmail, password);
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
        teamId: team,
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
        teamId: team,
        title: "Module #1",
        lessons: [lesson._id],
      });

      const courseTitle = "Course #1";
      const courseLanguage = "english";
      const courseSummary = "This is a summary of Course #1";

      await axios
        .post(
          `${API_URL}/course/${team._id}`,
          {
            title: courseTitle,
            language: courseLanguage,
            summary: courseSummary,
            modules: [module._id],
          },
          { headers: adminHeaders },
        )
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
        .post(
          `${API_URL}/course/${team._id}`,
          {
            title: courseTitle,
            language: courseLanguage,
            summary: courseSummary,
            modules: [invalidModuleId],
          },
          { headers: adminHeaders },
        )
        .then(() => {})
        .catch((e) => {
          expect(e.response.data.error.message).toContain("Some modules not found");
        });
    });

    it("Update a Course (PUT /course/:id)", async () => {
      const lesson1 = await LessonModel.create({
        teamId: team,
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
        teamId: team,
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
        teamId: team,
        title: "Initial Module",
        lessons: [lesson1._id, lesson2._id],
      });

      const course = await CourseModel.create({
        teamId: team,
        title: "Initial Course",
        language: "english",
        summary: "This is the initial course summary",
        modules: [module._id],
      });

      const updatedTitle = "Curso atualizado";
      const updatedLanguage = "portuguese";
      const updatedSummary = "Resumo do curso atualizado";

      await axios.put(
        `${API_URL}/course/${team._id}/${course._id}`,
        {
          title: updatedTitle,
          language: updatedLanguage,
          summary: updatedSummary,
          modules: [module._id],
        },
        { headers: adminHeaders },
      );

      await axios
        .get(`${API_URL}/course?courseId=${course._id}`, { headers: adminHeaders })
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
        teamId: team,
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
        teamId: team,
        title: "Module with Lesson",
        lessons: [lesson._id],
      });

      const newCourse = await CourseModel.create({
        teamId: team,
        title: "Course with Module",
        language: "english",
        summary: "This course contains a module",
        modules: [module._id],
      });

      await axios
        .get(`${API_URL}/course?courseId=${newCourse._id}`, { headers: adminHeaders })
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
        teamId: team,
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
        teamId: team,
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
        teamId: team,
        title: "Module in English",
        lessons: [lesson1._id],
      });

      const modulePortuguese = await ModuleModel.create({
        teamId: team,
        title: "Módulo em Português",
        lessons: [lesson2._id],
      });

      await CourseModel.create({
        teamId: team,
        title: "Course in English",
        language: "english",
        summary: "This is an English course",
        modules: [moduleEnglish._id],
      });

      await CourseModel.create({
        teamId: team,
        title: "Curso em Português",
        language: "portuguese",
        summary: "Este é um curso em Português",
        modules: [modulePortuguese._id],
      });

      // Getting all courses from a specific Team
      await axios
        .get(`${API_URL}/courses?teamId=${team._id}`, { headers: adminHeaders })
        .then((r) => expect(r.data.length).toBe(2))
        .catch((e) => expect(e).toBeUndefined());

      // Getting all courses from any team but english only
      await axios
        .get(`${API_URL}/courses?language=english`, { headers: adminHeaders })
        .then((r) => {
          expect(r.data.length).toBe(1);
          expect(r.data[0].title).toEqual("Course in English");
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Get courses by language with no results (GET /courses?language=french)", async () => {
      await axios
        .get(`${API_URL}/courses?language=french`, { headers: adminHeaders })
        .then(() => {})
        .catch((e) => {
          expect(e.response.status).toEqual(404);
          expect(e.response.data.error.message).toEqual("No courses found for this team and/or language");
        });
    });

    it("Get courses by language without specifying language nor teamId (GET /courses)", async () => {
      await axios
        .get(`${API_URL}/courses`, { headers: adminHeaders })
        .then(() => {})
        .catch((e) => {
          expect(e.response.status).toEqual(400);
          expect(e.response.data.error.message).toEqual("Missing teamId or language");
        });
    });

    it("Delete a Course (DELETE /course)", async () => {
      const lesson = await LessonModel.create({
        teamId: team,
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
        teamId: team,
        title: "Module to Delete",
        lessons: [lesson._id],
      });

      const newCourse = await CourseModel.create({
        teamId: team,
        title: "Course to Delete",
        language: "english",
        summary: "This course is about to be deleted",
        modules: [module._id],
      });

      const courseCountBefore = await CourseModel.countDocuments();

      await axios
        .delete(`${API_URL}/course/${team._id}/${newCourse._id}`, { headers: adminHeaders })
        .then((r) => {
          expect(r.data.message).toEqual(`Course '${newCourse._id}' deleted`);
        })
        .catch((e) => expect(e).toBeUndefined());

      const courseCountAfter = await CourseModel.countDocuments();
      expect(courseCountAfter).toBe(courseCountBefore - 1);
    });

    it("Duplicate a Course (POST /course/duplicate)", async () => {
      const lesson = await LessonModel.create({
        teamId: team,
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
        teamId: team,
        title: "Module to Duplicate",
        lessons: [lesson._id],
      });

      const course = await CourseModel.create({
        teamId: team,
        title: "Course to Duplicate",
        language: "english",
        summary: "This course will be duplicated",
        modules: [module._id],
      });

      await axios
        .post(`${API_URL}/course/duplicate/${team._id}/${course._id}`, {}, { headers: adminHeaders })
        .then((r) => {
          expect(r.data.title).toEqual(`${course.title} (Copy)`);
          expect(r.data.summary).toEqual(course.summary);
          expect(r.data.modules.some((recordedModule: Module) => recordedModule._id === module._id.toString())).toBe(
            true,
          );
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Should return 403 if no permisson to POST/GET/PUT/DELETE", async () => {
      const lesson = await LessonModel.create({
        teamId: team,
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
        teamId: team,
        title: "Module to Duplicate",
        lessons: [lesson._id],
      });

      await axios
        .post(
          `${API_URL}/course/${team._id}`,
          {
            title: "Course Title",
            language: "english",
            summary: "Summary",
            modules: [module._id],
          },
          { headers },
        )
        .then(() => {})
        .catch((e) => expect(e.response.status).toEqual(403));

      const course = await CourseModel.create({
        teamId: team,
        title: "Course Title",
        language: "english",
        summary: "Summary",
        modules: [module._id],
      });

      await axios
        .put(
          `${API_URL}/course/${team._id}/${course._id}`,
          {
            title: "Course Title",
            language: "english",
            summary: "Summary",
            modules: [module._id],
          },
          { headers },
        )
        .then(() => {})
        .catch((e) => expect(e.response.status).toEqual(403));

      await axios
        .delete(`${API_URL}/course/${team._id}/${course._id}`, { headers })
        .then(() => {})
        .catch((e) => expect(e.response.status).toEqual(403));
    });
  });
});
