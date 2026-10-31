import type { BizKind } from "../../../components/business-more/kind";
import { t } from "../../../i18n/core";
import { BILLING_HELP_STEPS, BILLING_HELP_TITLE } from "../../../services/legal/billingHelp";
import { REFUND_POLICY_LABEL, REFUND_POLICY_PATH } from "../../../marketing/legal/refund";

// MO1B-050 to -070 · the business Help centre content. Source:
// LEGAL_AND_HELP.md "Help centre" (the first article of each topic) and
// OURS-MO1B-help-articles (the 27 drafts for "(article to write)"), with the
// rewordings the frame checks call for (MO1B-054 "Edit profile", -056
// "Operations, then Classes", -058 title, -060 before Whish). Bundled with
// the app: it works offline and is searched on the device.
//
// HIDDEN UNTIL THEIR FEATURE SHIPS (an article must only describe screens
// that exist): Failed payments and Invoices and receipts (Whish and receipts,
// B8). Roles and permissions and Approve professionals are live (B6).

export interface HelpArticle {
  id: string;
  title: string;
  steps: string[];
  /** Round F: a page the article points to after its steps (the refund policy). */
  link?: { label: string; href: string };
}

export interface HelpTopic {
  id: string;
  title: string;
  icon: "rocket" | "calendar" | "users" | "wallet" | "team" | "tag" | "chart" | "shield" | "package";
  articles: HelpArticle[];
}

const a = (id: string, title: string, steps: string[]): HelpArticle => ({ id, title, steps });

