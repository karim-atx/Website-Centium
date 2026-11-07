import React from "react";
import { useIsWeb } from "./useWebLayout";

// Professional handover v1, 7.3 "Mobile wording on web": where a shared
// component tells you to tap, the web layout (from 1024px) says click. Mobile
// copy is unchanged. "Bigger tap targets" is a setting name and stays.

/** The mobile text below 1024px, the web text from 1024px. */
export const WebCopy: React.FC<{ mobile: string; web: string }> = ({ mobile, web }) => <>{useIsWeb() ? web : mobile}</>;
