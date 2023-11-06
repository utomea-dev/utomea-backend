import "reflect-metadata";
import { DataSource, EntityManager } from "typeorm";

// AppDataSource.initialize()
//   .then(async () => {
//     console.log("Connection initialized with database...");
//   })
//   .catch((error) => console.log("Error dusting database initialization", error));

// export const getDataSource = (delay = 3000): Promise<DataSource> => {

//   if (AppDataSource.isInitialized) return Promise.resolve(AppDataSource);

//   return new Promise((resolve, reject) => {
//     setTimeout(() => {
//       console.log("xxxxxx", AppDataSource.isInitialized);
//       if (AppDataSource.isInitialized) resolve(AppDataSource);
//       else reject("Failed to create connection with database");
//     }, delay);
//   });
// };

let dataSource: DataSource;
const getDatabaseConnection = async (): Promise<EntityManager> => {
  if (dataSource && dataSource.isInitialized) {
    console.log("Already Connection Created! Using Same Connection!");
    return dataSource.manager;
  } else {
    console.log("No DB Connection Found! Creating New Connection!");
    dataSource = new DataSource({
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
      entities: [__dirname + "/**/*.entity.{js,ts}"],
      migrations: [],
      subscribers: [],
      extra: {
        connectionTimeoutMillis: 4000,
      },
      // ssl: {
      //   rejectUnauthorized: false,
      // },
    });
    return await dataSource
      .initialize()
      .then(() => {
        console.trace("New DB Created!");
        return dataSource.manager;
      })
      .catch((e) => {
        console.debug(e, "Error Occured in DB creation");
        throw new Error(e);
      });
  }
};
export { getDatabaseConnection };
