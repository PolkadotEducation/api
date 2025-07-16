import { Request, Response } from "express";
import { ObjectId } from "mongodb";

import { TeamModel } from "@/models/Team";
import { UserTeamModel } from "@/models/UserTeam";
import { UserModel } from "@/models/User";

export const createTeam = async (req: Request, res: Response) => {
  try {
    const { owner, name, description, picture } = req.body;
    if (!owner || !name) return res.status(400).send({ error: { message: "Missing team's owner or name" } });

    const user = await UserModel.findOne({ email: owner });
    if (user) {
      // Create the Team
      const newTeam = await TeamModel.create({
        owner,
        name,
        description,
        picture,
      });

      // Create the relation Owner->Team
      const newUserTeam = await UserTeamModel.create({
        email: owner,
        teamId: newTeam._id,
      });

      if (newTeam && newUserTeam) return res.status(200).send(newTeam);
    } else {
      return res.status(404).send({ error: { message: "Team owner not a user" } });
    }
  } catch (e) {
    console.error(`[ERROR][createTeam] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "Team not created (already exists?)",
    },
  });
};

export const getTeams = async (req: Request, res: Response) => {
  try {
    const { teamId: id } = req.query;
    if (id) {
      const teamId = new ObjectId(id as string);
      const team = await TeamModel.findOne({ _id: teamId }).lean();
      const members = (await UserTeamModel.find({ teamId })).map((m) => m.email);
      if (team) return res.status(200).send({ ...team, id: team._id, members });
    } else {
      const teams = [];
      const storedTeams = await TeamModel.find().lean();
      for (const team of storedTeams) {
        const members = (await UserTeamModel.find({ teamId: team._id })).map((m) => m.email);
        teams.push({ ...team, id: team._id, members });
      }
      return res.status(200).send(teams);
    }
  } catch (e) {
    console.error(`[ERROR][getTeam] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "Team not found",
    },
  });
};

export const getUserTeams = async (req: Request, res: Response) => {
  try {
    const { isOwner } = req.query;
    const ownerEmail = res.locals?.populatedUser?.email;

    if (!ownerEmail) return res.status(400).send({ error: { message: "Missing users's email" } });

    let teams = [];
    if (isOwner) teams = await TeamModel.find({ owner: ownerEmail });
    else {
      const teamIds = (await UserTeamModel.find({ email: ownerEmail })).map((t) => t.teamId);
      for (const tId of teamIds) {
        const team = await TeamModel.findOne({ _id: tId });
        teams.push(team);
      }
    }

    return res.status(200).send(teams);
  } catch (e) {
    console.error(`[ERROR][getUserTeams] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "User's teams not found",
    },
  });
};

export const updateTeam = async (req: Request, res: Response) => {
  try {
    const ownerEmail = res.locals?.populatedUser?.email;
    const { id } = req.params;
    if (!id) return res.status(404).send({ error: { message: "Missing team's id" } });
    // owner: new owner email
    // addMembers: email[] (to be added)
    // remMembers: email[] (to be removed)
    const { name, description, picture, owner, addMembers, remMembers } = req.body;

    const team = await TeamModel.findOne({ _id: new ObjectId(id as string), owner: ownerEmail });
    if (!team) return res.status(404).send({ error: { message: "Team not found" } });

    if (name) team.name = name;
    if (description) team.description = description;
    if (picture) team.picture = picture;
    if (owner) {
      const newOwner = await UserModel.findOne({ email: owner });
      const userTeam = await UserTeamModel.findOne({ email: owner, teamId: team._id });
      if (newOwner && !userTeam) await UserTeamModel.create({ email: owner, teamId: team._id });
      team.owner = owner;
    }
    if (Array.isArray(addMembers)) {
      for (const email of addMembers) {
        const user = await UserModel.findOne({ email });
        const userTeam = await UserTeamModel.findOne({ email, teamId: team._id });
        if (user && !userTeam) await UserTeamModel.create({ email, teamId: team._id });
      }
    }
    if (Array.isArray(remMembers)) {
      for (const email of remMembers) {
        const user = await UserModel.findOne({ email });
        if (user) await UserTeamModel.deleteOne({ email, teamId: team._id });
      }
    }
    await team.save();

    const newMembers = (await UserTeamModel.find({ teamId: id })).map((m) => m.email);
    return res.status(200).send({
      id: team._id,
      owner: team.owner,
      name: team.name,
      description: team.description,
      picture: team.picture,
      members: newMembers,
    });
  } catch (e) {
    console.error(`[ERROR][updateTeam] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "Team not updated",
    },
  });
};

export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const ownerEmail = res.locals?.populatedUser?.email;
    const { id } = req.params;
    if (!id) return res.status(404).send({ error: { message: "Missing team's id" } });

    const teamId = new ObjectId(id as string);
    const result = await TeamModel.deleteOne({ _id: teamId, owner: ownerEmail });
    if (result?.deletedCount > 0) {
      // Deleting all entries from UserTeam
      await UserTeamModel.deleteMany({ teamId });
      return res.status(200).send({ message: `Team '${teamId}' deleted` });
    }
  } catch (e) {
    console.error(`[ERROR][deleteTeam] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "Team not deleted",
    },
  });
};

export const leaveTeam = async (req: Request, res: Response) => {
  try {
    const email = res.locals?.populatedUser?.email;
    const { id } = req.params;
    if (!id) return res.status(404).send({ error: { message: "Missing team's id" } });

    const teamId = new ObjectId(id as string);
    const team = await TeamModel.findOne({ _id: teamId });
    if (!team) return res.status(404).send({ error: { message: "Team not found" } });
    if (email === team.owner) return res.status(400).send({ error: { message: "Team owner can not leave" } });

    const result = await UserTeamModel.deleteOne({ teamId, email });
    if (result?.deletedCount > 0) {
      return res.status(200).send({ message: `User '${email}' has left ${teamId}` });
    }
  } catch (e) {
    console.error(`[ERROR][leaveTeam] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "User is not a member of the team",
    },
  });
};
