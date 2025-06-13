
import http from "../utils/http";
import {
  ChangePasswordParams,
  UserProfileFormData,
  User,
} from "../types/user.type";




export const updateUserProfile = async (formData: UserProfileFormData) => {
  http.put("/users/update-profile", formData);
};

export const changePassword = async (params: ChangePasswordParams) => {
  http.put("/users/change-password", params);
};

export const fetchCurrentUser = async (): Promise<User> => {
  const response = await http.get<User>("/users/me");
  return response.data;
};

export const findUserByEmail = async (email: string): Promise<User[] | null> => {
  try {
    const response = await http.post<User[]>("/users/find", { email });
    return response.data || null;
  } catch (error) {
    console.error("Error finding user by email:", error);
    return null;
  }
};

export const findUserById = async (userId: string): Promise<User | undefined> => {
  try {
    const response = await http.get<User>(`/users/find/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error finding user by ID:", error);
    return undefined;
  }
};

