import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Clock,
  Globe,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
  Utensils,
} from 'lucide-react';

export const FeaturesPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg border border-[#FFC107]/30 bg-[#FFC107]/10 px-4 py-2 text-xs font-bold text-[#FFC107] hover:bg-[#FFC107] hover:text-[#0A0A0A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight">
          Why Choose <span className="text-[#FFC107]">CharMary</span>
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          We don&apos;t just deliver packages; we deliver peace of mind.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {[
          {
            icon: ShieldCheck,
            title: 'Safe & Secure Handling',
            desc: 'Your items are our top priority. Our riders use weatherproof courier boxes and handle every package with care so it arrives in perfect condition.',
          },
          {
            icon: Clock,
            title: 'Real-Time Tracking',
            desc: 'No more guessing. Our free OpenStreetMap offline-cached engine shows your rider moving, stopped, journey percentage, and live ETA.',
          },
          {
            icon: UserCheck,
            title: 'Verified Riders',
            desc: 'All our dispatch riders are vetted, trained, and equipped with safety gear and 4-digit PIN handoff verification.',
          },
        ].map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
            className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#12141a] hover:border-[#FFC107]/60 p-7 space-y-3 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-[#FFC107]/15 text-[#FFC107] flex items-center justify-center">
              <card.icon className="w-5 h-5" />
            </div>
            <h2 className="font-display text-2xl font-bold">{card.title}</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {card.desc}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl border-2 border-[#FFC107] bg-white dark:bg-gradient-to-br dark:from-[#161922] dark:to-[#0A0A0A] p-7 sm:p-10 shadow-xl space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#FFC107]">
            <Globe className="w-4 h-4" />
            <span>Merchant &amp; Enterprise Dispatch</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-black">
            Are You a <span className="text-[#FFC107]">Business Owner?</span>
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Whether you run a restaurant, a boutique, or an e-commerce store, we provide seamless logistics for your business.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-xl border border-[#FFC107]/30 bg-[#FFC107]/10 p-5 space-y-1.5">
            <h3 className="font-display text-xl font-bold text-neutral-900 dark:text-[#FFC107] flex items-center gap-2">
              <Utensils className="w-4 h-4" />
              <span>Restaurants &amp; Food Vendors</span>
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Get hot food to your customers fast with insulated delivery boxes and instant WhatsApp tracking links.
            </p>
          </div>
          <div className="rounded-xl border border-[#FFC107]/30 bg-[#FFC107]/10 p-5 space-y-1.5">
            <h3 className="font-display text-xl font-bold text-neutral-900 dark:text-[#FFC107] flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>E-commerce &amp; Boutiques</span>
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Deliver your products to customers across Owerri and beyond with full real-time visibility.
            </p>
          </div>
        </div>

        <div className="text-center">
          <a
            href="https://wa.me/2348087276942?text=Hello%20CharMary!%20I%20would%20like%20to%20become%20a%20Business%20Partner."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] text-white px-6 py-3.5 text-sm font-extrabold hover:brightness-105 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Become a Partner</span>
          </a>
        </div>
      </div>
    </div>
  );
};
