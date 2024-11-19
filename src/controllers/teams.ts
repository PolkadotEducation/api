import { Request, Response } from "express";
import { ObjectId } from "bson";

import { TeamModel } from "@/models/Team";
import { UserTeamModel } from "@/models/UserTeam";
import { UserModel } from "@/models/User";

export const createTeam = async (req: Request, res: Response) => {
  try {
    const { name, description, picture } = req.body;
    const ownerEmail = res.locals?.populatedUser?.email;
    if (!ownerEmail || !name) return res.status(400).send({ error: { message: "Missing team's owner or name" } });

    // Create the Team
    const newTeam = await TeamModel.create({
      owner: ownerEmail,
      name,
      description,
      picture,
    });

    // Create the relation Owner->Team
    const newUserTeam = await UserTeamModel.create({
      email: ownerEmail,
      teamId: newTeam._id,
    });

    if (newTeam && newUserTeam) return res.status(200).send(newTeam);
  } catch (e) {
    console.error(`[ERROR][createTeam] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "Team not created (already exists?)",
    },
  });
};

export const getTeam = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.query;
    if (!teamId) return res.status(400).send({ error: { message: "Missing team's id" } });

    const team = await TeamModel.findOne({ _id: teamId }).lean();
    const members = (await UserTeamModel.find({ teamId })).map((m) => m.email);

    if (team) return res.status(200).send({ ...team, members });
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
    const userEmail = res.locals?.populatedUser?.email;

    if (!userEmail) return res.status(400).send({ error: { message: "Missing users's email" } });

    let teams = [];
    if (isOwner) teams = await TeamModel.find({ owner: userEmail });
    else {
      const teamIds = (await UserTeamModel.find({ email: userEmail })).map((t) => t.teamId);
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
    // owner: new owner email
    // addMembers: email[] (to be added)
    // remMembers: email[] (to be removed)
    const { name, description, picture, owner, addMembers, remMembers } = req.body;

    const team = await TeamModel.findOne({ _id: new ObjectId(id), owner: ownerEmail });
    if (!id || !team) return res.status(404).send({ error: { message: "Team not found" } });

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

    const result = await TeamModel.deleteOne({ _id: id, owner: ownerEmail });
    if (result?.deletedCount > 0) return res.status(200).send({ message: `Team '${id}' deleted` });
  } catch (e) {
    console.error(`[ERROR][deleteTeam] ${e}`);
  }

  return res.status(400).send({
    error: {
      message: "Team not deleted",
    },
  });
};
