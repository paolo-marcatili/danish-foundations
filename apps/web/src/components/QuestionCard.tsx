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
  onContinue?: () => void;
  onAudioStarted?: () => void;
  onAudioReplayCompleted?: (durationMs: number) => void;
  audioHasStarted?: boolean;
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
  onContinue,
  onAudioStarted,
  onAudioReplayCompleted,
  audioHasStarted = false
}: QuestionCardProps) {
  const showTimer = mode === "fight" && timerSeconds > 0;
  const showAudioButton = question.activity_type === "listen_and_choose";
  const isTapOrder = question.variant === "sentence_tap_order";
  const [selectedChips, setSelectedChips] = useState<AnswerOption[]>([]);
  const [audioStarted, setAudioStarted] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const expectedAnswerLength = question.expected_answer_length ?? question.options.length;
  const tapOrderReady = selectedChips.length === expectedAnswerLength;

  useEffect(() => {
    setSelectedChips([]);
    setAudioPlaying(false);
    setAudioStarted(question.activity_type !== "listen_and_choose" || audioHasStarted);
  }, [question.id, question.activity_type, audioHasStarted]);

  function handleChipTap(option: AnswerOption) {
    if (
      disabled
      || !isTapOrder
      || selectedChips.length >= expectedAnswerLength
      || selectedChips.some((chip) => chip.id === option.id)
    ) return;
    setSelectedChips((previous) => [...previous, option]);
  }

  function removeSelectedChip(optionId: string) {
    if (disabled) return;
    setSelectedChips((previous) => previous.filter((chip) => chip.id !== optionId));
  }

  function submitTapOrder() {
    if (disabled || !tapOrderReady) return;
    onAnswer(selectedChips.map((chip) => chip.label).join(" "));
  }

  function playQuestionAudio() {
    if (audioPlaying) return;
    void unlockAudio();
    const wasReadyForAnswer = audioStarted;
    const playbackStartedAt = performance.now();
    setAudioPlaying(true);
    void playLearningAudio(question.audio, question.target_audio_text, question.target_audio_lang ?? "hy-AM").then((played) => {
      setAudioPlaying(false);
      if (played && !wasReadyForAnswer) {
        setAudioStarted(true);
        onAudioStarted?.();
      } else if (played && wasReadyForAnswer) {
        onAudioReplayCompleted?.(Math.max(0, performance.now() - playbackStartedAt));
      }
    });
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
          active={!disabled && audioStarted && !audioPlaying}
          resetKey={`${question.id}:${audioStarted ? "started" : "waiting"}`}
          label={audioStarted ? t(language, "speedBonus") : t(language, "listenToStartBonus")}
        />
      ) : null}

      {showAudioButton ? (
        <button type="button" className="audio-button" disabled={audioPlaying} onClick={playQuestionAudio}>
          {question.activity_type === "repeat_after_me" ? t(language, "listenAndRepeat") : t(language, "listen")}
        </button>
      ) : null}

      <div className={question.kind === "letter" ? "prompt letter-prompt" : "prompt"} lang="hy">
        <FitText text={question.prompt} lang="hy" maxRem={question.kind === "letter" ? 5.6 : 3.2} minRem={question.kind === "letter" ? 2.1 : 1.05} />
      </div>
      <p className="prompt-hint">{getPromptHint(question, language)}</p>

      {isTapOrder ? (
        <div className="tap-order-area">
          <div className="tap-order-answer" lang="hy" aria-live="polite">
            {selectedChips.length > 0 ? (
              <div className="tap-order-selected-list">
                {selectedChips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className="tap-order-selected-chip"
                    disabled={disabled}
                    onClick={() => removeSelectedChip(chip.id)}
                    title={t(language, "removeWord")}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            ) : t(language, "tapWordsInOrder")}
          </div>
          <div className="tap-order-count">
            {t(language, "wordsSelected", { selected: selectedChips.length, total: expectedAnswerLength })}
          </div>
          <div className="answer-grid word-chip-grid">
            {question.options.map((option) => {
              const used = selectedChips.some((chip) => chip.id === option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`answer-button word-chip${used ? " chip-used" : ""}`}
                  disabled={disabled || used || selectedChips.length >= expectedAnswerLength}
                  onClick={() => handleChipTap(option)}
                >
                  <FitText text={option.label} lang="hy" maxRem={1.02} minRem={0.62} />
                </button>
              );
            })}
          </div>
          {!disabled ? (
            <div className="tap-order-actions">
              <button
                type="button"
                className="ghost-button compact-button"
                disabled={selectedChips.length === 0}
                onClick={() => setSelectedChips((previous) => previous.slice(0, -1))}
              >
                {t(language, "undoWord")}
              </button>
              <button
                type="button"
                className="ghost-button compact-button"
                disabled={selectedChips.length === 0}
                onClick={() => setSelectedChips([])}
              >
                {t(language, "resetOrder")}
              </button>
              <button
                type="button"
                className="primary-button compact-button tap-order-check"
                disabled={!tapOrderReady}
                onClick={submitTapOrder}
              >
                {t(language, "checkAnswer")}
              </button>
            </div>
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
          {question.answer_explanation ? (
            <div className="answer-explanation">
              <div className="answer-explanation-target" lang="hy">{question.answer_explanation.target}</div>
              {question.answer_explanation.transliteration ? (
                <div className="answer-explanation-row">
                  <span>{t(language, "pronunciationLabel")}</span>
                  <strong>{question.answer_explanation.transliteration}</strong>
                </div>
              ) : null}
              {question.answer_explanation.translation ? (
                <div className="answer-explanation-row">
                  <span>{t(language, "meaningLabel")}</span>
                  <strong>{question.answer_explanation.translation}</strong>
                </div>
              ) : null}
              {question.answer_explanation.word_glosses?.length ? (
                <div className="answer-glosses" aria-label={t(language, "wordByWord") }>
                  {question.answer_explanation.word_glosses.map((gloss) => (
                    <span key={`${gloss.target}:${gloss.translation}`} className="answer-gloss">
                      <b lang="hy">{gloss.target}</b>
                      <span>{gloss.translation}</span>
                    </span>
                  ))}
                </div>
              ) : null}
              {question.target_audio_text ? (
                <button type="button" className="feedback-audio-button" onClick={playQuestionAudio}>
                  🔊 {t(language, "listenAgain")}
                </button>
              ) : null}
            </div>
          ) : null}
          {feedback.statCapReached ? <span>{t(language, "statCapReached")}</span> : null}
          {!feedback.correct && onContinue ? (
            <button type="button" className="primary-button feedback-continue-button" onClick={onContinue}>
              {t(language, "continueButton")}
            </button>
          ) : null}
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
