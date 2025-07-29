import { getModelForClass, prop, Ref, Severity, index } from "@typegoose/typegoose";

import BaseModel from "./BaseModel";
import { Team } from "./Team";

class Challenge {
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

class Reference {
  @prop({ required: true, type: String })
  public title: string;

  @prop({ required: true, type: String })
  public link: string;
}

@index({ slug: 1, language: 1 }, { unique: true })
class Lesson extends BaseModel {
  @prop({ required: true, ref: () => Team })
  public teamId: Ref<Team>;

  @prop({ required: true, type: String })
  public title: string;

  @prop({ required: true, enum: ["english", "portuguese", "spanish"], type: String, default: "english" })
  public language: string;

  @prop({ required: true, type: String })
  public slug: string;

  @prop({ required: true, type: String })
  public body: string;

  @prop({ required: true, enum: ["easy", "medium", "hard"], type: String })
  public difficulty: string;

  @prop({ required: true, type: () => Challenge, default: {} })
  public challenge: Challenge;

  @prop({ required: false, type: () => Array<Reference>, default: [] })
  public references: Reference[];
}

const LessonModel = getModelForClass(Lesson);

export { Lesson, LessonModel };
