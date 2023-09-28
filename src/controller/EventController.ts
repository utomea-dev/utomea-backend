import { getDataSource } from "../../data-source";
import { Event } from "../entity/Event.entity";
// import { Photo } from "../entity/Photo.entity";
import { Messages } from "../utilities/Messages";
// import {
//   S3Client,
//   PutObjectCommand,
//   S3ClientConfig,
//   GetObjectCommand,
// } from "@aws-sdk/client-s3";
// import { parser } from "../utilities/formParser";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import * as sharp from "sharp";
// import * as path from "path";
import { authenticateJWT } from "../middleware/verifyToken";
import {
  APIGatewayProxyCallback,
  APIGatewayProxyEvent,
  Context,
} from "aws-lambda";

require("dotenv").config();

// const s3Config: S3ClientConfig = {
//   region: "us-east-1",
//   credentials: {
//     accessKeyId: "",
//     secretAccessKey: "",
//   },
// };

// const s3 = new S3Client(s3Config);
const MAX_SIZE = 4000000; // 4MB

export class EventController {
  public static getAllEvents = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    let groupedBy = {};
    const { limit = 10, skip = 0 } = req.queryStringParameters || {};
    console.log("limit", limit, skip);
    try {
      await authenticateJWT(req, context, callback);
      const AppDataSource = await getDataSource();
      const events = await AppDataSource.getRepository(Event)
        .createQueryBuilder("event")
        .leftJoinAndSelect("event.photos", "photo")
        .where("event.userId = :userId", { userId: req.user.id })
        .andWhere(" event.is_deleted = :is_deleted", { is_deleted: false })
        .loadRelationCountAndMap("event.photosCount", "event.photos")
        .orderBy("event.end_timestamp", "DESC")
        .skip(skip)
        .take(limit)
        .getMany();

      for (let event of events) {
        const end_date = event?.end_timestamp.toLocaleDateString("en-US");
        if (!groupedBy[end_date]) {
          groupedBy[end_date] = [event];
        } else {
          groupedBy[end_date].push(event);
        }
      }

      const result = Object.values(groupedBy);

      return {
        message: Messages.EVENT_FETCHED_SUCCESS,
        data: result,
      };
    } catch (error) {
      return {
        statusCode: error.statusCode || 500,
        body: JSON.stringify({
          message: error.message || "Internal Server Error",
        }),
      };
    }
  };

  public static createEvent = async (
    req,
    context: Context,
    callback: APIGatewayProxyCallback
  ) => {
    try {
      console.log("Create Event triggered");
      await authenticateJWT(req, context, callback);
      if (!req?.user?.id) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            message: Messages.UNAUTHORIZED,
          }),
        };
      }
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
    await authenticateJWT(req, context, callback);
    if (!req?.user?.id) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: Messages.UNAUTHORIZED,
        }),
      };
    }
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
    await authenticateJWT(req, context, callback);
    if (!req?.user?.id) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: Messages.UNAUTHORIZED,
        }),
      };
    }
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

  // public static uploadImagesToS3 = async (event) => {
  //   let outputBuffer;
  //   console.log("Upload images function triggered");
  //   const AppDataSource = await getDataSource();
  //   const eventRepository = AppDataSource.getRepository(Event);
  //   const photoRepository = AppDataSource.getRepository(Photo);
  //   try {
  //     const id = +event?.pathParameters?.id;
  //     const foundEvent = await eventRepository.findOne({
  //       where: { id, is_deleted: false },
  //     });
  //     if (!foundEvent) {
  //       return {
  //         statusCode: 404,
  //         body: JSON.stringify({
  //           message: `Event with id:${id} not found.`,
  //         }),
  //       };
  //     }

  //     const formData: any = await parser(event, MAX_SIZE);
  //     const files = formData.files;

  //     const uploadPromises = files.map(async (file) => {
  //       let isHeifImage = false;
  //       // if (file?.filename?.mimeType === "image/heif" || file?.filename?.mimeType === "image/heic") {
  //       //   isHeifImage = true;
  //       //   console.log("Innnnnn heif convert type", file?.filename?.mimeType);
  //       //   // outputBuffer = await convert({
  //       //   //   buffer: file?.content,
  //       //   //   format: "JPEG",
  //       //   //   quality: 1,
  //       //   // });
  //       //   outputBuffer = await sharp(file?.content).toFormat("jpeg").toBuffer()
  //       // }
  //       const compressedContent = await sharp(
  //         outputBuffer ? outputBuffer : file?.content
  //       )
  //         .resize({ width: 400, height: 300, fit: "cover" })
  //         .png({ quality: 80, compressionLevel: 8 })
  //         .toBuffer();
  //       const s3Params = {
  //         Bucket: "react-native-events",
  //         Key: isHeifImage
  //           ? `${path.parse(file?.filename?.filename).name}.jpg`
  //           : file?.filename?.filename,
  //         Body: compressedContent,
  //         ContentType: isHeifImage ? "image/jpeg" : file?.filename?.mimeType,
  //       };
  //       const command = new PutObjectCommand(s3Params);
  //       await s3.send(command);
  //     });
  //     await Promise.all(uploadPromises);
  //     let responseArray: any = [];
  //     for (let e of files) {
  //       let isHeifImage = false;
  //       isHeifImage =
  //         e?.filename?.mimeType === "image/heif" ||
  //         e?.filename?.mimeType === "image/heic"
  //           ? true
  //           : false;
  //       const s3Command = new GetObjectCommand({
  //         Bucket: "react-native-events",
  //         Key: isHeifImage
  //           ? `${path.parse(e?.filename?.filename).name}.jpg`
  //           : e?.filename?.filename,
  //       });
  //       const url = await getSignedUrl(s3, s3Command, { expiresIn: 600000 });
  //       responseArray.push(url);
  //       const photo = new Photo();
  //       photo.url = url;
  //       photo.event = foundEvent;
  //       await photoRepository.save(photo);
  //     }

  //     return {
  //       statusCode: 200,
  //       body: JSON.stringify({
  //         message: "Images uploaded successfully",
  //         data: responseArray,
  //       }),
  //     };
  //   } catch (error) {
  //     console.log("Error in catch block", error);
  //   }
  // };
}
