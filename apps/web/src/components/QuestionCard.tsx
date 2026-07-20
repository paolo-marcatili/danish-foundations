import { useEffect, useState } from "react";
import type { AnswerOption, TrainingQuestion } from "@hero-lang/learning-engine";
import { playLearningAudio, unlockAudio } from "../audio";
import { t } from "../i18n";
import { QuestionTimer } from "./QuestionTimer";
import { FitText } from "./FitText";

interface QuestionCardProps {
  question: TrainingQuestion;
  language: string;
  disabled: boolean;
  mode: "training" | "fight";
  index: number;
  total: number;
  timerSeconds?: number;
  feedback?: {
    correct: boolean;
    timedOut?: boolean;
    correctAnswer: string;
    selectedOptionId?: string;
    correctOptionId?: string;
    statCapReached?: boolean;
    damage?: number;
    energyLoss?: number;
    absorbedDamage?: number;
    combatLabelKey?: string;
  } | null;
  onAnswer: (selectedOptionId: string) => void;
  onTimeout?: () => void;
}

export function QuestionCard({
  question,
  language,
  disabled,
  mode,
  index,
  total,
  timerSeconds = 10,
  feedback,
  onAnswer,
  onTimeout
}: QuestionCardProps) {
  const showTimer = mode === "fight" && onTimeout;
  const showAudioButton = question.activity_type === "listen_and_choose";
  const isTapOrder = question.variant === "sentence_tap_order";
  const [selectedChips, setSelectedChips] = useState<AnswerOption[]>([]);

  useEffect(() => {
    setSelectedChips([]);
  }, [question.id]);

  function handleChipTap(option: AnswerOption) {
    if (disabled || !isTapOrder || selectedChips.some((chip) => chip.id === option.id)) return;
    const next = [...selectedChips, option];
    setSelectedChips(next);
    if (next.length === question.options.length) {
      onAnswer(next.map((chip) => chip.label).join(" "));
    }
  }

  return (
    <section className="question-card" aria-label={mode === "fight" ? t(language, "fightTitle") : t(language, "training")}>
      <div className="question-header">
        <span>
          {t(language, "question")} {index + 1} {t(language, "of")} {total}
        </span>
        <span>{t(language, question.skill)}</span>
      </div>

      {showTimer ? (
        <QuestionTimer
          durationSeconds={timerSeconds}
          active={!disabled}
          resetKey={question.id}
          onExpire={onTimeout}
          label={t(language, "timer")}
        />
      ) : null}

      {showAudioButton ? (
        <button
          type="button"
          className="audio-button"
          onClick={() => {
            void unlockAudio();
            void playLearningAudio(question.audio, question.target_audio_text, question.target_audio_lang ?? "hy-AM");
          }}
        >
          {question.activity_type === "repeat_after_me" ? t(language, "listenAndRepeat") : t(language, "listen")}
        </button>
      ) : null}

      <div className={question.kind === "letter" ? "prompt letter-prompt" : "prompt"} lang="hy">
        <FitText text={question.prompt} lang="hy" maxRem={question.kind === "letter" ? 5.6 : 3.2} minRem={question.kind === "letter" ? 2.1 : 1.05} />
      </div>
      <p className="prompt-hint">{getPromptHint(question, language)}</p>

      {isTapOrder ? (
        <div className="tap-order-area">
          <div className="tap-order-answer" lang="hy">
            {selectedChips.length > 0 ? selectedChips.map((chip) => chip.label).join(" ") : t(language, "tapWordsInOrder")}
          </div>
          <div className="answer-grid word-chip-grid">
            {question.options.map((option) => {
              const used = selectedChips.some((chip) => chip.id === option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`answer-button word-chip${used ? " chip-used" : ""}`}
                  disabled={disabled || used}
                  onClick={() => handleChipTap(option)}
                >
                  <FitText text={option.label} lang="hy" maxRem={1.02} minRem={0.62} />
                </button>
              );
            })}
          </div>
          {!disabled && selectedChips.length > 0 ? (
            <button type="button" className="ghost-button compact-button" onClick={() => setSelectedChips([])}>
              {t(language, "resetOrder")}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="answer-grid">
          {question.options.map((option) => {
            const isCorrect = feedback?.correctOptionId === option.id;
            const isSelectedWrong = Boolean(feedback && !feedback.correct && feedback.selectedOptionId === option.id);
            const answerClass = `answer-button${option.is_hard_distractor ? " hard-option" : ""}${isCorrect ? " answer-correct" : ""}${isSelectedWrong ? " answer-wrong" : ""}`;
            return (
              <button
                key={option.id}
                type="button"
                className={answerClass}
                disabled={disabled}
                onClick={() => onAnswer(option.id)}
              >
                <FitText text={option.label} lang={/^[\u0530-\u058F]/.test(option.label) ? "hy" : undefined} maxRem={1.02} minRem={0.62} />
              </button>
            );
          })}
        </div>
      )}

      {feedback ? (
        <div className={`inline-feedback ${feedback.correct ? "correct" : "incorrect"}`}>
          <strong>{feedback.timedOut ? t(language, "timeout") : feedback.correct ? t(language, "correct") : t(language, "wrong")}</strong>
          {!feedback.correct ? <span>{t(language, "answerIs")}: {feedback.correctAnswer}</span> : <span>{feedback.correctAnswer}</span>}
          {feedback.statCapReached ? <span>{t(language, "statCapReached")}</span> : null}
        </div>
      ) : null}
    </section>
  );
}

function getPromptHint(question: TrainingQuestion, language: string): string {
  if (question.prompt_hint) return question.prompt_hint;
  if (question.kind === "letter") return t(language, "letterHint");
  if (question.activity_type === "listen_and_choose") return t(language, "comprehensionHint");
  if (question.activity_type === "transliteration_match" || question.activity_type === "syllable_order") return t(language, "pronunciationHint");
  if (question.activity_type === "sentence_order") return t(language, "grammarHint");
  if (question.item?.transliteration) return `${t(language, "sayItLike")}: ${question.item.transliteration}`;
  return t(language, "chooseMeaning");
}
