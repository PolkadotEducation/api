import express from "express";
import { Server } from "http";
import BodyParser from "body-parser";
import axios from "axios";

import router from "@/routes";
import { mongoDBsetup } from "./db/setupTestMongo";
import { UserModel } from "@/models/User";
import { getAuthHeaders } from "./helpers";
import { TeamModel } from "@/models/Team";
import { UserInfo } from "@/types/User";
import { UserTeamModel } from "@/models/UserTeam";

const PORT = 3015;
const API_URL = `http://0.0.0.0:${PORT}`;

const MONGODB_DATABASE_NAME = "teamsTestDB";

const createMultipleUsers = async (n: number): Promise<UserInfo[]> => {
  const users: UserInfo[] = [];
  for (let i = 1; i <= n; i++) {
    const user = await UserModel.createUser({
      email: `user${i}@polkadot.education`,
      password: "superSecret",
      name: `New User ${i}`,
      language: "english",
      company: "company",
      picture: "Base64OrLink",
      isAdmin: true,
      signInType: "Email",
    });
    if (user) users.push(user);
  }
  return users;
};

describe("Setting API Server up...", () => {
  let users: UserInfo[];
  let server: Server;
  beforeAll((done) => {
    const app = express();
    app.use(BodyParser.json());

    router(app);

    server = app.listen(PORT, done);
  });

  beforeAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME);
    // We create 10 users to use them in other tests too
    users = await createMultipleUsers(10);
  });

  afterEach(async () => {
    await TeamModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME, true);
    return server && server.close();
  });

  describe("Teams", () => {
    it("Create a Team (POST /teams)", async () => {
      const email = users[0].email;

      const headers = await getAuthHeaders(email, "superSecret");

      const name = "My New Team";
      const description = "My New Team Description";
      const picture = "TeamBase64OrLinkPicture";

      await axios
        .post(
          `${API_URL}/teams`,
          {
            owner: email,
            name,
            description,
            picture,
          },
          { headers },
        )
        .then((r) => {
          expect(r.data.owner).toEqual(email);
          expect(r.data.name).toEqual(name);
          expect(r.data.description).toEqual(description);
          expect(r.data.picture).toEqual(picture);
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Get a Team (GET /teams?teamId=id)", async () => {
      const email = users[1].email;

      const headers = await getAuthHeaders(email, "superSecret");

      const name = "My New Team 2";
      const description = "My New Team 2 Description";
      const picture = "Team2Base64OrLinkPicture";

      const team = await TeamModel.create({
        owner: email,
        name,
        description,
        picture,
      });

      await UserTeamModel.create({ email, teamId: team });

      const members = [email];

      await axios
        .get(`${API_URL}/teams?teamId=${team._id}`, { headers })
        .then((r) => {
          expect(r.data.owner).toEqual(email);
          expect(r.data.name).toEqual(name);
          expect(r.data.description).toEqual(description);
          expect(r.data.picture).toEqual(picture);
          expect(r.data.members.length).toEqual(members.length);
          expect(r.data.members).toEqual(expect.arrayContaining(members));
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Update a Team (PUT /teams)", async () => {
      const email = users[2].email;

      const headers = await getAuthHeaders(email, "superSecret");

      const name = "My New Team 3";
      const description = "My New Team 3 Description";
      const picture = "Team3Base64OrLinkPicture";

      const team = await TeamModel.create({
        owner: email,
        name,
        description,
        picture,
      });

      await UserTeamModel.create({ email, teamId: team });

      const newName = "New Team Name";
      const newDescription = "New Team Description";
      const newPicture = "New Team Picture";

      await axios
        .put(
          `${API_URL}/teams/${team._id}`,
          {
            name: newName,
            description: newDescription,
            picture: newPicture,
          },
          { headers },
        )
        .then((r) => {
          expect(r.data.owner).toEqual(email);
          expect(r.data.name).toEqual(newName);
          expect(r.data.description).toEqual(newDescription);
          expect(r.data.picture).toEqual(newPicture);
          expect(r.data.members.length).toEqual(1);
        })
        .catch((e) => expect(e).toBeUndefined());

      // Adding members
      const addMembers = [users[3].email, users[4].email, users[5].email];
      await axios
        .put(
          `${API_URL}/teams/${team._id}`,
          {
            addMembers,
          },
          { headers },
        )
        .then((r) => {
          expect(r.data.members.length).toEqual(addMembers.length + 1);
        })
        .catch((e) => expect(e).toBeUndefined());

      // Removing members
      const remMembers = [users[4].email, users[5].email];
      await axios
        .put(
          `${API_URL}/teams/${team._id}`,
          {
            remMembers,
          },
          { headers },
        )
        .then((r) => {
          expect(r.data.members.length).toEqual(addMembers.length - remMembers.length + 1);
        })
        .catch((e) => expect(e).toBeUndefined());

      // Changing team owner
      const newOwner = users[3].email;
      await axios
        .put(
          `${API_URL}/teams/${team._id}`,
          {
            owner: newOwner,
          },
          { headers },
        )
        .then((r) => {
          expect(r.data.owner).toEqual(newOwner);
          expect(r.data.members.length).toEqual(2);
        })
        .catch((e) => expect(e).toBeUndefined());

      // Trying to update the team using old owner
      await axios
        .put(
          `${API_URL}/teams/${team._id}`,
          {
            name: "FooBar",
          },
          { headers },
        )
        .then((r) => {
          expect(r.data.name).toEqual("FooBar");
        })
        .catch((e) => expect(e.status).toEqual(404));
    });

    it("Delete a Team (DELETE /teams)", async () => {
      const email = users[6].email;

      const headers = await getAuthHeaders(email, "superSecret");

      const name = "My New Team 4";
      const description = "My New Team 4 Description";
      const picture = "Team4Base64OrLinkPicture";

      const team = await TeamModel.create({
        owner: email,
        name,
        description,
        picture,
      });

      await UserTeamModel.create({ email, teamId: team });

      await axios
        .delete(`${API_URL}/teams/${team._id}`, { headers })
        .then((r) => {
          expect(r.data.message).toEqual(`Team '${team._id}' deleted`);
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Get User's Teams (GET /users/teams)", async () => {
      const email = users[7].email;
      const headers = await getAuthHeaders(email, "superSecret");

      const team5 = await TeamModel.create({
        owner: email,
        name: "My New Team 5",
        description: "My New Team 5 Description",
        picture: "Team5Base64OrLinkPicture",
      });
      await UserTeamModel.create({ email, teamId: team5 });

      const team6 = await TeamModel.create({
        owner: email,
        name: "My New Team 6",
        description: "My New Team 6 Description",
        picture: "Team7Base64OrLinkPicture",
      });
      await UserTeamModel.create({ email, teamId: team6 });

      // Adding user to 3 other teams
      const otherOwnerEmail = users[8].email;
      for (let i = 0; i < 3; i++) {
        const team = await TeamModel.create({
          owner: otherOwnerEmail,
          name: `My New Team ${7 + i}`,
          description: `My New Team ${7 + i} Description`,
          picture: "...",
        });
        await UserTeamModel.create({ email: otherOwnerEmail, teamId: team });
        await UserTeamModel.create({ email, teamId: team });
      }

      // Getting all teams that user is the owner (2)
      await axios
        .get(`${API_URL}/users/teams?isOwner=1`, { headers })
        .then((r) => {
          expect(r.data.length).toEqual(2);
        })
        .catch((e) => expect(e).toBeUndefined());

      // Getting all teams that user is member, owner or not (2 + 3 = 5)
      await axios
        .get(`${API_URL}/users/teams`, { headers })
        .then((r) => {
          expect(r.data.length).toEqual(5);
        })
        .catch((e) => expect(e).toBeUndefined());
    });
  });
});
