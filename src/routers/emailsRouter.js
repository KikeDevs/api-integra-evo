import {Router} from "express";
import {sendEmail, testEmail} from "../controllers/emailsController.js";

const emailsRouter = new Router();

emailsRouter.get('/test', testEmail);
emailsRouter.post('/', sendEmail);

export default emailsRouter;