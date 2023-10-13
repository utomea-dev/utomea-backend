import { getDataSource } from "../../data-source";
import { Event } from "../entity/Event.entity";
import { Photo } from "../entity/Photo.entity";
import { Messages } from "../utilities/Messages";
import { S3Client, PutObjectCommand, S3ClientConfig } from "@aws-sdk/client-s3";
import { parser } from "../utilities/formParser";
import { authenticateJWT } from "../middleware/verifyToken";
import { APIGatewayProxyCallback, Context } from "aws-lambda";
import createErrorResponse from "../utilities/createErrorResponse";
import {
  getAccessKeyFromSecretManager,
  getAwsSecretKeyFromSecretManager,
} from "../utilities/SecretManager";
import { In } from "typeorm";
import { checkAuthentication } from "../middleware/checkAuth";

require("dotenv").config();

export class EventController {
  public static getAllEvents = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    let groupedBy = {};
    const { limit = 10, skip = 0, verified, date } =
      req.queryStringParameters || {};
    console.log("limit", limit, skip, verified, date);
    try {
      await authenticateJWT(req, context, callback);
      const AppDataSource = await getDataSource();
      const events = await AppDataSource.getRepository(Event)
        .createQueryBuilder("event")
        .leftJoinAndSelect("event.photos", "photo", "photo.is_deleted = false")
        .where("event.userId = :userId", { userId: req.user.id })
        .andWhere(verified ? "event.verified = :verified" : "1=1", { verified })
        .andWhere(date ? `DATE_TRUNC('day', "end_timestamp") = :date` : "1=1", {
          date,
        })
        .andWhere("event.is_deleted = :is_deleted", { is_deleted: false })
        // .loadRelationCountAndMap("event.photosCount", "event.photos")
        .orderBy("event.end_timestamp", "DESC")
        .skip(skip)
        .take(limit)
        .getMany();

      for (let event of events) {
        event["hero_image"] = event?.photos.length
          ? event.photos[0]?.url
          : null;
        console.log("event", event);
        const end_date = event?.end_timestamp.toLocaleDateString("en-US");
        if (!groupedBy[end_date]) {
          groupedBy[end_date] = [event];
        } else {
          groupedBy[end_date].push(event);
        }
      }

      const result = Object.values(groupedBy);

      const getTotalCount = async () => {
        return await AppDataSource.getRepository(Event)
          .createQueryBuilder("event")
          .where("event.userId = :userId", { userId: req.user.id })
          .andWhere("event.is_deleted = :is_deleted", { is_deleted: false })
          .getCount();
      };

      const getUnverifiedCount = async () => {
        return await AppDataSource.getRepository(Event)
          .createQueryBuilder("event")
          .where("event.userId = :userId", { userId: req.user.id })
          .andWhere("event.verified = :verified", { verified: false })
          .andWhere("event.is_deleted = :is_deleted", { is_deleted: false })
          .getCount();
      };

      const [totalCount, unverifiedCount] = await Promise.all([
        getTotalCount(),
        getUnverifiedCount(),
      ]);

      return {
        message: Messages.EVENT_FETCHED_SUCCESS,
        data: result,
        totalCount,
        unverifiedCount,
      };
    } catch (error) {
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };

