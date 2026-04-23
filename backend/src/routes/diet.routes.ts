import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getDietRecommendations } from "../controllers/diet.controller";

const router = Router();

router.get("/recommendations", authenticate, getDietRecommendations);

export default router;
