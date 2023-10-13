import * as jwt from "jsonwebtoken";
import { Messages } from "../utilities/Messages";
import { getSecretFromSecretManager } from "../utilities/SecretManager";
require("dotenv").config();

export const authenticateJWT = async (req, context, callback) => {
  try {
    const authHeader = req?.headers?.authorization;

    if (!authHeader) {
      return callback(null, {
        statusCode: 401,
        body: JSON.stringify({ message: Messages.UNAUTHORIZED }),
      });
    }

    const token = authHeader.split(" ")[1];
    const SECRET_KEY = await getSecretFromSecretManager();
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        console.log("In jwt error", err);
        return callback(null, {
          statusCode: 401,
          body: JSON.stringify({ message: Messages.UNAUTHORIZED }),
        });
      }
      req.user = { id: decoded?.id, email: decoded?.email };
    });
  } catch (error) {
    console.log("error", error);
  }
};
