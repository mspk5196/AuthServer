const dotenv = require('dotenv');
dotenv.config();

const http = require('http');
const app = require('./src/app.js');
const db = require('./src/config/db.js');
const { schedulePlanStatusJob } = require('./src/jobs/planStatusJob.js');
const { scheduleUsageReminderJob } = require('./src/jobs/usageReminderJob.js');

const PORT = process.env.PORT || 5050;
const server = http.createServer(app);

app.set('trust proxy', 1);

app.get('/', (req, res) => {
  res.send('✅ OK - Auth Server Running with no problems');
});

// Start scheduled jobs
schedulePlanStatusJob();
scheduleUsageReminderJob();

server.listen(PORT, '0.0.0.0', () => {
  // console.log  console.log(`Server running on port ${PORT}`);
});
