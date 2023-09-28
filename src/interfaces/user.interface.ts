import { AutoEntryTime } from "../enums/userEnums";

export interface IUserSignIn {
  email: string;
  password: string;
}

export interface IUserSignUp {
  name: string;
  email: string;
  password: string;
}

export interface IUpdateUserDetails {
  name: string;
  privacy_policy_accepted: boolean;
  auto_entry_time: AutoEntryTime;
}

export interface IResetPassword {
  password: string;
  confirm_password: string;
}

export interface IUser {
  email: string;
  password?: string;
  name: string;
  id: number;
  is_verified: boolean;
  privacy_policy_accepted: boolean;
  auto_entry_time: number;
  is_deleted: boolean;
}