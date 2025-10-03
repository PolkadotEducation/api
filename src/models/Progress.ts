import { getModelForClass, prop, index } from "@typegoose/typegoose";
import type { Ref } from "@typegoose/typegoose";
import BaseModel from "./BaseModel";
import { Lesson } from "./Lesson";
import { Course } from "./Course";
import { User } from "./User";
import { Challenge } from "./Challenge";
import { DailyChallenge } from "./DailyChallenge";

@index({ challenge: 1, lessonId: 1, courseId: 1, userId: 1, choice: 1 }, { unique: true })
@index({ dailyChallenge: 1, userId: 1 }, { unique: true })
class Progress extends BaseModel {
  @prop({ required: false, ref: () => Challenge })
  public challenge: Ref<Challenge>;

  @prop({ required: false, ref: () => Challenge })
  public challengeId: Ref<Challenge>;

  @prop({ required: false, ref: () => Lesson })
  public lessonId: Ref<Lesson>;

  @prop({ required: false, ref: () => Course })
  public courseId: Ref<Course>;

  @prop({ required: false, ref: () => DailyChallenge })
  public dailyChallenge: Ref<DailyChallenge>;

  @prop({ required: true, ref: () => User })
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
