import equiposServices from "../services/equiposServices.js";
import comprasServices from "../services/comprasServices.js";

export const crearEquipos = async (req, res) => {
    try {
        const items = req.body.items;
        const id_req = res.locals.id_req;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "No se recibieron ítems de compra válidos" });
        }

        const invalidItems = items.some(item =>
            !item.clase || !item.nombre || !item.marca || !item.modelo || !item.num_serie
        );

        if (invalidItems) {
            return res.status(400).json({ message: "Uno o más ítems de compra son inválidos" });
        }

        if (res.locals.actualizada) {
            await equiposServices.deleteByIdReq(id_req);
        }

        for (const item of items) {
            await equiposServices.create({ ...item, id_req });
        }

        const mensaje = res.locals.actualizada
            ? "Compra actualizada y equipos reemplazados con éxito"
            : "Compra y equipos creados con éxito";

        return res.status(201).json({ message: mensaje });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const guardarEquipos = async (req, res) => {
    try {
        const equipos = req.body.equipos;

        const id_req = equipos[0].id_req;

        if (!equipos || !Array.isArray(equipos)) {
            return res.status(400).json({ message: "No se recibieron equipos" });
        }

        for (const equipo of equipos) {
            await equiposServices.guardarEnInventario(equipo);
        }

        await comprasServices.complete(id_req)

        return res.status(201).json({ message: "Equipos guardados con éxito" });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const guardarCorrecciones = async (req, res) => {
    try {
        const equipos = req.body.equipos;

        const id_req = equipos[0].id_req;

        if (!equipos || !Array.isArray(equipos)) {
            return res.status(400).json({ message: "No se recibieron equipos" });
        }

        for (const equipo of equipos) {
            await equiposServices.guardarEnCorrecciones(equipo);
        }

        await comprasServices.amend(id_req);

        return res.status(201).json({ message: "Correcciones guardadas con éxito" });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getCorrecciones = async (req, res) => {
    try {
        const correcciones = await equiposServices.getCorrecciones();
        return res.status(200).json({messaage: "Correcciones recuperadas con éxito", correcciones: correcciones} );
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
