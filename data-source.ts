import "reflect-metadata";
import { DataSource } from "typeorm";
import { Event } from "./src/entity/Event.entity";
import { Photo } from "./src/entity/Photo.entity";
import { User } from "./src/entity/User.entity";
import { Category } from "./src/entity/Category.entity";
import { ExcludedList } from "./src/entity/ExcludedList.entity";

const AppDataSource = new DataSource({
  type: "postgres",
  // host: "utomea-dev.cxpuvfavg0yv.us-east-2.rds.amazonaws.com",
  host: "localhost",
  port: 5432,
  username: "postgres", // Local
  password: "root", // Local
  // username: "postgres", // Dev
  // password: "NAJYHMFOnM9bvSWQSy9T",
  // database: "utomea-dev",
  database: "react-native-serverless",
  synchronize: true,
  logging: false,
  entities: [Event, Photo, User, Category, ExcludedList],
  migrations: [],
  subscribers: [],
  // ssl: {
  //   rejectUnauthorized: false
  // }
});

AppDataSource.initialize()
  .then(async () => {
    console.log("Connection initialized with database...");
  })
  .catch((error) => console.log(error));

export const getDataSource = (delay = 3000): Promise<DataSource> => {
  if (AppDataSource.isInitialized) return Promise.resolve(AppDataSource);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (AppDataSource.isInitialized) resolve(AppDataSource);
      else reject("Failed to create connection with database");
    }, delay);
  });
};
