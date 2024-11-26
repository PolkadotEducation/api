import { TeamModel } from "@/models/Team";
import { UserTeamModel } from "@/models/UserTeam";
import { TeamInfo } from "@/types/Team";

export const getUserTeamInfo = async (email: string): Promise<TeamInfo[]> => {
  const teams = [];
  const userTeams = await UserTeamModel.find({ email });
  for (const userTeam of userTeams) {
    const team = await TeamModel.findById(userTeam.teamId);
    if (team) {
      teams.push({
        id: team._id,
        owner: team.owner,
        name: team.name,
        description: team.description,
        picture: team.picture,
      });
    }
  }
  return teams;
};
