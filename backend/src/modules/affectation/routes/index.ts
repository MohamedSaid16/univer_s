import { Router } from "express";
import campaignRouter, { specialiteLinkRouter } from "./campaign.routes";
import voeuRouter from "./voeu.routes";

const router = Router();

router.use("/campaigns", campaignRouter);
router.use("/specialites", specialiteLinkRouter);
router.use("/voeux", voeuRouter);

export default router;
