import type { BizKind } from "../../../components/business-more/kind";

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
      title: "Getting started",
      icon: "rocket",
      articles: [
        a("profile", "Set up your business profile", [
          "Open More, then Business Profile.",
          "Tap the camera on the cover and logo to add photos, then tap Bio and Categories.",
          "Tap each Contact row to add your phone, email, website and Instagram.",
          "Changes save as you go. Your profile is live straight away.",
        ]),
        !store &&
          a("first-class", "Add your first class", [
            "Tap Create class on the Dashboard.",
            "Name the class, pick the day, start and end time.",
            "Set capacity and who runs it.",
            "Tap Save. It shows in your schedule and on Explore.",
          ]),
        !store &&
          a("invite-team", "Invite your team", [
            "Open More, then Business ID, and tap Share.",
            "The professional enters your ID in their app.",
            "Open More, then Join requests, and tap Approve. Instructors and personal trainers each use a seat.",
          ]),
        a("get-listed", "Get listed on the marketplace", [
          store ? "Open Products, then Listing." : "Open Marketplace, then Listing.",
          "Add photos, opening hours and a short description.",
          "Turn on Show on Explore. Clients can find you straight away.",
        ]),
      ].filter(Boolean) as HelpArticle[],
    },
    !store && {
      id: "classes",
      title: "Classes and schedule",
      icon: "calendar",
      articles: [
        a("create", "Create and repeat a class", [
          "Tap Create class on the Dashboard or in Schedule.",
          "Pick a class type, name it, and choose the date, start and end time.",
          "Under Repeat, choose Weekly and the days it runs, then when it ends.",
          "Set capacity and who runs it, then tap Save. Every session appears in your schedule.",
        ]),
        a("edit-session", "Edit or cancel a session", [
          "Open Schedule and tap the session.",
          "Tap Edit to change the time or capacity, or Cancel session.",
          "Clients who booked are told by message.",
        ]),
        a("capacity", "Set capacity", ["Open the class and tap Edit.", "Change Capacity. You can't go below the number already booked.", "Tap Save."]),
        a("instructors", "Assign instructors and substitutes", [
          "Open the class and tap Edit.",
          "Choose who runs it from your team.",
          "For one session, tap the session, then Change instructor.",
        ]),
        a("waitlists", "How waitlists work", [
          "When a class is full, clients can join the waitlist.",
          "If a spot frees up, the first person is offered it and has 30 minutes to accept.",
          "Waitlist settings in More, then Booking policies, are coming soon.",
        ]),
      ],
    },
    store && {
      id: "orders",
      title: "Orders and products",
      icon: "package",
      articles: [
        a("pack", "Pack and send an order", [
          "Open Orders. New orders are under To fulfil.",
          "Tap an order to see what to pack and where it goes.",
          "Mark it as ready for pickup or sent when it leaves the store.",
        ]),
        a("add-product", "Add a product", ["Open Products and tap Add product.", "Add a photo, a name, the price and how many you have.", "Tap Save. It shows on your listing."]),
      ],
    },
    {
      id: "members",
      title: kind === "classes" ? "Clients" : store ? "Customers" : "Members",
      icon: "users",
      articles: [
        !store &&
          a("codes", "Invite members with a code", [
            "Open Analytics, then Members, and tap Create code.",
            "Hand the code to a new member, or share it in a message.",
            "When they redeem it, they appear as active straight away.",
          ]),
        !store &&
          a("plans", "Membership plans", [
            "Open Analytics, then Members, then Plans.",
            "Tap Add plan, set the name, price and how often it renews.",
            "Members choose a plan when they join.",
          ]),
        !store &&
          a("at-risk", "Members at risk", [
            "A member is at risk when they haven't booked for 21 days (gyms: no visit for 14 days).",
            "Open Analytics, then Members, to see who.",
            "Tap a name to send a message.",
          ]),
        a("message", store ? "Message a customer" : "Message a member", [
          "Open Messages and tap the pen.",
          store
            ? "Choose one of your customers. You can only message people who are your members or customers."
            : "Choose one of your members. You can only message people who are your members or customers.",
          "Write your message and send.",
        ]),
      ].filter(Boolean) as HelpArticle[],
    },
    {
      id: "payments",
      title: "Payments",
      icon: "wallet",
      articles: [
        a("cash", "Take cash payments", [
          "Open More, then Payment methods, to see the methods you accept.",
          "Cash is marked as paid at the desk. Whish payments are coming soon.",
          "Unpaid cash shows in Revenue, then Payments, under Money owed.",
        ]),
        a("owed", "Money owed", [
          "Open Analytics, then Revenue, then Payments.",
          "Money owed lists unpaid cash and late memberships.",
          "Tap a name to mark it as paid or send a reminder.",
        ]),
        a("refunds", "Refunds", ["Refunds are between you and your client, under your own policy.", "Record a cash refund on the payment so your numbers stay right."]),
      ],
    },
    !store && {
      id: "team",
      title: "Team",
      icon: "team",
      articles: [
        a("seats", "How seat blocks work", [
          "Each seat block lets 5 professionals join your business.",
          "Instructors and personal trainers use a seat, including the existing team you add for free. Professionals you hire through Centium don't use one.",
          "Professionals use your business ID to ask to join, and you approve each request.",
          "When every seat is used, approving another request asks you to add a block.",
        ]),
        a("business-id", "Your business ID", [
          "Your business ID is a short code professionals use to ask to join.",
          "Find it in More, then Business Profile, under Listing.",
          "Tap Copy or Share.",
        ]),
        a("roles", "Roles and permissions", [
          "Open More, then Roles and permissions, and tap a person.",
          "Pick their role: Instructor, Personal trainer, Front desk, Manager or Staff.",
          "Under What they can do, turn each permission on or off. Revenue is never on by default: only you can give it.",
        ]),
        a("approve", "Approve professionals", [
          "Open More, then Join requests.",
          "Check their details, then tap Approve or Deny.",
          "They join your team once they accept. Instructors and personal trainers use a free seat.",
        ]),
      ],
    },
    {
      id: "market",
      title: "Marketplace",
      icon: "tag",
      articles: [
        a("strength", "Improve your listing strength", [
          store ? "Open Products, then Listing, and expand Listing strength." : "Open Marketplace, then Listing, and expand Listing strength.",
          "Each missing item is listed. Tap one to fix it.",
          "Listings with at least 6 real photos and opening hours get the most profile opens.",
        ]),
        a("photos", "Photos that work", [
          "Use real photos of your space, in daylight if you can.",
          "Add at least 6.",
          "Put your best photo first. It's the one clients see in search.",
        ]),
        !store &&
          a("open-spots", "Open spots", [
            "Open Marketplace, then Open spots.",
            "Spots left in your upcoming classes show here.",
            "Promote a class with spots to fill it.",
          ]),
        a("promotions", "Promotions", [
          store ? "Open Products, then Promotions, and tap New promotion." : "Open Marketplace, then Promotions, and tap New promotion.",
          "Choose the offer and the dates.",
          "It shows as a badge on your listing.",
        ]),
        a("featured", "Featured placement", [
          "Feature your listing for a week to show it first in Explore.",
          "Featured listings are labelled Featured.",
          "It doesn't change your rating.",
        ]),
      ].filter(Boolean) as HelpArticle[],
    },
    {
      id: "analytics",
      title: "Analytics",
      icon: "chart",
      articles: [
        !store &&
          a("fill-rate", "What fill rate means", [
            "Fill rate is booked spots divided by total spots in your classes this week.",
            "70% is the target line. Classes under it are marked so you can promote or move them.",
            "Bookings count when a client books, not when they turn up.",
          ]),
        a("members-numbers", store ? "Customer numbers explained" : "Members numbers explained", [
          store ? "Customers is everyone who has ordered from you." : "Members is everyone with an active membership.",
          store ? "New customers ordered for the first time in the dates you picked." : "New members joined in the dates you picked.",
          "Trends appear after two weeks of data.",
        ]),
        a("revenue-numbers", "Revenue numbers explained", [
          "Revenue is money marked as paid in the dates you picked.",
          "Recurring each month is what active plans bring in.",
          "Money owed and failed payments are not in revenue until paid.",
        ]),
        a("reputation-numbers", "Reputation numbers explained", [
          "Your rating is the average of all stars, to one decimal.",
          "It shows once you have 3 reviews.",
          "Reply rate is the share of reviews you've answered.",
        ]),
      ].filter(Boolean) as HelpArticle[],
    },
    {
      id: "security",
      title: "Account and security",
      icon: "shield",
      articles: [
        a("two-factor", "Turn on two-factor authentication", [
          "Open Settings, then Two-factor authentication, and turn on Authenticator app.",
          "Scan the code with your authenticator app, or copy the setup key.",
          "Enter the 6-digit code it shows, then save your recovery codes somewhere safe.",
        ]),
        a("recovery", "Recovery codes", [
          "Recovery codes let you sign in if you lose your phone. Each works once.",
          "Find them in Settings, then Two-factor authentication.",
          "Make new ones if you've used most of them.",
        ]),
        a("delete", "Delete your business account", [
          "Open Settings and tap Delete business account.",
          "Your business is deleted after 30 days.",
          "Sign in before then and choose Cancel deletion to keep it.",
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
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return topics.flatMap((topic) =>
    topic.articles
      .filter((ar) => ar.title.toLowerCase().includes(t) || ar.steps.some((s) => s.toLowerCase().includes(t)))
      .map((article) => ({ topic, article }))
  );
}
