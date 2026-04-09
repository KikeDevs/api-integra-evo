import Compra from '../models/Compra.js';
import Equipo from "../models/equipos.js";
import estatus_interno from "../models/estatus.js";
import sequelize from "../config/database.js"

class comprasService{
    async getAll() {
        return await Compra.findAll({
            include: [{model: Equipo, as: 'equipos'}, {model: estatus_interno, as: 'estatus_interno'}],
        });
    }

    async getKpi(){
        return await sequelize.query(`
              SELECT estatus.detalle, COUNT(*) as cantidad
              FROM compras
              LEFT JOIN estatus_interno as estatus ON compras.estatus_interno_id = estatus.id
              GROUP BY estatus.detalle
            `);
    };

    async getPendientes(){
        return await sequelize.query(`
            SELECT COUNT(*) as pendientes
            FROM compras
            WHERE estatus_interno_id != 4 && estatus_interno_id !=5;
            `);
    }


    async create( compra ){
        return await Compra.create(compra);
    }
    async getById({ id_req } ){
        return await Compra.findOne({ where: { id_req } });
    }

    async count () {
        return await Compra.count();
    }
    async update({ id_req, estatus }){
        return await Compra.update(
            { estatus, estatus_interno_id: 2 },
            {
                where: {
                    id_req,
                },
            },
        );
    }
    async complete(id_req){
        return await Compra.update(
            { estatus_interno_id: 4 },
            {
                where: {
                    id_req,
                },
            },
        );
    }

    async amend(id_req){
        return await Compra.update(
            { estatus_interno_id: 3 },
            {
                where: {
                    id_req,
                },
            },
        );
    }
}

export  default new comprasService;