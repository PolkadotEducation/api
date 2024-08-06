import express from "express";
import { Server } from "http";
import BodyParser from "body-parser";
import axios from "axios";
import router from "@/routes";
import { mongoDBsetup } from "./db/setupTestMongo";

import { readFileSync } from "fs";
import { join } from "path";
import { LessonModel } from "@/models/Lesson";

const PORT = 3011;
const API_URL = `http://0.0.0.0:${PORT}`;

const MONGODB_DATABASE_NAME = "lessonsTestDB";

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

  afterAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME, true);
    return server && server.close();
  });

  describe("Lessons", () => {
    it("Create a Lesson (POST /lesson)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);

      const title = "Lesson #1";
      const body = loadFixture("example.md");
      const difficulty = "easy";
      const challenge = {
        question: "What is the capital of France?",
        choices: ["Berlin", "Madrid", "Paris", "Rome"],
        correctChoice: 2,
      };

      await axios
        .post(`${API_URL}/lesson`, {
          title,
          body,
          difficulty,
          challenge,
        })
        .then((r) => {
          expect(r.data.title).toEqual(title);
          expect(r.data.body).toEqual(body);
          expect(r.data.difficulty).toEqual(difficulty);
          expect(r.data.challenge).toEqual(expect.objectContaining(challenge));
          expect(r.data.references).toEqual([]);
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Create a Lesson without enough choices returns error (POST /lesson)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);

      const title = "Lesson #1";
      const body = loadFixture("example.md");
      const difficulty = "easy";
      const challenge = {
        question: "What is the capital of France?",
        choices: ["Paris", "Rome"],
        correctChoice: 0,
      };

      await axios
        .post(`${API_URL}/lesson`, {
          title,
          body,
          difficulty,
          challenge,
        })
        .then(() => {})
        .catch((e) => {
          expect(e.response.data.error.message).toContain(
            "Lesson validation failed: challenge.choices: Choices array must contain between 3 and 5 items.",
          );
        });
    });

    it("Get a Lesson (GET /lesson)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);

      const title = "Lesson #2";
      const body = loadFixture("example.md");
      const difficulty = "hard";
      const challenge = {
        question: "What is the capital of Lesotho?",
        choices: ["Maseru", "Gaborone", "Mbabane", "Lilongwe"],
        correctChoice: 0,
      };
      const references = [
        {
          title: "Polkadot Wiki",
          link: "https://wiki.polkadot.network/",
        },
        {
          title: "Polkadot Education",
          link: "https://polkadot.education/",
        },
      ];

      const newLesson = await LessonModel.create({
        title,
        body,
        difficulty,
        challenge,
        references,
      });

      await axios
        .get(`${API_URL}/lesson?lessonId=${newLesson?._id}`)
        .then((r) => {
          expect(r.data.title).toEqual(title);
          expect(r.data.body).toEqual(body);
          expect(r.data.difficulty).toEqual(difficulty);
          expect(r.data.challenge).toEqual(expect.objectContaining(challenge));
          expect(r.data.references[0]).toEqual(
            expect.objectContaining(references[0]),
          );
          expect(r.data.references[1]).toEqual(
            expect.objectContaining(references[1]),
          );
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Delete a Lesson (DELETE /lesson)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);

      const title = "Lesson #3";
      const body = loadFixture("example.md");
      const difficulty = "medium";
      const challenge = {
        question: "What is the capital of Kenya?",
        choices: ["Lagos", "Cairo", "Nairobi", "Addis Ababa"],
        correctChoice: 2,
      };

      const newLesson = await LessonModel.create({
        title,
        body,
        difficulty,
        challenge,
      });

      await axios
        .delete(`${API_URL}/lesson`, { data: { lessonId: newLesson._id } })
        .then((r) => {
          expect(r.data.message).toEqual(`Lesson '${newLesson._id}' deleted`);
        })
        .catch((e) => expect(e).toBeUndefined());
    });
  });
});
