// controllers/QAController.ts
import { Request, Response } from "express";
import { db } from "../utils/firebase";
import {
  Question,
  Answer,
  CreateQuestionRequest,
  CreateAnswerRequest,
  ReactionRequest,
  QuestionFilters,
} from "../types/qa";

export class QAController {
  // Criar pergunta
  static async createQuestion(req: Request, res: Response) {
    try {
      const { uid } = req.params;
      const { title, content, tags, mentions }: CreateQuestionRequest =
        req.body;

      // Buscar dados do autor
      const authorDoc = await db.collection("users").doc(uid).get();
      if (!authorDoc.exists) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const authorData = authorDoc.data();
      const questionId = db.collection("questions").doc().id;

      const questionData: Omit<Question, "id"> = {
        authorId: uid,
        authorName: authorData?.name,
        authorAvatar: authorData?.photoURL,
        title,
        content,
        tags: tags.map((tag) => tag.toLowerCase()),
        mentions: mentions || [],
        reactions: [],
        answersCount: 0,
        viewsCount: 0,
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection("questions").doc(questionId).set(questionData);

      // Adicionar XP ao autor (+15 por pergunta)
      await db
        .collection("users")
        .doc(uid)
        .update({
          engagement_xp: (authorData?.engagement_xp || 0) + 15,
        });

      // Criar notificações para usuários mencionados
      if (mentions && mentions.length > 0) {
        await QAController.createMentionNotifications(
          mentions,
          questionId,
          "question",
          uid
        );
      }

      res.status(201).json({
        id: questionId,
        ...questionData,
        message: "Pergunta criada com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao criar pergunta:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  // Listar perguntas com filtros
  static async getQuestions(req: Request, res: Response) {
    try {
      let {
        tags,
        resolved,
        authorId,
        sortBy = "recent",
        search,
        limit = 20,
        page = 1,
        lastCreatedAt,
      }: any = req.query;

      limit = Number(limit);

      let query: FirebaseFirestore.Query = db.collection("questions");

      // Filtro de tags
      if (tags) {
        // Garante que tags é array
        if (typeof tags === "string") tags = [tags];
        query = query.where("tags", "array-contains-any", tags);
      }

      // Filtro de resolved
      if (resolved !== undefined) {
        const resolvedBool = resolved === "true" || resolved === true;
        query = query.where("isResolved", "==", resolvedBool);
      }

      // Filtro de autor
      if (authorId) {
        query = query.where("authorId", "==", authorId);
      }

      // Ordenação
      switch (sortBy) {
        case "popular":
          // Firestore não permite orderBy em array length, então ignore ou use outro critério
          query = query.orderBy("viewsCount", "desc");
          break;
        case "unanswered":
          query = query
            .where("answersCount", "==", 0)
            .orderBy("createdAt", "desc");
          break;
        default:
          query = query.orderBy("createdAt", "desc");
      }

      // Paginação com startAfter (recomendado)
      if (lastCreatedAt) {
        // lastCreatedAt deve ser um timestamp válido
        query = query.startAfter(new Date(lastCreatedAt));
      }

      query = query.limit(limit);

      const snapshot = await query.get();
      const questions: Question[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();

        // Filtro de busca por texto (apenas no backend, não performático)
        if (search) {
          const searchLower = search.toLowerCase();
          const matchTitle = data.title?.toLowerCase().includes(searchLower);
          const matchContent = data.content
            ?.toLowerCase()
            .includes(searchLower);
          const matchTags = (data.tags || []).some((tag: string) =>
            tag.toLowerCase().includes(searchLower)
          );
          if (!matchTitle && !matchContent && !matchTags) {
            return;
          }
        }

        questions.push({
          id: doc.id,
          ...data,
          createdAt:
            typeof data.createdAt?.toDate === "function"
              ? data.createdAt.toDate()
              : data.createdAt,
          updatedAt:
            typeof data.updatedAt?.toDate === "function"
              ? data.updatedAt.toDate()
              : data.updatedAt,
        } as Question);
      });

      res.json({
        questions,
        pagination: {
          limit,
          hasMore: questions.length === limit,
          lastCreatedAt: questions.length
            ? questions[questions.length - 1].createdAt
            : null,
        },
      });
    } catch (error) {
      console.error("Erro ao buscar perguntas:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  // Buscar pergunta específica
  static async getQuestion(req: Request, res: Response) {
    try {
      const { questionId } = req.params;
      const { viewerId } = req.query;

      const questionDoc = await db
        .collection("questions")
        .doc(questionId)
        .get();
      if (!questionDoc.exists) {
        return res.status(404).json({ error: "Pergunta não encontrada" });
      }

      const questionData = questionDoc.data() as Question;

      // Incrementar visualizações (só se não for o autor)
      if (viewerId && viewerId !== questionData.authorId) {
        await db
          .collection("questions")
          .doc(questionId)
          .update({
            viewsCount: (questionData.viewsCount || 0) + 1,
          });
        questionData.viewsCount = (questionData.viewsCount || 0) + 1;
      }

      const question: Question = {
        ...questionData,
        id: questionDoc.id,
        createdAt: questionData.createdAt,
        updatedAt: questionData.updatedAt,
      };

      res.json(question);
    } catch (error) {
      console.error("Erro ao buscar pergunta:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  // Criar resposta
  // Update your createAnswer method (around line 212)
  static async createAnswer(req: Request, res: Response) {
    try {
      const { uid } = req.params;
      const { questionId, content, mentions }: CreateAnswerRequest = req.body;
  
      // Verificar se a pergunta existe
      const questionDoc = await db
        .collection("questions")
        .doc(questionId)
        .get();
      if (!questionDoc.exists) {
        return res.status(404).json({ error: "Pergunta não encontrada" });
      }
  
      // Buscar dados do autor
      const authorDoc = await db.collection("users").doc(uid).get();
      if (!authorDoc.exists) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
  
      const authorData = authorDoc.data();
      const answerId = db.collection("answers").doc().id;
  
      const answerData: Omit<Answer, "id"> = {
        questionId,
        authorId: uid,
        authorName: authorData?.name || "Usuário",
        authorAvatar: authorData?.photoURL,
        content,
        mentions: mentions || [],
        reactions: [],
        isAccepted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
  
      // Salvar resposta
      await db.collection("answers").doc(answerId).set(answerData);
  
      // Atualizar contador de respostas da pergunta
      await db
        .collection("questions")
        .doc(questionId)
        .update({
          answersCount: (questionDoc.data()?.answersCount || 0) + 1,
          updatedAt: new Date(),
        });
  
      // 🆕 Atualizar totalAnswers do usuário (+1) junto com XP
      await db
        .collection("users")
        .doc(uid)
        .update({
          engagement_xp: (authorData?.engagement_xp || 0) + 10,
          totalAnswers: (authorData?.totalAnswers || 0) + 1, 
        });
  
      // Notificar autor da pergunta
      const questionData = questionDoc.data();
      if (questionData?.authorId !== uid) {
        await QAController.createAnswerNotification(
          questionData?.authorId,
          questionId,
          answerId,
          uid
        );
      }
  
      // Criar notificações para menções
      if (mentions && mentions.length > 0) {
        await QAController.createMentionNotifications(
          mentions,
          answerId,
          "answer",
          uid
        );
      }
  
      res.status(201).json({
        id: answerId,
        ...answerData,
        message: "Resposta criada com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao criar resposta:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  // Buscar respostas de uma pergunta
  static async getAnswers(req: Request, res: Response) {
    try {
      const { questionId } = req.params;
      const { limit = 20, page = 1 } = req.query;

      let query = db
        .collection("answers")
        .where("questionId", "==", questionId)
        .orderBy("isAccepted", "desc")
        .orderBy("createdAt", "asc");

      const offset = (Number(page) - 1) * Number(limit);
      query = query.limit(Number(limit)).offset(offset);

      const snapshot = await query.get();
      const answers: Answer[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        answers.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as Answer);
      });

      res.json({
        answers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          hasMore: answers.length === Number(limit),
        },
      });
    } catch (error) {
      console.error("Erro ao buscar respostas:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  // Aceitar resposta (apenas autor da pergunta)
  static async acceptAnswer(req: Request, res: Response) {
    try {
      const { uid } = req.params;
      const { questionId, answerId } = req.body;

      // Verificar se o usuário é o autor da pergunta
      const questionDoc = await db
        .collection("questions")
        .doc(questionId)
        .get();
      if (!questionDoc.exists) {
        return res.status(404).json({ error: "Pergunta não encontrada" });
      }

      const questionData = questionDoc.data();
      if (questionData?.authorId !== uid) {
        return res
          .status(403)
          .json({ error: "Apenas o autor da pergunta pode aceitar respostas" });
      }

      // Remover aceitação anterior se houver
      if (questionData.acceptedAnswerId) {
        await db
          .collection("answers")
          .doc(questionData.acceptedAnswerId)
          .update({
            isAccepted: false,
          });
      }

      // Aceitar nova resposta
      await db.collection("answers").doc(answerId).update({
        isAccepted: true,
      });

      // Atualizar pergunta
      await db.collection("questions").doc(questionId).update({
        acceptedAnswerId: answerId,
        isResolved: true,
        updatedAt: new Date(),
      });

      // Dar XP bonus para autor da resposta aceita (+25)
      const answerDoc = await db.collection("answers").doc(answerId).get();
      const answerData = answerDoc.data();
      if (answerData) {
        const authorDoc = await db
          .collection("users")
          .doc(answerData.authorId)
          .get();
        const authorData = authorDoc.data();
        await db
          .collection("users")
          .doc(answerData.authorId)
          .update({
            engagement_xp: (authorData?.engagement_xp || 0) + 25,
          });
      }

      res.json({ message: "Resposta aceita com sucesso!" });
    } catch (error) {
      console.error("Erro ao aceitar resposta:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  // Sistema de reações
  static async toggleReaction(req: Request, res: Response) {
    try {
      const { uid } = req.params;
      const { targetId, targetType, reactionType }: ReactionRequest = req.body;

      const collection = targetType === "question" ? "questions" : "answers";
      const docRef = db.collection(collection).doc(targetId);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: `${targetType} não encontrada` });
      }

      const data = doc.data();
      const reactions = data?.reactions || [];

      // Verificar se usuário já reagiu com este tipo
      const existingReactionIndex = reactions.findIndex(
        (r: any) => r.userId === uid && r.type === reactionType
      );

      let updatedReactions;
      let message;

      if (existingReactionIndex >= 0) {
        // Remover reação existente
        updatedReactions = reactions.filter(
          (_: any, index: number) => index !== existingReactionIndex
        );
        message = "Reação removida";
      } else {
        // Remover outras reações do mesmo usuário e adicionar nova
        updatedReactions = reactions.filter((r: any) => r.userId !== uid);
        updatedReactions.push({
          userId: uid,
          type: reactionType,
          createdAt: new Date(),
        });
        message = "Reação adicionada";
      }

      await docRef.update({ reactions: updatedReactions });

      res.json({ message, reactionsCount: updatedReactions.length });
    } catch (error) {
      console.error("Erro ao alternar reação:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  // Métodos auxiliares para notificações
  private static async createMentionNotifications(
    mentions: any[],
    targetId: string,
    type: string,
    fromUserId: string
  ) {
    // Get author data for notification
    const fromUserDoc = await db.collection("users").doc(fromUserId).get();
    const fromUserData = fromUserDoc.data();

    const notifications = mentions.map((mention) => ({
      userId: mention.userId,
      type: "mention",
      fromUserId,
      fromUserName: fromUserData?.name || "Usuário",
      fromUserAvatar: fromUserData?.profile?.avatar,
      targetId,
      targetType: type,
      message: `${fromUserData?.name || "Usuário"} mencionou você em ${
        type === "question" ? "uma pergunta" : "uma resposta"
      }`,
      createdAt: new Date(),
      read: false,
    }));

    const batch = db.batch();
    notifications.forEach((notification) => {
      const notificationRef = db.collection("notifications").doc();
      batch.set(notificationRef, notification);
    });

    await batch.commit();
  }

  private static async createAnswerNotification(authorId: string, questionId: string, answerId: string, fromUserId: string) {
  // Get author data
  const fromUserDoc = await db.collection('users').doc(fromUserId).get();
  const fromUserData = fromUserDoc.data();

  // Get question title
  const questionDoc = await db.collection('questions').doc(questionId).get();
  const questionData = questionDoc.data();

  await db.collection('notifications').add({
    userId: authorId,
    type: 'answer',
    fromUserId,
    fromUserName: fromUserData?.name || 'Usuário',
    fromUserAvatar: fromUserData?.profile?.avatar,
    targetId: questionId,
    answerId,
    targetType: 'question',
    message: `${fromUserData?.name || 'Usuário'} respondeu sua pergunta: "${questionData?.title}"`,
    createdAt: new Date(),
    read: false
  });
}

}
