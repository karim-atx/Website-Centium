// The landing page's reviews (section 07 "In their words"), in ONE place.
//
// PLACEHOLDER CONTENT. Every review below is a SAMPLE from the design
// handover (prototype "Centium Site v29.dc.html", the eight reviews it
// renders). None of these people are real customers. Karim replaces them
// with real reviews before launch.
//
// HOW TO EDIT
// - Change a review: edit its fields below. Nothing else needs to change.
// - Add a review: copy one entry, paste it where it should appear in the row,
//   and fill in the five fields.
// - Remove a review: delete its entry.
// The row is built from this list alone, in this order, and works with any
// number of reviews from 3 upwards (the layout repeats the list as often as
// the screen needs, so a short list never leaves a gap). Keep at least 3.
//
// THE FIELDS
// - quote: the review itself, as it should read. One or two short sentences
//   read best; the card grows to fit a longer one.
// - name: the reviewer's name as they agreed to have it shown.
// - role: one or two words under the name, e.g. "Client", "Coach",
//   "Gym owner", "Physiotherapist".
// - rating: a whole number of stars from 1 to 5.
// - initials: one or two letters for the round badge, usually the initials of
//   the name ("Nour Saab" -> "NS").
// The badge and star colours alternate lavender and teal down the list on
// their own; there is nothing to set.

export interface Review {
  quote: string;
  name: string;
  role: string;
  /** Whole stars, 1 to 5. */
  rating: 1 | 2 | 3 | 4 | 5;
  /** One or two letters for the badge. */
  initials: string;
}

export const REVIEWS: Review[] = [
  {
    quote: "My food, training and heart rate finally live in one place.",
    name: "Nour Saab",
    role: "Client",
    rating: 5,
    initials: "NS",
  },
  {
    quote: "I see what my clients log without asking for screenshots.",
    name: "Maya Aoun",
    role: "Coach",
    rating: 5,
    initials: "MA",
  },
  {
    quote: "Bookings, waitlists and check-ins on one screen at the front desk.",
    name: "Rita Haddad",
    role: "Gym owner",
    rating: 5,
    initials: "RH",
  },
  {
    quote: "Logging breakfast by voice takes me seconds.",
    name: "Georges Karam",
    role: "Client",
    rating: 5,
    initials: "GK",
  },
  {
    quote: "Shared plans update on their side the moment I change them.",
    name: "Karim Nassar",
    role: "Coach",
    rating: 5,
    initials: "KN",
  },
  {
    quote: "Seeing my lab results next to their ranges made them make sense.",
    name: "Yasmina Chahine",
    role: "Client",
    rating: 5,
    initials: "YC",
  },
  {
    quote: "Our classes and memberships went digital without a second app.",
    name: "Elie Frem",
    role: "Gym owner",
    rating: 5,
    initials: "EF",
  },
  {
    quote: "Messages and calls sit next to the plan, so nothing gets lost.",
    name: "Dana Azar",
    role: "Physiotherapist",
    rating: 5,
    initials: "DA",
  },
];
