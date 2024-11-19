import { getModelForClass, prop } from "@typegoose/typegoose";
import type { Ref } from "@typegoose/typegoose";
import BaseModel from "./BaseModel";
import { Lesson } from "./Lesson";
import { Team } from "./Team";

class Module extends BaseModel {
  @prop({ required: true, ref: () => Team })
  public teamId: Ref<Team>;

  @prop({ required: true, type: String })
  public title: string;

  @prop({ required: true, type: () => Array<Lesson>, ref: () => Lesson })
  public lessons: Ref<Lesson>[];
}

const ModuleModel = getModelForClass(Module);

export { Module, ModuleModel };
