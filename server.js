/**
 * Legacy Express entry — delegates all /api/* traffic to lib/api-handlers.js.
 * Production path: Next.js app/api/[[...slug]]/route.js (same handler).
 */
const express = require("express");
const path = require("path");
const { handleApi } = require("./lib/api-handlers");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

const apiRouter = express.Router();

apiRouter.all(/.*/, async (req, res) => {
  try {
    const pathname = "/api" + (req.path === "/" ? "" : req.path);
    const result = await handleApi({
      method: req.method,
      pathname,
      query: req.query,
      body: req.body,
      authHeader: req.get("authorization"),
    });
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => res.setHeader(key, value));
    }
    res.status(result.status).send(result.body);
  } catch (error) {
    res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

app.use("/api", apiRouter);
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`ABC Legacy Express (api-handlers) running at http://localhost:${PORT}`);
});