import { APIGatewayProxyEvent, Context, APIGatewayProxyCallback } from "aws-lambda";
import { EventController } from "../src/controller/EventController";

export const deletePhotos = async (
    event: APIGatewayProxyEvent,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    try {
      return await EventController.deletePhotos(event, context, callback);
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message || "Something went wrong" }),
      };
    }
  };