  public static createEvent = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    try {
      console.log("Create Event triggered");
        await checkAuthentication(req, context, callback);
        const AppDataSource = await getDataSource();
      const eventRepository = AppDataSource.getRepository(Event);
      const {
        latitude,
        longitude,
        location,
        begin_timestamp,
        end_timestamp,
        title,
        category,
        tags,
        description,
        rating,
        verified,
      } = JSON.parse(req.body);
      const event = new Event();
      event.latitude = latitude;
      event.location = location;
      event.longitude = longitude;
      event.begin_timestamp = begin_timestamp;
      event.end_timestamp = end_timestamp;
      event.category = category;
      event.description = description;
      event.title = title;
      event.tags = tags;
      event.rating = rating ? rating : null;
      event.verified = verified ? verified : false;
      event.user = req.user?.id;
      await eventRepository.save(event);
      return { message: Messages.EVENT_CREATED_SUCCESS, body: event };
    } catch (error) {
      console.log("error in catch block", error);
      return {
        statusCode: error.statusCode || 500,
        body: JSON.stringify({
          message: error.message || "Internal Server Error",
        }),
      };
    }
  };

  public static editEvent = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    await checkAuthentication(req, context, callback);
    const AppDataSource = await getDataSource();
    const eventRepository = AppDataSource.getRepository(Event);
    try {
      const id = +req?.pathParameters?.id;
      const event = await eventRepository.findOne({
        where: { id, is_deleted: false },
      });
      if (!event) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: Messages.EVENT_NOT_FOUND,
          }),
        };
      }

      const updatedEvent = JSON.parse(req.body);
      Object.assign(event, updatedEvent);
      await eventRepository.save(event);
      return { message: Messages.EVENT_UPDATED_SUCCESS };
    } catch (error) {
      console.log("erorr", error);
      return {
        statusCode: error.statusCode || 500,
        body: JSON.stringify({
          message: error.message || "Internal Server Error",
        }),
      };
    }
  };

  public static deleteEvent = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    await checkAuthentication(req, context, callback);
    const AppDataSource = await getDataSource();
    const eventRepository = AppDataSource.getRepository(Event);
    try {
      const id = +req?.pathParameters?.id;
      const event = await eventRepository.findOne({
        where: { id, is_deleted: false },
      });
      if (!event) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: Messages.EVENT_NOT_FOUND,
          }),
        };
      }
      event.is_deleted = true;
      await eventRepository.save(event);
      return { message: Messages.EVENT_DELETED_SUCCESS };
    } catch (error) {
      console.log("error", error);
      return {
        statusCode: error.statusCode || 500,
        body: JSON.stringify({
          message: error.message || "Internal Server Error",
        }),
      };
    }
  };

  public static search = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    try {
      await checkAuthentication(req, context, callback);
      const AppDataSource = await getDataSource();
      console.log("reqqq", req);
      const { start_date, end_date, category, rating, search } = JSON.parse(
        req.body
      );
      console.log("start date", start_date, end_date, category);

      const events = await AppDataSource.getRepository(Event)
        .createQueryBuilder("event")
        .leftJoinAndSelect("event.photos", "photo")
        .leftJoinAndSelect("event.category", "category")
        .where("event.userId = :userId", { userId: req.user.id })
        .andWhere(
          start_date && end_date
            ? `DATE_TRUNC('day', "end_timestamp") >= :start_date AND DATE_TRUNC('day', "end_timestamp") <= :end_date`
            : `1=1`,
          { start_date, end_date }
        )
        .andWhere(
          category.length ? "event.category IN (:...category)" : `1=1`,
          { category }
        )
        .andWhere(rating.length ? "event.rating IN (:...rating)" : `1=1`, {
          rating,
        })
        .andWhere(
          search
            ? "event.title = :search OR event.location = :search OR category.name = :search"
            : `1=1`,
          { search }
        )
        .andWhere("event.is_deleted = :is_deleted", { is_deleted: false })
        .loadRelationCountAndMap("event.photosCount", "event.photos")
        .orderBy("event.end_timestamp", "DESC")
        .getMany();

      return {
        message: Messages.EVENT_FETCHED_SUCCESS,
        data: events,
      };
    } catch (error) {
      console.log("error", error);
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };

  public static uploadImagesToS3 = async (event) => {
    const s3Config: S3ClientConfig = {
      region: "us-east-2",
      credentials: {
        accessKeyId: await getAccessKeyFromSecretManager(),
        secretAccessKey: await getAwsSecretKeyFromSecretManager(),
      },
    };

    const s3 = new S3Client(s3Config);
    const MAX_SIZE = 6000000; // 6MB

    console.log("Upload images function triggered");
    const AppDataSource = await getDataSource();
    const eventRepository = AppDataSource.getRepository(Event);
    const photoRepository = AppDataSource.getRepository(Photo);
    try {
      const id = +event?.pathParameters?.id;
      const foundEvent = await eventRepository.findOne({
        where: { id, is_deleted: false },
      });
      if (!foundEvent) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: Messages.EVENT_NOT_FOUND,
          }),
        };
      }

      const formData: any = await parser(event, MAX_SIZE);
      const files = formData.files;

      const uploadPromises = files.map(async (file) => {
        const s3Params = {
          Bucket: "utomea-events",
          Key: file?.filename?.filename,
          Body: file?.content,
          ContentType: file?.filename?.mimeType,
        };
        const command = new PutObjectCommand(s3Params);
        await s3.send(command);
      });
      await Promise.all(uploadPromises);
      let responseArray: any = [];

      for (let e of files) {
        const url = `https://utomea-events.s3.us-east-2.amazonaws.com/${e?.filename?.filename}`;
        responseArray.push(url);
        const photo = new Photo();
        photo.url = url;
        photo.event = foundEvent;
        await photoRepository.save(photo);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Images uploaded successfully",
          data: responseArray,
        }),
      };
    } catch (error) {
      console.log("Error in catch block", error);
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };

  public static deletePhotos = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    try {
      await checkAuthentication(req, context, callback);
      const AppDataSource = await getDataSource();
      const PhotoRepository = AppDataSource.getRepository(Photo);
      const { photoIds } = JSON.parse(req?.body);
      const photos = await PhotoRepository.find({
        where: { id: In(photoIds), is_deleted: false },
      });
      for (let photo of photos) {
        photo.is_deleted = true;
        await PhotoRepository.save(photo);
      }
      return {
        message: Messages.PHOTOS_DELETED_SUCCESS,
      };
    } catch (error) {
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };

  public static getEventDetails = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    try {
      await checkAuthentication(req, context, callback);
      const AppDataSource = await getDataSource();
      const eventRepository = AppDataSource.getRepository(Event);
      const id = +req?.pathParameters?.id;
      const event = await eventRepository
        .createQueryBuilder("event")
        .leftJoinAndSelect("event.photos", "photo", "photo.is_deleted = false")
        .leftJoinAndSelect("event.category", "category")
        .where("event.id = :id", { id })
        .andWhere("event.is_deleted = :is_deleted", { is_deleted: false })
        .getOne();

      if (!event) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: Messages.EVENT_NOT_FOUND,
          }),
        };
      }
      return {
        message: Messages.EVENT_DETAILS_FETCH,
        data: event,
      };
    } catch (error) {
      console.log("error", error);
      return createErrorResponse(
        error?.status || 500,
        error.message || "Internal Server Error"
      );
    }
  };

  public static autoSuggest = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    try {
      await checkAuthentication(req, context, callback);
      const AppDataSource = await getDataSource();
      const eventRepository = AppDataSource.getRepository(Event);
      const { search } = JSON.parse(req.body);

      let titleSearch = await eventRepository
        .createQueryBuilder("event")
        .where("event.userId = :userId AND LOWER(event.title) like :title", {
          userId: req.user.id,
          title: `%${search.toLowerCase()}%`,
        })
        .andWhere("event.is_deleted = false")
        .select("event.title")
        .getMany();

      const categorySearch = await eventRepository
        .createQueryBuilder("event")
        .leftJoinAndSelect("event.category", "category")
        .where(
          "event.userId = :userId AND LOWER(category.name) like :category",
          {
            userId: req.user.id,
            category: `%${search.toLowerCase()}%`,
          }
        )
        .andWhere("event.is_deleted = false")
        .select(["event.id", "category.name"])
        .getMany();

      const locationSearch = await eventRepository
        .createQueryBuilder("event")
        .where(
          "event.userId = :userId AND LOWER(event.location) like :location",
          {
            userId: req.user.id,
            location: `%${search.toLowerCase()}%`,
          }
        )
        .andWhere("event.is_deleted = false")
        .select("event.location")
        .getMany();

      let finalCategorySearch: string[] = [];
      let finalTitleSearch: any[] = [];
      let finalLocationSearch: any[] = [];

      for (let e of categorySearch) {
        finalCategorySearch.push(e.category.name);
      }

      for (let e of titleSearch) {
        finalTitleSearch.push(Object.values(e));
      }

      for (let e of locationSearch) {
        finalLocationSearch.push(Object.values(e));
      }
      const finalResult = [
        ...finalTitleSearch,
        ...finalLocationSearch,
        ...finalCategorySearch,
      ];

      return {
        message: Messages.AUTO_SUGGESTION_FETCH,
        data: finalResult.flat(),
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
