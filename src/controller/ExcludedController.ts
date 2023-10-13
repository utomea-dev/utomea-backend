import { APIGatewayProxyCallback, Context } from "aws-lambda";
import createErrorResponse from "../utilities/createErrorResponse";
import { checkAuthentication } from "../middleware/checkAuth";
import { getDataSource } from "../../data-source";
import { ExcludedList } from "../entity/ExcludedList.entity";
import { IExcludedLocation } from "../interfaces/excluded.interface";
import { Messages } from "../utilities/Messages";

export class ExcludedLocationController {
  public static createExcludedLocation = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    try {
      await checkAuthentication(req, context, callback);
      const AppDataSource = await getDataSource();
      const excludedRepository = AppDataSource.getRepository(ExcludedList);
      const {
        identifier,
        latitude,
        longitude,
        radius,
      }: IExcludedLocation = JSON.parse(req.body);
      const excludedLocation = new ExcludedList();
      excludedLocation.identifier = identifier;
      excludedLocation.radius = radius;
      excludedLocation.latitude = latitude;
      excludedLocation.longitude = longitude;
      excludedLocation.user = req?.user?.id;
      await excludedRepository.save(excludedLocation);
      return { message: Messages.LOCATION_EXCLUDED, body: excludedLocation };
    } catch (error) {
      console.log("error", error);
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };

  public static getExcludedLocations = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    try {
      await checkAuthentication(req, context, callback);
      const AppDataSource = await getDataSource();
      const excludedRepository = AppDataSource.getRepository(ExcludedList);
      const result = await excludedRepository
        .createQueryBuilder("excludedLocation")
        .where("excludedLocation.userId = :userId", { userId: req.user.id })
        .andWhere("excludedLocation.is_deleted = :is_deleted", {
          is_deleted: false,
        })
        .getMany();

      return { message: Messages.EXCLUDED_LOCATIONS_FETCHED, data: result };
    } catch (error) {
      console.log("error", error);
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };

  public static deleteExcludedLocation = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    try {
      await checkAuthentication(req, context, callback);
      const AppDataSource = await getDataSource();
      const excludedRepository = AppDataSource.getRepository(ExcludedList);
      const id = +req?.pathParameters?.id;
      const excludedLocation = await excludedRepository.findOne({
        where: { id, is_deleted: false },
      });

      if (!excludedLocation) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: Messages.LOCATION_NOT_FOUND,
          }),
        };
      }
      excludedLocation.is_deleted = true
      await excludedRepository.save(excludedLocation)
      return { message: Messages.EXCLUDED_LOCATION_DELETED };
    } catch (error) {
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };
}
