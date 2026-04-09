import {DataTypes} from "sequelize";
import sequelize from '../config/database.js'

const estatus_interno = sequelize.define('estatus_interno', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    detalle: {
        type: DataTypes.STRING,
        allowNull: false,
    }
}, {
    tableName: 'estatus_interno',
    timestamps: false,
});


export default estatus_interno;
