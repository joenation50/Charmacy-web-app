import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Bike, MapPin, ShieldCheck } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg border border-[#FFC107]/30 bg-[#FFC107]/10 px-4 py-2 text-xs font-bold text-[#FFC107] hover:bg-[#FFC107] hover:text-[#0A0A0A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-2xl mx-auto space-y-2"
      >
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight">
          About <span className="text-[#FFC107]">CharMary</span>
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Your trusted delivery partner in Owerri.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-white/15 shadow-xl"
        >
          <img
            src="/images/rider2.jpg"
            alt="CharMary Rider"
            className="w-full h-[240px] sm:h-[340px] lg:h-[380px] object-cover"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-5"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-black">Who We Are</h2>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            CharMary Courier and Logistics is a premier dispatch company based in Owerri, Imo State. We were founded on a simple principle: to provide fast, reliable, and affordable delivery services to individuals and businesses.
          </p>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            We understand the hustle of Owerri, and we are here to make your life easier. Whether you&apos;re a restaurant owner needing food delivered hot, or a business owner shipping products to customers, our dedicated team of riders ensures your items arrive on time, every time.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-200 dark:border-white/10">
            <div>
              <div className="font-display text-3xl font-black text-[#FFC107]">100%</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Reliability
              </div>
            </div>
            <div>
              <div className="font-display text-3xl font-black text-[#FFC107]">24/7</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Support
              </div>
            </div>
            <div>
              <div className="font-display text-3xl font-black text-[#FFC107]">GPS</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Live Map
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/track"
              className="inline-flex items-center gap-2 rounded-xl bg-[#FFC107] text-[#0A0A0A] px-5 py-3 text-xs font-extrabold hover:bg-[#F2B705]"
            >
              <MapPin className="w-4 h-4" />
              <span>Track a Shipment</span>
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 dark:border-white/15 px-5 py-3 text-xs font-bold hover:border-[#FFC107]"
            >
              <span>Contact Dispatch</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="grid sm:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#12141a] p-5 space-y-2">
          <Bike className="w-5 h-5 text-[#FFC107]" />
          <h3 className="font-display text-xl font-bold">Trained Fleet</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Every rider broadcasts real-time GPS speed, heading, and stops straight from the Rider Portal.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#12141a] p-5 space-y-2">
          <MapPin className="w-5 h-5 text-[#FFC107]" />
          <h3 className="font-display text-xl font-bold">Offline Cached Maps</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Powered by 100% free OpenStreetMap tiles cached locally via our service worker for reliable mobile &amp; PC tracking.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#12141a] p-5 space-y-2">
          <ShieldCheck className="w-5 h-5 text-[#FFC107]" />
          <h3 className="font-display text-xl font-bold">Customer Protection</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Every completed shipment is verified using the receiver&apos;s unique 4-digit delivery PIN.
          </p>
        </div>
      </div>
    </div>
  );
};
