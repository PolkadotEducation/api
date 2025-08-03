import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://482b7accda2abc6c83e12aa6cfeb6122@o4509737515810816.ingest.us.sentry.io/4509737517318144",

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});
