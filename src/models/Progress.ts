import { getModelForClass, prop } from "@typegoose/typegoose";
import type { Ref } from "@typegoose/typegoose";
import BaseModel from "./BaseModel";
import { Lesson } from "./Lesson";
import { Course } from "./Course";
import { User } from "./User";

class Progress extends BaseModel {
  @prop({ required: true, type: String })
  public lessonId: Ref<Lesson>;

  @prop({ required: true, type: String })
  public courseId: Ref<Course>;

  @prop({ required: true, type: String })
  public userId: Ref<User>;

  @prop({ required: true, type: Number })
  public choice: number;

  @prop({ required: true, type: String, enum: ["easy", "medium", "hard"] })
  public difficulty: string;

  @prop({ required: true, type: Boolean })
  public isCorrect: boolean;
}

const ProgressModel = getModelForClass(Progress);

export { Progress, ProgressModel };
