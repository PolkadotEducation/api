import { getModelForClass, prop, Ref } from "@typegoose/typegoose";
import BaseModel from "./BaseModel";
import { Lesson } from "./Lesson";

class Module extends BaseModel {
  @prop({ required: true, type: String })
  public title: string;

  @prop({ required: true, type: () => Array<Lesson>, ref: () => Lesson })
  public lessons: Ref<Lesson>[];
}

const ModuleModel = getModelForClass(Module);

export { Module, ModuleModel };
