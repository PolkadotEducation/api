import { Express } from "express";
import bodyParser from "body-parser";
import corsConfig from "./cors.config";

const middlewareInjection = (app: Express) => {
  // apply middlewares
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(corsConfig());
};

export default middlewareInjection;
