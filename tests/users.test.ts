import express from "express";
import { Server } from "http";
import BodyParser from "body-parser";
import axios from "axios";
import router from "@/routes";
import { mongoDBsetup } from "./db/setupTestMongo";
import { UserModel } from "@/models/User";

const PORT = 3010;
const API_URL = `http://0.0.0.0:${PORT}`;

const MONGODB_DATABASE_NAME = "usersTestDB";

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
    await mongoDBsetup(MONGODB_DATABASE_NAME, true);
    return server && server.close();
  });

  describe("Users", () => {
    it("Create a User (POST /users)", async () => {
      const email = "user1@polkadot.education";
      const name = "User One";
      const password = "superSecret";
      const language = "english";
      const company = "company";
      const isAdmin = false;
      await axios
        .post(`${API_URL}/users`, {
          email,
          name,
          password,
          language,
          company,
          isAdmin,
        })
        .then((r) => {
          expect(r.data.email).toEqual(email);
          expect(r.data.name).toEqual(name);
          expect(r.data.language).toEqual(language);
          expect(r.data.company).toEqual(company);
          expect(r.data.isAdmin).toEqual(isAdmin);
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Get a User (GET /users)", async () => {
      const email = "user2@polkadot.education";
      const name = "User Two";
      const password = "superSecret";
      const language = "english";
      const user = await UserModel.createUser({
        email,
        password,
        name,
        language,
        company: "company",
        picture: "Base64OrLink",
        isAdmin: false,
      });
      await axios
        .get(`${API_URL}/users/${user?.id}`)
        .then((r) => {
          expect(r.data.email).toEqual(email);
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Update a User (PUT /users)", async () => {
      const email = "user3@polkadot.education";
      const name = "User Three";
      const password = "superSecret";
      const language = "english";
      const user = await UserModel.createUser({
        email,
        password,
        name,
        language,
        company: "company",
        picture: "Base64OrLink",
        isAdmin: false,
      });

      const newEmail = "New Email";
      const newName = "New Name";
      const newPassword = "newSuperSecret";
      const newLanguage = "portuguese";
      const newCompany = "New Company";
      await axios
        .put(`${API_URL}/users/${user?.id}`, {
          email: newEmail,
          password: newPassword,
          name: newName,
          language: newLanguage,
          company: newCompany,
          isAdmin: true,
        })
        .then(async (r) => {
          expect(r.data.email).toEqual(newEmail);
          expect(r.data.name).toEqual(newName);
          expect(r.data.language).toEqual(newLanguage);
          expect(r.data.company).toEqual(newCompany);
          expect(r.data.isAdmin).toEqual(true);
          // Password check
          const updatedUser = await UserModel.findById(user?.id);
          const validPassword = await updatedUser?.comparePassword(newPassword);
          expect(validPassword).toBeTruthy();
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Delete a User (DELETE /users)", async () => {
      const email = "user4@polkadot.education";
      const name = "User Four";
      const password = "superSecret";
      const language = "english";
      const user = await UserModel.createUser({
        email,
        password,
        name,
        language,
        company: "company",
        picture: "Base64OrLink",
        isAdmin: false,
      });
      await axios
        .delete(`${API_URL}/users/${user?.id}`)
        .then((r) => {
          expect(r.data.message).toEqual(`User '${user?.id}' deleted`);
        })
        .catch((e) => expect(e).toBeUndefined());
    });
  });

  describe("Verify User", () => {
    it("Create and verify a User (POST /users POST /users/verify)", async () => {
      const email = "verifyuser@polkadot.education";
      const name = "Verify User";
      const password = "superSecret";
      const language = "english";
      const company = "company";
      const isAdmin = false;
      await axios
        .post(`${API_URL}/users`, {
          email,
          name,
          password,
          language,
          company,
          isAdmin,
        })
        .then((r) => {
          expect(r.data.email).toEqual(email);
        })
        .catch((e) => expect(e).toBeUndefined());

      // Trying to get verified with wrong token
      await axios
        .post(`${API_URL}/users/verify`, { email, token: "invalid" })
        .then((r) => expect(r.data.email).toEqual(email))
        .catch((e) => expect(e.status).toEqual(400));

      // Getting the verify token
      const preVerifyUser = await UserModel.findOne({ email });
      const token = preVerifyUser?.verify?.token;
      await axios
        .post(`${API_URL}/users/verify`, { email, token })
        .then((r) => expect(r.data.email).toEqual(email))
        .catch((e) => expect(e).toBeUndefined());

      // Verified users has no verify field.
      const user = await UserModel.findOne({ email });
      expect(user?.email).toEqual(email);
      expect(user?.verify).toBeUndefined();
    });

    it("Try to verify a User with outdated verification (POST /users POST /users/verify)", async () => {
      const email = "noverifyuser@polkadot.education";
      const name = "No Verify User";
      const password = "superSecret";
      const language = "english";
      const company = "company";
      const isAdmin = false;
      await axios
        .post(`${API_URL}/users`, {
          email,
          name,
          password,
          language,
          company,
          isAdmin,
        })
        .then((r) => {
          expect(r.data.email).toEqual(email);
        })
        .catch((e) => expect(e).toBeUndefined());

      // Manually changing the verify.date so it becomoes invalid
      const oldVerifyUser = await UserModel.findOne({ email });
      if (oldVerifyUser) {
        oldVerifyUser.verify = {
          token: oldVerifyUser.verify?.token || "",
          date: new Date("2024-10-10"),
        };
        await oldVerifyUser.save();

        const oldDate = oldVerifyUser?.verify?.date;
        const oldToken = oldVerifyUser?.verify?.token;

        await axios
          .post(`${API_URL}/users/verify`, { email, token: oldToken })
          .then((r) => expect(r.data.email).toEqual(email))
          .catch((e) => expect(e.status).toEqual(400));

        // In order to get a new verfification link, users must try to log in again
        await axios
          .post(`${API_URL}/users/login`, { email, password })
          .then((r) => expect(r.data.jwt).toBeDefined())
          .catch((e) => expect(e).toBeUndefined());

        // Verify date must be updated now
        const preVerifyUser = await UserModel.findOne({ email });

        const newDate = preVerifyUser?.verify?.date;
        const token = preVerifyUser?.verify?.token;

        expect(newDate!.getTime()).toBeGreaterThan(oldDate!.getTime());
        expect(token).not.toEqual(oldToken);

        await axios
          .post(`${API_URL}/users/verify`, { email, token })
          .then((r) => expect(r.data.email).toEqual(email))
          .catch((e) => expect(e).toBeUndefined());

        // Verified users has no verify field.
        const user = await UserModel.findOne({ email });
        expect(user?.email).toEqual(email);
        expect(user?.verify).toBeUndefined();
      } else {
        throw new Error("User not found");
      }
    });
  });

  describe("Recover User", () => {
    it("Create and recover a User (POST /users POST /users/recover)", async () => {
      const email = "recoveruser@polkadot.education";
      const name = "Recover User";
      const password = "superSecret";
      const language = "english";
      const company = "company";
      const isAdmin = false;
      await axios
        .post(`${API_URL}/users`, {
          email,
          name,
          password,
          language,
          company,
          isAdmin,
        })
        .then((r) => {
          expect(r.data.email).toEqual(email);
        })
        .catch((e) => expect(e).toBeUndefined());

      // Starting the recover logic
      await axios
        .post(`${API_URL}/users/recover`, { email })
        .then((r) => expect(r.data).toEqual(true))
        .catch((e) => expect(e).toBeUndefined());

      // Trying to recover with wrong token
      await axios
        .post(`${API_URL}/users/recover`, { email, token: "invalid" })
        .then((r) => expect(r.data).toEqual(true))
        .catch((e) => expect(e.status).toEqual(400));

      // Getting the recover token
      const preRecoverUser = await UserModel.findOne({ email });
      const token = preRecoverUser?.recover?.token;
      const newPassword = "123123123";
      await axios
        .post(`${API_URL}/users/recover`, { email, token, password: newPassword })
        .then((r) => expect(r.data).toEqual(true))
        .catch((e) => expect(e).toBeUndefined());

      // Recovered users has no recover field.
      const user = await UserModel.findOne({ email });
      expect(user?.email).toEqual(email);
      expect(user?.recover).toBeUndefined();

      // Login with new password
      await axios
        .post(`${API_URL}/users/login`, { email, password: newPassword })
        .then((r) => expect(r.data.jwt).toBeDefined())
        .catch((e) => expect(e).toBeUndefined());
    });
  });
});
