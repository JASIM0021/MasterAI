const express = require('express');
const FileRouter = require('./src/routes/fileRoutes');
const protectedRoute = require('./src/routes/protectedRoute');
const apiKeyRoutes = require('./src/routes/apiKeyRoutes');
const config = require('./src/config/config');
const userRouter = require('./src/user/user.router');
const dotenv = require('dotenv');
const cron = require('node-cron');
const cluster = require('cluster');
const os = require('os');
const path = require('path');
const cors = require('cors')
const fs = require('fs');
const session = require('express-session');
const { apiKeyAuth, requireScope } = require('./src/middleware/authMiddleware');
const keyRateLimiter = require('./src/middleware/rateLimitMiddleware');
const { default: mongoose } = require('mongoose');
const { default: helmet } = require('helmet');
const creditResetService = require('./services/creditResetService');
const { authRoutes } = require('./routes/auth');
const { pushRouter } = require('./routes/notifications');
const razorpayRouter = require('./routes/razorpay');
dotenv.config();

// Temporarily disable clustering to fix Mongoose model compilation issues
// if (cluster.isMaster) {
//   // Get the number of available CPU cores
//   const numCPUs = os.cpus().length;

//   // Fork workers for each CPU core
//   for (let i = 0; i < numCPUs; i++) {
//     cluster.fork();
//   }

//   // Handle worker crashes
//   cluster.on('exit', (worker, code, signal) => {
//     console.log(`Worker ${worker.process.pid} died. Restarting...`);
//     cluster.fork();
//   });
// } else {
  const app = express();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Middleware to exclude auth routes from API key validation
  app.use((req, res, next) => {
    // Skip API key validation for auth routes, social OAuth routes, and payment webhooks
    if (req.path.startsWith('/api/auth') ||
        req.path.startsWith('/api/social/auth') ||
        req.path.startsWith('/api/payments/success') ||
        req.path.startsWith('/api/payments/failure') ||
        req.path.startsWith('/api/payments/cancel') ||
        req.path.startsWith('/api/razorpay')) {
      return next();
    }

    const token = req?.headers?.apikey || req?.headers?.Apikey;
    if (token == config.masterAiapiKey) {
      next();
    } else {
      return res.status(401).json({
        message: 'Unauthorize Access',
        status: 401,
      });
    }
  });

app.use(express.urlencoded({ extended: true }));

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.openai.com'],
        },
      },
    }),
  );

  app.use(cors({
    origin: ['http://localhost:*', 'http://127.0.0.1:*', 'https://websitebuilder.todayintech.in','https://logoai.todayintech.in','https://\*.todayintech.in'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
  }))
  app.use(express.json({ limit: '10mb' }));

  // Session middleware for OAuth
  app.use(session({
    secret: process.env.SESSION_SECRET || 'master-ai-session-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  app.get('/', (req, res) => res.send('Welcome TO Master AI Rest Service'));

  // Auth routes (no API key required)
app.use('/api/auth', authRoutes);

app.use('/api/fcm',pushRouter)

  // Payment routes (PayU webhooks don't require API key)
  app.use('/api/payments', require('./routes/payments'));

  // Razorpay payment routes
  app.use('/api/razorpay', razorpayRouter);

  // Social routes (no API key required for OAuth)
  app.use('/api/social', require('./routes/social'));
  app.use('/api/posts', require('./routes/posts'));
  app.use('/api/schedules', require('./routes/schedules'));
  app.use('/api/approval', require('./routes/approval'));
  app.use('/api/credits', require('./routes/credits'));
  app.use('/api/videos', require('./routes/videos'));

  // Other routes (API key required)
  app.use('/api', FileRouter);
  app.use('/api/v1', protectedRoute);
  app.use('/api/user', userRouter);
  app.use('/api/admin', apiKeyRoutes);

  // Schedule a task in every day midnight
  cron.schedule('0 0 * * *', () => {
    const uploadDir = path.join(__dirname, 'uploads');
    fs.readdir(uploadDir, (err, files) => {
      if (err) {
        console.error('Error reading uploads directory:', err);
        return;
      }
      files.forEach(file => {
        fs.unlink(path.join(uploadDir, file), err => {
          if (err) {
            console.error('Error deleting file:', err);
          }
        });
      });
      console.log('Uploads folder cleared');
    });
  });

  async function main() {
    try {
      await mongoose.connect(process.env.MONGO_URL, {
        dbName: 'masterAiApiKey',
      });

      app.listen(config.port, () => {
        console.log(`app is listening on port ${config.port}`);
      });
    } catch (err) {
      console.log(err);
    }
  }

  main();

  // app.listen(config.port, () => {
  //   console.log(`Worker ${process.pid} is running on port ${config.port}`);
  // });
// }
