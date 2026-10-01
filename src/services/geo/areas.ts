// Cities and areas in Lebanon with an approximate centre point, for choosing
// an area instead of sharing a location (clients) and for setting an
// approximate area (professionals). Centres are approximate by design; the
// map only ever works to about 1 km.

export interface Area {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
}

export const AREAS: Area[] = [
  // Beirut
  { id: "hamra", name: "Hamra", region: "Beirut", lat: 33.896, lng: 35.482 },
  { id: "achrafieh", name: "Achrafieh", region: "Beirut", lat: 33.887, lng: 35.52 },
  { id: "verdun", name: "Verdun", region: "Beirut", lat: 33.884, lng: 35.486 },
  { id: "downtown", name: "Downtown Beirut", region: "Beirut", lat: 33.896, lng: 35.505 },
  { id: "mar-mikhael", name: "Mar Mikhael and Gemmayzeh", region: "Beirut", lat: 33.897, lng: 35.524 },
  { id: "badaro", name: "Badaro", region: "Beirut", lat: 33.875, lng: 35.515 },
  // Mount Lebanon
  { id: "sin-el-fil", name: "Sin el Fil", region: "Mount Lebanon", lat: 33.876, lng: 35.54 },
  { id: "jdeideh", name: "Jdeideh", region: "Mount Lebanon", lat: 33.893, lng: 35.557 },
  { id: "hazmieh", name: "Hazmieh", region: "Mount Lebanon", lat: 33.856, lng: 35.54 },
  { id: "baabda", name: "Baabda", region: "Mount Lebanon", lat: 33.834, lng: 35.544 },
  { id: "antelias", name: "Antelias", region: "Mount Lebanon", lat: 33.917, lng: 35.593 },
  { id: "dbayeh", name: "Dbayeh", region: "Mount Lebanon", lat: 33.937, lng: 35.588 },
  { id: "broummana", name: "Broummana", region: "Mount Lebanon", lat: 33.883, lng: 35.624 },
  { id: "jounieh", name: "Jounieh", region: "Mount Lebanon", lat: 33.981, lng: 35.618 },
  { id: "kaslik", name: "Kaslik", region: "Mount Lebanon", lat: 33.973, lng: 35.613 },
  { id: "byblos", name: "Byblos (Jbeil)", region: "Mount Lebanon", lat: 34.122, lng: 35.651 },
  { id: "aley", name: "Aley", region: "Mount Lebanon", lat: 33.808, lng: 35.598 },
  { id: "choueifat", name: "Choueifat", region: "Mount Lebanon", lat: 33.808, lng: 35.52 },
  { id: "damour", name: "Damour", region: "Mount Lebanon", lat: 33.73, lng: 35.453 },
  // North
  { id: "batroun", name: "Batroun", region: "North", lat: 34.255, lng: 35.658 },
  { id: "chekka", name: "Chekka", region: "North", lat: 34.33, lng: 35.729 },
  { id: "tripoli", name: "Tripoli", region: "North", lat: 34.437, lng: 35.85 },
  { id: "zgharta", name: "Zgharta", region: "North", lat: 34.398, lng: 35.893 },
  { id: "halba", name: "Halba", region: "North", lat: 34.543, lng: 36.08 },
  // South
  { id: "sidon", name: "Sidon (Saida)", region: "South", lat: 33.563, lng: 35.369 },
  { id: "tyre", name: "Tyre (Sour)", region: "South", lat: 33.271, lng: 35.196 },
  { id: "nabatieh", name: "Nabatieh", region: "South", lat: 33.378, lng: 35.484 },
  { id: "jezzine", name: "Jezzine", region: "South", lat: 33.542, lng: 35.585 },
  // Bekaa
  { id: "zahle", name: "Zahle", region: "Bekaa", lat: 33.847, lng: 35.902 },
  { id: "chtaura", name: "Chtaura", region: "Bekaa", lat: 33.818, lng: 35.851 },
  { id: "baalbek", name: "Baalbek", region: "Bekaa", lat: 34.006, lng: 36.211 },
];

export const REGIONS = ["Beirut", "Mount Lebanon", "North", "South", "Bekaa"] as const;

export const areaById = (id: string | null | undefined): Area | undefined => AREAS.find((a) => a.id === id);
