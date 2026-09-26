import { Router } from "express";

import { getPublishedTheme, getTheme, postPublishedTheme } from "../controllers/theme.controller.js";
import { validateThemeBody } from "../validators/theme.validator.js";

export const themeRoute = Router();

themeRoute.get("/widget/theme", getTheme);
themeRoute.post("/widget/themes", validateThemeBody, postPublishedTheme);
themeRoute.get("/widget/themes/:id", getPublishedTheme);
