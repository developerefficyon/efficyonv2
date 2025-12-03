function getHealth(req, res) {
  res.json({ status: "ok", service: "effycion-backend" })
}

module.exports = {
  getHealth,
}


