import { APIGatewayProxyCallback, Context } from "aws-lambda";
import createErrorResponse from "../utilities/createErrorResponse";
import { authenticateJWT } from "../middleware/verifyToken";
import { Messages } from "../utilities/Messages";
import { getDatabaseConnection } from "../../data-source";
import { Category } from "../entity/Category.entity";

export class CategoryController {
  public static getAllCategories = async (
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
      const AppDataSource = await getDatabaseConnection()

      const categoryRepository = AppDataSource.getRepository(Category);
      const categories = await categoryRepository.find({});
      return {
        message: Messages.CATEGORY_FETCH_SUCCESS,
        data: categories,
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
