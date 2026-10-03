import { Router } from "express";

import { getPublishedTheme, getTheme, postPublishedTheme } from "../controllers/theme.controller.js";
import { createWidgetSchema, publishedThemeParamsSchema } from "../validators/theme.validator.js";
import { validateBody, validateParams } from "../validators/request.validator.js";

export const themeRoute = Router();

themeRoute.get("/widget/theme", getTheme);
themeRoute.post("/widget/themes", validateBody(createWidgetSchema), postPublishedTheme);
themeRoute.get("/widget/themes/:id", validateParams(publishedThemeParamsSchema), getPublishedTheme);
