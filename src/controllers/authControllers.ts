import { db } from "../utils/firebase";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined in environment variables');
}

// Helper function to format user data for response
const formatUserResponse = (uid: string, userData: any) => {
  return {
    uid,
    name: userData.name,
    email: userData.email,
    engagement_xp: userData.engagement_xp || 0,
    hasCompletedOnboarding: userData.hasCompletedOnboarding || false,
    onboardingCompletedAt: userData.onboardingCompletedAt || null,
    created_at: userData.created_at,
    profile: {
      role: userData.profile?.role || null,
      experience: userData.profile?.experience || null,
      bio: userData.profile?.bio || "",
      location: userData.profile?.location || "",
      website: userData.profile?.website || "",
      languages: userData.profile?.languages || [],
      tools: userData.profile?.tools || [],
      skills: userData.profile?.skills || [],
      interests: userData.profile?.interests || [],
      socialLinks: userData.profile?.socialLinks || {},
      createdAt: userData.profile?.createdAt || null,
      updatedAt: userData.profile?.updatedAt || null,
    }
  };
};

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  try {
    // Verifica se o usuário já existe
    const snapshot = await db
      .collection("users")
      .where("email", "==", email)
      .get();
    if (!snapshot.empty) {
      return res.status(400).json({ message: "Email já cadastrado." });
    }

    // Criptografa a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    const now = new Date();

    // Cria o usuário no Firestore com estrutura completa
    const newUser = {
      name,
      email,
      password: hashedPassword,
      created_at: now,
      hasCompletedOnboarding: false,
      onboardingCompletedAt: null,
      engagement_xp: 0,
      profile: {
        role: null,
        experience: null,
        bio: "",
        location: "",
        website: "",
        languages: [],
        tools: [],
        skills: [],
        interests: [],
        socialLinks: {},
        createdAt: now,
        updatedAt: now,
      }
    };

    const userRef = await db.collection("users").add(newUser);

    // Gera o token JWT
    const expiresInSeconds = 7 * 24 * 60 * 60; // 7 dias em segundos
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const token = jwt.sign({ uid: userRef.id, email }, JWT_SECRET, {
      expiresIn: expiresInSeconds,
    });

    // Format complete user response
    const userResponse = formatUserResponse(userRef.id, newUser);

    res.status(201).json({
      message: "Usuário registrado com sucesso",
      token,
      user: userResponse,
      expiresIn: expiresAt,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res
      .status(500)
      .json({ message: "Erro ao registrar usuário", error: errorMessage });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    // Busca o usuário pelo email
    const snapshot = await db
      .collection("users")
      .where("email", "==", email)
      .get();
    if (snapshot.empty) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Verifica a senha
    const isPasswordValid = await bcrypt.compare(password, userData.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    // Gera o token JWT
    const expiresInSeconds = 7 * 24 * 60 * 60; // 7 dias em segundos
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const token = jwt.sign(
      { uid: userDoc.id, email: userData.email },
      JWT_SECRET,
      { expiresIn: expiresInSeconds }
    );

    // Format complete user response
    const userResponse = formatUserResponse(userDoc.id, userData);

    res.status(200).json({
      message: "Login realizado com sucesso",
      token,
      user: userResponse,
      expiresIn: expiresAt,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res
      .status(500)
      .json({ message: "Erro ao realizar login", error: errorMessage });
  }
};

// Additional auth endpoint to get current user (useful for token validation)
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;

    const userDoc = await db.collection("users").doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const userData = userDoc.data();
    const userResponse = formatUserResponse(uid, userData);

    res.status(200).json({
      user: userResponse
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      message: "Erro ao buscar usuário", 
      error: errorMessage 
    });
  }
};