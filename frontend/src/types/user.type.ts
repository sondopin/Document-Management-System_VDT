export interface User {
  _id: string;
  email: string;
  password: string;
  user_name: string;
  last_modified: Date;
  last_login: Date;
  is_active: boolean;
}


export interface UserProfileFormData {
  user_name: string;
  email: string;
}

export interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}