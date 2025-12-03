const express = require("express")
const cors = require("cors")
const routes = require("./routes")

const app = express()

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.path}`)
  next()
})

// Global middleware
app.use(cors())
app.use(express.json())

// Routes
app.use("/", routes)

module.exports = app


