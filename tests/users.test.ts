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
    it("Create a User (POST /user)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);
      const email = "user1@polkadot.education";
      const name = "User One";
      const password = "superSecret";
      await axios
        .post(`${API_URL}/user`, {
          email,
          name,
          password,
        })
        .then((r) => {
          expect(r.data.email).toEqual(email);
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Get a User (GET /user)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);
      const email = "user2@polkadot.education";
      const name = "User Two";
      const password = "superSecret";
      const user = await UserModel.createUser(email, password, name);
      await axios
        .get(`${API_URL}/user?userId=${user?.userId}`)
        .then((r) => {
          expect(r.data.email).toEqual(email);
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Delete a User (DELETE /user)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);
      const email = "user3@polkadot.education";
      const name = "User Three";
      const password = "superSecret";
      await UserModel.createUser(email, password, name);
      await axios
        .delete(`${API_URL}/user`, { data: { email } })
        .then((r) => {
          expect(r.data.message).toEqual(`User '${email}' deleted`);
        })
        .catch((e) => expect(e).toBeUndefined());
    });
  });
});
