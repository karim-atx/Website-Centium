import React from "react";

/**
 * Round F: a translated sentence with nodes inside it (a link, a bold email).
 * Pass the t() result with its {name} placeholders still in place, and the
 * node for each: rich(t("Signed in as {email}"), { email: <b>{email}</b> }).
 * The word order comes from the translation, so Arabic can move the node.
 */
export function rich(text: string, nodes: Record<string, React.ReactNode>): React.ReactNode[] {
  return text.split(/(\{\w+\})/).map((piece, i) => {
    const name = /^\{(\w+)\}$/.exec(piece)?.[1];
    return name !== undefined && name in nodes ? <React.Fragment key={i}>{nodes[name]}</React.Fragment> : piece;
  });
}
