import { createElement, type ComponentType } from "react";
import { useIsWeb } from "./useWebLayout";

/**
 * Website viewport v1: a route component that renders its web layout from
 * 1024px wide and the unchanged mobile component below it. The mobile
 * component is the same import as before, so nothing under 1024 changes.
 */
export function withWeb<P extends object>(Mobile: ComponentType<P>, Web: ComponentType<P>): ComponentType<P> {
  const Responsive = (props: P) => createElement(useIsWeb() ? Web : Mobile, props);
  Responsive.displayName = `withWeb(${Mobile.displayName ?? Mobile.name ?? "Page"})`;
  return Responsive;
}
