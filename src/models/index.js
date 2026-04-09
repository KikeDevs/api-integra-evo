import sequelize from "../config/database.js";

import Compra from './Compra.js';
import Equipo from './equipos.js';

Compra.hasMany(Equipo, {
    foreignKey: 'id_req',
    sourceKey: 'id_req',
    as: 'equipos'
});

Equipo.belongsTo(Compra, {
    foreignKey: 'id_req',
    targetKey: 'id_req',
    as: 'compra'
});

