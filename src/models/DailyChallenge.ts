import { getModelForClass, prop, index, Ref } from "@typegoose/typegoose";

import BaseModel from "./BaseModel";
import { Challenge } from "./Challenge";

@index({ challenge: 1, date: 1, language: 1 }, { unique: true })
class DailyChallenge extends BaseModel {
  @prop({ required: true, ref: () => Challenge })
  public challenge: Ref<Challenge>;

  @prop({ required: true, type: Date })
  public date: Date;

  @prop({ required: true, enum: ["english", "portuguese", "spanish"], type: String })
  public language: string;
}

const DailyChallengeModel = getModelForClass(DailyChallenge);

export { DailyChallenge, DailyChallengeModel };
