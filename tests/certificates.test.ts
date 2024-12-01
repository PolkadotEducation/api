import express from "express";
import { Server } from "http";
import BodyParser from "body-parser";
import axios from "axios";
import router from "@/routes";
import { mongoDBsetup } from "./db/setupTestMongo";

import { readFileSync } from "fs";
import { join } from "path";
import { Module, ModuleModel } from "@/models/Module";
import { Course, CourseModel } from "@/models/Course";
import { Lesson, LessonModel } from "@/models/Lesson";
import { ProgressModel } from "@/models/Progress";
import { UserModel } from "@/models/User";
import { UserInfo } from "@/types/User";
import { getAuthHeaders } from "./helpers";
import { Team, TeamModel } from "@/models/Team";
import { UserTeamModel } from "@/models/UserTeam";
import { CertificateModel } from "@/models/Certificate";
import mongoose from "mongoose";

const PORT = 3016;
const API_URL = `http://0.0.0.0:${PORT}`;

const MONGODB_DATABASE_NAME = "certificateTestDB";

const loadFixture = (fixture: string) => {
  const filePath = join(__dirname, `fixtures/${fixture}`);
  return readFileSync(filePath, "utf-8");
};

describe("Setting API Server up...", () => {
  let team: Team;
  let server: Server;
  beforeAll((done) => {
    const app = express();
    app.use(BodyParser.json());

    router(app);

    server = app.listen(PORT, done);
  });

  beforeAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME);
    team = await TeamModel.create({
      owner: "owner@team.com",
      name: "Admin Team",
      description: "Admin Team Description",
      picture: "...",
    });
    await UserTeamModel.create({ email: "owner@team.com", teamId: team });
  });

  afterAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME, true);
    return server && server.close();
  });

  describe("Certificate", () => {
    let course: Course,
      lesson1: Lesson,
      lesson2: Lesson,
      lesson3: Lesson,
      lesson4: Lesson,
      lesson5: Lesson,
      module1: Module,
      module2: Module,
      module3: Module,
      user: UserInfo | undefined,
      headers: { authorization: string; code: string };

    beforeEach(async () => {
      const email = "new.user@polkadot.education";
      const password = "password";
      user = await UserModel.createUser({
        email,
        password,
        name: "New User",
        language: "english",
        company: "company",
        picture: "Base64OrLink",
        isAdmin: false,
        signInType: "Email",
      });

      headers = await getAuthHeaders(email, password);

      lesson1 = await LessonModel.create({
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

      lesson2 = await LessonModel.create({
        teamId: team,
        title: "Lesson #2",
        language: "english",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of Italy?",
          choices: ["Naples", "Milan", "Rome"],
          correctChoice: 2,
        },
      });

      lesson3 = await LessonModel.create({
        teamId: team,
        title: "Lesson #3",
        language: "english",
        body: loadFixture("example.md"),
        difficulty: "medium",
        challenge: {
          question: "Another question?",
          choices: ["1", "2", "3"],
          correctChoice: 2,
        },
      });

      lesson4 = await LessonModel.create({
        teamId: team,
        title: "Lesson #4",
        language: "english",
        body: loadFixture("example.md"),
        difficulty: "hard",
        challenge: {
          question: "Another question?",
          choices: ["1", "2", "3"],
          correctChoice: 0,
        },
      });

      lesson5 = await LessonModel.create({
        teamId: team,
        title: "Lesson #5",
        language: "english",
        body: loadFixture("example.md"),
        difficulty: "hard",
        challenge: {
          question: "Another question?",
          choices: ["1", "2", "3"],
          correctChoice: 1,
        },
      });

      module1 = await ModuleModel.create({
        teamId: team,
        title: "Initial Module",
        lessons: [lesson1._id, lesson2._id],
      });

      module2 = await ModuleModel.create({
        teamId: team,
        title: "Next Module",
        lessons: [lesson3._id, lesson4._id],
      });

      module3 = await ModuleModel.create({
        teamId: team,
        title: "Final Module",
        lessons: [lesson5._id],
      });

      course = await CourseModel.create({
        teamId: team,
        title: "Initial Course",
        language: "english",
        summary: "This is the initial course summary",
        modules: [module1._id, module2._id, module3._id],
      });
    });

    afterEach(async () => {
      await ProgressModel.deleteMany({});
      await LessonModel.deleteMany({});
      await ModuleModel.deleteMany({});
      await CourseModel.deleteMany({});
      await UserModel.deleteMany({});
      await CertificateModel.deleteMany({});
    });

    it("Generate Certificate (POST /certificates/generate)", async () => {
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson1._id,
        userId: user?.id,
        choice: lesson1.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson1.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson2._id,
        userId: user?.id,
        choice: lesson2.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson2.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson3._id,
        userId: user?.id,
        choice: lesson3.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson3.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson4._id,
        userId: user?.id,
        choice: lesson4.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson4.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson5._id,
        userId: user?.id,
        choice: lesson5.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson5.difficulty,
      });

      const progressRecords = await ProgressModel.find({ userId: user?.id, courseId: course._id });
      expect(progressRecords.length).toBe(5);

      await axios
        .post(
          `${API_URL}/certificates/generate`,
          {
            courseId: course._id?.toString(),
          },
          { headers },
        )
        .then((r) => {
          expect(r.data.courseId).toEqual(course._id?.toString());
          expect(r.data.courseTitle).toEqual(course.title);
          expect(r.data.userId).toEqual(user?.id?.toString());
          expect(r.data.userName).toEqual(user?.name);
          expect(r.status).toEqual(200);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("should not generate a certificate because the user did not complete the course.", async () => {
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson1._id,
        userId: user?.id,
        choice: lesson1.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson1.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson2._id,
        userId: user?.id,
        choice: lesson2.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson2.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson3._id,
        userId: user?.id,
        choice: lesson3.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson3.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson4._id,
        userId: user?.id,
        choice: lesson4.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson4.difficulty,
      });

      // Missing lesson 5 to complete course

      await axios
        .post(
          `${API_URL}/certificates/generate`,
          {
            courseId: course._id,
          },
          { headers },
        )
        .then(() => {})
        .catch((e) => {
          expect(e.response.status).toEqual(400);
          expect(e.response.data.error.message).toEqual("User not elegible for certificate");
        });
    });

    it("should get certificate by certificateId (GET /certificates/:certificateId)", async () => {
      const certificate = await CertificateModel.create({
        courseId: course._id,
        courseTitle: course.title,
        userId: user?.id,
        userName: user?.name,
      });

      await axios
        .get(`${API_URL}/certificates/${certificate._id}`)
        .then((r) => {
          expect(r.data.courseId).toEqual(course._id?.toString());
          expect(r.data.courseTitle).toEqual(course.title);
          expect(r.data.userId).toEqual(user?.id.toString());
          expect(r.data.userName).toEqual(user?.name);
          expect(r.status).toEqual(200);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("should not get certificate because certificate not found", async () => {
      const randomCertificateId = new mongoose.Types.ObjectId();
      await axios
        .get(`${API_URL}/certificates/${randomCertificateId}`)
        .then(() => {})
        .catch((e) => {
          expect(e.response.status).toEqual(400);
          expect(e.response.data.error.message).toEqual("Certificate not found");
        });
    });

    it("should get certificates by courseId (GET /certificates)", async () => {
      await CertificateModel.create({
        courseId: course._id,
        courseTitle: course.title,
        userId: user?.id,
        userName: user?.name,
      });

      await CertificateModel.create({
        courseId: course._id,
        courseTitle: course.title,
        userId: new mongoose.Types.ObjectId(),
        userName: "another user name",
      });

      await axios
        .get(`${API_URL}/certificates?courseId=${course._id}`, { headers })
        .then((r) => {
          expect(r.data.length).toEqual(2);
          expect(r.status).toEqual(200);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("should get certificates by userId (GET /certificates)", async () => {
      await CertificateModel.create({
        courseId: new mongoose.Types.ObjectId(),
        courseTitle: "Another course",
        userId: user?.id,
        userName: user?.name,
      });

      await CertificateModel.create({
        courseId: course._id,
        courseTitle: course.title,
        userId: user?.id,
        userName: user?.name,
      });

      await axios
        .get(`${API_URL}/certificates?userId=${user?.id}`, { headers })
        .then((r) => {
          expect(r.data.length).toEqual(2);
          expect(r.status).toEqual(200);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });
  });
});
