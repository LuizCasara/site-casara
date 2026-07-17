"use client";

import { QUIZ_LIMITS, type QuizQuestionDraft } from "@/lib/quiz";

type Props = {
  question: QuizQuestionDraft;
  index: number;
  onChange: (index: number, question: QuizQuestionDraft) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
};

const DEFAULT_TIME_LIMIT = 20;

export default function QuestionBuilder({ question, index, onChange, onRemove, canRemove }: Props) {
  function updatePrompt(prompt: string) {
    onChange(index, { ...question, prompt });
  }

  function updateOption(optIndex: number, text: string) {
    const options = [...question.options];
    options[optIndex] = text;
    onChange(index, { ...question, options });
  }

  function addOption() {
    if (question.options.length >= QUIZ_LIMITS.OPTIONS_MAX) return;
    onChange(index, { ...question, options: [...question.options, ""] });
  }

  function removeOption(optIndex: number) {
    if (question.options.length <= QUIZ_LIMITS.OPTIONS_MIN) return;
    const options = question.options.filter((_, i) => i !== optIndex);
    let correctOptionIndex = question.correctOptionIndex;
    if (optIndex === correctOptionIndex) correctOptionIndex = 0;
    else if (optIndex < correctOptionIndex) correctOptionIndex -= 1;
    onChange(index, { ...question, options, correctOptionIndex });
  }

  function setCorrect(optIndex: number) {
    onChange(index, { ...question, correctOptionIndex: optIndex });
  }

  function toggleTimer(enabled: boolean) {
    onChange(index, { ...question, timeLimitSeconds: enabled ? DEFAULT_TIME_LIMIT : null });
  }

  function setTimeLimit(seconds: number) {
    onChange(index, { ...question, timeLimitSeconds: seconds });
  }

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-500">Pergunta {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-red-500 text-sm hover:underline"
          >
            Remover
          </button>
        )}
      </div>

      <input
        type="text"
        value={question.prompt}
        onChange={(e) => updatePrompt(e.target.value)}
        maxLength={QUIZ_LIMITS.PROMPT_MAX}
        placeholder="Digite a pergunta"
        className="w-full p-3 text-gray-800 border rounded-md"
      />

      <div className="space-y-2">
        {question.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${index}`}
              checked={question.correctOptionIndex === i}
              onChange={() => setCorrect(i)}
              title="Marcar como resposta certa"
            />
            <input
              type="text"
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              maxLength={QUIZ_LIMITS.OPTION_MAX_LEN}
              placeholder={`Opção ${i + 1}`}
              className="flex-1 p-2 text-sm text-gray-800 border rounded-md"
            />
            {question.options.length > QUIZ_LIMITS.OPTIONS_MIN && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="text-gray-400 hover:text-red-500 px-1"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {question.options.length < QUIZ_LIMITS.OPTIONS_MAX && (
          <button type="button" onClick={addOption} className="text-sm text-green-600 hover:underline">
            + adicionar opção
          </button>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <input
          type="checkbox"
          checked={question.timeLimitSeconds !== null}
          onChange={(e) => toggleTimer(e.target.checked)}
        />
        Tempo limite
        {question.timeLimitSeconds !== null && (
          <>
            <input
              type="number"
              min={QUIZ_LIMITS.TIME_LIMIT_MIN_SECONDS}
              max={QUIZ_LIMITS.TIME_LIMIT_MAX_SECONDS}
              value={question.timeLimitSeconds}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              className="w-20 p-1 text-gray-800 border rounded-md"
            />
            <span>segundos</span>
          </>
        )}
      </label>
    </div>
  );
}
