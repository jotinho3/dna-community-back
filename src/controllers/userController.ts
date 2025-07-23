import { db } from "../utils/firebase";
import { Request, Response } from "express";
import { admin } from "../utils/firebase";

// Interface for user profile
interface UserProfile {
  role:
    | "data_analyst"
    | "data_scientist"
    | "data_engineer"
    | "bi_analyst"
    | "other";
  languages: string[];
  softwares: string[];
  interests: string[];
  goals: string[];
  // Campos sociais
  bio?: string;
  location?: string;
  website?: string;
  skills?: string[];
  socialLinks?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    portfolio?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserController {
  // Check onboarding status
  static async checkOnboardingStatus(req: Request, res: Response) {
    const { uid } = req.params;

    try {
      const userDoc = await db.collection("users").doc(uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const userData = userDoc.data();

      res.status(200).json({
        hasCompletedOnboarding: userData?.hasCompletedOnboarding || false,
        profile: userData?.profile || null,
      });
    } catch (error) {
      res.status(500).json({
        message: "Erro ao verificar status do onboarding",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Complete onboarding - integra com a lógica de perfil social
  static async completeOnboarding(req: Request, res: Response) {
    const { uid } = req.params;
    const profile: UserProfile = req.body;

    try {
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const userData = userDoc.data();

      // Extender o perfil com dados sociais iniciais
      const extendedProfile: UserProfile = {
        ...profile,
        // Campos sociais iniciais vazios se não fornecidos
        bio: profile.bio || "",
        location: profile.location || "",
        website: profile.website || "",
        skills: profile.skills || [],
        socialLinks: profile.socialLinks || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await userRef.update({
        hasCompletedOnboarding: true,
        profile: extendedProfile,
        onboardingCompletedAt: new Date(),
        engagement_xp: userData?.engagement_xp || 0,
      });

      res.status(200).json({
        success: true,
        message: "Onboarding completed successfully",
        user: {
          uid,
          hasCompletedOnboarding: true,
          profile: extendedProfile,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      res.status(500).json({
        message: "Erro ao completar onboarding",
        error: errorMessage,
      });
    }
  }

  // Update user profile (campos sociais)
  static async updateProfile(req: Request, res: Response) {
    const { uid } = req.params;
    const {
      bio,
      location,
      website,
      skills,
      socialLinks,
      role,
      languages,
      softwares,
      interests,
      goals,
    } = req.body;

    try {
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const userData = userDoc.data();

      // Atualiza apenas os campos fornecidos
      const updatedProfile = {
        ...userData?.profile,
        // Campos técnicos
        role: role !== undefined ? role : userData?.profile?.role,
        languages:
          languages !== undefined ? languages : userData?.profile?.languages,
        softwares:
          softwares !== undefined ? softwares : userData?.profile?.softwares,
        interests:
          interests !== undefined ? interests : userData?.profile?.interests,
        goals: goals !== undefined ? goals : userData?.profile?.goals,
        // Campos sociais
        bio: bio !== undefined ? bio : userData?.profile?.bio,
        location:
          location !== undefined ? location : userData?.profile?.location,
        website: website !== undefined ? website : userData?.profile?.website,
        skills: skills !== undefined ? skills : userData?.profile?.skills,
        socialLinks:
          socialLinks !== undefined
            ? socialLinks
            : userData?.profile?.socialLinks,
        updatedAt: new Date(),
      };

      await userRef.update({
        profile: updatedProfile,
        updated_at: new Date(),
      });

      res.status(200).json({
        message: "Perfil atualizado com sucesso",
        profile: updatedProfile,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      res.status(500).json({
        message: "Erro ao atualizar perfil",
        error: errorMessage,
      });
    }
  }

  // Get user by ID (with social info)
  static async getById(req: Request, res: Response) {
    const { uid } = req.params;
    const { currentUserId } = req.query;

    try {
      const userDoc = await db.collection("users").doc(uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const userData = userDoc.data();

      // Verificar se completou onboarding
      if (!userData?.hasCompletedOnboarding) {
        return res.status(404).json({ message: "Perfil não disponível" });
      }

      const followersCount = await UserController.getFollowersCount(uid);
      const followingCount = await UserController.getFollowingCount(uid);

      // Verificar se o usuário atual segue este perfil
      let isFollowing = false;
      if (currentUserId && currentUserId !== uid) {
        const followDoc = await db
          .collection("followers")
          .where("followerId", "==", currentUserId)
          .where("followingId", "==", uid)
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
        isFollowing,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      res.status(500).json({
        message: "Erro ao buscar usuário",
        error: errorMessage,
      });
    }
  }

  // Get all users with profiles (for discovery)
static async getAll(req: Request, res: Response) {
  try {
    console.log("🔍 Incoming query params:", req.query);

    const {
      page = 1,
      limit = 20,
      role,
      skills,
      location,
      currentUserId,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    console.log("📄 Page:", pageNum, "🔢 Limit:", limitNum);

    let query: FirebaseFirestore.Query = db
      .collection("users")
      .where("hasCompletedOnboarding", "==", true)

    console.log("🔧 Base query created");

    if (role) {
      query = query.where("profile.role", "==", role);
      console.log("🎭 Filtering by role:", role);
    }

    if (location) {
      query = query.where("profile.location", "==", location);
      console.log("📍 Filtering by location:", location);
    }

    query = query.orderBy("engagement_xp", "desc");

    const snapshot = await query.limit(limitNum).get();

    console.log(`📦 Retrieved ${snapshot.size} user(s) from Firestore`);

    const users = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const userData = doc.data();

        const followersCount = await UserController.getFollowersCount(doc.id);
        const followingCount = await UserController.getFollowingCount(doc.id);

        let isFollowing = false;
        if (currentUserId && currentUserId !== doc.id) {
          const followDoc = await db
            .collection("followers")
            .where("followerId", "==", currentUserId)
            .where("followingId", "==", doc.id)
            .get();
          isFollowing = !followDoc.empty;
        }

        const profileUser = {
          uid: doc.id,
          name: userData.name,
          email: userData.email,
          profile: userData.profile || {},
          engagement_xp: userData.engagement_xp || 0,
          created_at: userData.created_at,
          followersCount,
          followingCount,
          isFollowing,
        };

        return profileUser;
      })
    );

    // Filtro por skills (após a consulta, pois Firestore não suporta contains parcial)
    let filteredUsers = users;
    if (skills) {
      const skillsArray: string[] = Array.isArray(skills)
        ? skills.map((s) => String(s))
        : [String(skills)];

      console.log("🎯 Filtering by skills:", skillsArray);

      filteredUsers = users.filter((user) =>
        user.profile?.skills?.some((skill: string) =>
          skillsArray.some((filterSkill) =>
            skill.toLowerCase().includes(filterSkill.toLowerCase())
          )
        )
      );

      console.log(`🔎 ${filteredUsers.length} user(s) matched skill filters`);
    }

    res.status(200).json({
      users: filteredUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredUsers.length, // se quiser total global, use um count separado
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in getAll:", errorMessage);
    res.status(500).json({
      message: "Erro ao buscar usuários",
      error: errorMessage,
    });
  }
}


  // Follow user
  static async followUser(req: Request, res: Response) {
    const { followerId, followingId } = req.body;

    if (followerId === followingId) {
      return res
        .status(400)
        .json({ message: "Não é possível seguir a si mesmo" });
    }

    try {
      // Verificar se já segue
      const existingFollow = await db
        .collection("followers")
        .where("followerId", "==", followerId)
        .where("followingId", "==", followingId)
        .get();

      if (!existingFollow.empty) {
        return res
          .status(400)
          .json({ message: "Usuário já está sendo seguido" });
      }

      // Criar relacionamento de seguidor
      await db.collection("followers").add({
        followerId,
        followingId,
        createdAt: new Date(),
      });

      // Incrementar XP de engajamento para ambos
      const followerRef = db.collection("users").doc(followerId);
      const followingRef = db.collection("users").doc(followingId);

      await Promise.all([
        followerRef.update({
          engagement_xp: admin.firestore.FieldValue.increment(5), // XP por seguir alguém
        }),
        followingRef.update({
          engagement_xp: admin.firestore.FieldValue.increment(10), // XP por ganhar seguidor
        }),
      ]);

      res.status(200).json({ message: "Usuário seguido com sucesso" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      res.status(500).json({
        message: "Erro ao seguir usuário",
        error: errorMessage,
      });
    }
  }

  // Unfollow user
  static async unfollowUser(req: Request, res: Response) {
    const { followerId, followingId } = req.body;

    try {
      const followDoc = await db
        .collection("followers")
        .where("followerId", "==", followerId)
        .where("followingId", "==", followingId)
        .get();

      if (followDoc.empty) {
        return res
          .status(404)
          .json({ message: "Relacionamento de seguidor não encontrado" });
      }

      // Remover relacionamento
      await followDoc.docs[0].ref.delete();

      res.status(200).json({ message: "Usuário deixou de ser seguido" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      res.status(500).json({
        message: "Erro ao deixar de seguir usuário",
        error: errorMessage,
      });
    }
  }

  // Get followers
  static async getFollowers(req: Request, res: Response) {
    const { uid } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    try {
      const followersSnapshot = await db
        .collection("followers")
        .where("followingId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(limitNum)
        .offset(offset)
        .get();

      const followers = await Promise.all(
        followersSnapshot.docs.map(async (doc) => {
          const followData = doc.data();
          const userDoc = await db
            .collection("users")
            .doc(followData.followerId)
            .get();
          const userData = userDoc.data();

          return {
            uid: userDoc.id,
            name: userData?.name,
            profile: userData?.profile,
            followedAt: followData.createdAt,
          };
        })
      );

      res.status(200).json({
        followers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: followers.length,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      res.status(500).json({
        message: "Erro ao buscar seguidores",
        error: errorMessage,
      });
    }
  }

  // Get following
  static async getFollowing(req: Request, res: Response) {
    const { uid } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    try {
      const followingSnapshot = await db
        .collection("followers")
        .where("followerId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(limitNum)
        .offset(offset)
        .get();

      const following = await Promise.all(
        followingSnapshot.docs.map(async (doc) => {
          const followData = doc.data();
          const userDoc = await db
            .collection("users")
            .doc(followData.followingId)
            .get();
          const userData = userDoc.data();

          return {
            uid: userDoc.id,
            name: userData?.name,
            profile: userData?.profile,
            followedAt: followData.createdAt,
          };
        })
      );

      res.status(200).json({
        following,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: following.length,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      res.status(500).json({
        message: "Erro ao buscar usuários seguidos",
        error: errorMessage,
      });
    }
  }

  // Soft delete user
  static async deleteUser(req: Request, res: Response) {
    const { uid } = req.params;

    try {
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Soft delete
      await userRef.update({
        deleted: true,
        deletedAt: new Date(),
        updated_at: new Date(),
      });

      res.status(200).json({ message: "Usuário removido com sucesso" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      res.status(500).json({
        message: "Erro ao remover usuário",
        error: errorMessage,
      });
    }
  }

  // Helper methods
  static async getFollowersCount(uid: string): Promise<number> {
    try {
      const snapshot = await db
        .collection("followers")
        .where("followingId", "==", uid)
        .get();
      return snapshot.size;
    } catch (error) {
      return 0;
    }
  }

  static async getFollowingCount(uid: string): Promise<number> {
    try {
      const snapshot = await db
        .collection("followers")
        .where("followerId", "==", uid)
        .get();
      return snapshot.size;
    } catch (error) {
      return 0;
    }
  }
}
