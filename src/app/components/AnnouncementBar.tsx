"use client";

export default function AnnouncementBar() {
  return (
    <div className="relative w-full overflow-hidden bg-[#f5f0e8] border-b border-black/[0.06]">
      <div className="flex whitespace-nowrap py-2.5">
        <div className="flex animate-marquee gap-0 items-center">
          {[...Array(3)].map((_, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-0 text-[11px] md:text-xs tracking-[0.2em] text-black/70 uppercase font-medium mx-6"
            >
              <span>Eid Offer &mdash; 10% OFF</span>
              <span className="w-1 h-1 rounded-full bg-black/20 mx-6" />
              <span>2 Tees &mdash; 900 EGP</span>
              <span className="w-1 h-1 rounded-full bg-black/20 mx-6" />
              <span>3 Tees &mdash; 1,250 EGP</span>
              <span className="w-1 h-1 rounded-full bg-black/20 mx-6" />
              <span>4 Tees &mdash; 1,500 EGP</span>
              <span className="w-1 h-1 rounded-full bg-black/20 mx-6" />
              <span>Free Delivery Over 1,000 EGP</span>
              <span className="w-1 h-1 rounded-full bg-black/20 mx-6" />
              <span>Premium Oversized Essentials</span>
              <span className="w-1 h-1 rounded-full bg-black/20 mx-6" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
