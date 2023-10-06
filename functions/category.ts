import { APIGatewayEvent, APIGatewayProxyCallback, Context } from "aws-lambda";
import { CategoryController } from "../src/controller/CategoryController";

export const getAllCategories = async (
  event: APIGatewayEvent,
  context: Context,
  callback: APIGatewayProxyCallback
) => {
  try {
    return await CategoryController.getAllCategories(event, context, callback);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Something went wrong" }),
    };
  }
};
