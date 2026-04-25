import type { Request, Response } from "express";

const pfeRoutes = require("./index.js");
const { AdminPfeController } = require("./adminPfe.controller");

const adminController = new AdminPfeController();

pfeRoutes.put("/sujets/:id/valider", (req: Request, res: Response) => adminController.validerSujet(req, res));
pfeRoutes.patch("/sujets/:id/validate", (req: Request, res: Response) => adminController.validerSujet(req, res));
pfeRoutes.put("/sujets/:id/refuser", (req: Request, res: Response) => adminController.refuserSujet(req, res));
pfeRoutes.patch("/sujets/:id/reject", (req: Request, res: Response) => adminController.refuserSujet(req, res));

export default pfeRoutes;