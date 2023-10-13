import {
  APIGatewayProxyCallback,
  APIGatewayProxyEvent,
  Context,
} from "aws-lambda";
import { ExcludedLocationController } from "../src/controller/ExcludedController";

export const createExcludedLocation = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: APIGatewayProxyCallback
) => {
  try {
    return await ExcludedLocationController.createExcludedLocation(
      event,
      context,
      callback
    );
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const getExcludedLocations = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: APIGatewayProxyCallback
) => {
  try {
    return await ExcludedLocationController.getExcludedLocations(
      event,
      context,
      callback
    );
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};

export const deleteExcludedLocation = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: APIGatewayProxyCallback
) => {
  try {
    return await ExcludedLocationController.deleteExcludedLocation(
      event,
      context,
      callback
    );
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};
