import { getModelForClass, prop } from "@typegoose/typegoose";
import type { Ref } from "@typegoose/typegoose";
import BaseModel from "./BaseModel";
import { Lesson } from "./Lesson";
import { Course } from "./Course";

class Progress extends BaseModel {
  @prop({ required: true, type: String })
  public lessonId: Ref<Lesson>;

  @prop({ required: true, type: String })
  public courseId: Ref<Course>;

  @prop({ required: true, type: Number })
  public choice: number;

  @prop({ required: true, type: Boolean })
  public isCorrect: boolean;
}

const ProgressModel = getModelForClass(Progress);

export { Progress, ProgressModel };
