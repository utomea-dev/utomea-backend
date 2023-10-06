import { getDataSource } from "../../data-source";
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
  IResetPassword,
  IUpdateUserDetails,
  IUser,
  IUserSignIn,
  IUserSignUp,
} from "../interfaces/user.interface";
import {
  getSecretFromSecretManager,
} from "../utilities/SecretManager";
import createErrorResponse from "../utilities/createErrorResponse";
import { run } from "../utilities/mailerService";
import { authenticateJWT } from "../middleware/verifyToken";

require("dotenv").config();

export class AuthController {
  public static userSignup = async (req: APIGatewayProxyEvent) => {
    try {
      const SECRET_KEY = await getSecretFromSecretManager();
      const AppDataSource = await getDataSource();
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
      const AppDataSource = await getDataSource();
      const userRepository = AppDataSource.getRepository(User);
      const { email, password }: IUserSignIn = JSON.parse(req.body || "{}");
      const user: IUser | null = await userRepository.findOne({ where: { email } });
      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: Messages.USER_NOT_EXISTS,
          }),
        };
      }

      const isPasswordCorrect =  await bcrypt.compare(password, user.password as string);
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
      delete user.password

      return { message: Messages.LOGIN_SUCCESSFULL, token, user };
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
      const AppDataSource = await getDataSource();
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
      }: IUpdateUserDetails = JSON.parse(req.body);
      user.name = name;
      user.privacy_policy_accepted = privacy_policy_accepted;
      user.auto_entry_time = auto_entry_time;
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
    const AppDataSource = await getDataSource();
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

    const AppDataSource = await getDataSource();
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
}
