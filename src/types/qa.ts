// types/qa.ts

export interface Question {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  content: string;
  tags: string[];
  mentions: Mention[];
  reactions: Reaction[];
  answersCount: number;
  viewsCount: number;
  isResolved: boolean;
  acceptedAnswerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Answer {
  id: string;
  questionId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  mentions: Mention[];
  reactions: Reaction[];
  isAccepted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Mention {
  userId: string;
  userName: string;
  startIndex: number;
  endIndex: number;
}

export interface Reaction {
  userId: string;
  type: 'like' | 'helpful' | 'insightful' | 'thanks';
  createdAt: Date;
}

export interface QuestionFilters {
  tags?: string[];
  resolved?: boolean;
  authorId?: string;
  sortBy?: 'recent' | 'popular' | 'unanswered';
  search?: string;
}

export interface CreateQuestionRequest {
  title: string;
  content: string;
  tags: string[];
  mentions: Mention[];
}

export interface CreateAnswerRequest {
  questionId: string;
  content: string;
  mentions: Mention[];
}

export interface ReactionRequest {
  targetId: string; // questionId or answerId
  targetType: 'question' | 'answer';
  reactionType: 'like' | 'helpful' | 'insightful' | 'thanks';
}

// Dados populares para tags
export const POPULAR_TAGS = [
  'sql', 'python', 'r', 'javascript', 'power-bi', 'tableau', 
  'excel', 'machine-learning', 'data-visualization', 'statistics',
  'etl', 'data-cleaning', 'pandas', 'spark', 'aws', 'azure',
  'snowflake', 'databricks', 'airflow', 'docker'
];

export const REACTION_LABELS = {
  like: '👍 Curtir',
  helpful: '🙌 Útil',
  insightful: '💡 Perspicaz',
  thanks: '🙏 Obrigado'
};