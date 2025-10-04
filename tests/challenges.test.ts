import express from "express";
import { Server } from "http";
import BodyParser from "body-parser";
import axios from "axios";
import router from "@/routes";
import { mongoDBsetup } from "./db/setupTestMongo";
import { ChallengeModel } from "@/models/Challenge";
import { DailyChallengeModel } from "@/models/DailyChallenge";
import { getAuthHeaders } from "./helpers";
import { UserModel } from "@/models/User";
import { Team, TeamModel } from "@/models/Team";
import { UserTeamModel } from "@/models/UserTeam";

const PORT = 3017;
const API_URL = `http://0.0.0.0:${PORT}`;
const MONGODB_DATABASE_NAME = "challengesTestDB";

describe("Setting API Server up...", () => {
  let regularHeaders: { authorization: string; code: string };
  let adminHeaders: { authorization: string; code: string };

  let server: Server;
  beforeAll((done) => {
    const app = express();
    app.use(BodyParser.json());

    router(app);

    server = app.listen(PORT, done);
  });

  let team: Team;

  beforeAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME);

    const adminEmail = "admin@polkadot.education";
    await UserModel.createUser({
      email: adminEmail,
      password: "password",
      name: "Admin User",
      language: "english",
      company: "test",
      picture: "test",
      isAdmin: true,
      signInType: "Email",
    });

    const regularEmail = "user@polkadot.education";
    await UserModel.createUser({
      email: regularEmail,
      password: "password",
      name: "Regular User",
      language: "english",
      company: "test",
      picture: "test",
      isAdmin: false,
      signInType: "Email",
    });

    team = await TeamModel.create({
      owner: adminEmail,
      name: "Admin Team",
      description: "Admin Team Description",
      picture: "...",
    });
    await UserTeamModel.create({ email: adminEmail, teamId: team });

    adminHeaders = await getAuthHeaders(adminEmail, "password");
    regularHeaders = await getAuthHeaders(regularEmail, "password");
  });

  afterAll(async () => {
    await ChallengeModel.deleteMany({});
    await DailyChallengeModel.deleteMany({});
    await UserModel.deleteMany({});
    await TeamModel.deleteMany({});
    await UserTeamModel.deleteMany({});
  });

  afterEach(async () => {
    await ChallengeModel.deleteMany({});
    await DailyChallengeModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME, true);
    return server && server.close();
  });

  describe("Challenges", () => {
    it("Create a Challenge (POST /challenge)", async () => {
      const challengeData = {
        question: "What is 2 + 2?",
        choices: ["3", "4", "5", "6"],
        correctChoice: 1,
        difficulty: "easy",
        language: "english",
      };

      const response = await axios.post(`${API_URL}/challenge/${team._id}`, challengeData, { headers: adminHeaders });

      expect(response.status).toBe(201);
      expect(response.data.question).toEqual(challengeData.question);
      expect(response.data.choices).toEqual(challengeData.choices);
      expect(response.data.correctChoice).toEqual(challengeData.correctChoice);
      expect(response.data.difficulty).toEqual(challengeData.difficulty);
    });

    it("Create Challenge with invalid choices length returns error", async () => {
      const invalidChallenge = {
        question: "Test question",
        choices: ["1"],
        correctChoice: 0,
        difficulty: "easy",
        language: "english",
      };

      await expect(
        axios.post(`${API_URL}/challenge/${team._id}`, invalidChallenge, { headers: adminHeaders }),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: {
              message: expect.stringContaining("Choices array must contain between 2 and 5 items"),
            },
          },
        },
      });
    });

    it("Update a Challenge (PUT /challenge/:id)", async () => {
      const challenge = await ChallengeModel.create({
        teamId: team._id,
        question: "Old question",
        choices: ["A", "B", "C", "D"],
        correctChoice: 0,
        difficulty: "medium",
        language: "english",
      });

      const updatedData = {
        teamId: team._id,
        question: "New question",
        choices: ["X", "Y", "Z", "W"],
        correctChoice: 2,
        difficulty: "hard",
        language: "english",
      };

      const response = await axios.put(`${API_URL}/challenge/${team._id}/${challenge._id}`, updatedData, {
        headers: adminHeaders,
      });

      expect(response.status).toBe(200);
      expect(response.data.question).toEqual(updatedData.question);
      expect(response.data.choices).toEqual(updatedData.choices);
      expect(response.data.correctChoice).toEqual(updatedData.correctChoice);
    });

    it("Get random challenges (POST /challenges/random)", async () => {
      await ChallengeModel.create({
        teamId: team._id,
        question: "Test 1",
        choices: ["A", "B", "C"],
        correctChoice: 0,
        difficulty: "easy",
        language: "english",
      });

      await ChallengeModel.create({
        teamId: team._id,
        question: "Test 2",
        choices: ["X", "Y", "Z", "W"],
        correctChoice: 1,
        difficulty: "medium",
        language: "english",
      });

      await ChallengeModel.create({
        teamId: team._id,
        question: "Test 3",
        choices: ["L", "M", "N", "O"],
        correctChoice: 2,
        difficulty: "hard",
        language: "english",
      });

      const response = await axios.post(
        `${API_URL}/challenges/random`,
        { language: "english", size: 3 },
        { headers: regularHeaders },
      );

      expect(response.status).toBe(200);
      expect(response.data.random).toBeDefined();
      expect(response.data.random.length).toBe(3);
    });

    it("Get random challenges with custom size (POST /challenges/random)", async () => {
      await ChallengeModel.create({
        teamId: team._id,
        question: "Test 1",
        choices: ["A", "B"],
        correctChoice: 0,
        difficulty: "easy",
        language: "english",
      });

      await ChallengeModel.create({
        teamId: team._id,
        question: "Test 2",
        choices: ["X", "Y"],
        correctChoice: 1,
        difficulty: "medium",
        language: "english",
      });

      const response = await axios.post(
        `${API_URL}/challenges/random`,
        { language: "english", size: 2 },
        { headers: regularHeaders },
      );

      expect(response.status).toBe(200);
      expect(response.data.random.length).toBe(2);
    });

    it("Returns error for random challenges without language", async () => {
      await expect(axios.post(`${API_URL}/challenges/random`, {}, { headers: regularHeaders })).rejects.toMatchObject({
        response: {
          status: 400,
          data: { error: { message: "Missing language" } },
        },
      });
    });

    it("Get daily challenge (POST /challenges/daily)", async () => {
      await ChallengeModel.create({
        teamId: team._id,
        question: "Daily challenge question",
        choices: ["A", "B", "C", "D"],
        correctChoice: 1,
        difficulty: "medium",
        language: "english",
      });

      const response = await axios.post(
        `${API_URL}/challenges/daily`,
        { language: "english" },
        { headers: regularHeaders },
      );

      expect(response.status).toBe(200);
      expect(response.data.daily).toBeDefined();
      expect(response.data.daily.question).toBeDefined();
      expect(response.data.daily.choices).toBeDefined();
      expect(response.data.daily.difficulty).toBeDefined();
    });

    it("Returns error for daily challenge without language", async () => {
      await expect(axios.post(`${API_URL}/challenges/daily`, {}, { headers: regularHeaders })).rejects.toMatchObject({
        response: {
          status: 400,
          data: { error: { message: "Missing language" } },
        },
      });
    });

    it("Get single Challenge (GET /challenge)", async () => {
      const challenge = await ChallengeModel.create({
        teamId: team._id,
        question: "Single test",
        choices: ["1", "2", "3", "4"],
        correctChoice: 2,
        difficulty: "easy",
        language: "english",
      });

      const response = await axios.get(`${API_URL}/challenge?challengeId=${challenge._id}`, { headers: adminHeaders });

      expect(response.status).toBe(200);
      expect(response.data.question).toEqual(challenge.question);
      expect(response.data.choices).toEqual(challenge.choices);
      expect(response.data.correctChoice).toEqual(challenge.correctChoice);
    });

    it("Delete a Challenge (DELETE /challenge/:id)", async () => {
      const challenge = await ChallengeModel.create({
        teamId: team._id,
        question: "To be deleted",
        choices: ["A", "B", "C"],
        correctChoice: 0,
        difficulty: "easy",
        language: "english",
      });

      const countBefore = await ChallengeModel.countDocuments();

      const response = await axios.delete(`${API_URL}/challenge/${team._id}/${challenge._id}`, {
        headers: adminHeaders,
      });

      expect(response.status).toBe(200);
      expect(response.data.message).toEqual(`Challenge '${challenge._id}' deleted`);

      const countAfter = await ChallengeModel.countDocuments();
      expect(countAfter).toBe(countBefore - 1);
    });

    it("Returns 404 for non-existent challenge", async () => {
      const fakeId = "60e4b68f2f8fb814b56fa181";

      await expect(
        axios.get(`${API_URL}/challenge?challengeId=${fakeId}`, { headers: adminHeaders }),
      ).rejects.toMatchObject({
        response: {
          status: 404,
          data: { error: { message: "Challenge not found" } },
        },
      });
    });

    it("Returns 400 for missing required fields", async () => {
      const incompleteData = {
        question: "Incomplete",
      };

      await expect(
        axios.post(`${API_URL}/challenge/${team._id}`, incompleteData, { headers: adminHeaders }),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: { error: { message: "Missing required parameters" } },
        },
      });
    });

    it("Should return 403 for non-admin users", async () => {
      const challengeData = {
        teamId: team._id,
        question: "Test",
        choices: ["A", "B", "C"],
        correctChoice: 0,
        difficulty: "easy",
        language: "english",
      };

      await expect(
        axios.post(`${API_URL}/challenge/${team._id}`, challengeData, { headers: regularHeaders }),
      ).rejects.toMatchObject({
        response: { status: 403 },
      });

      const challenge = await ChallengeModel.create(challengeData);

      await expect(
        axios.put(`${API_URL}/challenge/${team._id}/${challenge._id}`, challengeData, { headers: regularHeaders }),
      ).rejects.toMatchObject({
        response: { status: 403 },
      });

      await expect(
        axios.delete(`${API_URL}/challenge/${team._id}/${challenge._id}`, { headers: regularHeaders }),
      ).rejects.toMatchObject({
        response: { status: 403 },
      });

      await expect(axios.get(`${API_URL}/challenges/backoffice`, { headers: regularHeaders })).rejects.toMatchObject({
        response: { status: 403 },
      });
    });

    it("Get challenges summary (GET /challenges/summary)", async () => {
      await ChallengeModel.create({
        teamId: team._id,
        question: "What is the capital of England?",
        choices: ["London", "Manchester", "Birmingham", "Liverpool"],
        correctChoice: 0,
        difficulty: "easy",
        language: "english",
      });

      await ChallengeModel.create({
        teamId: team._id,
        question: "¿Cuál es la capital de España?",
        choices: ["Madrid", "Barcelona", "Valencia", "Sevilla"],
        correctChoice: 0,
        difficulty: "medium",
        language: "spanish",
      });

      const response = await axios.get(`${API_URL}/challenges/summary`, { headers: adminHeaders });
      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);

      const challenge = response.data[0];
      expect(challenge).toHaveProperty("_id");
      expect(challenge).toHaveProperty("question");
      expect(challenge).toHaveProperty("difficulty");
      expect(challenge).toHaveProperty("language");
      expect(challenge).toHaveProperty("updatedAt");

      expect(challenge).not.toHaveProperty("choices");
      expect(challenge).not.toHaveProperty("correctChoice");
      expect(challenge).not.toHaveProperty("teamId");

      const englishResponse = await axios.get(`${API_URL}/challenges/summary?language=english`, {
        headers: adminHeaders,
      });
      expect(englishResponse.status).toBe(200);
      expect(englishResponse.data).toHaveLength(1);
      expect(englishResponse.data[0].language).toBe("english");

      const emptyResponse = await axios.get(`${API_URL}/challenges/summary?language=french`, { headers: adminHeaders });
      expect(emptyResponse.status).toBe(204);
    });

    it("Get backoffice challenges (GET /challenges/backoffice)", async () => {
      await ChallengeModel.create({
        teamId: team._id,
        question: "What is the capital of England?",
        choices: ["London", "Manchester", "Birmingham", "Liverpool"],
        correctChoice: 0,
        difficulty: "easy",
        language: "english",
      });

      await ChallengeModel.create({
        teamId: team._id,
        question: "¿Cuál es la capital de España?",
        choices: ["Madrid", "Barcelona", "Valencia", "Sevilla"],
        correctChoice: 0,
        difficulty: "medium",
        language: "spanish",
      });

      const response = await axios.get(`${API_URL}/challenges/backoffice`, { headers: adminHeaders });
      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);

      const challenge = response.data[0];
      expect(challenge).toHaveProperty("_id");
      expect(challenge).toHaveProperty("question");
      expect(challenge).toHaveProperty("choices");
      expect(challenge).toHaveProperty("correctChoice");
      expect(challenge).toHaveProperty("difficulty");
      expect(challenge).toHaveProperty("language");
      expect(challenge).toHaveProperty("teamId");

      // Test language filtering
      const englishResponse = await axios.get(`${API_URL}/challenges/backoffice?language=english`, {
        headers: adminHeaders,
      });
      expect(englishResponse.status).toBe(200);
      expect(englishResponse.data).toHaveLength(1);
      expect(englishResponse.data[0].language).toBe("english");

      const spanishResponse = await axios.get(`${API_URL}/challenges/backoffice?language=spanish`, {
        headers: adminHeaders,
      });
      expect(spanishResponse.status).toBe(200);
      expect(spanishResponse.data).toHaveLength(1);
      expect(spanishResponse.data[0].language).toBe("spanish");

      // Test empty result for non-existent language
      const emptyResponse = await axios.get(`${API_URL}/challenges/backoffice?language=french`, {
        headers: adminHeaders,
      });
      expect(emptyResponse.status).toBe(204);
    });
  });
});
