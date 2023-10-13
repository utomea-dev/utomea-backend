import { Messages } from "../utilities/Messages";
import { authenticateJWT } from "./verifyToken";

export const checkAuthentication = async (req, context, callback) => {
    await authenticateJWT(req, context, callback);
    console.log("reqqq", req)
      if (!req?.user?.id) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            message: Messages.UNAUTHORIZED,
          }),
        };
      }
}