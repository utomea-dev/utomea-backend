import { ACCOUNT_TYPE, AutoEntryTime } from "../enums/userEnums";

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
  auto_verification: boolean
  // profile_pic?: string;
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
  is_new_user: boolean;
  auto_verification: boolean;
  account_type: ACCOUNT_TYPE;
  profile_pic: any;
  verificationCode: any;
  verificationCodeExpiry: any
}


export interface IJwtPayload {
  id: number,
  email: string
}