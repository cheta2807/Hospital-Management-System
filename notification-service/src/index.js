const app = require("./app");
const config = require("./config");
const { startReminderJob } = require("./jobs/reminders");

app.listen(config.port, () => {
  console.log(`Notification service listening on :${config.port}`);
  startReminderJob();
});
