import type { BizKind } from "../../components/business-more/kind";
import type { FeatureArea } from "../../services/business-market";
import { t, tn, tx } from "../../i18n/core";

// The MA1 words per business type. Classes = the drawn board (BizMarketV7,
// whose `gym` variant renders Classes vocabulary); Gym and Store = COPY.md's
// per-type map and the OURS strings in BU3_market_nav.md section 5 (members /
// passes; customers / orders).

export interface Vocab {
  subtitle: string;
  spotsTab: string;
  listed: string;
  listedEmpty: string;
  hiddenSub: string;
  hideBody: string;
  bannerBody: string;
  strengthEmpty: string;
  catTitle: string;
  photoTip: string;
  promosEmpty: string;
  offersEmpty: string;
  audienceNew: string;
  statLabel: string;
  featureTitle: string;
  featureArea: FeatureArea;
  areaLabel: string;
  whatError: string;
  previewSection: (name: string) => string;
  perfLabels: [string, string, string];
  funnelTitle: string;
  funnelSub: string;
  stages: string[];
  chartTitle: string;
  chartSub: string;
  chartModes: [string, string];
  topTitle: string;
  newTitle: string;
  emptyFunnel: string;
  /** English noun for the shared listing sentences (services/business-market/listingLogic), which are still English. */
  people: string;
  /** English plural of the done step, for the same shared sentences. */
  doneWord: string;
  emptyBio: string;
  /** "New … see it on your card (and class pages)". */
  newSee: string;
  newSeeClasses: string;
  chartPlaceholder: string;
  perWeek: [string, string];
  bySource: string;
  doneCount: (n: number) => string;
  noneYet: string;
}

