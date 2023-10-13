import { AuthController } from "../src/controller/AuthController";
import { APIGatewayEvent, APIGatewayProxyCallback, Context } from "aws-lambda";

export const userSignIn = async (event: APIGatewayEvent) => {
  try {
    return await AuthController.userSignIn(event);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const userSignup = async (event: APIGatewayEvent) => {
  try {
    return await AuthController.userSignup(event);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const updateUser = async (event: APIGatewayEvent, context: Context, callback: APIGatewayProxyCallback) => {
  try {
    return await AuthController.updateUserDetails(event, context, callback);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const forgotPassword = async (event: APIGatewayEvent) => {
  try {
    return await AuthController.forgotPassword(event);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const resetPassword = async (event: APIGatewayEvent) => {
  try {
    return await AuthController.resetPassword(event);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const changePassword = async (event: APIGatewayEvent, context: Context, callback: APIGatewayProxyCallback) => {
  try {
    return await AuthController.changePassword(event, context, callback);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};