export function helpTopics(kind: BizKind): HelpTopic[] {
  const store = kind === "store";
  const topics: (HelpTopic | false)[] = [
    {
      id: "start",
      title: t("Getting started"),
      icon: "rocket",
      articles: [
        a("profile", t("Set up your business profile"), [
          t("Open More, then Business Profile."),
          t("Tap the camera on the cover and logo to add photos, then tap Bio and Categories."),
          t("Tap each Contact row to add your phone, email, website and Instagram."),
          t("Changes save as you go. Your profile is live straight away."),
        ]),
        !store &&
          a("first-class", t("Add your first class"), [
            t("Tap Create class on the Dashboard."),
            t("Name the class, pick the day, start and end time."),
            t("Set capacity and who runs it."),
            t("Tap Save. It shows in your schedule and on Explore."),
          ]),
        !store &&
          a("invite-team", t("Invite your team"), [
            t("Open More, then Business ID, and tap Share."),
            t("The professional enters your ID in their app."),
            t("Open More, then Join requests, and tap Approve. Instructors and personal trainers each use a seat."),
          ]),
        a("get-listed", t("Get listed on the marketplace"), [
          store ? t("Open Products, then Listing.") : t("Open Marketplace, then Listing."),
          t("Add photos, opening hours and a short description."),
          t("Turn on Show on Explore. Clients can find you straight away."),
        ]),
      ].filter(Boolean) as HelpArticle[],
    },
    !store && {
      id: "classes",
      title: t("Classes and schedule"),
      icon: "calendar",
      articles: [
        a("create", t("Create and repeat a class"), [
          t("Tap Create class on the Dashboard or in Schedule."),
          t("Pick a class type, name it, and choose the date, start and end time."),
          t("Under Repeat, choose Weekly and the days it runs, then when it ends."),
          t("Set capacity and who runs it, then tap Save. Every session appears in your schedule."),
        ]),
        a("edit-session", t("Edit or cancel a session"), [
          t("Open Schedule and tap the session."),
          t("Tap Edit to change the time or capacity, or Cancel session."),
          t("Clients who booked are told by message."),
        ]),
        a("capacity", t("Set capacity"), [t("Open the class and tap Edit."), t("Change Capacity. You can't go below the number already booked."), t("Tap Save.")]),
        a("instructors", t("Assign instructors and substitutes"), [
          t("Open the class and tap Edit."),
          t("Choose who runs it from your team."),
          t("For one session, tap the session, then Change instructor."),
        ]),
        a("waitlists", t("How waitlists work"), [
          t("When a class is full, clients can join the waitlist."),
          t("If a spot frees up, the first person is offered it and has 30 minutes to accept."),
          t("Waitlist settings in More, then Booking policies, are coming soon."),
        ]),
      ],
    },
    store && {
      id: "orders",
      title: t("Orders and products"),
      icon: "package",
      articles: [
        a("pack", t("Pack and send an order"), [
          t("Open Orders. New orders are under To fulfil."),
          t("Tap an order to see what to pack and where it goes."),
          t("Mark it as ready for pickup or sent when it leaves the store."),
        ]),
        a("add-product", t("Add a product"), [t("Open Products and tap Add product."), t("Add a photo, a name, the price and how many you have."), t("Tap Save. It shows on your listing.")]),
      ],
    },
    {
      id: "members",
      title: kind === "classes" ? t("Clients") : store ? t("Customers") : t("Members"),
      icon: "users",
      articles: [
        !store &&
          a("codes", t("Invite members with a code"), [
            t("Open Analytics, then Members, and tap Create code."),
            t("Hand the code to a new member, or share it in a message."),
            t("When they redeem it, they appear as active straight away."),
          ]),
        !store &&
          a("plans", t("Membership plans"), [
            t("Open Analytics, then Members, then Plans."),
            t("Tap Add plan, set the name, price and how often it renews."),
            t("Members choose a plan when they join."),
          ]),
        !store &&
          a("at-risk", t("Members at risk"), [
            t("A member is at risk when they haven't booked for 21 days (gyms: no visit for 14 days)."),
            t("Open Analytics, then Members, to see who."),
            t("Tap a name to send a message."),
          ]),
        a("message", store ? t("Message a customer") : t("Message a member"), [
          t("Open Messages and tap the pen."),
          store
            ? t("Choose one of your customers. You can only message people who are your members or customers.")
            : t("Choose one of your members. You can only message people who are your members or customers."),
          t("Write your message and send."),
        ]),
      ].filter(Boolean) as HelpArticle[],
    },
    {
      id: "payments",
      title: t("Payments"),
      icon: "wallet",
      articles: [
        a("cash", t("Take cash payments"), [
          t("Open More, then Payment methods, to see the methods you accept."),
          t("Cash is marked as paid at the desk. Whish payments are coming soon."),
          t("Unpaid cash shows in Revenue, then Payments, under Money owed."),
        ]),
        a("owed", t("Money owed"), [
          t("Open Analytics, then Revenue, then Payments."),
          t("Money owed lists unpaid cash and late memberships."),
          t("Tap a name to mark it as paid or send a reminder."),
        ]),
        a("refunds", t("Refunds"), [t("Refunds are between you and your client, under your own policy."), t("Record a cash refund on the payment so your numbers stay right.")]),
      ],
    },
    // Round F (DN, F5): your own Centium plan, as the Refund and Cancellation Policy sets out.
    {
      id: "billing",
      title: t("Billing"),
      icon: "wallet",
      articles: [{ ...a("billing-and-refunds", t(BILLING_HELP_TITLE), BILLING_HELP_STEPS.map((s) => t(s))), link: { label: t(REFUND_POLICY_LABEL), href: REFUND_POLICY_PATH } }],
    },
    !store && {
      id: "team",
      title: t("Team"),
      icon: "team",
      articles: [
        a("seats", t("How seat blocks work"), [
          t("Each seat block lets 5 professionals join your business."),
          t("Instructors and personal trainers use a seat, including the existing team you add for free. Professionals you hire through Centium don't use one."),
          t("Professionals use your business ID to ask to join, and you approve each request."),
          t("When every seat is used, approving another request asks you to add a block."),
        ]),
        a("business-id", t("Your business ID"), [
          t("Your business ID is a short code professionals use to ask to join."),
          t("Find it in More, then Business Profile, under Listing."),
          t("Tap Copy or Share."),
        ]),
        a("roles", t("Roles and permissions"), [
          t("Open More, then Roles and permissions, and tap a person."),
          t("Pick their role: Instructor, Personal trainer, Front desk, Manager or Staff."),
          t("Under What they can do, turn each permission on or off. Revenue is never on by default: only you can give it."),
        ]),
        a("approve", t("Approve professionals"), [
          t("Open More, then Join requests."),
          t("Check their details, then tap Approve or Deny."),
          t("They join your team once they accept. Instructors and personal trainers use a free seat."),
        ]),
      ],
    },
    {
      id: "market",
      title: t("Marketplace"),
      icon: "tag",
      articles: [
        a("strength", t("Improve your listing strength"), [
          store ? t("Open Products, then Listing, and expand Listing strength.") : t("Open Marketplace, then Listing, and expand Listing strength."),
          t("Each missing item is listed. Tap one to fix it."),
          t("Listings with at least 6 real photos and opening hours get the most profile opens."),
        ]),
        a("photos", t("Photos that work"), [
          t("Use real photos of your space, in daylight if you can."),
          t("Add at least 6."),
          t("Put your best photo first. It's the one clients see in search."),
        ]),
        !store &&
          a("open-spots", t("Open spots"), [
            t("Open Marketplace, then Open spots."),
            t("Spots left in your upcoming classes show here."),
            t("Promote a class with spots to fill it."),
          ]),
        a("promotions", t("Promotions"), [
          store ? t("Open Products, then Promotions, and tap New promotion.") : t("Open Marketplace, then Promotions, and tap New promotion."),
          t("Choose the offer and the dates."),
          t("It shows as a badge on your listing."),
        ]),
        a("featured", t("Featured placement"), [
          t("Feature your listing for a week to show it first in Explore."),
          t("Featured listings are labelled Featured."),
          t("It doesn't change your rating."),
        ]),
      ].filter(Boolean) as HelpArticle[],
    },
    {
      id: "analytics",
      title: t("Analytics"),
      icon: "chart",
      articles: [
        !store &&
          a("fill-rate", t("What fill rate means"), [
            t("Fill rate is booked spots divided by total spots in your classes this week."),
            t("70% is the target line. Classes under it are marked so you can promote or move them."),
            t("Bookings count when a client books, not when they turn up."),
          ]),
        a("members-numbers", store ? t("Customer numbers explained") : t("Members numbers explained"), [
          store ? t("Customers is everyone who has ordered from you.") : t("Members is everyone with an active membership."),
          store ? t("New customers ordered for the first time in the dates you picked.") : t("New members joined in the dates you picked."),
          t("Trends appear after two weeks of data."),
        ]),
        a("revenue-numbers", t("Revenue numbers explained"), [
          t("Revenue is money marked as paid in the dates you picked."),
          t("Recurring each month is what active plans bring in."),
          t("Money owed and failed payments are not in revenue until paid."),
        ]),
        a("reputation-numbers", t("Reputation numbers explained"), [
          t("Your rating is the average of all stars, to one decimal."),
          t("It shows once you have 3 reviews."),
          t("Reply rate is the share of reviews you've answered."),
        ]),
      ].filter(Boolean) as HelpArticle[],
    },
    {
      id: "security",
      title: t("Account and security"),
      icon: "shield",
      articles: [
        a("two-factor", t("Turn on two-factor authentication"), [
          t("Open Settings, then Two-factor authentication, and turn on Authenticator app."),
          t("Scan the code with your authenticator app, or copy the setup key."),
          t("Enter the 6-digit code it shows, then save your recovery codes somewhere safe."),
        ]),
        a("recovery", t("Recovery codes"), [
          t("Recovery codes let you sign in if you lose your phone. Each works once."),
          t("Find them in Settings, then Two-factor authentication."),
          t("Make new ones if you've used most of them."),
        ]),
        a("delete", t("Delete your business account"), [
          t("Open Settings and tap Delete business account."),
          t("Your business is deleted after 30 days."),
          t("Sign in before then and choose Cancel deletion to keep it."),
        ]),
      ],
    },
  ];
  return topics.filter(Boolean) as HelpTopic[];
}

/** "2 min read": 200 words a minute, at least 1 (MO1B-056 OURS). */
export function readMinutes(article: HelpArticle): number {
  const words = article.steps.join(" ").split(/\s+/).filter(Boolean).length + article.title.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function searchHelp(topics: HelpTopic[], q: string): { topic: HelpTopic; article: HelpArticle }[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return topics.flatMap((topic) =>
    topic.articles
      .filter((ar) => ar.title.toLowerCase().includes(needle) || ar.steps.some((s) => s.toLowerCase().includes(needle)))
      .map((article) => ({ topic, article }))
  );
}
