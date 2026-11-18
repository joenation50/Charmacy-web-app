import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Bike,
  ChevronDown,
  Clock,
  Globe,
  Headphones,
  Layers,
  MapPin,
  MessageCircle,
  Package,
  Radio,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
  UserCheck,
  Utensils,
  Zap,
} from 'lucide-react';
import { sanitizeOrderId } from '../lib/geo';
import { useToast } from '../components/Toast';

const FAQS = [
  {
    q: 'How do I track my package in real time?',
    a: 'Once a CharMary rider dispatches your parcel, you receive an Order ID (such as CH-90210) and a direct tracking link. Enter the ID above or open the Track portal to view live GPS movement, speed, stop status, route polyline, and destination pin.',
  },
  {
    q: 'Does live tracking work in low-signal areas or outside Owerri?',
    a: 'Yes. CharMary uses 100% free OpenStreetMap maps with offline tile caching, global Photon & OpenStreetMap address search, and queued GPS telemetry. Whether delivering across Owerri or anywhere worldwide, movement syncs automatically when connectivity returns.',
  },
  {
    q: 'How do I pay for my delivery?',
    a: 'We accept instant Bank Transfers and Cash on Delivery. Final delivery fee confirmation is shared immediately when you book a rider via WhatsApp.',
  },
  {
    q: 'Can I send fragile or high-value electronics?',
    a: 'Yes. Our verified dispatch riders carry padded waterproof delivery boxes and use 4-digit customer Delivery PIN verification before completing handoff.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'CharMary delivered my package from Wetheral to New Owerri in under 45 minutes. Watching the rider move and stop live on the map gave me total peace of mind.',
    author: 'Sarah O.',
    role: 'Boutique Owner, New Owerri',
  },
  {
    quote:
      'I rely on CharMary for daily hot food dispatches. Professional riders, instant WhatsApp booking, and customers love checking the live arrival ETA.',
    author: 'Chef Emeka',
    role: 'Restaurant Partner',
  },
  {
    quote:
      'I shipped a laptop across town and monitored every turn until the 4-digit PIN handoff was confirmed. Fast, transparent, and trustworthy.',
    author: 'David A.',
    role: 'Tech Consultant',
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [quickOrderId, setQuickOrderId] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cDetails, setCDetails] = useState('');
  const [readyWaUrl, setReadyWaUrl] = useState<string | null>(null);

  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = sanitizeOrderId(quickOrderId);
    if (!cleaned || cleaned.length < 4) {
      toast('Enter a valid Order ID (e.g. CH-90210)', 'err');
      return;
    }
    navigate(`/track?id=${encodeURIComponent(cleaned)}`);
  };

  const handleBuildQuote = (e: React.FormEvent) => {
    e.preventDefault();
    const name = cName.trim();
    const phone = cPhone.trim();
    const details = cDetails.trim();
    if (!name || !phone || !details) {
      toast('Please fill in your name, phone number, and delivery details.', 'err');
      return;
    }
    const text = `Hello CharMary! I'd like to book a rider.\n\n*Name:* ${name}\n*Phone:* ${phone}\n*Details:* ${details}`;
    const url = `https://wa.me/2348087276942?text=${encodeURIComponent(text)}`;
    setReadyWaUrl(url);
    toast('Booking message prepared. Tap Open WhatsApp below to send.', 'ok');
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] dark:bg-[#0A0A0A] text-neutral-900 dark:text-white overflow-x-hidden">
      {/* HERO SECTION (Preserves banner-logo.jpg + obsidian & #FFC107 identity with fluid motion) */}
      <section className="relative overflow-hidden border-b border-neutral-200 dark:border-white/10">
        <div className="absolute inset-0">
          <motion.img
            initial={{ scale: 1.06 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            src="/images/banner-logo.jpg"
            alt="CharMary Courier Banner"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/85 to-[#f4f5f7] dark:from-[#0A0A0A]/80 dark:via-[#0A0A0A]/85 dark:to-[#0A0A0A]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-28">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="lg:col-span-7 space-y-6"
            >
              <div className="inline-flex items-center gap-2 rounded-lg border border-[#FFC107]/40 bg-[#FFC107]/15 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-neutral-900 dark:text-[#FFC107]">
                <Radio className="w-3.5 h-3.5" />
                <span>Owerri Dispatch &amp; Live GPS Telemetry</span>
              </div>

              <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.98] text-neutral-900 dark:text-white">
                Your Delivery, <span className="text-[#FFC107]">Our Priority!</span>
              </h1>

              <p className="text-base sm:text-lg text-neutral-700 dark:text-neutral-300 max-w-2xl leading-relaxed">
                Fast, reliable, and affordable delivery services in Owerri. Track your riders
                live from pickup to drop-off with free offline-cached maps and verified PIN handoff.
              </p>

              {/* Inline Quick-Track Bar */}
              <form
                onSubmit={handleQuickTrack}
                className="flex flex-col sm:flex-row gap-2.5 max-w-xl rounded-2xl border border-neutral-300 dark:border-white/15 bg-white/95 dark:bg-[#12141a]/95 p-2 shadow-xl backdrop-blur-md focus-within:border-[#FFC107] transition-colors"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={quickOrderId}
                    onChange={(e) => setQuickOrderId(e.target.value)}
                    placeholder="Enter Order ID or tracking link (e.g. CH-90210)"
                    className="w-full rounded-xl bg-transparent pl-10 pr-3 py-3 text-sm font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFC107] text-[#0A0A0A] px-5 py-3 text-sm font-extrabold uppercase tracking-wide hover:bg-[#F2B705] active:scale-[0.98] transition-all shrink-0 cursor-pointer"
                >
                  <span>Track Live</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-[#0A0A0A] px-5 py-3 text-sm font-bold hover:opacity-90 transition-all hover:-translate-y-0.5"
                >
                  <Truck className="w-4 h-4 text-[#FFC107] dark:text-[#0A0A0A]" />
                  <span>Book a Rider</span>
                </Link>
                <Link
                  to="/services"
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 dark:border-white/20 bg-white/75 dark:bg-white/5 px-5 py-3 text-sm font-bold text-neutral-900 dark:text-white hover:border-[#FFC107] transition-all hover:-translate-y-0.5"
                >
                  <span>Explore Services</span>
                  <ArrowRight className="w-4 h-4 text-[#FFC107]" />
                </Link>
              </div>
            </motion.div>

            {/* Right Telemetry Showcase Card with Live Animated Dispatch Motion */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="lg:col-span-5"
            >
              <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white/95 dark:bg-[#12141a]/95 backdrop-blur-md p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="/images/logo.jpg"
                      alt="CharMary Crest"
                      className="w-11 h-11 rounded-full object-cover border-2 border-[#FFC107]"
                    />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-[#FFC107]">
                        Live Fleet Network
                      </div>
                      <div className="font-display text-xl font-black">
                        Real-Time Precision
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-xs font-bold">
                    <Zap className="w-3.5 h-3.5" />
                    Active
                  </span>
                </div>

                {/* Animated Live Route Motion Strip */}
                <div className="rounded-xl bg-neutral-100 dark:bg-[#0A0A0A] border border-neutral-200 dark:border-white/10 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    <span className="flex items-center gap-1 text-blue-500">
                      <MapPin className="w-3 h-3" /> Pickup
                    </span>
                    <span className="text-[#FFC107]">Live Telemetry</span>
                    <span className="flex items-center gap-1 text-emerald-500">
                      Drop-off <MapPin className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="relative h-8 flex items-center">
                    <div className="w-full h-[3px] rounded-full animate-road-dash opacity-80" />
                    <motion.div
                      animate={{ x: ['0%', '84%', '0%'] }}
                      transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute left-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#FFC107] text-[#0A0A0A] shadow-md border-2 border-[#0A0A0A]"
                    >
                      <Bike className="w-4 h-4" />
                    </motion.div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-neutral-100 dark:bg-[#181b24] p-3.5 border border-neutral-200 dark:border-white/10">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      <Layers className="w-3.5 h-3.5 text-[#FFC107]" />
                      <span>Free Maps</span>
                    </div>
                    <div className="mt-1 text-sm font-bold">Offline Cached</div>
                  </div>
                  <div className="rounded-xl bg-neutral-100 dark:bg-[#181b24] p-3.5 border border-neutral-200 dark:border-white/10">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      <Globe className="w-3.5 h-3.5 text-[#FFC107]" />
                      <span>Destination</span>
                    </div>
                    <div className="mt-1 text-sm font-bold">Global Search</div>
                  </div>
                  <div className="rounded-xl bg-neutral-100 dark:bg-[#181b24] p-3.5 border border-neutral-200 dark:border-white/10">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Motion State</span>
                    </div>
                    <div className="mt-1 text-sm font-bold">Moving &amp; Stopped</div>
                  </div>
                  <div className="rounded-xl bg-neutral-100 dark:bg-[#181b24] p-3.5 border border-neutral-200 dark:border-white/10">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#FFC107]" />
                      <span>Handoff</span>
                    </div>
                    <div className="mt-1 text-sm font-bold">4-Digit PIN</div>
                  </div>
                </div>

                <Link
                  to="/track"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#FFC107]/40 bg-[#FFC107]/10 text-neutral-900 dark:text-[#FFC107] py-3 text-sm font-bold hover:bg-[#FFC107] hover:text-[#0A0A0A] transition-colors"
                >
                  <span>Open Live Tracking Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-2xl mx-auto mb-12 space-y-2"
        >
          <h2 className="font-display text-4xl sm:text-5xl font-black tracking-tight">
            How It <span className="text-[#FFC107]">Works</span>
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Three seamless steps from dispatch booking to verified doorstep arrival.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              title: 'Book a Rider',
              desc: 'Send your pickup and drop-off details via WhatsApp or the booking form below for instant dispatch.',
              icon: MessageCircle,
            },
            {
              step: '02',
              title: 'We Pick Up Securely',
              desc: 'Our vetted rider arrives promptly, sets the global drop-off destination, and starts GPS broadcasting.',
              icon: Package,
            },
            {
              step: '03',
              title: 'Track & Deliver',
              desc: 'Watch live movement, stops, route ETA, and distance remaining until the 4-digit PIN handoff.',
              icon: MapPin,
            },
          ].map((item, idx) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: idx * 0.08 }}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#12141a] p-7 hover:border-[#FFC107]/70 transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="w-11 h-11 rounded-xl bg-[#FFC107] text-[#0A0A0A] font-display text-xl font-black flex items-center justify-center">
                  {item.step}
                </span>
                <item.icon className="w-6 h-6 text-[#FFC107]" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SERVICES (Preserves rider1.jpg, bike1.jpg, bike2.jpg) */}
      <section className="border-y border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0e1015]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-2xl mx-auto mb-12 space-y-2"
          >
            <h2 className="font-display text-4xl sm:text-5xl font-black tracking-tight">
              Our <span className="text-[#FFC107]">Services</span>
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Tailored bike logistics built for urgent errands, commerce, and business fleets.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-7">
            {[
              {
                img: '/images/rider1.jpg',
                alt: 'CharMary Rider',
                title: 'Express Delivery',
                desc: 'Fast, priority same-day dispatch for urgent packages and time-sensitive errands across Owerri.',
              },
              {
                img: '/images/bike1.jpg',
                alt: 'CharMary Delivery Bike',
                title: 'Parcels & Packages',
                desc: 'From vital documents to boxed retail orders, our bikes navigate traffic swiftly and safely.',
              },
              {
                img: '/images/bike2.jpg',
                alt: 'Delivery Bike',
                title: 'Door-to-Door Delivery',
                desc: 'Direct pickup from your doorstep and live-tracked handoff straight to the receiver.',
              },
            ].map((srv, idx) => (
              <motion.div
                key={srv.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                whileHover={{ y: -5 }}
                className="group rounded-2xl overflow-hidden border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#12141a] hover:border-[#FFC107] transition-all shadow-sm"
              >
                <div className="h-60 overflow-hidden bg-neutral-900">
                  <img
                    src={srv.img}
                    alt={srv.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 space-y-2">
                  <h3 className="font-display text-2xl font-bold">{srv.title}</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {srv.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE CHARMARY & PARTNER BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="font-display text-4xl sm:text-5xl font-black tracking-tight">
            Why Choose <span className="text-[#FFC107]">CharMary?</span>
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            We do not just carry packages; we deliver real-time visibility and confidence.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: ShieldCheck,
              title: 'Safe & Secure Handling',
              desc: 'Waterproof courier boxes, padded transport, and verified 4-digit receiver PIN confirmation on drop-off.',
            },
            {
              icon: Sparkles,
              title: 'Live GPS + Offline Maps',
              desc: 'Watch rider velocity, stop alerts, and drop-off pins on cached free OpenStreetMap routes.',
            },
            {
              icon: Tag,
              title: 'Affordable Transparent Rates',
              desc: 'Fair, predictable pricing tailored for individuals, food vendors, and scaling e-commerce brands.',
            },
          ].map((feat, idx) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#12141a] p-7 space-y-3 hover:border-[#FFC107]/60 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-[#FFC107]/15 text-[#FFC107] flex items-center justify-center">
                <feat.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-2xl font-bold">{feat.title}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Business Partner Banner */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border-2 border-[#FFC107] bg-white dark:bg-gradient-to-br dark:from-[#161922] dark:to-[#0A0A0A] p-7 sm:p-10 shadow-xl"
        >
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#FFC107]">
                <UserCheck className="w-4 h-4" />
                <span>Business Logistics</span>
              </div>
              <h3 className="font-display text-3xl sm:text-4xl font-black">
                Are You a <span className="text-[#FFC107]">Business Owner?</span>
              </h3>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed">
                Whether you run a bustling restaurant, boutique, pharmacy, or online shop,
                partner with CharMary for dedicated dispatch riders and live customer tracking links.
              </p>
              <a
                href="https://wa.me/2348087276942?text=Hello%20CharMary!%20I%20would%20like%20to%20register%20as%20a%20Business%20Partner."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] text-white px-6 py-3.5 text-sm font-bold hover:brightness-105 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Become a Partner on WhatsApp</span>
              </a>
            </div>

            <div className="lg:col-span-5 grid sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="rounded-xl border border-[#FFC107]/30 bg-[#FFC107]/10 p-4 space-y-1">
                <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-[#FFC107]">
                  <Utensils className="w-4 h-4" />
                  <span>Restaurants &amp; Food Vendors</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  Deliver hot meals fast with insulated carrier boxes and live customer ETAs.
                </p>
              </div>
              <div className="rounded-xl border border-[#FFC107]/30 bg-[#FFC107]/10 p-4 space-y-1">
                <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-[#FFC107]">
                  <ShoppingBag className="w-4 h-4" />
                  <span>E-commerce &amp; Boutiques</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  Reduce failed deliveries with verified customer tracking and PIN handoff.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ABOUT CHARMARY (Preserves rider2.jpg) */}
      <section className="border-y border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0e1015]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-white/10 shadow-xl"
          >
            <img
              src="/images/rider2.jpg"
              alt="CharMary Rider"
              className="w-full h-[240px] sm:h-[320px] lg:h-[360px] object-cover hover:scale-105 transition-transform duration-700"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="space-y-5"
          >
            <div className="text-xs font-bold uppercase tracking-widest text-[#FFC107]">
              About CharMary
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-black tracking-tight">
              Your Trusted Delivery Partner in <span className="text-[#FFC107]">Owerri</span>
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
              CharMary Courier and Logistics is a dispatch company based in Owerri, Imo State,
              built to bring speed, accountability, and modern GPS transparency to every delivery.
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              From single urgent errands to daily merchant fulfillment, our riders transmit live
              coordinates, motion state, and route telemetry so senders and receivers never have to guess.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-neutral-200 dark:border-white/10">
              <div>
                <div className="font-display text-3xl font-black text-[#FFC107]">100%</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Accountability
                </div>
              </div>
              <div>
                <div className="font-display text-3xl font-black text-[#FFC107]">24/7</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Live Tracking
                </div>
              </div>
              <div>
                <div className="font-display text-3xl font-black text-[#FFC107]">PIN</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Verified Handoff
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="font-display text-4xl sm:text-5xl font-black tracking-tight">
            What Our <span className="text-[#FFC107]">Customers Say</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, idx) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#12141a] p-6 flex flex-col justify-between space-y-4 hover:border-[#FFC107]/50 transition-colors"
            >
              <p className="text-sm italic text-neutral-700 dark:text-neutral-300 leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <div className="font-bold text-[#FFC107]">{t.author}</div>
                <div className="text-xs text-neutral-500">{t.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ ACCORDION */}
      <section className="border-y border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0e1015]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="font-display text-4xl sm:text-5xl font-black tracking-tight">
              Frequently Asked <span className="text-[#FFC107]">Questions</span>
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={item.q}
                  className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#12141a] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#FFC107] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
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
        </div>
      </section>

      {/* BOOK A RIDER / CONTACT */}
      <section id="book-rider" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-widest text-[#FFC107]">
                Dispatch Desk
              </div>
              <h2 className="font-display text-4xl font-black tracking-tight">
                Book a <span className="text-[#FFC107]">Rider Now</span>
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Complete the quote form to prepare an instant WhatsApp dispatch message with your pickup and drop-off route.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFC107]/15 text-[#FFC107] flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Call / WhatsApp Dispatch</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 font-mono-tabular">
                    0808 727 6942
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFC107]/15 text-[#FFC107] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Dispatch Hub</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Owerri, Imo State, Nigeria (Global Coordinate Pinning Supported)
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFC107]/15 text-[#FFC107] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Operating Hours</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Monday – Sunday · Rapid Same-Day Dispatch
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form
              onSubmit={handleBuildQuote}
              className="rounded-2xl border border-neutral-200 dark:border-white/15 border-t-4 border-t-[#FFC107] bg-white dark:bg-[#12141a] p-6 sm:p-8 shadow-xl space-y-5"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={cName}
                    onChange={(e) => {
                      setCName(e.target.value);
                      setReadyWaUrl(null);
                    }}
                    placeholder="e.g. Chinedu Okafor"
                    required
                    className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-4 py-3 text-sm focus:border-[#FFC107] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={cPhone}
                    onChange={(e) => {
                      setCPhone(e.target.value);
                      setReadyWaUrl(null);
                    }}
                    placeholder="e.g. 08012345678"
                    required
                    className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-4 py-3 text-sm focus:border-[#FFC107] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Pickup &amp; Drop-off Details
                </label>
                <textarea
                  rows={4}
                  value={cDetails}
                  onChange={(e) => {
                    setCDetails(e.target.value);
                    setReadyWaUrl(null);
                  }}
                  placeholder="e.g. Pick up parcel at Wetheral Road, deliver to New Owerri"
                  required
                  className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-4 py-3 text-sm focus:border-[#FFC107] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#FFC107] text-[#0A0A0A] px-6 py-3 text-sm font-extrabold hover:bg-[#F2B705] transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Prepare WhatsApp Dispatch</span>
                </button>

                {readyWaUrl && (
                  <a
                    href={readyWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] text-white px-6 py-3 text-sm font-extrabold hover:brightness-105 transition-all"
                  >
                    <span>Open WhatsApp Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t-2 border-[#FFC107] bg-white dark:bg-[#12141a] py-10 px-4 text-center space-y-3">
        <img
          src="/images/logo.jpg"
          alt="CharMary Logo"
          className="w-14 h-14 rounded-full object-cover mx-auto border-2 border-[#FFC107]"
        />
        <div className="font-display text-lg font-black">
          CHAR<span className="text-[#FFC107]">MARY</span> COURIER &amp; LOGISTICS
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          &copy; {new Date().getFullYear()} CharMary Courier &amp; Logistics. All rights reserved.
        </p>
      </footer>

      {/* Floating WhatsApp CTA (Positioned cleanly above Tawk.to on mobile & desktop) */}
      <a
        href="https://wa.me/2348087276942"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with CharMary on WhatsApp"
        className="fixed bottom-[92px] right-5 z-[800] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/35 flex items-center justify-center hover:scale-105 transition-transform"
      >
        <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" />
      </a>
    </div>
  );
};
