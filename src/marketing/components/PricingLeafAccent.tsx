import React from "react";

const LEAF_PATH =
  "M 924.1 543.4 L 915.6 549.5 L 905.6 555.7 L 894 561.9 L 878.6 568.1 L 859.3 574.2 L 830 580.4 L 796.8 586.6 L 768.2 592.8 L 748.1 598.9 L 731.9 605.1 L 718.8 611.3 L 708 617.5 L 698.7 623.6 L 690.2 629.8 L 682.5 636 L 675.5 642.2 L 669.4 648.3 L 664 654.5 L 658.6 660.7 L 653.9 666.9 L 650.1 673.1 L 645.4 679.2 L 641.6 685.4 L 637.7 691.6 L 634.6 697.8 L 631.5 703.9 L 628.5 710.1 L 626.1 716.3 L 623.8 722.5 L 621.5 728.6 L 619.2 734.8 L 617.6 741 L 615.3 747.2 L 613.8 753.3 L 612.2 759.5 L 611.5 765.7 L 609.9 771.9 L 609.2 778 L 608.4 784.2 L 607.6 790.4 L 681.7 796.6 L 671.7 802.8 L 661.7 808.9 L 651.6 815.1 L 643.1 821.3 L 634.6 827.5 L 626.1 833.6 L 618.4 839.8 L 611.5 846 L 603.8 852.2 L 596.8 858.3 L 589.9 864.5 L 582.9 870.7 L 576.7 876.9 L 569.8 883 L 607.6 887.7 L 637.7 887.7 L 684.8 883 L 713.4 876.9 L 734.2 870.7 L 751.2 864.5 L 765.1 858.3 L 778.2 852.2 L 789 846 L 799.1 839.8 L 808.3 833.6 L 816.8 827.5 L 824.5 821.3 L 832.3 815.1 L 839.2 808.9 L 845.4 802.8 L 851.6 796.6 L 857.7 790.4 L 863.2 784.2 L 867.8 778 L 872.4 771.9 L 877 765.7 L 881.7 759.5 L 885.5 753.3 L 889.4 747.2 L 893.3 741 L 896.3 734.8 L 899.4 728.6 L 902.5 722.5 L 905.6 716.3 L 907.9 710.1 L 911 703.9 L 913.3 697.8 L 915.6 691.6 L 917.2 685.4 L 919.5 679.2 L 921.1 673.1 L 922.6 666.9 L 924.1 660.7 L 925.7 654.5 L 927.2 648.3 L 928 642.2 L 929.5 636 L 930.3 629.8 L 931.1 623.6 L 931.9 617.5 L 931.9 611.3 L 932.6 605.1 L 932.6 598.9 L 932.6 592.8 L 931.9 586.6 L 931.9 580.4 L 931.1 574.2 L 930.3 568.1 L 930.3 561.9 L 928.8 555.7 L 928 549.5 L 926.5 543.4 Z M 829.2 668.4 L 826.1 674.6 L 822.2 680.8 L 817.6 686.9 L 813.7 693.1 L 809.1 699.3 L 804.5 705.5 L 799.8 711.7 L 794.4 717.8 L 789 724 L 782.9 730.2 L 776.7 736.4 L 769.7 742.5 L 762.8 748.7 L 755.1 754.9 L 746.6 761.1 L 737.3 767.2 L 727.3 773.4 L 715.7 779.6 L 703.3 785.8 L 691 791.9 L 683.3 795.8 L 656.2 809.3 L 589.5 809.3 L 608.4 795.8 L 613.8 791.9 L 622.3 785.8 L 632.3 779.6 L 643.1 773.4 L 655.5 767.2 L 668.6 761.1 L 684 754.9 L 699.5 748.7 L 714.2 742.5 L 727.3 736.4 L 739.6 730.2 L 751.2 724 L 761.2 717.8 L 771.3 711.7 L 779.8 705.5 L 789 699.3 L 797.5 693.1 L 805.2 686.9 L 813 680.8 L 819.9 674.6 L 826.9 668.4 Z";

const leaves = [
  { left: 31, top: 3, size: 22, rot: 34 },
  { left: 2, top: 30, size: 17, rot: 128 },
  { left: 55, top: 54, size: 19, rot: 52 },
  { left: 30, top: 96, size: 14, rot: 150 },
];

const stalks = ["M20 25 L34 17", "M31 47 L18 42", "M44 71 L58 65", "M58 100 L46 104"];

/** Mirrored leaf-stem accent flanking the pricing heading (v4 landing
 *  handoff) — a teal stem drawn twice (soft underlay + core) with four
 *  leaves growing off it on alternating sides, connected by hairline
 *  stalks. `mirror` flips the whole accent horizontally for the right-hand
 *  gutter, reusing the same markup rather than re-deriving mirrored paths. */
export const PricingLeafAccent: React.FC<{ mirror?: boolean }> = ({ mirror }) => (
  <span
    aria-hidden="true"
    className="absolute top-1/2 pointer-events-none"
    style={
      mirror
        ? { right: 0, transform: "translateY(-50%) scaleX(-1)", display: "block", width: 86, height: 126 }
        : { left: 0, transform: "translateY(-50%)", display: "block", width: 86, height: 126 }
    }
  >
    <svg viewBox="0 0 86 126" fill="none" aria-hidden="true" className="absolute inset-0 w-full h-full">
      <path d="M10 8 C26 26 36 52 46 74 C55 94 66 108 78 118" stroke="#5E9E95" strokeWidth="9" strokeLinecap="round" fill="none" opacity=".22" />
      <path d="M10 8 C26 26 36 52 46 74 C55 94 66 108 78 118" stroke="#5E9E95" strokeWidth="5.2" strokeLinecap="round" fill="none" />
      {stalks.map((d, i) => (
        <path key={i} d={d} stroke="#5E9E95" strokeWidth="2" strokeLinecap="round" opacity=".5" />
      ))}
    </svg>
    {leaves.map((l, i) => (
      <svg
        key={i}
        viewBox="560 520 400 400"
        fill="none"
        aria-hidden="true"
        className="absolute overflow-visible"
        style={{ left: l.left, top: l.top, width: l.size, height: l.size, transform: `rotate(${l.rot}deg)`, transformOrigin: "50% 50%" }}
      >
        <path fillRule="evenodd" fill="#5E9E95" d={LEAF_PATH} />
      </svg>
    ))}
  </span>
);
