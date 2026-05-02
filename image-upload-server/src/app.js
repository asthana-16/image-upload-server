const express = require("express");
const uploadRoute = require("./upload");

const app = express();

app.use("/upload", uploadRoute);

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;