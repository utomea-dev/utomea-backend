import {
  APIGatewayProxyCallback,
  APIGatewayProxyEvent,
  Context,
} from "aws-lambda";
import { EventController } from "../src/controller/EventController";

export const getAllEvents = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: APIGatewayProxyCallback
) => {
  try {
    return await EventController.getAllEvents(event, context, callback);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const createEvent = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: APIGatewayProxyCallback
) => {
  try {
    return await EventController.createEvent(event, context, callback);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const editEvent = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: APIGatewayProxyCallback
) => {
  try {
    return await EventController.editEvent(event, context, callback);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const deleteEvent = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: APIGatewayProxyCallback
) => {
  try {
    return await EventController.deleteEvent(event, context, callback);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};