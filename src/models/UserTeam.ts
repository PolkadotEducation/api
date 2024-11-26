import { getModelForClass, index, prop } from "@typegoose/typegoose";
import type { Ref } from "@typegoose/typegoose";
import BaseModel from "./BaseModel";
import { Team } from "./Team";

@index({ email: 1, teamId: 1 }, { unique: true })
class UserTeam extends BaseModel {
  @prop({ required: true, type: String })
  public email: string;

  @prop({ required: true, ref: () => Team })
  public teamId: Ref<Team>;
}

const UserTeamModel = getModelForClass(UserTeam);

export { UserTeam, UserTeamModel };
