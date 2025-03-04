import { getModelForClass, prop, Severity } from "@typegoose/typegoose";

import BaseModel from "./BaseModel";

class Challenge extends BaseModel {
  @prop({ required: true, type: String })
  public question: string;

  @prop({
    required: true,
    type: Array<string>,
    validate: {
      validator: function (v: string[]) {
        return v.length >= 3 && v.length <= 5;
      },
      message: "Choices array must contain between 3 and 5 items.",
    },
    allowMixed: Severity.ALLOW,
  })
  public choices: string[];

  @prop({ required: true, type: Number })
  public correctChoice: number;
}

const ChallengeModel = getModelForClass(Challenge);

export { Challenge, ChallengeModel };