export function vocabOf(kind: BizKind): Vocab {
  if (kind === "gym")
    return {
      subtitle: t("How people find and join you"),
      spotsTab: t("Day passes"),
      listed: t("People can find you and buy a pass"),
      listedEmpty: t("Visible, but people see very little yet"),
      hiddenSub: t("Turn it on to be found and joined"),
      hideBody: t("New members won't find you or buy a pass. Members keep their passes. You can turn it back on any time."),
      bannerBody: t("People can't find you or buy a pass until you turn your listing on."),
      strengthEmpty: t("People see very little yet. Start with a logo, photos and your address."),
      catTitle: t("Activities"),
      photoTip: t("Show your real space in good light, in landscape. Add at least 6: the floor, equipment, changing rooms and the front desk."),
      promosEmpty: t("Promote a day pass or an intro week to reach new people on Explore."),
      offersEmpty: t("Offers you create in Front desk appear here to show on your listing."),
      audienceNew: t("New members only"),
      statLabel: t("Passes"),
      featureTitle: t('Top of "Gyms near you"'),
      featureArea: "gyms",
      areaLabel: t("Gyms near you"),
      whatError: t("Pick a pass or offer to promote."),
      previewSection: (name) => t("Passes from {name}", { name }),
      perfLabels: [t("Listing views"), t("Profile taps"), t("Day passes")],
      funnelTitle: t("From seen to a visit"),
      funnelSub: t("Where people find you, and where they drop off before a visit."),
      stages: [t("Seen in results"), t("Profile opened"), t("Bought a pass"), t("Joined")],
      chartTitle: t("Views and passes"),
      chartSub: t("Are more people finding you each week, and buying a pass?"),
      chartModes: [t("Views"), t("Passes")],
      topTitle: t("Top passes from Centium"),
      newTitle: t("Joined after a pass"),
      emptyFunnel: t("No views yet. People start finding you once your listing is complete."),
      people: "people",
      doneWord: "passes",
      emptyBio: t("Add a short description so people know what you're about."),
      newSee: t("New people see it on your card. You can turn it off any time."),
      newSeeClasses: t("New people see it on your card and class pages. You can turn it off any time."),
      chartPlaceholder: t("Views and passes start once your listing is seen."),
      perWeek: [t("Views per week"), t("Passes per week")],
      bySource: t("Seen in results by source"),
      doneCount: (n) => tn(n, "{n} pass", "{n} passes"),
      noneYet: t("No passes from Centium yet."),
    };
  if (kind === "store")
    return {
      subtitle: t("How customers find and buy from you"),
      spotsTab: t("Available"),
      listed: t("Customers can find you and buy"),
      listedEmpty: t("Visible, but customers see very little yet"),
      hiddenSub: t("Turn it on to be found and bought from"),
      hideBody: t("New customers won't find you or order. Open orders still go ahead. You can turn it back on any time."),
      bannerBody: t("Customers can't find you or order until you turn your listing on."),
      strengthEmpty: t("Customers see very little yet. Start with a logo, photos and your address."),
      catTitle: t("Item categories"),
      photoTip: t("Show your shop and products in good light, in landscape. Add at least 6: the shop front, shelves, the counter and your best sellers."),
      promosEmpty: t("Promote a product or a first-order offer to reach new customers on Explore."),
      offersEmpty: t("Add an offer to show it on your listing."),
      audienceNew: t("New customers only"),
      statLabel: t("Orders"),
      featureTitle: t('Top of "Shops near you"'),
      featureArea: "shops",
      areaLabel: t("Shops near you"),
      whatError: t("Pick a product or offer to promote."),
      previewSection: (name) => t("Products from {name}", { name }),
      perfLabels: [t("Listing views"), t("Profile taps"), t("Orders")],
      funnelTitle: t("From seen to ordered"),
      funnelSub: t("Where customers find you, and where they drop off before ordering."),
      stages: [t("Seen in results"), t("Profile opened"), t("Ordered")],
      chartTitle: t("Views and orders"),
      chartSub: t("Are more customers finding you each week, and ordering?"),
      chartModes: [t("Views"), t("Orders")],
      topTitle: t("Top items from Centium"),
      newTitle: t("New customers from Centium"),
      emptyFunnel: t("No views yet. Customers start finding you once your listing is complete."),
      people: "customers",
      doneWord: "orders",
      emptyBio: t("Add a short description so customers know what you're about."),
      newSee: t("New customers see it on your card. You can turn it off any time."),
      newSeeClasses: t("New customers see it on your card and class pages. You can turn it off any time."),
      chartPlaceholder: t("Views and orders start once your listing is seen."),
      perWeek: [t("Views per week"), t("Orders per week")],
      bySource: t("Seen in results by source"),
      doneCount: (n) => tn(n, "{n} order", "{n} orders"),
      noneYet: t("No orders from Centium yet."),
    };
  return {
    subtitle: t("How clients find and book you"),
    spotsTab: t("Open spots"),
    listed: t("Clients can find you and book"),
    listedEmpty: t("Visible, but clients see very little yet"),
    hiddenSub: t("Turn it on to be found and booked"),
    hideBody: t("New clients won't find you or book your classes. Members keep their bookings. You can turn it back on any time."),
    bannerBody: t("Clients can't find you or book your classes until you turn your listing on."),
    strengthEmpty: t("Clients see very little yet. Start with a logo, photos and your address."),
    catTitle: t("Activities"),
    photoTip: t("Show your real space in good light, in landscape. Add at least 6: the studio, the equipment, the changing rooms and the front desk."),
    promosEmpty: t("Promote a quiet class or an intro offer to reach new clients on Explore."),
    offersEmpty: t("Offers you create in Schedule appear here to show on your listing."),
    audienceNew: t("New clients only"),
    statLabel: t("Bookings"),
    featureTitle: t('Top of "Classes near you"'),
    featureArea: "classes",
    areaLabel: t("Classes near you"),
    whatError: t("Pick a class or offer to promote."),
    previewSection: (name) => t("Classes from {name}", { name }),
    perfLabels: [t("Listing views"), t("Profile taps"), t("Bookings")],
    funnelTitle: t("From seen to booked"),
    funnelSub: t("Where clients find you, and where they drop off before booking."),
    stages: [t("Seen in results"), t("Profile opened"), tx("Booked", "funnel step")],
    chartTitle: t("Views and bookings"),
    chartSub: t("Are more clients finding you each week, and booking?"),
    chartModes: [t("Views"), t("Bookings")],
    topTitle: t("Top classes from Centium"),
    newTitle: t("New clients from Centium"),
    emptyFunnel: t("No views yet. Clients start finding you once your listing is complete."),
    people: "clients",
    doneWord: "bookings",
    emptyBio: t("Add a short description so clients know what you're about."),
    newSee: t("New clients see it on your card. You can turn it off any time."),
    newSeeClasses: t("New clients see it on your card and class pages. You can turn it off any time."),
    chartPlaceholder: t("Views and bookings start once your listing is seen."),
    perWeek: [t("Views per week"), t("Bookings per week")],
    bySource: t("Seen in results by source"),
    doneCount: (n) => tn(n, "{n} booking", "{n} bookings"),
    noneYet: t("No bookings from Centium yet."),
  };
}
