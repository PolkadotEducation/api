import { getModelForClass, prop, index } from "@typegoose/typegoose";
import type { Ref } from "@typegoose/typegoose";
import BaseModel from "./BaseModel";
import { Course } from "./Course";
import { User } from "./User";

@index({ lessonId: 1, courseId: 1, userId: 1 }, { unique: true })
class Certificate extends BaseModel {
  @prop({ required: true, type: String, maxlength: 100 })
  public courseTitle: string;

  @prop({ required: true, type: String, maxlength: 100 })
  public userName: string;

  @prop({ required: true, ref: () => User })
  public userId: Ref<User>;

  @prop({ required: true, ref: () => Course })
  public courseId: Ref<Course>;

  @prop({ required: false, type: Number })
  public courseDuration: number;
}

const CertificateModel = getModelForClass(Certificate);

export { Certificate, CertificateModel };
