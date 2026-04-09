import comprasServices from "../services/comprasServices.js";

export const getAll = async  (req, res) => {
    try {
        const compras = await comprasServices.getAll();
        const total = await comprasServices.count();
        const [comprasPorEstado = result] = await comprasServices.getKpi();
        const [pendientes = result] = await comprasServices.getPendientes();
        return res.status(200).json({comprasPorEstado, compras, total, pendientes: pendientes[0].pendientes});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
}
export const crearCompra = async (req, res, next) => {
    try {
        const nuevaCompra = req.body;

        if (!nuevaCompra) return res.status(400).json({ message: "No se recibió un json válido" });

        const compraExiste = await comprasServices.getById(nuevaCompra);

        if (compraExiste) {
            await comprasServices.update(nuevaCompra);
            res.locals.id_req = nuevaCompra.id_req;
            res.locals.actualizada = true;
            return next();
        }

        const compra = await comprasServices.create(nuevaCompra);
        res.locals.id_req = compra.id_req;

        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const completarCompra = async  (req, res) => {
    try {
        const {id_req} = req.body;
        await comprasServices.complete(id_req);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
}


