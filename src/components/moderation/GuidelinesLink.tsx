import React from "react";
import { Link } from "react-router-dom";
import { isModerationMessage } from "../../services/moderation/text";
import { t } from "../../i18n/core";

/**
 * " Community guidelines", after a moderation sentence (Round C Release 2:
 * every moderation and image-approval message links to them). Renders
 * nothing after any other message, so an error line can always include it.
 */
export const GuidelinesLink: React.FC<{ message: string | null | undefined }> = ({ message }) =>
  isModerationMessage(message) ? (
    <>
      {" "}
      <Link to="/legal/community-guidelines" className="underline font-semibold" style={{ color: "inherit" }}>
        {t("Community guidelines")}
      </Link>
    </>
  ) : null;
