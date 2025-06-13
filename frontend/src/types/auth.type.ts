import { User } from "./user.type";
import { SuccessResponse } from "./utils.type";

export type AuthResponse = SuccessResponse<{ user: User }>;
