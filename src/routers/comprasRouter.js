import {Router} from 'express';
import {crearCompra, getAll} from "../controllers/comprasController.js";
import authenticateToken from "../middlewares/auth.js";
import {crearEquipos, getCorrecciones, guardarCorrecciones, guardarEquipos} from "../controllers/equiposController.js";

const comprasRouter = new Router();

comprasRouter.get('/', authenticateToken, getAll);
comprasRouter.post('/', authenticateToken, crearCompra, crearEquipos);
comprasRouter.post('/inventario', authenticateToken, guardarEquipos);
comprasRouter.post('/correcciones', authenticateToken, guardarCorrecciones);
comprasRouter.get('/correcciones', authenticateToken, getCorrecciones);



export default comprasRouter;
