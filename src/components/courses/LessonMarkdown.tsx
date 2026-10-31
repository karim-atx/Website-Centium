import React, { useMemo } from "react";
import { parseMarkdown, type Block, type Inline } from "../../services/courses/markdown";

// Round D: a lesson's limited Markdown as React elements (the token tree from
// services/courses/markdown). Text only ever reaches the page as React text
// children, so nothing in a body can become markup. Links open in a new tab
// with rel="noopener noreferrer", and only http(s) links exist at all.
//
// Colours come from the surrounding text (the learner's forum colours or the
// builder's ink); `linkColour` sets the links'.

function inlines(nodes: readonly Inline[], linkColour: string | undefined, key = ""): React.ReactNode[] {
  return nodes.map((n, i) => {
    const k = `${key}${i}`;
    switch (n.t) {
      case "text":
        return <React.Fragment key={k}>{n.v}</React.Fragment>;
      case "br":
        return <br key={k} />;
      case "strong":
        return <strong key={k} className="font-bold">{inlines(n.c, linkColour, `${k}.`)}</strong>;
      case "em":
        return <em key={k}>{inlines(n.c, linkColour, `${k}.`)}</em>;
      case "link":
        return (
          <a key={k} href={n.href} target="_blank" rel="noopener noreferrer" className="underline font-semibold [overflow-wrap:anywhere]" style={{ color: linkColour }}>
            {inlines(n.c, linkColour, `${k}.`)}
          </a>
        );
    }
  });
}

function block(b: Block, i: number, linkColour: string | undefined): React.ReactNode {
  switch (b.t) {
    case "heading": {
      const size = b.level === 1 ? "1.25em" : b.level === 2 ? "1.12em" : "1em";
      const Tag = b.level === 1 ? "h2" : b.level === 2 ? "h3" : "h4";
      return (
        <Tag key={i} className="m-0 font-extrabold leading-[1.3]" style={{ fontSize: size }}>
          {inlines(b.c, linkColour)}
        </Tag>
      );
    }
    case "p":
      return (
        <p key={i} className="m-0">
          {inlines(b.c, linkColour)}
        </p>
      );
    case "ul":
      return (
        <ul key={i} className="m-0 ps-5 list-disc flex flex-col gap-1">
          {b.items.map((it, j) => (
            <li key={j}>{inlines(it, linkColour)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={i} start={b.start} className="m-0 ps-5 list-decimal flex flex-col gap-1">
          {b.items.map((it, j) => (
            <li key={j}>{inlines(it, linkColour)}</li>
          ))}
        </ol>
      );
  }
}

export const LessonMarkdown: React.FC<{ text: string | null | undefined; linkColour?: string; className?: string; style?: React.CSSProperties }> = ({ text, linkColour, className, style }) => {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  if (blocks.length === 0) return null;
  return (
    <div className={`flex flex-col gap-2.5 [overflow-wrap:anywhere] ${className ?? ""}`} style={style}>
      {blocks.map((b, i) => block(b, i, linkColour))}
    </div>
  );
};
