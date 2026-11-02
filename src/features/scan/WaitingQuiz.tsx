import { Check } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import type { QuizAnswers } from '@/shared/audit/contracts';
import type { QuizKey } from '@/shared/audit/quiz';
import { GOAL_PHRASE, QUIZ } from '@/shared/audit/quiz';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Overline } from '@/shared/ui/Overline';

/** How long a quiz answer stays highlighted before the next question replaces it. */
const ADVANCE_MS = 350;

/**
 * Four quick questions to fill the scan. Picking an answer holds it highlighted for a beat, then moves
 * on; any question can be skipped. The answers tailor the report, so once they're in the card says so
 * and offers a redo.
 */
export function WaitingQuiz({
  answers,
  onAnswer,
  onReset,
}: {
  answers: QuizAnswers;
  onAnswer: (key: QuizKey, value: string) => void;
  onReset: () => void;
}) {
  // After a reload, pick up at the first unanswered question.
  const [index, setIndex] = useState(() => {
    const next = QUIZ.findIndex((question) => !answers[question.key]);
    return next === -1 ? QUIZ.length : next;
  });
  const advanceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const titleId = useId();

  useEffect(() => () => clearTimeout(advanceRef.current), []);

  const question = QUIZ[index];

  // Any pending advance is cancelled first, so a skip straight after a pick can't move on twice.
  const advance = () => {
    clearTimeout(advanceRef.current);
    setIndex((current) => current + 1);
  };

  const pick = (option: string) => {
    if (!question) return;
    onAnswer(question.key, option);
    clearTimeout(advanceRef.current);
    advanceRef.current = setTimeout(advance, ADVANCE_MS);
  };

  const redo = () => {
    clearTimeout(advanceRef.current);
    onReset();
    setIndex(0);
  };

  return (
    <Card className="flex shrink-0 flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <Overline tone="accent">
          {question ? `While you wait · ${index + 1} of ${QUIZ.length}` : 'While you wait'}
        </Overline>
        <div aria-hidden="true" className="flex gap-1">
          {QUIZ.map((item, i) => (
            <span
              key={item.key}
              className={cn(
                'h-1 w-5 rounded-[2px] transition-colors duration-[120ms] ease-out',
                answers[item.key] || i < index
                  ? 'bg-primary-900'
                  : i === index
                    ? 'bg-primary-300'
                    : 'bg-neutral-200',
              )}
            />
          ))}
        </div>
      </div>

      {question ? (
        <>
          <p
            id={titleId}
            className="font-serif text-xl leading-[26px] font-semibold text-pretty text-primary-900"
          >
            {question.title}
          </p>
          <div
            role="group"
            aria-labelledby={titleId}
            className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2"
          >
            {question.options.map((option) => {
              const chosen = answers[question.key] === option;
              return (
                <Button
                  key={option}
                  variant={chosen ? 'default' : 'outline'}
                  aria-pressed={chosen}
                  onClick={() => pick(option)}
                  // 44px to tap on a phone; wraps rather than clipping a long answer.
                  className="h-auto min-h-11 w-full py-2 whitespace-normal sm:min-h-9"
                >
                  {option}
                </Button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] leading-[19px] text-pretty text-muted-foreground">
              {question.hint}
            </span>
            <Button variant="ghost" size="sm" onClick={advance}>
              Skip
            </Button>
          </div>
        </>
      ) : (
        <div className="flex animate-pop items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check aria-hidden="true" className="size-4" />
          </span>
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="font-serif text-lg leading-6 font-semibold text-primary-900">
              All set. Your report is tailored to you.
            </span>
            <span className="text-[13px] leading-[19px] text-muted-foreground">
              {answers.goal
                ? `We’ll lead with what gets you more ${GOAL_PHRASE[answers.goal]}.`
                : 'Your answers shape what we show first.'}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={redo}>
            Redo
          </Button>
        </div>
      )}
    </Card>
  );
}
