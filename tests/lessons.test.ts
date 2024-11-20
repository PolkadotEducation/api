import express from "express";
import { Server } from "http";
import BodyParser from "body-parser";
import axios from "axios";
import router from "@/routes";
import { mongoDBsetup } from "./db/setupTestMongo";

import { readFileSync } from "fs";
import { join } from "path";
import { Lesson, LessonModel } from "@/models/Lesson";
import { getAuthHeaders } from "./helpers";
import { UserModel } from "@/models/User";

const PORT = 3011;
const API_URL = `http://0.0.0.0:${PORT}`;

const MONGODB_DATABASE_NAME = "lessonsTestDB";

const loadFixture = (fixture: string) => {
  const filePath = join(__dirname, `fixtures/${fixture}`);
  return readFileSync(filePath, "utf-8");
};

describe("Setting API Server up...", () => {
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
    headers = await getAuthHeaders(email, password);
    adminHeaders = await getAuthHeaders(adminEmail, password);
  });

  afterAll(async () => {
    await LessonModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME, true);
    return server && server.close();
  });

  describe("Lessons", () => {
    it("Create a Lesson (POST /lesson)", async () => {
      const title = "Lesson #1";
      const language = "english";
      const body = loadFixture("example.md");
      const difficulty = "easy";
      const challenge = {
        question: "What is the capital of France?",
        choices: ["Berlin", "Madrid", "Paris", "Rome"],
        correctChoice: 2,
      };

      await axios
        .post(
          `${API_URL}/lesson`,
          {
            title,
            language,
            body,
            difficulty,
            challenge,
          },
          { headers: adminHeaders },
        )
        .then((r) => {
          expect(r.data.title).toEqual(title);
          expect(r.data.language).toEqual(language);
          expect(r.data.body).toEqual(body);
          expect(r.data.difficulty).toEqual(difficulty);
          expect(r.data.challenge).toEqual(expect.objectContaining(challenge));
          expect(r.data.references).toEqual([]);
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Create a Lesson without enough choices returns error (POST /lesson)", async () => {
      const title = "Lesson #1";
      const language = "english";
      const body = loadFixture("example.md");
      const difficulty = "easy";
      const invalidChallenge = {
        question: "What is the capital of France?",
        choices: ["Paris", "Rome"],
        correctChoice: 0,
      };

      await axios
        .post(
          `${API_URL}/lesson`,
          {
            title,
            language,
            body,
            difficulty,
            challenge: invalidChallenge,
          },
          { headers: adminHeaders },
        )
        .then(() => {})
        .catch((e) => {
          expect(e.response.data.error.message).toContain(
            "Lesson validation failed: challenge.choices: Choices array must contain between 3 and 5 items.",
          );
        });
    });

    it("Update a Lesson (PUT /lesson/:id)", async () => {
      const title = "Lesson #2";
      const body = loadFixture("example.md");
      const difficulty = "hard";
      const language = "english";
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

      const lesson = await LessonModel.create({
        title,
        body,
        difficulty,
        challenge,
        references,
        language,
      });

      const updatedTitle = "Updated Lesson #2";
      const updatedBody = loadFixture("updated-example.md");
      const updatedDifficulty = "medium";
      const updatedChallenge = {
        question: "What is the capital of Botswana?",
        choices: ["Gaborone", "Maseru", "Mbabane", "Lilongwe"],
        correctChoice: 0,
      };
      const updatedReferences = [
        {
          title: "Updated Polkadot Wiki",
          link: "https://wiki.polkadot.network/updated",
        },
        {
          title: "Updated Polkadot Education",
          link: "https://polkadot.education/updated",
        },
      ];
      const updatedLanguage = "english";

      await axios.put(
        `${API_URL}/lesson/${lesson._id}`,
        {
          title: updatedTitle,
          body: updatedBody,
          difficulty: updatedDifficulty,
          challenge: updatedChallenge,
          references: updatedReferences,
          language: updatedLanguage,
        },
        { headers: adminHeaders },
      );

      await axios
        .get(`${API_URL}/lesson?lessonId=${lesson._id}`, { headers })
        .then((r) => {
          expect(r.data.title).toEqual(updatedTitle);
          expect(r.data.body).toEqual(updatedBody);
          expect(r.data.difficulty).toEqual(updatedDifficulty);
          expect(r.data.references[0]).toEqual(expect.objectContaining(updatedReferences[0]));
          expect(r.data.references[1]).toEqual(expect.objectContaining(updatedReferences[1]));
          expect(r.data.language).toEqual(updatedLanguage);
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Update a Lesson with not enough choices returns error (PUT /lesson/:id)", async () => {
      const initialTitle = "Initial Lesson";
      const initialBody = loadFixture("example.md");
      const initialDifficulty = "easy";
      const initialChallenge = {
        question: "What is the capital of Germany?",
        choices: ["Berlin", "Munich", "Frankfurt"],
        correctChoice: 0,
      };
      const language = "english";

      const initialLesson = await LessonModel.create({
        title: initialTitle,
        body: initialBody,
        difficulty: initialDifficulty,
        challenge: initialChallenge,
        language,
      });

      const updatedTitle = "Lesson #1";
      const updatedBody = loadFixture("updated-example.md");
      const updatedDifficulty = "easy";
      const invalidChallenge = {
        question: "What is the capital of France?",
        choices: ["Paris", "Rome"],
        correctChoice: 0,
      };

      await axios
        .put(
          `${API_URL}/lesson/${initialLesson._id}`,
          {
            title: updatedTitle,
            body: updatedBody,
            difficulty: updatedDifficulty,
            challenge: invalidChallenge,
            language,
          },
          { headers: adminHeaders },
        )
        .then(() => {})
        .catch((e) => {
          expect(e.response.data.error.message).toContain(
            "Validation failed: challenge.choices: Choices array must contain between 3 and 5 items.",
          );
        });
    });

    it("Get a Lesson (GET /lesson)", async () => {
      const title = "Aula #2";
      const body = loadFixture("example.md");
      const difficulty = "hard";
      const language = "portuguese";
      const challenge = {
        question: "Qual é a capital do Lesoto?",
        choices: ["Maseru", "Gaborone", "Mbabane", "Lilongwe"],
        correctChoice: 0,
      };
      const references = [
        {
          title: "Wiki Polkadot",
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
        language,
      });

      await axios
        .get(`${API_URL}/lesson?lessonId=${newLesson?._id}`, { headers })
        .then((r) => {
          expect(r.data.title).toEqual(title);
          expect(r.data.body).toEqual(body);
          expect(r.data.difficulty).toEqual(difficulty);
          expect(r.data.references[0]).toEqual(expect.objectContaining(references[0]));
          expect(r.data.references[1]).toEqual(expect.objectContaining(references[1]));
          expect(r.data.language).toEqual(language);
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Get lessons by language (GET /lessons?language=english)", async () => {
      await LessonModel.deleteMany({});

      const lessonsData = [
        {
          title: "Lesson in English #1",
          body: "This is the body of lesson 1 in English.",
          difficulty: "easy",
          language: "english",
          challenge: {
            question: "What is the capital of England?",
            choices: ["London", "Paris", "Berlin", "Rome"],
            correctChoice: 0,
          },
        },
        {
          title: "Lesson in English #2",
          body: "This is the body of lesson 2 in English.",
          difficulty: "easy",
          language: "english",
          challenge: {
            question: "What is the capital of the USA?",
            choices: ["Washington D.C.", "New York", "Los Angeles", "Chicago"],
            correctChoice: 0,
          },
        },
        {
          title: "Lição em Português",
          body: "Este é o corpo da lição em Português.",
          difficulty: "easy",
          language: "portuguese",
          challenge: {
            question: "Qual é a capital do Brasil?",
            choices: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"],
            correctChoice: 2,
          },
        },
      ];

      await LessonModel.insertMany(lessonsData);

      await axios
        .get(`${API_URL}/lessons?language=english`, { headers })
        .then((r) => {
          expect(r.status).toEqual(200);
          expect(r.data.length).toEqual(2);
          expect(r.data[0].title).toEqual("Lesson in English #1");
          expect(r.data[1].title).toEqual("Lesson in English #2");
          expect(r.data[0].language).toEqual("english");
          expect(r.data[1].language).toEqual("english");

          const portugueseLesson = r.data.find((lesson: Lesson) => lesson.language === "portuguese");
          expect(portugueseLesson).toBeUndefined();
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Get lessons by language with no results (GET /lessons?language=french)", async () => {
      await axios
        .get(`${API_URL}/lessons?language=french`, { headers })
        .then(() => {})
        .catch((e) => {
          expect(e.response.status).toEqual(404);
          expect(e.response.data.error.message).toEqual("No lessons found for this language");
        });
    });

    it("Get lessons by language without specifying language (GET /lessons)", async () => {
      await axios
        .get(`${API_URL}/lessons`, { headers })
        .then(() => {})
        .catch((e) => {
          expect(e.response.status).toEqual(400);
          expect(e.response.data.error.message).toEqual("Missing language");
        });
    });

    it("Delete a Lesson (DELETE /lesson)", async () => {
      const title = "Aula #3";
      const body = loadFixture("example.md");
      const difficulty = "medium";
      const language = "spanish";
      const challenge = {
        question: "¿Cuál es la capital de Kenia?",
        choices: ["Lagos", "Cairo", "Nairobi", "Addis Ababa"],
        correctChoice: 2,
      };

      const newLesson = await LessonModel.create({
        title,
        body,
        difficulty,
        challenge,
        language,
      });

      await axios
        .delete(`${API_URL}/lesson`, { headers: adminHeaders, data: { lessonId: newLesson._id } })
        .then((r) => {
          expect(r.data.message).toEqual(`Lesson '${newLesson._id}' deleted`);
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Should return 200 and lessons summary if lessons found", async () => {
      await LessonModel.deleteMany({});

      const lessonsData = [
        {
          title: "Lesson in English #1",
          body: "This is the body of lesson 1 in English.",
          difficulty: "easy",
          language: "english",
          challenge: {
            question: "What is the capital of England?",
            choices: ["London", "Paris", "Berlin", "Rome"],
            correctChoice: 0,
          },
        },
        {
          title: "Lesson in English #2",
          body: "This is the body of lesson 2 in English.",
          difficulty: "easy",
          language: "english",
          challenge: {
            question: "What is the capital of the USA?",
            choices: ["Washington D.C.", "New York", "Los Angeles", "Chicago"],
            correctChoice: 0,
          },
        },
        {
          title: "Lição em Português",
          body: "Este é o corpo da lição em Português.",
          difficulty: "easy",
          language: "portuguese",
          challenge: {
            question: "Qual é a capital do Brasil?",
            choices: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"],
            correctChoice: 2,
          },
        },
      ];

      await LessonModel.insertMany(lessonsData);

      await axios
        .get(`${API_URL}/lessons/summary`, { headers: adminHeaders })
        .then((r) => {
          expect(r.status).toEqual(200);
          expect(r.data.length).toEqual(3);
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Should return 204 if no lessons found", async () => {
      await LessonModel.deleteMany({});

      await axios
        .get(`${API_URL}/lessons/summary`, { headers: adminHeaders })
        .then((r) => {
          expect(r.status).toEqual(204);
        })
        .catch((e) => expect(e).toBeUndefined());
    });
  });
});
