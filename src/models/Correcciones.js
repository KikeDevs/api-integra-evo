import {DataTypes} from 'sequelize';
import sequelize from '../config/database.js'

const Correcciones = sequelize.define('Inventario', {
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
        tableName: 'Correcciones',
        timestamps: true,
    }
)

export default Correcciones;
