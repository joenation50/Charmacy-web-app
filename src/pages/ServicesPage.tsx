import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Layers,
  MapPin,
  Package,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const SERVICES = [
  {
    img: '/images/rider1.jpg',
    alt: 'CharMary Rider',
    badge: 'Same-Day Priority',
    title: 'Express Delivery',
    desc: 'Fast, dedicated point-to-point bike dispatch for urgent errands, legal documents, and time-critical drops across Owerri.',
    highlights: ['Pickup within 20–35 mins', 'Live GPS link shared instantly', 'Direct rider call button'],
  },
  {
    img: '/images/bike1.jpg',
    alt: 'CharMary Delivery Bike',
    badge: 'Protected Cargo',
    title: 'Parcels & Packages',
    desc: 'Documents, retail inventory, electronics, or boxed parcels handled carefully inside weatherproof courier boxes.',
    highlights: ['Waterproof dispatch boxes', '4-digit receiver PIN handoff', 'Fragile item protection'],
  },
  {
    img: '/images/bike2.jpg',
    alt: 'Delivery Bike',
    badge: 'Doorstep Handoff',
    title: 'Door-to-Door Delivery',
    desc: 'Seamless pickup from your shop, office, or home straight to your customer’s doorstep with real-time ETA telemetry.',
    highlights: ['Global coordinate pinning', 'Moving & stopped live updates', 'Pay via transfer or cash'],
  },
];

const ZONES = [
  { name: 'Central Owerri (Wetheral / Douglas / Ikenegbu)', eta: '25 – 40 mins', tier: 'Intra-City Core', base: '₦1,500' },
  { name: 'New Owerri / World Bank / Trans-Egbu', eta: '30 – 50 mins', tier: 'Urban Metro', base: '₦2,000' },
  { name: 'FUTO / Ihiagwa / Nekede / Orji', eta: '40 – 65 mins', tier: 'Extended Hub', base: '₦2,500' },
  { name: 'Obinze / Egbu / Uratta / Custom Pin', eta: '45 – 75 mins', tier: 'Peri-Urban', base: '₦3,000+' },
];

export const ServicesPage: React.FC = () => {
  const [selectedZone, setSelectedZone] = useState(0);
  const [tierMode, setTierMode] = useState<'standard' | 'express'>('express');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg border border-[#FFC107]/30 bg-[#FFC107]/10 px-4 py-2 text-xs font-bold text-[#FFC107] hover:bg-[#FFC107] hover:text-[#0A0A0A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 rounded-xl bg-[#FFC107] text-[#0A0A0A] px-5 py-2.5 text-xs font-extrabold hover:bg-[#F2B705] transition-colors"
        >
          <span>Book a Rider</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-2xl mx-auto space-y-2"
      >
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight">
          Our <span className="text-[#FFC107]">Services</span>
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Built for rapid urban errands, restaurant orders, e-commerce fulfillment, and secure parcel handoff.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-7">
        {SERVICES.map((srv, idx) => (
          <motion.article
            key={srv.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
            whileHover={{ y: -4 }}
            className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#12141a] hover:border-[#FFC107] transition-all shadow-sm flex flex-col"
          >
            <div className="h-60 overflow-hidden bg-neutral-900">
              <img
                src={srv.img}
                alt={srv.alt}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
              <div className="space-y-2">
                <span className="inline-block rounded-md bg-[#FFC107]/15 text-[#FFC107] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                  {srv.badge}
                </span>
                <h2 className="font-display text-2xl font-bold">{srv.title}</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {srv.desc}
                </p>
              </div>
              <ul className="space-y-2 border-t border-neutral-200 dark:border-white/10 pt-4 text-xs text-neutral-600 dark:text-neutral-300">
                {srv.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#FFC107] shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>
        ))}
      </div>

      {/* Interactive Dispatch Zone & Speed Estimator */}
      <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-white/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#FFC107]">
              <Layers className="w-4 h-4" />
              <span>Coverage &amp; SLA Guide</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-black mt-1">
              Estimated Transit Windows
            </h2>
          </div>

          <div className="inline-flex rounded-xl border border-neutral-300 dark:border-white/15 p-1 bg-neutral-100 dark:bg-[#0A0A0A]">
            <button
              type="button"
              onClick={() => setTierMode('express')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                tierMode === 'express'
                  ? 'bg-[#FFC107] text-[#0A0A0A]'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Express Priority
            </button>
            <button
              type="button"
              onClick={() => setTierMode('standard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                tierMode === 'standard'
                  ? 'bg-[#FFC107] text-[#0A0A0A]'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Standard Same-Day
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ZONES.map((z, idx) => {
            const active = selectedZone === idx;
            return (
              <button
                key={z.name}
                type="button"
                onClick={() => setSelectedZone(idx)}
                className={`text-left rounded-xl border p-4 transition-all cursor-pointer ${
                  active
                    ? 'border-[#FFC107] bg-[#FFC107]/10 shadow-sm'
                    : 'border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0A0A0A]/70 hover:border-[#FFC107]/50'
                }`}
              >
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#FFC107]">
                  {z.tier}
                </div>
                <div className="font-bold text-sm mt-1 text-neutral-900 dark:text-white">
                  {z.name}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300 font-mono-tabular">
                  <span>{tierMode === 'express' ? z.eta : 'Same-day batch'}</span>
                  <span className="font-extrabold text-neutral-900 dark:text-white">
                    {z.base}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-50 dark:bg-[#0A0A0A] border border-neutral-200 dark:border-white/10 px-4 py-3 text-xs">
          <span className="text-neutral-600 dark:text-neutral-300">
            Selected zone: <strong className="text-neutral-900 dark:text-white">{ZONES[selectedZone].name}</strong> &middot;{' '}
            {tierMode === 'express' ? 'Direct dedicated bike dispatch' : 'Consolidated same-day route'}
          </span>
          <Link
            to="/contact"
            className="inline-flex items-center gap-1.5 font-extrabold text-[#FFC107] hover:underline"
          >
            <span>Book This Route</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: Clock, title: 'Same-Day Speed', text: 'Optimized dispatch routing across Owerri & neighboring hubs.' },
          { icon: MapPin, title: 'Live OpenStreetMap', text: 'Watch rider position, velocity, stops, and exact drop-off pin.' },
          { icon: ShieldCheck, title: 'Verified PIN Handoff', text: 'Deliveries close only after confirming your 4-digit customer PIN.' },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#12141a] p-5 flex items-start gap-3"
          >
            <item.icon className="w-5 h-5 text-[#FFC107] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">{item.title}</div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{item.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#FFC107]/40 bg-[#FFC107]/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 text-[#FFC107] shrink-0" />
          <div>
            <div className="font-display text-xl font-black">Ready to send a package?</div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              Schedule a rider in seconds via WhatsApp or track an existing dispatch live.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/track"
            className="rounded-xl border border-neutral-300 dark:border-white/20 px-4 py-2.5 text-xs font-bold hover:border-[#FFC107]"
          >
            Track Order
          </Link>
          <Link
            to="/contact"
            className="rounded-xl bg-[#FFC107] text-[#0A0A0A] px-5 py-2.5 text-xs font-extrabold hover:bg-[#F2B705]"
          >
            Request Dispatch
          </Link>
        </div>
      </div>
    </div>
  );
};
