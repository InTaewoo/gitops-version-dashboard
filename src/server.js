const app = require("./app");

const port = Number(process.env.PORT || 8080);

app.listen(port, "0.0.0.0", () => {
  console.log(`GitOps dashboard listening on port ${port}`);
});

