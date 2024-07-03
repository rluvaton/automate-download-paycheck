import prettyMilliseconds from "pretty-ms";

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function getDuration(startTimeInMs: number): string {
  return prettyMilliseconds(Date.now() - startTimeInMs);
}

