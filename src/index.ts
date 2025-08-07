import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';
import { initializeApp } from 'firebase-admin/app';
import cors from 'cors';
import { admin } from './utils/firebase'; // Adjust the import path as necessary
import { getFirestore } from 'firebase-admin/firestore';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import qaRoutes from './routes/qaRoutes';
import notificationRoutes from './routes/notificationRoutes';
import workshopRoutes from './routes/workshopRoutes';
import rewardRoutes from './routes/rewardsRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(bodyParser.json());

app.use(express.json({ limit: '50mb' }));  // Aumenta o limite para JSON
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const corsOptions = {
  origin: ['http://localhost:3000', 'localhost:3000', 'https://dna-community.vercel.app'], // Permite apenas o front-end na porta 3001
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization', 'uid', 'Accept', 'x-requested-with', 'Origin', 'orcamentouid'], // Cabeçalhos permitidos
};

app.use(cors(corsOptions));


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/admin', adminRoutes);
// app.use('/api/profiles', profileRoutes);
// app.use('/api/companies', companyRoutes);
// app.use('/api/plans', planRoutes);
// app.use('/api/subcompanies', subcompanyRoutes);
// app.use('/api/news', newsRoutes);
// app.use('/api/workshops', workshopRoutes);
// app.use('/api/userWorkshops', userWorkshopRoutes);
// app.use('/api/forums', forumRoutes);
// app.use('/api/posts', postRoutes);
// app.use('/api/responses', responseRoutes);
// app.use('/api/reactions', reactionRoutes);
// app.use('/api/follows', followRoutes);
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/dailyQuests', dailyQuestRoutes);
// app.use('/api/userDailyQuests', userDailyQuestRoutes);
// app.use('/api/engagementXpActions', engagementXpActionRoutes);
// app.use('/api/workshopPaths', workshopPathRoutes);
// app.use('/api/workshopPathSteps', workshopPathStepRoutes);
// app.use('/api/certifications', certificationRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});