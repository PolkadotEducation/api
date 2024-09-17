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

  afterAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME, true);
    return server && server.close();
  });

  describe("Users", () => {
    it("Create a User (POST /users)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);
      const email = "user1@polkadot.education";
      const name = "User One";
      const password = "superSecret";
      const company = "company";
      const isAdmin = false;
      await axios
        .post(`${API_URL}/users`, {
          email,
          name,
          password,
          company,
          isAdmin,
        })
        .then((r) => {
          expect(r.data.email).toEqual(email);
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Get a User (GET /users)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);
      const email = "user2@polkadot.education";
      const name = "User Two";
      const password = "superSecret";
      const user = await UserModel.createUser(email, password, name, "company", "Base64OrLink", false);
      await axios
        .get(`${API_URL}/users/${user?.userId}`)
        .then((r) => {
          expect(r.data.email).toEqual(email);
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Update a User (PUT /users)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);
      const email = "user3@polkadot.education";
      const name = "User Three";
      const password = "superSecret";
      const user = await UserModel.createUser(email, password, name, "company", "Base64OrLink", false);

      const newEmail = "New Email";
      const newPassword = "newSuperSecret";
      const newName = "New Name";
      const newCompany = "New Company";
      await axios
        .put(`${API_URL}/users/${user?.userId}`, {
          email: newEmail,
          password: newPassword,
          name: newName,
          company: newCompany,
          isAdmin: true,
        })
        .then(async (r) => {
          expect(r.data.email).toEqual(newEmail);
          expect(r.data.name).toEqual(newName);
          expect(r.data.company).toEqual(newCompany);
          expect(r.data.isAdmin).toEqual(true);
          // Password check
          const updatedUser = await UserModel.findById(user?.userId);
          const validPassword = await updatedUser?.comparePassword(newPassword);
          expect(validPassword).toBeTruthy();
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Delete a User (DELETE /users)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);
      const email = "user4@polkadot.education";
      const name = "User Four";
      const password = "superSecret";
      const user = await UserModel.createUser(email, password, name, "company", "Base64OrLink", false);
      await axios
        .delete(`${API_URL}/users/${user?.userId}`)
        .then((r) => {
          expect(r.data.message).toEqual(`User '${user?.userId}' deleted`);
        })
        .catch((e) => expect(e).toBeUndefined());
    });
  });
});
