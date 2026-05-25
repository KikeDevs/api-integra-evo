import {Router} from "express";
import {sendEmail, testEmail, getEmailErrors} from "../controllers/emailsController.js";

const emailsRouter = new Router();

emailsRouter.get('/test', testEmail);
emailsRouter.get('/errors', getEmailErrors);
emailsRouter.post('/', sendEmail);

export default emailsRouter;