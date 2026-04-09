import {Router} from "express";
import {sendEmail} from "../controllers/emailsController.js";

const emailsRouter = new Router();

emailsRouter.post('/', sendEmail);

export default emailsRouter;