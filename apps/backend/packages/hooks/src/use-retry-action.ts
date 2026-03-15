"use client";

import { useState } from "react";

export function useRetryAction<TArgs extends unknown[]>(
  action: (...args: TArgs) => Promise<void>
) {
  const [isRetrying, setIsRetrying] = useState(false);

  async function retry(...args: TArgs) {
    setIsRetrying(true);

    try {
      await action(...args);
    } finally {
      setIsRetrying(false);
    }
  }

  return {
    isRetrying,
    retry
  };
}
