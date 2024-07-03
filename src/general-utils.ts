import prettyMilliseconds from "pretty-ms";

export function getDuration(startTimeInMs: number): string {
  return prettyMilliseconds(Date.now() - startTimeInMs);
}

