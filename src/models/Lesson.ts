import { getModelForClass, prop, Ref, index } from "@typegoose/typegoose";

import BaseModel from "./BaseModel";
import { Team } from "./Team";
import { Challenge } from "./Challenge";

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

  @prop({ required: false, enum: ["easy", "medium", "hard"], type: String })
  public difficulty: string;

  @prop({ required: true, ref: () => Challenge })
  public challenge: Ref<Challenge>;

  @prop({ required: false, type: () => Array<Reference>, default: [] })
  public references: Reference[];
}

const LessonModel = getModelForClass(Lesson);

export { Lesson, LessonModel };
