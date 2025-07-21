import { db } from "../utils/firebase";
import { Request, Response } from "express";

// Interface for type safety
interface UserProfile {
  role: "data_analyst" | "data_scientist" | "data_engineer" | "bi_analyst" | "other";
  languages: string[]; // SQL, Python, R, etc
  softwares: string[]; // Power BI, Tableau, Python, etc
  interests: string[]; // Data Visualization, Machine Learning, ETL, etc
  goals: string[]; // ["improve_analysis", "learn_ml", "master_bi", "collaborate"]
}

// Check onboarding status
export const checkOnboardingStatus = async (req: Request, res: Response) => {
  const { uid } = req.params;

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const userData = userDoc.data();

    res.status(200).json({
      hasCompletedOnboarding: userData?.hasCompletedOnboarding || false,
      profile: userData?.profile || null
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Erro ao verificar status do onboarding', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// Update user profile with new structure
export const completeUserOnboarding = async (req: Request, res: Response) => {
  const { uid } = req.params;
  const profileData: UserProfile = req.body;

  try {
    await db.collection('users').doc(uid).update({
      hasCompletedOnboarding: true,
      profile: profileData,
      updated_at: new Date(),
      engagement_xp: 0 // Initialize engagement XP
    });

    res.status(200).json({
      message: 'Perfil atualizado com sucesso',
      user: {
        uid,
        hasCompletedOnboarding: true,
        profile: profileData
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Erro ao atualizar perfil', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};