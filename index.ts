import { APIGatewayEvent, APIGatewayProxyCallback, Context } from "aws-lambda";
import { EventController } from "./src/controller/EventController";

require("dotenv").config();

export const uploadImagesToS3 = async (event) => {
  try {
    return await EventController.uploadImagesToS3(event);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const getPreSignedUrl = async (event: APIGatewayEvent, context: Context,
  callback: APIGatewayProxyCallback) => {
  try {
    return await EventController.getPreSignedUrl(event, context, callback);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const seedImageUrls = async (event) => {
  try {
    return await EventController.seedUrlsInDB(event);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

