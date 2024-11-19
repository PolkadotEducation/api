import { getModelForClass, index, prop } from "@typegoose/typegoose";
import BaseModel from "./BaseModel";

@index({ email: 1, name: 1 }, { unique: true })
class Team extends BaseModel {
  // User email (owner)
  @prop({ required: true, type: String })
  public owner: string;

  @prop({ required: true, type: String })
  public name: string;

  @prop({ required: false, type: String })
  public description: string;

  @prop({ required: false, type: String })
  public picture: string;
}

const TeamModel = getModelForClass(Team);

export { Team, TeamModel };
