import http from "../utils/http";
import { AuthResponse } from "../types/auth.type";

export const registerAccount = async (data: {
  email: string;
  password: string;
}) => http.post<AuthResponse>("/auth/register", data);

export const login = async (data: { email: string; password: string }) =>
  http.post<AuthResponse>("/auth/login", data);

export const logout = async () => http.post("/auth/logout");
