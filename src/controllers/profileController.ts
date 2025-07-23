import { Request, Response } from 'express';
import { db } from '../utils/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export class ProfileController {
  
  // Criar/Atualizar perfil do usuário
  static async create(req: Request, res: Response) {
    const { uid, bio, location, website, skills, socialLinks } = req.body;
    
    try {
      // Verifica se o usuário existe
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      const userData = userDoc.data();
      
      // Atualiza o perfil do usuário
      await db.collection('users').doc(uid).update({
        profile: {
          ...userData?.profile,
          bio: bio || '',
          location: location || '',
          website: website || '',
          skills: skills || [],
          socialLinks: socialLinks || {},
          updatedAt: new Date()
        }
      });

      res.status(200).json({
        message: 'Perfil atualizado com sucesso',
        profile: {
          uid,
          bio,
          location,
          website,
          skills,
          socialLinks
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        message: 'Erro ao criar/atualizar perfil', 
        error: errorMessage 
      });
    }
  }

  // Buscar todos os perfis (com paginação)
  static async getAll(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, role, skills } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      let query = db.collection('users')
        .where('hasCompletedOnboarding', '==', true);

      // Filtros opcionais
      if (role) {
        query = query.where('profile.role', '==', role);
      }

      const snapshot = await query
        .orderBy('engagement_xp', 'desc')
        .limit(limitNum)
        .offset(offset)
        .get();

      const profiles = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const userData = doc.data();
          const followersCount = await ProfileController.getFollowersCount(doc.id);
          const followingCount = await ProfileController.getFollowingCount(doc.id);

          return {
            uid: doc.id,
            name: userData.name,
            email: userData.email,
            profile: userData.profile,
            engagement_xp: userData.engagement_xp || 0,
            created_at: userData.created_at,
            followersCount,
            followingCount
          };
        })
      );

      // Filtrar por skills se especificado
      let filteredProfiles = profiles;
      if (skills) {
        const skillsArray = Array.isArray(skills) ? skills : [skills];
        filteredProfiles = profiles.filter(profile => 
          profile.profile?.skills?.some((skill: string) => 
            skillsArray.includes(skill)
          )
        );
      }

      res.status(200).json({
        profiles: filteredProfiles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredProfiles.length
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        message: 'Erro ao buscar perfis', 
        error: errorMessage 
      });
    }
  }

  // Buscar perfil por ID
  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const { currentUserId } = req.query;

    try {
      const userDoc = await db.collection('users').doc(id).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ message: 'Perfil não encontrado' });
      }

      const userData = userDoc.data();
      const followersCount = await ProfileController.getFollowersCount(id);
      const followingCount = await ProfileController.getFollowingCount(id);
      
      // Verificar se o usuário atual segue este perfil
      let isFollowing = false;
      if (currentUserId) {
        const followDoc = await db
          .collection('followers')
          .where('followerId', '==', currentUserId)
          .where('followingId', '==', id)
          .get();
        isFollowing = !followDoc.empty;
      }

      res.status(200).json({
        uid: userDoc.id,
        name: userData?.name,
        email: userData?.email,
        profile: userData?.profile,
        engagement_xp: userData?.engagement_xp || 0,
        created_at: userData?.created_at,
        followersCount,
        followingCount,
        isFollowing
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        message: 'Erro ao buscar perfil', 
        error: errorMessage 
      });
    }
  }

  // Atualizar perfil
  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const updateData = req.body;

    try {
      const userDoc = await db.collection('users').doc(id).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ message: 'Perfil não encontrado' });
      }

      const userData = userDoc.data();
      
      await db.collection('users').doc(id).update({
        profile: {
          ...userData?.profile,
          ...updateData,
          updatedAt: new Date()
        }
      });

      res.status(200).json({
        message: 'Perfil atualizado com sucesso'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        message: 'Erro ao atualizar perfil', 
        error: errorMessage 
      });
    }
  }

  // Deletar perfil (soft delete)
  static async delete(req: Request, res: Response) {
    const { id } = req.params;

    try {
      await db.collection('users').doc(id).update({
        deleted: true,
        deletedAt: new Date()
      });

      res.status(200).json({
        message: 'Perfil removido com sucesso'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        message: 'Erro ao remover perfil', 
        error: errorMessage 
      });
    }
  }

  // Seguir usuário
  static async followUser(req: Request, res: Response) {
    const { followerId, followingId } = req.body;

    try {
      // Verifica se já segue
      const existingFollow = await db
        .collection('followers')
        .where('followerId', '==', followerId)
        .where('followingId', '==', followingId)
        .get();

      if (!existingFollow.empty) {
        return res.status(400).json({ message: 'Já está seguindo este usuário' });
      }

      // Criar relação de seguidor
      await db.collection('followers').add({
        followerId,
        followingId,
        createdAt: new Date()
      });

      // Atualizar XP de engajamento do usuário seguido
      const followingUserRef = db.collection('users').doc(followingId);
      await followingUserRef.update({
        engagement_xp: FieldValue.increment(10)
      });

      res.status(201).json({
        message: 'Usuário seguido com sucesso'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        message: 'Erro ao seguir usuário', 
        error: errorMessage 
      });
    }
  }

  // Deixar de seguir usuário
  static async unfollowUser(req: Request, res: Response) {
    const { followerId, followingId } = req.body;

    try {
      const followDoc = await db
        .collection('followers')
        .where('followerId', '==', followerId)
        .where('followingId', '==', followingId)
        .get();

      if (followDoc.empty) {
        return res.status(400).json({ message: 'Não está seguindo este usuário' });
      }

      // Remover relação de seguidor
      const batch = db.batch();
      followDoc.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Diminuir XP de engajamento do usuário
      const followingUserRef = db.collection('users').doc(followingId);
      await followingUserRef.update({
        engagement_xp: FieldValue.increment(-10)
      });

      res.status(200).json({
        message: 'Deixou de seguir o usuário'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        message: 'Erro ao deixar de seguir usuário', 
        error: errorMessage 
      });
    }
  }

  // Buscar seguidores de um usuário
  static async getFollowers(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const followersSnapshot = await db
        .collection('followers')
        .where('followingId', '==', id)
        .get();

      const followers = await Promise.all(
        followersSnapshot.docs.map(async (doc) => {
          const followData = doc.data();
          const userDoc = await db.collection('users').doc(followData.followerId).get();
          const userData = userDoc.data();
          
          return {
            uid: userDoc.id,
            name: userData?.name,
            profile: userData?.profile,
            followedAt: followData.createdAt
          };
        })
      );

      res.status(200).json({ followers });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        message: 'Erro ao buscar seguidores', 
        error: errorMessage 
      });
    }
  }

  // Buscar quem o usuário segue
  static async getFollowing(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const followingSnapshot = await db
        .collection('followers')
        .where('followerId', '==', id)
        .get();

      const following = await Promise.all(
        followingSnapshot.docs.map(async (doc) => {
          const followData = doc.data();
          const userDoc = await db.collection('users').doc(followData.followingId).get();
          const userData = userDoc.data();
          
          return {
            uid: userDoc.id,
            name: userData?.name,
            profile: userData?.profile,
            followedAt: followData.createdAt
          };
        })
      );

      res.status(200).json({ following });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        message: 'Erro ao buscar seguindo', 
        error: errorMessage 
      });
    }
  }

  // Métodos auxiliares
  static async getFollowersCount(userId: string): Promise<number> {
    const snapshot = await db
      .collection('followers')
      .where('followingId', '==', userId)
      .get();
    return snapshot.size;
  }

  static async getFollowingCount(userId: string): Promise<number> {
    const snapshot = await db
      .collection('followers')
      .where('followerId', '==', userId)
      .get();
    return snapshot.size;
  }
}