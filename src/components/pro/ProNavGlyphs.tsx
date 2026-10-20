import React from "react";
import { CalendarDays, Users } from "lucide-react";

// Release 3 · NV1: the professional bar's Clients and Calendar glyphs. Idle is
// lucide (users, calendar-days) at 24 / 1.6 in the idle ink; active is the
// handover's filled state (icons/custom nav-clients-on, nav-calendar-on,
// source/lucide-icon.js), its body copied literally: the shape fills with the
// accent and the inner lines turn white.

export interface ProNavGlyphProps {
  active: boolean;
  size?: number;
  color: string;
  style?: React.CSSProperties;
}

const SW = 1.6;

export const ClientsNavGlyph: React.FC<ProNavGlyphProps> = ({ active, size = 24, color, style }) =>
  active ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" style={{ color, ...style }} aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2Z" fill="currentColor" />
      <circle cx="9" cy="7" r="4" fill="currentColor" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ) : (
    <Users size={size} strokeWidth={SW} style={{ color, ...style }} aria-hidden />
  );

export const CalendarNavGlyph: React.FC<ProNavGlyphProps> = ({ active, size = 24, color, style }) =>
  active ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" style={{ color, ...style }} aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" fill="currentColor" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" stroke="#FFFFFF" />
      <g stroke="#FFFFFF" strokeWidth={2}>
        <path d="M8 14h.01" />
        <path d="M12 14h.01" />
        <path d="M16 14h.01" />
        <path d="M8 18h.01" />
        <path d="M12 18h.01" />
        <path d="M16 18h.01" />
      </g>
    </svg>
  ) : (
    <CalendarDays size={size} strokeWidth={SW} style={{ color, ...style }} aria-hidden />
  );
