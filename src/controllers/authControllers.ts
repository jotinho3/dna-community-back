import { db } from "../utils/firebase";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined in environment variables');
}

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

    // Cria o usuário no Firestore
    const userRef = await db.collection("users").add({
      name,
      email,
      password: hashedPassword,
      created_at: new Date(),
      hasCompletedOnboarding: false,
      profile: {
        role: null,
        experience: null,
        languages: [],
        tools: [],
        interests: [],
      },
      engagement_xp: 0,
    });
    // Gera o token JWT
    const expiresInSeconds = 7 * 24 * 60 * 60; // 7 dias em segundos
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const token = jwt.sign({ uid: userRef.id, email }, JWT_SECRET, {
      expiresIn: expiresInSeconds,
    });

    res.status(201).json({
      message: "Usuário registrado com sucesso",
      token,
      user: {
        uid: userRef.id,
        name,
        email,
        created_at: new Date(),
      },
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

    res.status(200).json({
      message: "Login realizado com sucesso",
      token,
      user: {
        uid: userDoc.id,
        name: userData.name,
        email: userData.email,
        created_at: userData.created_at,
      },
      expiresIn: expiresAt,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res
      .status(500)
      .json({ message: "Erro ao realizar login", error: errorMessage });
  }
};
