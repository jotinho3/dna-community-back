// routes/qaRoutes.ts
import express from 'express';
import { QAController } from '../controllers/qaController';

const router = express.Router();

// Rotas de perguntas
router.post('/:uid/questions', QAController.createQuestion);
router.get('/questions', QAController.getQuestions);
router.get('/questions/:questionId', QAController.getQuestion);

// Rotas de respostas
router.post('/:uid/answers', QAController.createAnswer);
router.get('/questions/:questionId/answers', QAController.getAnswers);
router.post('/:uid/answers/accept', QAController.acceptAnswer);

// Rotas de reações
router.post('/:uid/reactions', QAController.toggleReaction);

export default router;

// No seu index.js principal, adicione:
// app.use('/api/qa', qaRoutes);