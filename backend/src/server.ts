import { config } from "./config";
import { app } from "./app";

app.listen(config.puerto, () => {
  console.log(`API de Jorge Motors en http://localhost:${config.puerto}/api/v1`);
});
