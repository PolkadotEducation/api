import { Express } from "express";
import cors from "cors";
import bodyParser from "body-parser";

const middlewareInjection = (app: Express) => {
  // apply middlewares
  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
};

export default middlewareInjection;
