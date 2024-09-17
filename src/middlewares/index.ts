import { Express } from "express";
import bodyParser from "body-parser";

const middlewareInjection = (app: Express) => {
  // apply middlewares
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
};

export default middlewareInjection;
