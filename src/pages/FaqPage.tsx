import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';

type FaqCategory = 'all' | 'tracking' | 'booking' | 'safety';

const FAQ_LIST: Array<{ category: Exclude<FaqCategory, 'all'>; q: string; a: string }> = [
  {
    category: 'tracking',
    q: 'How do I track my package?',
    a: 'Once your rider picks up your package, you will receive a tracking link via WhatsApp. Click the link or enter your Order ID on the Track Order page to view the rider’s live location, movement status, speed, journey percentage, and destination pin in real time.',
  },
  {
    category: 'tracking',
    q: 'How accurate is the moving vs stopped status?',
    a: 'Our Rider Portal streams live GPS coordinates, speed (km/h), and accuracy directly to Firestore. You can see immediately when your rider is moving, stopped at traffic/pickup, or approaching your destination.',
  },
  {
    category: 'tracking',
    q: 'Does live tracking work on both mobile and PC?',
    a: 'Yes. CharMary is a responsive Progressive Web App (PWA) optimized for Android, iOS, and desktop browsers with offline-cached free map tiles and global destination search.',
  },
  {
    category: 'booking',
    q: 'What areas do you cover?',
    a: 'We cover the entire Owerri metropolis and immediate surrounding areas, while our global coordinate & address search lets riders pin destinations accurately anywhere in the world.',
  },
  {
    category: 'booking',
    q: 'How do I pay for my delivery?',
    a: 'We accept Bank Transfers, Prepaid Merchant settlements, and Cash on Delivery. Payment status (Paid or Pending) is tracked live inside your shipment details.',
  },
  {
    category: 'safety',
    q: 'What is the 4-digit delivery PIN?',
    a: 'Every shipment generates a unique 4-digit delivery PIN visible on your Track Order page. Your rider confirms this PIN with the receiver before marking the order as Delivered.',
  },
  {
    category: 'safety',
    q: 'Can I send fragile items?',
    a: 'Yes, our riders are trained to handle fragile items with extra care inside padded waterproof courier boxes. Mark your parcel as fragile when booking.',
  },
];

export const FaqPage: React.FC = () => {
  const [category, setCategory] = useState<FaqCategory>('all');
  const [openQuestion, setOpenQuestion] = useState<string | null>(FAQ_LIST[0].q);

  const visibleFaqs = useMemo(
    () => (category === 'all' ? FAQ_LIST : FAQ_LIST.filter((f) => f.category === category)),
    [category]
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg border border-[#FFC107]/30 bg-[#FFC107]/10 px-4 py-2 text-xs font-bold text-[#FFC107] hover:bg-[#FFC107] hover:text-[#0A0A0A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <Link
          to="/track"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFC107] hover:underline"
        >
          <span>Track a Delivery</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="text-center space-y-2"
      >
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight">
          Frequently Asked <span className="text-[#FFC107]">Questions</span>
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Everything you need to know about live tracking, booking, payments, and PIN security.
        </p>
      </motion.div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {(
          [
            ['all', 'All Topics'],
            ['tracking', 'Live Tracking'],
            ['booking', 'Booking & Payment'],
            ['safety', 'PIN & Safety'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
              category === key
                ? 'bg-[#FFC107] text-[#0A0A0A]'
                : 'border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#12141a] text-neutral-600 dark:text-neutral-300 hover:border-[#FFC107]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visibleFaqs.map((item) => {
          const isOpen = openQuestion === item.q;
          return (
            <div
              key={item.q}
              className="rounded-xl border border-neutral-200 dark:border-white/10 border-l-4 border-l-[#FFC107] bg-white dark:bg-[#12141a] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenQuestion(isOpen ? null : item.q)}
                className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-[#FFC107] shrink-0" />
                  <span>{item.q}</span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[#FFC107] shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed border-t border-neutral-200 dark:border-white/10 pt-3">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[#FFC107]/40 bg-[#FFC107]/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="font-display text-xl font-black">Still have a question?</div>
          <p className="text-xs text-neutral-600 dark:text-neutral-300">
            Chat with our dispatch team on WhatsApp or use the live chat widget below.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/contact"
            className="rounded-xl bg-[#FFC107] text-[#0A0A0A] px-4 py-2.5 text-xs font-extrabold hover:bg-[#F2B705]"
          >
            Booking Form
          </Link>
          <a
            href="https://wa.me/2348087276942"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] text-white px-4 py-2.5 text-xs font-extrabold hover:brightness-105"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
};
