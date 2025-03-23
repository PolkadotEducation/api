import express from "express";
import { Server } from "http";
import BodyParser from "body-parser";
import axios from "axios";
import router from "@/routes";
import { mongoDBsetup } from "./db/setupTestMongo";
import { ChallengeModel } from "@/models/Challenge";
import { getAuthHeaders } from "./helpers";
import { UserModel } from "@/models/User";

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

    adminHeaders = await getAuthHeaders(adminEmail, "password");
    regularHeaders = await getAuthHeaders(regularEmail, "password");
  });

  afterEach(async () => {
    await ChallengeModel.deleteMany({});
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
      };

      const response = await axios.post(`${API_URL}/challenge`, challengeData, { headers: adminHeaders });

      expect(response.status).toBe(201);
      expect(response.data.question).toEqual(challengeData.question);
      expect(response.data.choices).toEqual(challengeData.choices);
      expect(response.data.correctChoice).toEqual(challengeData.correctChoice);
    });

    it("Create Challenge with invalid choices length returns error", async () => {
      const invalidChallenge = {
        question: "Test question",
        choices: ["1"],
        correctChoice: 0,
      };

      await expect(
        axios.post(`${API_URL}/challenge`, invalidChallenge, { headers: adminHeaders }),
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
        question: "Old question",
        choices: ["A", "B", "C", "D"],
        correctChoice: 0,
      });

      const updatedData = {
        question: "New question",
        choices: ["X", "Y", "Z", "W"],
        correctChoice: 2,
      };

      const response = await axios.put(`${API_URL}/challenge/${challenge._id}`, updatedData, { headers: adminHeaders });

      expect(response.status).toBe(200);
      expect(response.data.question).toEqual(updatedData.question);
      expect(response.data.choices).toEqual(updatedData.choices);
      expect(response.data.correctChoice).toEqual(updatedData.correctChoice);
    });

    it("Get all Challenges with specific daily challenge (GET /challenges)", async () => {
      await ChallengeModel.create({
        question: "Test 1",
        choices: ["A", "B", "C"],
        correctChoice: 0,
      });

      await ChallengeModel.create({
        question: "Test 2",
        choices: ["X", "Y", "Z", "W"],
        correctChoice: 1,
      });

      await ChallengeModel.create({
        question: "Test 3",
        choices: ["L", "M", "N", "O"],
        correctChoice: 2,
      });

      const response = await axios.get(`${API_URL}/challenges`, {
        headers: adminHeaders,
      });

      expect(response.status).toBe(200);
      expect(response.data.challenges.random.length).toBe(3);

      // @TODO: Mock date to test daily challenge
      // expect(response.data.dailyChallenge.question).toBe("Test 1");
      // expect(response.data.dailyChallenge.correctChoice).toBe(0);
      // expect(response.data.dailyChallenge.choices).toEqual(["A", "B", "C"]);
    });

    it("Get single Challenge (GET /challenge/:id)", async () => {
      const challenge = await ChallengeModel.create({
        question: "Single test",
        choices: ["1", "2", "3", "4"],
        correctChoice: 2,
      });

      const response = await axios.get(`${API_URL}/challenge/${challenge._id}`, { headers: adminHeaders });

      expect(response.status).toBe(200);
      expect(response.data.question).toEqual(challenge.question);
      expect(response.data.choices).toEqual(challenge.choices);
      expect(response.data.correctChoice).toEqual(challenge.correctChoice);
    });

    it("Delete a Challenge (DELETE /challenge/:id)", async () => {
      const challenge = await ChallengeModel.create({
        question: "To be deleted",
        choices: ["A", "B", "C"],
        correctChoice: 0,
      });

      const countBefore = await ChallengeModel.countDocuments();

      const response = await axios.delete(`${API_URL}/challenge/${challenge._id}`, { headers: adminHeaders });

      expect(response.status).toBe(200);
      expect(response.data.message).toEqual(`Challenge '${challenge._id}' deleted`);

      const countAfter = await ChallengeModel.countDocuments();
      expect(countAfter).toBe(countBefore - 1);
    });

    it("Returns 404 for non-existent challenge", async () => {
      const fakeId = "60e4b68f2f8fb814b56fa181";

      await expect(axios.get(`${API_URL}/challenge/${fakeId}`, { headers: adminHeaders })).rejects.toMatchObject({
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

      await expect(axios.post(`${API_URL}/challenge`, incompleteData, { headers: adminHeaders })).rejects.toMatchObject(
        {
          response: {
            status: 400,
            data: { error: { message: "Missing required parameters" } },
          },
        },
      );
    });

    it("Should return 403 for non-admin users", async () => {
      const challengeData = {
        question: "Test",
        choices: ["A", "B", "C"],
        correctChoice: 0,
      };

      await expect(
        axios.post(`${API_URL}/challenge`, challengeData, { headers: regularHeaders }),
      ).rejects.toMatchObject({
        response: { status: 403 },
      });

      const challenge = await ChallengeModel.create(challengeData);

      await expect(
        axios.put(`${API_URL}/challenge/${challenge._id}`, challengeData, { headers: regularHeaders }),
      ).rejects.toMatchObject({
        response: { status: 403 },
      });

      await expect(
        axios.delete(`${API_URL}/challenge/${challenge._id}`, { headers: regularHeaders }),
      ).rejects.toMatchObject({
        response: { status: 403 },
      });
    });
  });
});
