import express from "express";
import { Server } from "http";
import BodyParser from "body-parser";
import axios from "axios";
import router from "@/routes";
import { mongoDBsetup } from "./db/setupTestMongo";
import { readFileSync } from "fs";
import { join } from "path";
import { ModuleModel } from "@/models/Module";
import { Lesson, LessonModel } from "@/models/Lesson";
import { UserModel } from "@/models/User";
import { getAuthHeaders } from "./helpers";
import { Team, TeamModel } from "@/models/Team";
import { UserTeamModel } from "@/models/UserTeam";

const PORT = 3012;
const API_URL = `http://0.0.0.0:${PORT}`;
const MONGODB_DATABASE_NAME = "modulesTestDB";

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

  afterEach(async () => {
    await LessonModel.deleteMany({});
    await ModuleModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME, true);
    return server && server.close();
  });

  describe("Modules", () => {
    it("Create a Module (POST /module)", async () => {
      const lesson = await LessonModel.create({
        teamId: team,
        title: "Lesson #1",
        language: "english",
        slug: "lesson-1",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of France?",
          choices: ["Berlin", "Madrid", "Paris", "Rome"],
          correctChoice: 2,
        },
      });

      const moduleTitle = "Module #1";
      await axios
        .post(
          `${API_URL}/module/${team._id}`,
          {
            title: moduleTitle,
            lessons: [lesson._id],
          },
          { headers: adminHeaders },
        )
        .then((r) => {
          expect(r.data.title).toEqual(moduleTitle);
          expect(r.data.lessons[0]).toEqual(lesson._id.toString());
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("Create a Module with invalid lessons returns error (POST /module)", async () => {
      const moduleTitle = "Module with invalid lessons";
      const invalidLessonId = "60e4b68f2f8fb814b56fa181";
      await axios
        .post(
          `${API_URL}/module/${team._id}`,
          {
            title: moduleTitle,
            lessons: [invalidLessonId],
          },
          { headers: adminHeaders },
        )
        .then(() => {})
        .catch((e) => {
          expect(e.response.data.error.message).toContain("Some lessons not found");
        });
    });

    it("Update a Module (PUT /module/:id)", async () => {
      const lesson1 = await LessonModel.create({
        teamId: team,
        title: "Lesson #1",
        language: "english",
        slug: "lesson-1-module-update",
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
        slug: "lesson-2-module-update",
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
        lessons: [lesson1._id],
      });

      const updatedTitle = "Updated Module";
      await axios.put(
        `${API_URL}/module/${team._id}/${module._id}`,
        {
          title: updatedTitle,
          lessons: [lesson1._id, lesson2._id],
        },
        { headers: adminHeaders },
      );

      await axios
        .get(`${API_URL}/module?moduleId=${module._id}`, { headers: adminHeaders })
        .then((r) => {
          expect(r.data.title).toEqual(updatedTitle);
          expect(r.data.lessons.some((recordedLesson: Lesson) => recordedLesson._id === lesson1._id.toString())).toBe(
            true,
          );
          expect(r.data.lessons.some((recordedLesson: Lesson) => recordedLesson._id === lesson2._id.toString())).toBe(
            true,
          );
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Get a Module (GET /module)", async () => {
      const lesson = await LessonModel.create({
        teamId: team,
        title: "Lesson #3",
        language: "english",
        slug: "lesson-3-get",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of Japan?",
          choices: ["Tokyo", "Kyoto", "Osaka"],
          correctChoice: 0,
        },
      });

      const newModule = await ModuleModel.create({
        teamId: team,
        title: "Module with Lesson",
        lessons: [lesson._id],
      });

      await axios
        .get(`${API_URL}/module?moduleId=${newModule._id}`, { headers: adminHeaders })
        .then((r) => {
          expect(r.data.title).toEqual("Module with Lesson");
          expect(r.data.lessons.some((recordedLesson: Lesson) => recordedLesson._id === lesson._id.toString())).toBe(
            true,
          );
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Delete a Module (DELETE /module)", async () => {
      const lesson = await LessonModel.create({
        teamId: team,
        title: "Lesson #4",
        language: "english",
        slug: "lesson-4-delete",
        body: loadFixture("example.md"),
        difficulty: "hard",
        challenge: {
          question: "What is the capital of Kenya?",
          choices: ["Lagos", "Cairo", "Nairobi", "Addis Ababa"],
          correctChoice: 2,
        },
      });

      const newModule = await ModuleModel.create({
        teamId: team,
        title: "Module to Delete",
        lessons: [lesson._id],
      });

      const moduleCountBefore = await ModuleModel.countDocuments();

      await axios
        .delete(`${API_URL}/module/${team._id}/${newModule._id}`, { headers: adminHeaders })
        .then((r) => {
          expect(r.data.message).toEqual(`Module '${newModule._id}' deleted`);
        })
        .catch((e) => expect(e).toBeUndefined());

      const moduleCountAfter = await ModuleModel.countDocuments();
      expect(moduleCountAfter).toBe(moduleCountBefore - 1);
    });

    it("Should return 403 if no permisson to POST/GET/PUT/DELETE", async () => {
      const lesson = await LessonModel.create({
        teamId: team,
        title: "Lesson #1",
        language: "english",
        slug: "lesson-1-permissions",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of France?",
          choices: ["Berlin", "Madrid", "Paris", "Rome"],
          correctChoice: 2,
        },
      });

      await axios
        .post(
          `${API_URL}/module/${team._id}`,
          {
            title: "Module Title",
            lessons: [lesson._id],
          },
          { headers },
        )
        .then(() => {})
        .catch((e) => expect(e.response.status).toEqual(403));

      const module = await ModuleModel.create({
        teamId: team,
        title: "Initial Module",
        lessons: [lesson._id],
      });

      await axios
        .put(
          `${API_URL}/module/${team._id}/${module._id}`,
          {
            title: "New Module Title",
            lessons: [lesson._id],
          },
          { headers },
        )
        .then(() => {})
        .catch((e) => expect(e.response.status).toEqual(403));

      await axios
        .delete(`${API_URL}/module/${team._id}/${module._id}`, { headers })
        .then(() => {})
        .catch((e) => expect(e.response.status).toEqual(403));
    });
  });
});
