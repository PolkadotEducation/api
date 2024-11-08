import { env } from "@/environment";
import { UserModel } from "@/models/User";

export const getAuthHeaders = async (email: string, password: string) => {
  const jwt = await UserModel.login(email, password);
  return {
    authorization: `Bearer ${jwt}`,
    code: env.AUTH_CODE,
  };
};
