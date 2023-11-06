import { getDatabaseConnection } from "../../data-source";
import { User } from "../entity/User.entity";
import { Messages } from "../utilities/Messages";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import {
  APIGatewayProxyCallback,
  APIGatewayProxyEvent,
  Context,
} from "aws-lambda";

import {
  IJwtPayload,
  IResetPassword,
  IUpdateUserDetails,
  IUser,
  IUserSignIn,
  IUserSignUp,
} from "../interfaces/user.interface";
import {
  getAccessKeyFromSecretManager,
  getAwsSecretKeyFromSecretManager,
  getSecretFromSecretManager,
} from "../utilities/SecretManager";
import createErrorResponse from "../utilities/createErrorResponse";
import { run, sendCode } from "../utilities/mailerService";
import { authenticateJWT } from "../middleware/verifyToken";
import { checkAuthentication } from "../middleware/checkAuth";
import { PutObjectCommand, S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { parser } from "../utilities/formParser";
import { ACCOUNT_TYPE } from "../enums/userEnums";

require("dotenv").config();

export class AuthController {
  public static userSignup = async (req: APIGatewayProxyEvent) => {
    try {
      const SECRET_KEY = await getSecretFromSecretManager();
      const AppDataSource = await getDatabaseConnection();
      const userRepository = AppDataSource.getRepository(User);
      const { email, password }: IUserSignUp = JSON.parse(req.body || "{}");
      const userExists = await userRepository.findOne({
        where: { email, is_deleted: false },
      });
      if (userExists) {
        return {
          statusCode: 409,
          body: JSON.stringify({
            message: Messages.DUPLICATE_USER,
          }),
        };
      }
      const saltRounds = 10;
      const salt = bcrypt.genSaltSync(saltRounds);
      const hashedPassword = bcrypt.hashSync(password, salt);
      const user: IUser = new User();
      user.email = email;
      user.password = hashedPassword;
      await userRepository.save(user);
      delete user.password;

      const token = jwt.sign({ id: user?.id, email: user?.email }, SECRET_KEY, {
        expiresIn: "365d",
      });
      return { message: Messages.USER_CREATED, token, user };
    } catch (error) {
      console.log("Error", error);
      return {
        statusCode: error.statusCode || 500,
        body: JSON.stringify({
          message: error.message || "Internal Server Error",
        }),
      };
    }
  };

  public static userSignIn = async (req: APIGatewayProxyEvent) => {
    try {
      const SECRET_KEY = await getSecretFromSecretManager();
      const AppDataSource = await getDatabaseConnection();
      const userRepository = AppDataSource.getRepository(User);
      const { email, password }: IUserSignIn = JSON.parse(req.body || "{}");
      const user: IUser | null = await userRepository.findOne({
        where: { email, is_deleted: false },
      });
      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: Messages.USER_NOT_EXISTS,
          }),
        };
      }

      const isPasswordCorrect = await bcrypt.compare(
        password,
        user.password as string
      );
      if (!isPasswordCorrect) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            message: "Invalid Credentials",
          }),
        };
      }

      const token = jwt.sign({ id: user?.id, email: user?.email }, SECRET_KEY, {
        expiresIn: "365d",
      });
      delete user.password;

      return { message: Messages.LOGIN_SUCCESSFULL, token, user };
    } catch (error) {
      console.log("error", error);
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };

  public static uploadProfilePic = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    try {
      await authenticateJWT(req, context, callback);
      if (!req?.user) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            message: Messages.UNAUTHORIZED,
          }),
        };
      }
      const AppDataSource = await getDatabaseConnection();
      const userRepository = AppDataSource.getRepository(User);
      const userId = +req?.user?.id;
      const user = await userRepository.findOne({
        where: { id: userId, is_deleted: false },
      });
      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: Messages.USER_NOT_EXIST,
          }),
        };
      }

      const s3Config: S3ClientConfig = {
        region: "us-east-2",
        credentials: {
          accessKeyId: await getAccessKeyFromSecretManager(),
          secretAccessKey: await getAwsSecretKeyFromSecretManager(),
        },
      };
      const s3 = new S3Client(s3Config);
      const MAX_SIZE = 6000000; // 6MB
      const formData: any = await parser(req, MAX_SIZE);
      const profile_pic = formData.files[0];
      const s3Params = {
        Bucket: "utomea-events",
        Key: `profile_pic/${profile_pic?.filename?.filename.replace(/ /g, "")}`,
        Body: profile_pic?.content,
        ContentType: profile_pic?.filename?.mimeType,
      };
      const command = new PutObjectCommand(s3Params);
      await s3.send(command);
      let url = `https://utomea-events.s3.us-east-2.amazonaws.com/profile_pic/${profile_pic?.filename?.filename.replace(
        / /g,
        ""
      )}`;
      user.profile_pic = url;

      await userRepository.save(user);
      return { message: Messages.PROFILE_PIC_UPLOADED };
    } catch (error) {
      console.log("error", error);
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };

  public static updateUserDetails = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    try {
      await authenticateJWT(req, context, callback);
      if (!req?.user) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            message: Messages.UNAUTHORIZED,
          }),
        };
      }
      const AppDataSource = await getDatabaseConnection();
      const userRepository = AppDataSource.getRepository(User);
      const userId = +req?.user?.id;
      const user = await userRepository.findOne({
        where: { id: userId, is_deleted: false },
      });
      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: Messages.USER_NOT_EXIST,
          }),
        };
      }
      const {
        name,
        privacy_policy_accepted,
        auto_entry_time,
        auto_verification,
      }: IUpdateUserDetails = JSON.parse(req.body);
      user.name = name;
      user.privacy_policy_accepted = privacy_policy_accepted;
      user.auto_entry_time = auto_entry_time;
      user.auto_verification = auto_verification;
      await userRepository.save(user);
      return { message: Messages.USER_UPDATED_SUCCESSFULLY };
    } catch (error) {
      console.log("error", error);
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };
  public static forgotPassword = async (req: APIGatewayProxyEvent) => {
    const SECRET_KEY: string = await getSecretFromSecretManager();
    const AppDataSource = await getDatabaseConnection();
    const userRepository = AppDataSource.getRepository(User);
    try {
      const { email } = JSON.parse(req.body || "");
      const user = await userRepository.findOne({
        where: { email, is_deleted: false },
      });
      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: Messages.USER_NOT_EXIST,
          }),
        };
      }

      if (user.account_type === ACCOUNT_TYPE.SOCIAL_ACCOUNT) {
        return {
          statusCode: 403,
          body: JSON.stringify({
            message: Messages.EMAIL_LINKED_TO_SOCIAL,
          }),
        };
      }
      const token = jwt.sign({ email }, SECRET_KEY, {
        expiresIn: "15m",
      });

      const resetPasswordLink = `utomeaapp://reset-password/${token}`;
      await run(email, resetPasswordLink);
      return {
        message: Messages.RESET_LINK_SENT,
      };
    } catch (error) {
      console.log("error", error);
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };

  public static resetPassword = async (req: APIGatewayProxyEvent) => {
    const SECRET_KEY: string = await getSecretFromSecretManager();
    const AppDataSource = await getDatabaseConnection();

    const userRepository = AppDataSource.getRepository(User);
    try {
      const token: string = req?.pathParameters?.token as string;
      jwt.verify(token, SECRET_KEY);
      const { password, confirm_password }: IResetPassword = JSON.parse(
        req.body || ""
      );
      if (password !== confirm_password) {
        return {
          statusCode: 403,
          body: JSON.stringify({
            message: Messages.PASSWORD_NOT_SAME,
          }),
        };
      }
      const decoded = jwt.decode(token);
      const email = decoded?.["email"];
      console.log("email", email);
      const user = await userRepository.findOne({
        where: { email, is_deleted: false },
      });
      console.log("user", user);
      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: Messages.USER_NOT_EXIST,
          }),
        };
      }

      const saltRounds = 10;
      const salt = bcrypt.genSaltSync(saltRounds);
      const hashedPassword = bcrypt.hashSync(password, salt);

      user.password = hashedPassword;
      await userRepository.save(user);
      return {
        message: Messages.PASSWORD_RESET,
      };
    } catch (error) {
      console.log("error", error);
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };

  public static changePassword = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    const AppDataSource = await getDatabaseConnection();
    const userRepository = AppDataSource.getRepository(User);
    try {
      await checkAuthentication(req, context, callback);
      const { password, new_password, confirm_password } = JSON.parse(req.body);
      const authHeader = req?.headers?.authorization;
      const token = authHeader.split(" ")[1];
      const decoded = jwt.decode(token) as IJwtPayload;
      const user: any = await userRepository.findOne({
        where: { id: decoded?.id, is_deleted: false },
      });

      console.log("user", user);

      const isPasswordCorrect = await bcrypt.compare(
        password,
        user?.password as string
      );

      console.log("is password correct", isPasswordCorrect);

      if (!isPasswordCorrect) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            message: Messages.INCORRECT_PASSWORD,
          }),
        };
      }

      if (new_password !== confirm_password) {
        return {
          statusCode: 403,
          body: JSON.stringify({
            message: Messages.PASSWORD_NOT_SAME,
          }),
        };
      }

      const saltRounds = 10;
      const salt = bcrypt.genSaltSync(saltRounds);
      const hashedPassword = bcrypt.hashSync(new_password, salt);

      user.password = hashedPassword;
      await userRepository.save(user);
      return {
        message: Messages.PASSWORD_CHANGE,
      };
    } catch (error) {
      console.log("error", error);
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };

  public static getUserDetails = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    const AppDataSource = await getDatabaseConnection();
    const userRepository = AppDataSource.getRepository(User);
    try {
      await checkAuthentication(req, context, callback);
      console.log("reqqqq", req);
      const user: IUser | null = await userRepository.findOne({
        where: { id: req?.user?.id, is_deleted: false },
      });
      console.log("user", user);
      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: Messages.USER_NOT_EXIST,
          }),
        };
      }

      delete user.password;

      return {
        message: Messages.USER_DETAILS_FETCHED,
        data: user,
      };
    } catch (error) {
      console.log("error", error);
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };

  public static socialLogin = async (req: APIGatewayProxyEvent) => {
    try {
      const SECRET_KEY = await getSecretFromSecretManager();
      const AppDataSource = await getDatabaseConnection();
      const userRepository = AppDataSource.getRepository(User);
      const { email } = JSON.parse(req.body || "{}");
      const user: IUser | null = await userRepository.findOne({
        where: {
          email,
          is_deleted: false,
          account_type: ACCOUNT_TYPE.NORMAL_EMAIL,
        },
      });

      if (user) {
        return {
          statusCode: 403,
          body: JSON.stringify({
            message: Messages.EMAIL_ALREADY_REGISTERED,
          }),
        };
      }

      const alreadyExists: IUser | null = await userRepository.findOne({
        where: {
          email,
          account_type: ACCOUNT_TYPE.SOCIAL_ACCOUNT,
          is_deleted: false,
        },
      });
      if (alreadyExists) {
        const token = jwt.sign(
          { id: alreadyExists?.id, email: alreadyExists?.email },
          SECRET_KEY,
          { expiresIn: "365d" }
        );
        delete alreadyExists.password;
        return {
          message: Messages.LOGIN_SUCCESSFULL,
          token,
          user: alreadyExists,
        };
      }

      const newUser: IUser = new User();
      newUser.email = email;
      newUser.account_type = ACCOUNT_TYPE.SOCIAL_ACCOUNT;
      await userRepository.save(newUser);
      const token = jwt.sign(
        { id: newUser?.id, email: newUser?.email },
        SECRET_KEY,
        {
          expiresIn: "365d",
        }
      );

      delete newUser.password;
      return { message: Messages.LOGIN_SUCCESSFULL, token, user: newUser };
    } catch (error) {
      console.log("error", error);
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };

  public static deleteProfilePic = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    try {
      await checkAuthentication(req, context, callback);
      const AppDataSource = await getDatabaseConnection();
      const userRepository = AppDataSource.getRepository(User);
      const userId = +req?.user?.id;
      const user: IUser | null = await userRepository.findOne({
        where: { id: userId, is_deleted: false },
      });
      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: Messages.USER_NOT_EXIST,
          }),
        };
      }
      user.profile_pic = null;
      await userRepository.save(user);
      return { message: Messages.PROFILE_PIC_DELETED };
    } catch (error) {
      console.log("error", error);
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };

  public static sendVerificationEmail = async (req) => {
    try {
      const AppDataSource = await getDatabaseConnection();
      const userRepository = AppDataSource.getRepository(User);
      const { email } = JSON.parse(req.body);
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const verificationCodeExpiry = new Date();
      verificationCodeExpiry.setMinutes(
        verificationCodeExpiry.getMinutes() + 15
      ); // 15 minutes expiry

      const user = await userRepository.findOne({
        where: { email, is_deleted: false },
      });
      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: Messages.USER_NOT_EXIST,
          }),
        };
      }
      const res = await sendCode(email, verificationCode);
      if (res.Error) {
        return {
          statusCode: 403,
          body: JSON.stringify({
            message: res?.Error?.message,
          }),
        };
      }
      user.verificationCode = verificationCode;
      user.verificationCodeExpiry = verificationCodeExpiry;

      await userRepository.save(user);
      return { message: Messages.VERIFICATION_CODE_SENT };
    } catch (error) {
      console.log("error", error);
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };

  public static verifyOTP = async (req) => {
    try {
      const AppDataSource = await getDatabaseConnection();
      const userRepository = AppDataSource.getRepository(User);
      const { email, otp } = JSON.parse(req.body);

      const user: IUser | null = await userRepository.findOne({
        where: { email, is_deleted: false },
      });
      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: Messages.USER_NOT_EXIST,
          }),
        };
      }

      if (user.verificationCode === otp) {
        const now = new Date();
        if (user.verificationCodeExpiry && user.verificationCodeExpiry > now) {
          user.is_verified = true;
          user.verificationCode = null;
          user.verificationCodeExpiry = null;

          await userRepository.save(user);
          return {
            statusCode: 200,
            body: JSON.stringify({ message: "OTP verified successfully." }),
          };
        } else {
          return {
            statusCode: 401,
            body: JSON.stringify({ message: "Verification code has expired." }),
          };
        }
      } else {
        return {
          statusCode: 401,
          body: JSON.stringify({ message: "Invalid OTP." }),
        };
      }
    } catch (error) {
      console.log("error", error);
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };
}
