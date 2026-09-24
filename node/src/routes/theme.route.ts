import { Router } from "express";

import { getTheme, putTheme } from "../controllers/theme.controller.js";
import { validateThemeBody } from "../validators/theme.validator.js";

export const themeRoute = Router();

themeRoute.get("/widget/theme", getTheme);
themeRoute.put("/widget/theme", validateThemeBody, putTheme);
