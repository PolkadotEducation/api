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
import { Team, TeamModel } from "@/models/Team";
import { UserTeamModel } from "@/models/UserTeam";

const PORT = 3011;
const API_URL = `http://0.0.0.0:${PORT}`;

const MONGODB_DATABASE_NAME = "lessonsTestDB";

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
  });

  afterAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME, true);
    return server && server.close();
  });

  describe("Lessons", () => {
    it("Create a Lesson (POST /lesson)", async () => {
      const title = "Lesson #1";
      const language = "english";
      const slug = "lesson-1";
      const body = loadFixture("example.md");
      const difficulty = "easy";
      const challenge = {
        question: "What is the capital of France?",
        choices: ["Berlin", "Madrid", "Paris", "Rome"],
        correctChoice: 2,
      };

      await axios
        .post(
          `${API_URL}/lesson/${team._id}`,
          {
            title,
            language,
            slug,
            body,
            difficulty,
            challenge,
          },
          { headers: adminHeaders },
        )
        .then((r) => {
          expect(r.data.title).toEqual(title);
          expect(r.data.language).toEqual(language);
          expect(r.data.slug).toEqual(slug);
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
      const slug = "lesson-1-invalid-choices";
      const body = loadFixture("example.md");
      const difficulty = "easy";
      const invalidChallenge = {
        question: "What is the capital of France?",
        choices: ["Paris", "Rome"],
        correctChoice: 0,
      };

      await axios
        .post(
          `${API_URL}/lesson/${team._id}`,
          {
            title,
            language,
            slug,
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

    it("Create a Lesson with same slug but different language returns success (POST /lesson)", async () => {
      const title = "Lesson #1";
      const language = "english";
      const slug = "lesson-slug";
      const body = loadFixture("example.md");
      const difficulty = "easy";
      const challenge = {
        question: "What is the capital of France?",
        choices: ["Berlin", "Madrid", "Paris", "Rome"],
        correctChoice: 2,
      };

      await LessonModel.create({
        teamId: team,
        title,
        language,
        slug,
        body,
        difficulty,
        challenge,
      });

      await axios
        .post(
          `${API_URL}/lesson/${team._id}`,
          {
            title,
            language: "portuguese",
            slug,
            body,
            difficulty,
            challenge,
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

    it("Create a Lesson with same slug and language returns error (POST /lesson)", async () => {
      const title = "Lesson #1";
      const language = "english";
      const slug = "lesson-slug";
      const body = loadFixture("example.md");
      const difficulty = "easy";
      const challenge = {
        question: "What is the capital of France?",
        choices: ["Berlin", "Madrid", "Paris", "Rome"],
        correctChoice: 2,
      };

      const differentLanguage = "portuguese";
      await LessonModel.create({
        teamId: team,
        title,
        language,
        slug,
        body,
        difficulty,
        challenge,
      });

      await axios
        .post(
          `${API_URL}/lesson/${team._id}`,
          {
            title,
            language: differentLanguage,
            slug,
            body,
            difficulty,
            challenge,
          },
          { headers: adminHeaders },
        )
        .then((r) => {
          expect(r.data.language).toEqual(differentLanguage);
          expect(r.data.slug).toEqual(slug);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
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
        teamId: team,
        title,
        body,
        difficulty,
        challenge,
        references,
        language,
        slug: "lesson-2-update",
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
        `${API_URL}/lesson/${team._id}/${lesson._id}`,
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
        .get(`${API_URL}/lesson?lessonId=${lesson._id}`, { headers: adminHeaders })
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
        teamId: team,
        title: initialTitle,
        body: initialBody,
        difficulty: initialDifficulty,
        challenge: initialChallenge,
        language,
        slug: "initial-lesson-choices-validation",
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
          `${API_URL}/lesson/${team._id}/${initialLesson._id}`,
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
        teamId: team,
        title,
        body,
        difficulty,
        challenge,
        references,
        language,
        slug: "lesson-2",
      });

      await axios
        .get(`${API_URL}/lesson?lessonId=${newLesson._id}`, { headers: adminHeaders })
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
          teamId: team,
          title: "Lesson in English #1",
          body: "This is the body of lesson 1 in English.",
          difficulty: "easy",
          language: "english",
          slug: "lesson-in-english-1",
          challenge: {
            question: "What is the capital of England?",
            choices: ["London", "Paris", "Berlin", "Rome"],
            correctChoice: 0,
          },
        },
        {
          teamId: team,
          title: "Lesson in English #2",
          body: "This is the body of lesson 2 in English.",
          difficulty: "easy",
          language: "english",
          slug: "lesson-in-english-2",
          challenge: {
            question: "What is the capital of the USA?",
            choices: ["Washington D.C.", "New York", "Los Angeles", "Chicago"],
            correctChoice: 0,
          },
        },
        {
          teamId: team,
          title: "Lição em Português",
          body: "Este é o corpo da lição em Português.",
          difficulty: "easy",
          language: "portuguese",
          slug: "lesson-in-language",
          challenge: {
            question: "Qual é a capital do Brasil?",
            choices: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"],
            correctChoice: 2,
          },
        },
      ];

      await LessonModel.insertMany(lessonsData);

      await axios
        .get(`${API_URL}/lessons?language=english`, { headers: adminHeaders })
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
        .get(`${API_URL}/lessons?language=french`, { headers: adminHeaders })
        .then(() => {})
        .catch((e) => {
          expect(e.response.status).toEqual(404);
          expect(e.response.data.error.message).toEqual("No lessons found for this language");
        });
    });

    it("Get lessons by language without specifying language (GET /lessons)", async () => {
      await axios
        .get(`${API_URL}/lessons`, { headers: adminHeaders })
        .then(() => {})
        .catch((e) => {
          expect(e.response.status).toEqual(400);
          expect(e.response.data.error.message).toEqual("Missing teamId or language");
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
        teamId: team,
        title,
        body,
        difficulty,
        challenge,
        language,
        slug: "lesson-3",
      });

      await axios
        .delete(`${API_URL}/lesson/${team._id}/${newLesson._id}`, { headers: adminHeaders })
        .then((r) => {
          expect(r.data.message).toEqual(`Lesson '${newLesson._id}' deleted`);
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Should return 200 and lessons summary if lessons found", async () => {
      await LessonModel.deleteMany({});

      const lessonsData = [
        {
          teamId: team,
          title: "Lesson in English #1",
          body: "This is the body of lesson 1 in English.",
          difficulty: "easy",
          language: "english",
          slug: "lesson-in-english-1-summary",
          challenge: {
            question: "What is the capital of England?",
            choices: ["London", "Paris", "Berlin", "Rome"],
            correctChoice: 0,
          },
        },
        {
          teamId: team,
          title: "Lesson in English #2",
          body: "This is the body of lesson 2 in English.",
          difficulty: "easy",
          language: "english",
          slug: "lesson-in-english-2-summary",
          challenge: {
            question: "What is the capital of the USA?",
            choices: ["Washington D.C.", "New York", "Los Angeles", "Chicago"],
            correctChoice: 0,
          },
        },
        {
          teamId: team,
          title: "Lição em Português",
          body: "Este é o corpo da lição em Português.",
          difficulty: "easy",
          language: "portuguese",
          slug: "lesson-in-language-summary",
          challenge: {
            question: "Qual é a capital do Brasil?",
            choices: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"],
            correctChoice: 2,
          },
        },
      ];

      await LessonModel.insertMany(lessonsData);

      // Fetching lessons from an specific teamId
      await axios
        .get(`${API_URL}/lessons/summary?teamId=${team._id}`, { headers: adminHeaders })
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

    it("Duplicate lessons (POST /lessons/duplicate)", async () => {
      const lesson1 = await LessonModel.create({
        teamId: team,
        title: "Original Lesson 1",
        body: "Content of lesson 1",
        difficulty: "easy",
        language: "english",
        slug: "original-lesson",
        challenge: {
          question: "What is the capital of England?",
          choices: ["London", "Paris", "Berlin", "Rome"],
          correctChoice: 0,
        },
        references: [],
      });

      const lesson2 = await LessonModel.create({
        teamId: team,
        title: "Original Lesson 2",
        body: "Content of lesson 2",
        difficulty: "medium",
        language: "english",
        slug: "other-original-lesson-but-with-number-at-the-end-1",
        challenge: {
          question: "What is the capital of the USA?",
          choices: ["Washington D.C.", "New York", "Los Angeles", "Chicago"],
          correctChoice: 0,
        },
        references: [],
      });

      const lesson3 = await LessonModel.create({
        teamId: team,
        title: "Original Lesson 3",
        body: "Content of lesson 3",
        difficulty: "medium",
        language: "english",
        slug: "yet-another-original-lesson-but-with-number-at-the-end-9",
        challenge: {
          question: "What is the capital of the USA?",
          choices: ["Washington D.C.", "New York", "Los Angeles", "Chicago"],
          correctChoice: 0,
        },
        references: [],
      });

      await axios
        .post(
          `${API_URL}/lessons/duplicate/${team._id}`,
          { lessons: [lesson1._id, lesson2._id, lesson3._id] },
          { headers: adminHeaders },
        )
        .then(async (r) => {
          expect(r.status).toEqual(200);
          expect(r.data.length).toEqual(3);

          expect(r.data[0]).not.toEqual(lesson1._id);
          expect(r.data[1]).not.toEqual(lesson2._id);
          expect(r.data[2]).not.toEqual(lesson3._id);

          const duplicatedLessons = await Promise.all(r.data.map((id: string) => LessonModel.findById(id)));
          expect(duplicatedLessons[0]?.slug).toEqual("original-lesson-1");
          expect(duplicatedLessons[1]?.slug).toEqual("other-original-lesson-but-with-number-at-the-end-2");
          expect(duplicatedLessons[2]?.slug).toEqual("yet-another-original-lesson-but-with-number-at-the-end-10");
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Duplicate lessons missing lessons (POST /lessons/duplicate)", async () => {
      await axios.post(`${API_URL}/lessons/duplicate/${team._id}`, {}, { headers: adminHeaders }).catch((e) => {
        expect(e.response.status).toEqual(400);
        expect(e.response.data.error.message).toContain("Missing lessons to duplicate");
      });
    });

    it("Should return 403 if no permisson to POST/GET/PUT/DELETE", async () => {
      const title = "Lesson #X";
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
          `${API_URL}/lesson/${team._id}`,
          {
            title,
            language,
            body,
            difficulty,
            challenge,
          },
          { headers },
        )
        .then(() => {})
        .catch((e) => expect(e.response.status).toEqual(403));

      const lesson = await LessonModel.create({
        teamId: team,
        title,
        body,
        difficulty,
        challenge,
        references: [],
        language,
        slug: "lesson-x-permissions",
      });

      await axios
        .put(
          `${API_URL}/lesson/${team._id}/${lesson._id}`,
          {
            title,
            language,
            body,
            difficulty,
            challenge,
          },
          { headers },
        )
        .then(() => {})
        .catch((e) => expect(e.response.status).toEqual(403));

      await axios
        .delete(`${API_URL}/lesson/${team._id}/${lesson._id}`, { headers })
        .then(() => {})
        .catch((e) => expect(e.response.status).toEqual(403));
    });
  });
});
