import { Fragment } from "react";

/**
 * Renders text so lines only wrap at its spaces. Burmese has no spaces between
 * words and browsers break it mid-word; our copy puts a space between phrases,
 * so each phrase stays whole. Harmless for English (each word is a phrase).
 */
export function Phrases({ text }: { text: string }) {
  return text.split(" ").map((p, i) => (
    <Fragment key={i}>
      {i ? " " : null}
      <span className="whitespace-nowrap">{p}</span>
    </Fragment>
  ));
}
