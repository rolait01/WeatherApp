import { Router } from "express";
import {
  listWidgets,
  createWidget,
  deleteWidget,
  weatherByQuery,
  reverseByCoords,
  suggestByText,
} from "../controllers/widgetsController.js";

const router = Router();

router.get("/", listWidgets);
router.post("/", createWidget);
router.delete("/:id", deleteWidget);

router.get("/weather", weatherByQuery);
router.get("/reverse", reverseByCoords);
router.get("/suggest", suggestByText);

export default router;
