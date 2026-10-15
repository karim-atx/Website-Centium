import type { BizKind } from "../../components/business-more/kind";
import type { FeatureArea } from "../../services/business-market";

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
  people: string;
}

export function vocabOf(kind: BizKind): Vocab {
  if (kind === "gym")
    return {
      subtitle: "How people find and join you",
      spotsTab: "Day passes",
      listed: "People can find you and buy a pass",
      listedEmpty: "Visible, but people see very little yet",
      hiddenSub: "Turn it on to be found and joined",
      hideBody: "New members won't find you or buy a pass. Members keep their passes. You can turn it back on any time.",
      bannerBody: "People can't find you or buy a pass until you turn your listing on.",
      strengthEmpty: "People see very little yet. Start with a logo, photos and your address.",
      catTitle: "Activities",
      photoTip: "Show your real space in good light, in landscape. Add at least 6: the floor, equipment, changing rooms and the front desk.",
      promosEmpty: "Promote a day pass or an intro week to reach new people on Explore.",
      offersEmpty: "Offers you create in Front desk appear here to show on your listing.",
      audienceNew: "New members only",
      statLabel: "Passes",
      featureTitle: 'Top of "Gyms near you"',
      featureArea: "gyms",
      areaLabel: "Gyms near you",
      whatError: "Pick a pass or offer to promote.",
      previewSection: (n) => `Passes from ${n}`,
      perfLabels: ["Listing views", "Profile taps", "Day passes"],
      funnelTitle: "From seen to a visit",
      funnelSub: "Where people find you, and where they drop off before a visit.",
      stages: ["Seen in results", "Profile opened", "Bought a pass", "Joined"],
      chartTitle: "Views and passes",
      chartSub: "Are more people finding you each week, and buying a pass?",
      chartModes: ["Views", "Passes"],
      topTitle: "Top passes from Centium",
      newTitle: "Joined after a pass",
      emptyFunnel: "No views yet. People start finding you once your listing is complete.",
      people: "people",
    };
  if (kind === "store")
    return {
      subtitle: "How customers find and buy from you",
      spotsTab: "Available",
      listed: "Customers can find you and buy",
      listedEmpty: "Visible, but customers see very little yet",
      hiddenSub: "Turn it on to be found and bought from",
      hideBody: "New customers won't find you or order. Open orders still go ahead. You can turn it back on any time.",
      bannerBody: "Customers can't find you or order until you turn your listing on.",
      strengthEmpty: "Customers see very little yet. Start with a logo, photos and your address.",
      catTitle: "Item categories",
      photoTip: "Show your shop and products in good light, in landscape. Add at least 6: the shop front, shelves, the counter and your best sellers.",
      promosEmpty: "Promote a product or a first-order offer to reach new customers on Explore.",
      offersEmpty: "Add an offer to show it on your listing.",
      audienceNew: "New customers only",
      statLabel: "Orders",
      featureTitle: 'Top of "Shops near you"',
      featureArea: "shops",
      areaLabel: "Shops near you",
      whatError: "Pick a product or offer to promote.",
      previewSection: (n) => `Products from ${n}`,
      perfLabels: ["Listing views", "Profile taps", "Orders"],
      funnelTitle: "From seen to ordered",
      funnelSub: "Where customers find you, and where they drop off before ordering.",
      stages: ["Seen in results", "Profile opened", "Ordered"],
      chartTitle: "Views and orders",
      chartSub: "Are more customers finding you each week, and ordering?",
      chartModes: ["Views", "Orders"],
      topTitle: "Top items from Centium",
      newTitle: "New customers from Centium",
      emptyFunnel: "No views yet. Customers start finding you once your listing is complete.",
      people: "customers",
    };
  return {
    subtitle: "How clients find and book you",
    spotsTab: "Open spots",
    listed: "Clients can find you and book",
    listedEmpty: "Visible, but clients see very little yet",
    hiddenSub: "Turn it on to be found and booked",
    hideBody: "New clients won't find you or book your classes. Members keep their bookings. You can turn it back on any time.",
    bannerBody: "Clients can't find you or book your classes until you turn your listing on.",
    strengthEmpty: "Clients see very little yet. Start with a logo, photos and your address.",
    catTitle: "Activities",
    photoTip: "Show your real space in good light, in landscape. Add at least 6: the studio, the equipment, the changing rooms and the front desk.",
    promosEmpty: "Promote a quiet class or an intro offer to reach new clients on Explore.",
    offersEmpty: "Offers you create in Schedule appear here to show on your listing.",
    audienceNew: "New clients only",
    statLabel: "Bookings",
    featureTitle: 'Top of "Classes near you"',
    featureArea: "classes",
    areaLabel: "Classes near you",
    whatError: "Pick a class or offer to promote.",
    previewSection: (n) => `Classes from ${n}`,
    perfLabels: ["Listing views", "Profile taps", "Bookings"],
    funnelTitle: "From seen to booked",
    funnelSub: "Where clients find you, and where they drop off before booking.",
    stages: ["Seen in results", "Profile opened", "Booked"],
    chartTitle: "Views and bookings",
    chartSub: "Are more clients finding you each week, and booking?",
    chartModes: ["Views", "Bookings"],
    topTitle: "Top classes from Centium",
    newTitle: "New clients from Centium",
    emptyFunnel: "No views yet. Clients start finding you once your listing is complete.",
    people: "clients",
  };
}
