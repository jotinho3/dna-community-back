import express from 'express';
import { UserController } from '../controllers/userController';

const router = express.Router();

// === ROTAS DE ONBOARDING ===
// GET /api/users/:uid/onboarding/status
router.get('/:uid/onboarding/status', UserController.checkOnboardingStatus);

// POST /api/users/:uid/onboarding/complete
router.post('/:uid/onboarding/complete', UserController.completeOnboarding);

// === ROTAS DE PERFIL ===
// GET /api/users/profiles - Buscar todos os perfis
router.get('/profiles', UserController.getAll);

// GET /api/users/:uid/profile - Buscar perfil por UID
router.get('/:uid/profile', UserController.getById);

// PUT /api/users/:uid/profile - Atualizar perfil
router.put('/:uid/profile', UserController.updateProfile);

// DELETE /api/users/:uid - Deletar usuário (soft delete)
router.delete('/:uid', UserController.deleteUser);

// === ROTAS DE SEGUIDOR ===
// POST /api/users/follow
router.post('/follow', UserController.followUser);

// POST /api/users/unfollow
router.post('/unfollow', UserController.unfollowUser);

// GET /api/users/:uid/followers
router.get('/:uid/followers', UserController.getFollowers);

// GET /api/users/:uid/following
router.get('/:uid/following', UserController.getFollowing);

export default router;