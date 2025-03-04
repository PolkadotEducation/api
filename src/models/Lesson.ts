import { getModelForClass, prop, Ref } from "@typegoose/typegoose";

import BaseModel from "./BaseModel";
import { Team } from "./Team";
import { Challenge } from "./Challenge";

class Reference {
  @prop({ required: true, type: String })
  public title: string;

  @prop({ required: true, type: String })
  public link: string;
}

class Lesson extends BaseModel {
  @prop({ required: true, ref: () => Team })
  public teamId: Ref<Team>;

  @prop({ required: true, type: String })
  public title: string;

  @prop({ required: true, enum: ["english", "portuguese", "spanish"], type: String, default: "english" })
  public language: string;

  @prop({ required: true, type: String })
  public body: string;

  @prop({ required: true, enum: ["easy", "medium", "hard"], type: String })
  public difficulty: string;

  @prop({ required: false, type: () => Challenge, default: {} })
  public challenge: Challenge;

  @prop({ required: false, type: () => Array<Reference>, default: [] })
  public references: Reference[];
}

const LessonModel = getModelForClass(Lesson);

export { Lesson, LessonModel };
