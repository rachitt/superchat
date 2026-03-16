import type {
  GameConfig,
  GameState,
  GamePlayerData,
  TriviaState,
  TriviaQuestion,
  TriviaConfig,
} from "@superchat/shared";
import type { GameEngine, GameActionResult } from "./base.js";
import { randomUUID } from "crypto";

const SAMPLE_QUESTIONS: Omit<TriviaQuestion, "id">[] = [
  { question: "What programming language was created by Brendan Eich in 1995?", options: ["Java", "JavaScript", "Python", "C++"], correctIndex: 1, category: "tech" },
  { question: "What does HTML stand for?", options: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyper Transfer Markup Language", "Home Tool Markup Language"], correctIndex: 0, category: "tech" },
  { question: "Which planet is known as the Red Planet?", options: ["Venus", "Jupiter", "Mars", "Saturn"], correctIndex: 2, category: "science" },
  { question: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correctIndex: 3, category: "geography" },
  { question: "Who painted the Mona Lisa?", options: ["Van Gogh", "Da Vinci", "Picasso", "Rembrandt"], correctIndex: 1, category: "art" },
  { question: "What year did the World Wide Web become publicly available?", options: ["1989", "1991", "1993", "1995"], correctIndex: 1, category: "tech" },
  { question: "What is the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], correctIndex: 2, category: "science" },
  { question: "Which data structure uses LIFO?", options: ["Queue", "Stack", "Array", "Linked List"], correctIndex: 1, category: "tech" },
  { question: "What is the capital of Japan?", options: ["Osaka", "Kyoto", "Tokyo", "Nagoya"], correctIndex: 2, category: "geography" },
  { question: "What does CSS stand for?", options: ["Computer Style Sheets", "Cascading Style Sheets", "Creative Style System", "Colorful Style Sheets"], correctIndex: 1, category: "tech" },
  { question: "Which animal is the largest living land animal?", options: ["Rhinoceros", "Hippopotamus", "African Elephant", "Giraffe"], correctIndex: 2, category: "science" },
  { question: "In what year was the first iPhone released?", options: ["2005", "2006", "2007", "2008"], correctIndex: 2, category: "tech" },
];

function generateQuestions(count: number, category?: string): TriviaQuestion[] {
  let pool = SAMPLE_QUESTIONS;
  if (category) {
    const filtered = pool.filter((q) => q.category === category);
    if (filtered.length > 0) pool = filtered;
  }
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  while (selected.length < count) {
    selected.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return selected.map((q) => ({ ...q, id: randomUUID() }));
}

export const triviaEngine: GameEngine = {
  minPlayers: 1,
  maxPlayers: 20,

  initState(config: GameConfig, _players: GamePlayerData[]): GameState {
    const c = config as TriviaConfig & { type: "trivia" };
    const questions = generateQuestions(c.questionCount, c.category);
    const scores: Record<string, number> = {};
    _players.forEach((p) => (scores[p.userId] = 0));
    return {
      type: "trivia",
      currentQuestionIndex: 0,
      questions,
      answers: {},
      scores,
      phase: "question",
      questionStartedAt: new Date().toISOString(),
    };
  },

  handleAction(
    state: GameState,
    playerId: string,
    action: string,
    data: Record<string, unknown>,
    players: GamePlayerData[]
  ): GameActionResult {
    const s = state as TriviaState & { type: "trivia" };

    if (action === "answer" && s.phase === "question") {
      const answerIndex = data.answerIndex as number;
      if (typeof answerIndex !== "number" || answerIndex < 0 || answerIndex > 3) {
        return { state, finished: false };
      }
      if (s.answers[playerId] !== undefined) {
        return { state, finished: false };
      }

      const newAnswers = { ...s.answers, [playerId]: String(answerIndex) };
      const allAnswered = players.every((p) => newAnswers[p.userId] !== undefined);

      if (allAnswered) {
        // Score this question
        const currentQ = s.questions[s.currentQuestionIndex];
        const newScores = { ...s.scores };
        for (const p of players) {
          const ans = newAnswers[p.userId];
          if (ans !== undefined && Number(ans) === currentQ.correctIndex) {
            newScores[p.userId] = (newScores[p.userId] || 0) + 100;
          }
        }

        // Show reveal briefly, then check if more questions
        const nextIndex = s.currentQuestionIndex + 1;
        if (nextIndex >= s.questions.length) {
          // Game over
          return {
            state: { ...s, answers: newAnswers, scores: newScores, phase: "finished" },
            finished: true,
          };
        }

        // Move to next question
        return {
          state: {
            ...s,
            currentQuestionIndex: nextIndex,
            answers: {},
            scores: newScores,
            phase: "question",
            questionStartedAt: new Date().toISOString(),
          },
          finished: false,
        };
      }

      return { state: { ...s, answers: newAnswers }, finished: false };
    }

    return { state, finished: false };
  },

  handleTimeout(state: GameState, players: GamePlayerData[]): GameActionResult {
    return { state, finished: false };
  },
};
