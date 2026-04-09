import {DataTypes} from 'sequelize';
import sequelize from '../config/database.js'
import Compra from "./Compra.js";

const Equipo = sequelize.define('Equipo', {
    id_req: {
        type: DataTypes.INTEGER,
        references: {
            model: 'compras',
            key: 'id_req'
        },
    },
    clase: {
        type: DataTypes.STRING,
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    marca: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    modelo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    num_serie: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
}, {
        tableName: 'Equipos',
        timestamps: true,
    }
)

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

export default Equipo;
