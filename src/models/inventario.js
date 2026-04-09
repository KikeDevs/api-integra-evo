import {DataTypes} from 'sequelize';
import sequelize from '../config/database.js'

const Inventario = sequelize.define('Inventario', {
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
        tableName: 'Inventario',
        timestamps: true,
    }
)

export default Inventario;
