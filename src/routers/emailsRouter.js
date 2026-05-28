import {Router} from "express";
import { sendEmail, testEmail, getEmailErrors, trackEmail, getSentEmails, checkBounces } from "../controllers/emailsController.js";

const emailsRouter = new Router();

emailsRouter.get('/test', testEmail);
emailsRouter.get('/errors', getEmailErrors);
// Sin auth — el cliente de correo llama este endpoint al renderizar el pixel
emailsRouter.get('/track/:id', trackEmail);
emailsRouter.get('/sent', getSentEmails);
emailsRouter.get('/bounces', checkBounces);
emailsRouter.post('/', sendEmail);

export default emailsRouter;
