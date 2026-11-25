const cors = require("cors");
const express = require("express");
const config = require("./config");
const invoices = require("./routes/invoices");

const app = express();

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
      if (config.allowVercel && /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return cb(null, true);
      return cb(new Error("Origin not allowed by CORS"));
    },
    exposedHeaders: ["Content-Disposition"],
  })
);

app.get("/health", (_req, res) => res.json({ status: "ok", service: "notification-service" }));
app.use("/api/invoices", invoices);

module.exports = app;
