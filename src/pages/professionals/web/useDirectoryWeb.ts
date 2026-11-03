import { useEffect, useMemo, useState } from "react";
import type { Enums } from "../../../../lib/supabase/database.types";
import { fetchPublicDirectory, type DirectoryListing } from "../../../services/directory";
import { fetchLinkedProfessionals } from "../../../services/consent";
import { fetchConnectedProfessional, type ConnectedProfessional } from "../../../services/connected-professional";
import { fetchRankedDirectory, type DirectoryHit } from "../../../services/pro-profile";
import { locationPermission, requestPosition, savedArea, type Coords } from "../../../services/geo";
import { countryNear, countryOfArea } from "../../../services/geo/country";
import { abroadLabel, arrangeDirectory, deviceDistance, DEFAULT_RADIUS_KM, serverSort, type DirectorySort, type WhereChoice } from "../directoryFilterModel";

// Website viewport v1, WC-PR Professionals: the directory's data, as the
// mobile Professionals page reads it (same services, same rules): the live
// directory (directory_professionals), the ranked directory
// (professionals_ranked, once there is a point: the saved area, else the
// position when location is ALREADY allowed), the linked professional
// (active_professional_clients) and their summary.
//
// The web page's list and profile are two routes (/app/professionals and
// /app/professionals/:id), so the first click on a card mounts the page again:
// the directory read (counted per hour, EG) is kept here for a minute, so
// that click does not read it twice. A retry always reads it again.

type Subtype = Enums<"professional_subtype">;

let directoryMemo: { listings: DirectoryListing[]; at: number } | null = null;
const MEMO_MS = 60_000;
const freshDirectory = (): DirectoryListing[] | null => (directoryMemo && Date.now() - directoryMemo.at < MEMO_MS ? directoryMemo.listings : null);

export interface DirectoryWeb {
  listings: DirectoryListing[] | null;
  directoryError: boolean;
  retry: () => void;
  ranked: DirectoryHit[] | null;
  /** The ranked hits, measured on the device, cut to the Distance choice and sorted (directoryFilterModel). */
  shownHits: (DirectoryHit & { distanceKm: number | null; abroad: string | null })[];
  linkedId: string | null;
  linkedDetail: ConnectedProfessional | null;
  linkedError: string | null;
  /** Re-reads one listing into the list (after a review changes its aggregate). */
  patchListing: (l: DirectoryListing) => void;
}

export function useDirectoryWeb(opts: { type: Subtype | null; maxKm: number | null; sort: DirectorySort; where: WhereChoice; anyCountry: boolean }): DirectoryWeb {
  const { type, maxKm, sort, where, anyCountry } = opts;

  const [listings, setListings] = useState<DirectoryListing[] | null>(freshDirectory);
  const [directoryError, setDirectoryError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (reload === 0 && freshDirectory()) return;
    let cancelled = false;
    void fetchPublicDirectory().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setDirectoryError(true);
        setListings((prev) => prev ?? []);
        return;
      }
      directoryMemo = { listings: result.listings, at: Date.now() };
      setDirectoryError(false);
      setListings(result.listings);
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  // The linked professional (the relationship, then its summary).
  const [linkedId, setLinkedId] = useState<string | null>(null);
  const [linkedDetail, setLinkedDetail] = useState<ConnectedProfessional | null>(null);
  const [linkedError, setLinkedError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchLinkedProfessionals().then((result) => {
      if (cancelled || result.status !== "ok") return;
      const id = result.professionals[0]?.professionalId ?? null;
      setLinkedId(id);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!linkedId) return;
    let cancelled = false;
    void fetchConnectedProfessional(linkedId).then((detail) => {
      if (cancelled) return;
      if (!detail.ok) setLinkedError(detail.message);
      else setLinkedDetail(detail.professional);
    });
    return () => {
      cancelled = true;
    };
  }, [linkedId]);

  // The ranked directory: a failed, offline or pointless answer keeps the live list (the quiet state).
  const [ranked, setRanked] = useState<DirectoryHit[] | null>(null);
  const [point, setPoint] = useState<Coords | null>(null);
  const [searcherCountry, setSearcherCountry] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      const area = savedArea();
      let at: Coords | null = area ? { lat: area.lat, lng: area.lng } : null;
      if (!at && (await locationPermission()) === "granted") {
        const p = await requestPosition();
        if (p.ok) at = p.coords;
      }
      if (!at || !live) return;
      const countryCode = area ? countryOfArea(area) : countryNear(at);
      setPoint(at);
      setSearcherCountry(countryCode);
      const r = await fetchRankedDirectory({ point: at, subtype: type, radiusKm: maxKm ?? DEFAULT_RADIUS_KM, sort: serverSort(sort), countryCode, anyCountry });
      if (live) setRanked(r.ok ? r.value : null);
    })();
    return () => {
      live = false;
    };
  }, [type, maxKm, sort, anyCountry]);

  const shownHits = useMemo(
    () =>
      arrangeDirectory(
        (ranked ?? []).map((h) => ({ ...h, distanceKm: deviceDistance(point, h), abroad: abroadLabel(h.countryCode, searcherCountry, anyCountry) })),
        maxKm,
        sort,
        where,
      ),
    [ranked, point, searcherCountry, anyCountry, maxKm, sort, where],
  );

  return {
    listings,
    directoryError,
    retry: () => {
      setDirectoryError(false);
      setListings((prev) => (prev && prev.length > 0 ? prev : null));
      setReload((n) => n + 1);
    },
    ranked,
    shownHits,
    linkedId,
    linkedDetail,
    linkedError,
    patchListing: (l) => {
      setListings((prev) => {
        const next = prev ? prev.map((x) => (x.profileId === l.profileId ? l : x)) : prev;
        if (next && directoryMemo) directoryMemo = { listings: next, at: directoryMemo.at };
        return next;
      });
    },
  };
}
