import React from "react";

/**
 * Professional web viewport v1: the client and patient page cards at their
 * web sizes, the reference files' own `t` values (WP-CL Client Web v4 for
 * Full coaching; WP-CL Nutrition Client Web and WP-CO Patient Web, which
 * share one `t`, for Nutrition and Clinical overview). Only the web tab grid
 * provides it; null (the default) renders every primitive exactly as on
 * mobile.
 */
export interface ClientWebSizes {
  secFs: number; secL: number; secLs: string; secC: string | null; secPb: number; secMb: number; secR: number;
  cardPad: string;
  listPad: string; rowPad: string; rowMin: number; tile: number; tileR: number; tileIc: number; rT: number; rTl: number; rM: number; rMl: number; chev: number;
  chipFs: number; chipPad: string;
  numPad: string; numL: number; numLl: number; numV: number; numVl: number | null; numMt: number; numS: number; numSl: number;
  shH: number; shPx: number; shFs: number; shIc: number; shGap: number;
  softPad: string; softIc: number; softFs: number; softL: string;
}

/** WP-CL Client Web v4 (Full coaching): one set at both widths. */
export const FC_WEB_SIZES: ClientWebSizes = {
  secFs: 13, secL: 20, secLs: "0.08em", secC: null, secPb: 8, secMb: 12, secR: 15,
  cardPad: "20px 24px",
  listPad: "0 20px", rowPad: "10px 0", rowMin: 60, tile: 44, tileR: 12, tileIc: 20, rT: 15, rTl: 22, rM: 13, rMl: 20, chev: 16,
  chipFs: 13, chipPad: "3px 10px",
  numPad: "16px 20px", numL: 13, numLl: 20, numV: 28, numVl: null, numMt: 6, numS: 13, numSl: 20,
  shH: 32, shPx: 12, shFs: 13, shIc: 16, shGap: 8,
  softPad: "14px 16px", softIc: 16, softFs: 13, softL: "20px",
};

/** WP-CL Nutrition Client Web and WP-CO Patient Web, with their rail values. */
export const webSizes3 = (rail: boolean): ClientWebSizes => ({
  secFs: 13, secL: 20, secLs: "0.08em", secC: "#7D67D9", secPb: 8, secMb: 12, secR: 13,
  cardPad: rail ? "14px 20px" : "16px 24px",
  listPad: "0 20px", rowPad: "10px 0", rowMin: 56, tile: 40, tileR: 12, tileIc: 20, rT: 15, rTl: 24, rM: 13, rMl: 20, chev: 16,
  chipFs: 12, chipPad: "2px 10px",
  numPad: rail ? "10px 16px" : "10px 20px", numL: 13, numLl: 20, numV: rail ? 24 : 26, numVl: 32, numMt: 4, numS: 13, numSl: 20,
  shH: 32, shPx: 12, shFs: 13, shIc: 14, shGap: 8,
  softPad: "12px 16px", softIc: 16, softFs: 15, softL: "24px",
});

export const ClientWebSizeContext = React.createContext<ClientWebSizes | null>(null);
export const useClientWebSizes = () => React.useContext(ClientWebSizeContext);
