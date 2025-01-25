import { getModelForClass, prop } from "@typegoose/typegoose";
import type { Ref } from "@typegoose/typegoose";
import BaseModel from "./BaseModel";
import { Module } from "./Module";
import { Team } from "./Team";

class Course extends BaseModel {
  @prop({ required: true, ref: () => Team })
  public teamId: Ref<Team>;

  @prop({ required: true, type: String, maxlength: 100 })
  public title: string;

  @prop({ required: true, enum: ["english", "portuguese", "spanish"], type: String, default: "english" })
  public language: string;

  @prop({ required: true, type: String, maxlength: 1000 })
  public summary: string;

  @prop({ required: true, type: () => Array<Module>, ref: () => Module })
  public modules: Ref<Module>[];

  @prop({
    required: true,
    enum: ["blackPink", "blackPurple", "tetris", "gradient"],
    type: String,
    default: "blackPink",
  })
  public banner: string;
}

const CourseModel = getModelForClass(Course);

export { Course, CourseModel };
