import { getModelForClass, prop } from "@typegoose/typegoose";
import type { Ref } from "@typegoose/typegoose";
import BaseModel from "./BaseModel";
import { Module } from "./Module";

class Course extends BaseModel {
  @prop({ required: true, type: String, maxlength: 100 })
  public title: string;

  @prop({ required: true, type: String, maxlength: 1000 })
  public summary: string;

  @prop({ required: true, type: () => Array<Module>, ref: () => Module })
  public modules: Ref<Module>[];
}

const CourseModel = getModelForClass(Course);

export { Course, CourseModel };
