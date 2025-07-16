import { getModelForClass, prop } from "@typegoose/typegoose";
import BaseModel from "./BaseModel";

class Ranking extends BaseModel {
  @prop({ required: true, enum: ["weekly", "general"], type: String })
  public type: string;

  @prop({ required: true, type: Date })
  public lastUpdated: Date;

  @prop({ required: true, type: () => [Object] })
  public ranking!: Array<{
    userId: string;
    name: string;
    picture: string;
    xp: number;
  }>;
}

const RankingModel = getModelForClass(Ranking);
export { Ranking, RankingModel };
