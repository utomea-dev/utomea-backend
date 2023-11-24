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

export const updateUser = async (
  event: APIGatewayEvent,
  context: Context,
  callback: APIGatewayProxyCallback
) => {
  try {
    return await AuthController.updateUserDetails(event, context, callback);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const uploadProfilePic = async (
  event: APIGatewayEvent,
  context: Context,
  callback: APIGatewayProxyCallback
) => {
  try {
    return await AuthController.uploadProfilePic(event, context, callback);
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

export const changePassword = async (
  event: APIGatewayEvent,
  context: Context,
  callback: APIGatewayProxyCallback
) => {
  try {
    return await AuthController.changePassword(event, context, callback);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const getUserDetails = async (
  event: APIGatewayEvent,
  context: Context,
  callback: APIGatewayProxyCallback
) => {
  try {
    return await AuthController.getUserDetails(event, context, callback);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const socialLogin = async (event: APIGatewayEvent) => {
  try {
    return await AuthController.socialLogin(event);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const deleteProfilePic = async (
  event: APIGatewayEvent,
  context: Context,
  callback: APIGatewayProxyCallback
) => {
  try {
    return await AuthController.deleteProfilePic(event, context, callback);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};


export const sendVerificationEmail = async (
  event: APIGatewayEvent
) => {
  try {
    return await AuthController.sendVerificationEmail(event);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};


export const verifyOTP = async (
  event: APIGatewayEvent
) => {
  try {
    return await AuthController.verifyOTP(event);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const verifyForgotPasswordOTP = async (
  event: APIGatewayEvent
) => {
  try {
    return await AuthController.verifyForgotPasswordOTP(event);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
}

export const deleteUser = async (
  event: APIGatewayEvent,
  context: Context,
  callback: APIGatewayProxyCallback
) => {
  try {
    return await AuthController.deleteUser(event, context, callback);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
}