// A decorative QR-style grid.
//
// NOT A SCANNABLE CODE, and it never was. The cells are a deterministic
// pseudo-random pattern seeded by whatever string it is handed, so the same
// seed always draws the same square and two different ones look different.
// Nothing encodes anything and nothing redeems it.
//
// IT LIVES HERE BECAUSE ITS OLD HOME IS GONE. It used to sit in
// GymDetailSheet, beside the prototype purchase flow that has been removed
// along with gym passes — but the two real business screens that draw a
// member-facing code, BusinessGymTab and BusinessClassesTab, still use it for
// the placeholder they show their own operators. Leaving it in a deleted file
// was not an option and putting it in one of those two tabs would have made
// the other import across features.
//
// When a real code exists — a redeemable token from a booking or a
// membership, checked server-side — this is what it replaces, and the callers
// should stop passing a made-up seed at the same time.
export function QrPattern({ seed, className = "w-32 h-32" }: { seed: string; className?: string }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const cells = Array.from({ length: 100 }, () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return (h >> 16) % 3 === 0;
  });
  return (
    <div className={`grid grid-cols-10 gap-0.5 bg-white p-2 rounded-xl shrink-0 ${className}`}>
      {cells.map((filled, i) => (
        <div key={i} className={filled ? "bg-charcoal" : "bg-white"} />
      ))}
    </div>
  );
}

export default QrPattern;
