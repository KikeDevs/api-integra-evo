import {DataTypes} from 'sequelize';
import sequelize from '../config/database.js'
import estatus_interno from "./estatus.js";

const Compra = sequelize.define('Compra', {
    id_req: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
    },
    empresa: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    titulo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    fecha_registro: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    centro_costos: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    proyecto: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    tipo_compra: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    clasi_compra: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    proveedor: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    justificacion: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    tipo_activo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    estatus_interno_id: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false,
        references: {
            model: 'estatus_interno',
            key: 'id'
        },
    },
    estatus: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    tableName: 'compras',
    timestamps: true
});

Compra.belongsTo(estatus_interno, {
    foreignKey: 'estatus_interno_id',
    as: 'estatus_interno'
});

estatus_interno.hasMany(Compra, {
    foreignKey: 'estatus_interno_id'
});
export default Compra;