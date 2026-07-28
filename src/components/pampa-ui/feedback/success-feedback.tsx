'use client';

import { useEffect } from 'react';
import { CircleCheck } from 'lucide-react';

type SuccessFeedbackProps = {
  message: string | null;
  onDismiss: () => void;
  duration?: number;
};

function SuccessFeedback({ message, onDismiss, duration = 5000 }: SuccessFeedbackProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timeout);
  }, [duration, message, onDismiss]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-success shadow-lg"
    >
      <CircleCheck className="size-5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export { SuccessFeedback };
export type { SuccessFeedbackProps };
