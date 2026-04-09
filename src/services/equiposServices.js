import Equipo from '../models/equipos.js';
import Inventario from "../models/inventario.js";
import Correcciones from "../models/Correcciones.js";
class equiposService {
    async create(equipo) {
        return await Equipo.create(equipo);
    }

    async guardarEnInventario(equipo) {
        return await Inventario.create(equipo);
    }

    async guardarEnCorrecciones(equipo) {
        return await Correcciones.create(equipo);
    }

    async getCorrecciones(){
        return await Correcciones.findAll();
    }

    // equiposServices.js
    async deleteByIdReq(id_req) {
        return await Equipo.destroy({
            where: {id_req}
        });
    }


    async updateEquipo(correccion){
        return await Correcciones.update(
            correccion,
            { where: { id: 1 } }
        )
    }
}

export  default new equiposService();

