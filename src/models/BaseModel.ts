import { modelOptions, ReturnModelType, Severity } from "@typegoose/typegoose";
import { IBaseModel } from "@/types/IBaseModel";

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },

  options: {
    allowMixed: Severity.ALLOW,
  },
})
class BaseModel implements IBaseModel {
  public _id?: string;
  public createdAt?: Date;
  public updatedAt?: Date;

  /**
   * Paginates the results with default limit of 20 results
   *
   * @param query - The mongo query params passed on .find function
   * @param page - The page requested
   * @param limit - The limit you want connections based on
   * @returns - List of results
   */
  public static findPaginated(this: ReturnModelType<typeof BaseModel>, query: object, page = 1, limit = 20) {
    return this.find(query)
      .limit(limit)
      .skip((page - 1) * limit);
  }
}

export default BaseModel;
