import { getDatabaseConnection } from "../../data-source";
import { Event } from "../entity/Event.entity";
import { Photo } from "../entity/Photo.entity";
import { Messages } from "../utilities/Messages";
import { S3Client, PutObjectCommand, S3ClientConfig } from "@aws-sdk/client-s3";
import { parser } from "../utilities/formParser";
import { APIGatewayProxyCallback, Context } from "aws-lambda";
import createErrorResponse from "../utilities/createErrorResponse";
import {
  getAccessKeyFromSecretManager,
  getAwsSecretKeyFromSecretManager,
} from "../utilities/SecretManager";
import { In } from "typeorm";
import { checkAuthentication } from "../middleware/checkAuth";
import { User } from "../entity/User.entity";
import { IUser } from "../interfaces/user.interface";

require("dotenv").config();

export class EventController {
  public static getAllEvents = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    try {
      let groupedBy = {};
      let result;

      const { limit = 10, skip = 0, verified, date } =
        req.queryStringParameters || {};
      await checkAuthentication(req, context, callback);
      const AppDataSource = await getDatabaseConnection();
      const mainpulateData = function(events) {
        groupedBy = {};
        for (let event of events) {
          event.photos.sort((a, b) => {
            return a.id - b.id;
          });
          event["hero_image"] = event?.photos.length
            ? event.photos[0]?.url
            : null;
          const end_date = event?.end_timestamp.toLocaleDateString("en-US");
          if (!groupedBy[end_date]) {
            groupedBy[end_date] = [event];
          } else {
            groupedBy[end_date].push(event);
          }
        }

        let result = Object.values(groupedBy);
        return result;
      };
      const paginateArray = function(array, skip, limit) {
        console.log("in paginate", skip, limit, array.length);
        const startIndex = skip;
        const endIndex = +skip + +limit;

        if (startIndex >= array.length) {
          return []; // Return an empty array if the skip value is out of bounds.
        }

        return array.slice(startIndex, endIndex);
      };

      if (!date) {
        const events = await AppDataSource.getRepository(Event)
          .createQueryBuilder("event")
          .leftJoinAndSelect(
            "event.photos",
            "photo",
            "photo.is_deleted = false"
          )
          .where("event.userId = :userId", { userId: req.user.id })
          .andWhere(verified ? "event.verified = :verified" : "1=1", {
            verified,
          })
          .andWhere("event.is_deleted = :is_deleted", { is_deleted: false })
          .orderBy("event.end_timestamp", "DESC")
          .skip(skip)
          .take(limit)
          .getMany();

        result = mainpulateData(events);
      } else {
        let idx;
        const allEvents = await AppDataSource.getRepository(Event)
          .createQueryBuilder("event")
          .leftJoinAndSelect(
            "event.photos",
            "photo",
            "photo.is_deleted = false"
          )
          .where("event.userId = :userId", { userId: req.user.id })
          .andWhere(verified ? "event.verified = :verified" : "1=1", {
            verified,
          })
          .andWhere("event.is_deleted = :is_deleted", { is_deleted: false })
          .orderBy("event.end_timestamp", "DESC")
          .getMany();

        result = mainpulateData(allEvents);

        // console.log("In date", date);
        for (let e of result) {
          let eventDate = e?.[0]?.end_timestamp.toISOString().split("T")[0];
          eventDate = new Date(eventDate);
          eventDate.setHours(0, 0, 0, 0);
          let dateParams = new Date(date);
          dateParams.setHours(0, 0, 0, 0);
          if (dateParams.getTime() === eventDate.getTime()) {
            idx = result.indexOf(e);
          }
        }
        const splicedArray = result.splice(idx, 1);
        result.unshift(...splicedArray);
        result = paginateArray(result.flat(), skip, limit);
        result = mainpulateData(result);
      }

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

      const newUser = async () => {
        const user = await AppDataSource.getRepository(User).findOne({
          where: { id: req?.user?.id, is_deleted: false },
          select: { is_new_user: true },
        });
        return user;
      };

      const [totalCount, unverifiedCount, isNewUser] = await Promise.all([
        getTotalCount(),
        getUnverifiedCount(),
        newUser(),
      ]);

      return {
        message: Messages.EVENT_FETCHED_SUCCESS,
        data: result,
        totalCount,
        unverifiedCount,
        isNewUser: isNewUser?.is_new_user,
      };
    } catch (error) {
      console.log("error in get events", error);
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
      console.log("Create Event triggered", req?.body);
      await checkAuthentication(req, context, callback);
      const AppDataSource = await getDatabaseConnection();
      const eventRepository = AppDataSource.getRepository(Event);
      const userRepository = AppDataSource.getRepository(User);
      const user: IUser | null = await userRepository.findOne({
        where: { id: req?.user?.id, is_deleted: false },
      });
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
        event_type,
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
      event.verified = user?.auto_verification ? true : false;
      event.user = req.user?.id;
      event.event_type = event_type;
      await eventRepository.save(event);

      if (user!.is_new_user === true) {
        user!.is_new_user = false;
        await userRepository.save(user as IUser);
      }

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
    const AppDataSource = await getDatabaseConnection();
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
    const AppDataSource = await getDatabaseConnection();
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
      console.log("reqqq", req);
      const { start_date, end_date, category, rating, search } = JSON.parse(
        req.body
      );
      console.log("start date", search);
      const AppDataSource = await getDatabaseConnection();
      const events = await AppDataSource.getRepository(Event)
        .createQueryBuilder("event")
        .leftJoinAndSelect("event.photos", "photo")
        .leftJoinAndSelect(
          "event.category",
          "category",
          `event.userId = ${req.user.id}`
        )
        .where("event.userId = :userId", { userId: req.user.id })
        .andWhere(
          start_date && end_date
            ? `DATE_TRUNC('day', "end_timestamp") >= :start_date AND DATE_TRUNC('day', "end_timestamp") <= :end_date`
            : `1=1`,
          { start_date, end_date }
        )
        .andWhere(
          category?.length ? "event.category IN (:...category)" : `1=1`,
          { category }
        )
        .andWhere(rating?.length ? "event.rating IN (:...rating)" : `1=1`, {
          rating,
        })
        .andWhere(
          search
            ? "(LOWER(event.title) = :search OR LOWER(event.location) = :search OR LOWER(array_to_string(event.tags, ',')) LIKE :new) AND event.userId = :userId"
            : `1=1`,
          {
            search: search?.toLowerCase(),
            new: `%${search.toLowerCase()}%`,
            userId: req?.user?.id,
          }
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
    const AppDataSource = await getDatabaseConnection();
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
          Key: `${file?.filename?.filename.replace(/ /g, "")}`,
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
      const AppDataSource = await getDatabaseConnection();
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
      const AppDataSource = await getDatabaseConnection();
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
      let finalResult: string[] = [];
      await checkAuthentication(req, context, callback);
      const AppDataSource = await getDatabaseConnection();
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

        const tagsSearch = await eventRepository
        .createQueryBuilder("event")
        .where(
          "event.userId = :userId AND LOWER(array_to_string(event.tags, ',')) LIKE :new",
          {
            userId: req.user.id,
            new: `%${search.toLowerCase()}%`,
          }
        )
        .andWhere("event.is_deleted = false")
        .select("event.tags")
        .getMany();

      let finalTitleSearch: any[] = [];
      let finalLocationSearch: any[] = [];
      let finalTagSearch: any[] = [];



      for (let e of titleSearch) {
        finalTitleSearch.push(Object.values(e));
      }

      for (let e of locationSearch) {
        finalLocationSearch.push(Object.values(e));
      }

      for (let e of tagsSearch) {
        finalTagSearch.push(Object.values(e));
      }

      finalTagSearch = finalTagSearch.flat().flat().filter(e => e.toLowerCase().indexOf(search.toLowerCase()) > -1)
      console.log("tagsss", finalTagSearch)

      let mergedArray = [...finalTitleSearch, ...finalLocationSearch, ...finalTagSearch];

      for (let e of mergedArray.flat()) {
        const isPresent = finalResult.includes(e.toLowerCase());
        if (!isPresent) {
          finalResult.push(e.toLowerCase());
        }
      }

      finalResult = finalResult.map(
        (e) => e.charAt(0).toUpperCase() + e.slice(1)
      );

      return {
        message: Messages.AUTO_SUGGESTION_FETCH,
        data: finalResult,
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
