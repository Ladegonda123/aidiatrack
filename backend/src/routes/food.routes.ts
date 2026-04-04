import { Router } from "express";
import { searchFoods } from "../controllers/food.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authenticate, searchFoods);

export default router;
