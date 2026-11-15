import { createSeededApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const { app } = createSeededApp();

app.listen(port, () => {
  console.log(`Dental Clinic Management listening on http://localhost:${port}`);
});
