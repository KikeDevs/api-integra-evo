import {Router} from 'express';
import {crearCompra, getAll} from "../controllers/comprasController.js";
import authenticateToken from "../middlewares/auth.js";
import {crearEquipos, getCorrecciones, guardarCorrecciones, guardarEquipos} from "../controllers/equiposController.js";

const comprasRouter = new Router();

comprasRouter.get('/', getAll);
comprasRouter.post('/', authenticateToken, crearCompra, crearEquipos);
comprasRouter.post('/inventario', guardarEquipos);
comprasRouter.post('/correcciones', guardarCorrecciones);
comprasRouter.get('/correcciones', getCorrecciones);



export default comprasRouter;
