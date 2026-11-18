import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Headphones,
  MapPin,
  MessageCircle,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '../components/Toast';

export const ContactPage: React.FC = () => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [packageType, setPackageType] = useState('Parcel');
  const [weight, setWeight] = useState('');
  const [priority, setPriority] = useState<'standard' | 'express'>('express');
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cod'>('transfer');
  const [isFragile, setIsFragile] = useState(false);
  const [details, setDetails] = useState('');
  const [waUrl, setWaUrl] = useState<string | null>(null);

  const resetPrepared = () => setWaUrl(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !pickupAddress.trim() || !dropoffAddress.trim()) {
      toast('Please fill in your name, phone number, pickup address, and drop-off address.', 'err');
      return;
    }

    const lines = [
      `Hello CharMary Dispatch! I'd like to book a rider.`,
      ``,
      `*Sender Name:* ${name.trim()}`,
      `*Phone:* ${phone.trim()}`,
      `*Pickup Location:* ${pickupAddress.trim()}`,
      `*Drop-off Location:* ${dropoffAddress.trim()}`,
      `*Package Type:* ${packageType}${weight.trim() ? ` (${weight.trim()})` : ''}`,
      `*Speed Tier:* ${priority === 'express' ? 'Express Same-Day' : 'Standard Same-Day'}`,
      `*Payment Preference:* ${paymentMethod === 'transfer' ? 'Bank Transfer' : 'Cash on Delivery'}`,
      `*Fragile Handling:* ${isFragile ? 'YES — Handle with extra care' : 'Standard'}`,
    ];

    if (details.trim()) {
      lines.push(`*Notes:* ${details.trim()}`);
    }

    setWaUrl(`https://wa.me/2348087276942?text=${encodeURIComponent(lines.join('\n'))}`);
    toast('Dispatch request formatted — tap Open WhatsApp Now.', 'ok');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
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
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-white/15 px-4 py-2 text-xs font-bold hover:border-[#FFC107] transition-colors"
        >
          <MapPin className="w-3.5 h-3.5 text-[#FFC107]" />
          <span>Already Booked? Track Order</span>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-2"
      >
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight">
          Book &amp; <span className="text-[#FFC107]">Contact Dispatch</span>
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
          Provide full pickup, drop-off, and parcel specs below to launch a structured WhatsApp dispatch booking.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="lg:col-span-5 space-y-6"
        >
          <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-6 space-y-5 shadow-sm">
            <div>
              <h2 className="font-display text-3xl font-black">Get in Touch</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1.5">
                Every booking receives a live Order ID and PIN-protected tracking link once dispatched.
              </p>
            </div>

            <div className="space-y-4">
              <a
                href="tel:08087276942"
                className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 dark:border-white/10 hover:border-[#FFC107] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FFC107]/15 text-[#FFC107] flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Call / WhatsApp Dispatch</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-300 font-mono-tabular">
                    0808 727 6942
                  </div>
                </div>
              </a>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 dark:border-white/10">
                <div className="w-10 h-10 rounded-xl bg-[#FFC107]/15 text-[#FFC107] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Primary Dispatch Hub</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Owerri, Imo State, Nigeria (with global destination pinning)
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 dark:border-white/10">
                <div className="w-10 h-10 rounded-xl bg-[#FFC107]/15 text-[#FFC107] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Dispatch Hours</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Mon – Sat: 7:30 AM – 8:30 PM &middot; Live support 24/7
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 dark:border-white/10">
                <div className="w-10 h-10 rounded-xl bg-[#FFC107]/15 text-[#FFC107] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">PIN-Secured Handoff</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Orders close only after verifying the receiver&apos;s 4-digit delivery PIN.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          onSubmit={handleSubmit}
          className="lg:col-span-7 rounded-2xl border border-neutral-200 dark:border-white/15 border-t-4 border-t-[#FFC107] bg-white dark:bg-[#12141a] p-6 sm:p-8 shadow-xl space-y-4"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#FFC107]">
            <Package className="w-4 h-4" />
            <span>Shipping &amp; Rider Request Form</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                Your Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  resetPrepared();
                }}
                placeholder="e.g. Chinedu Okafor"
                className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-4 py-3 text-sm focus:border-[#FFC107] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                Phone / WhatsApp Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  resetPrepared();
                }}
                placeholder="e.g. 08012345678"
                className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-4 py-3 text-sm focus:border-[#FFC107] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                Pickup Address / Landmark *
              </label>
              <input
                type="text"
                required
                value={pickupAddress}
                onChange={(e) => {
                  setPickupAddress(e.target.value);
                  resetPrepared();
                }}
                placeholder="e.g. Wetheral Road, Owerri"
                className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-4 py-3 text-sm focus:border-[#FFC107] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                Drop-off Destination *
              </label>
              <input
                type="text"
                required
                value={dropoffAddress}
                onChange={(e) => {
                  setDropoffAddress(e.target.value);
                  resetPrepared();
                }}
                placeholder="e.g. Area H, New Owerri"
                className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-4 py-3 text-sm focus:border-[#FFC107] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Package Type
              </label>
              <select
                value={packageType}
                onChange={(e) => {
                  setPackageType(e.target.value);
                  resetPrepared();
                }}
                className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              >
                <option value="Parcel">Parcel</option>
                <option value="Food">Hot Food</option>
                <option value="Document">Document</option>
                <option value="Electronics">Electronics</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Fragile">Fragile Item</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Est. Weight
              </label>
              <input
                type="text"
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value);
                  resetPrepared();
                }}
                placeholder="e.g. 2.5kg"
                className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Priority Tier
              </label>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value as 'standard' | 'express');
                  resetPrepared();
                }}
                className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              >
                <option value="express">Express</option>
                <option value="standard">Standard</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Payment
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value as 'transfer' | 'cod');
                  resetPrepared();
                }}
                className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              >
                <option value="transfer">Bank Transfer</option>
                <option value="cod">Cash on Delivery</option>
              </select>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={isFragile}
              onChange={(e) => {
                setIsFragile(e.target.checked);
                resetPrepared();
              }}
              className="accent-[#FFC107] w-4 h-4"
            />
            <span>Mark parcel as fragile (requires insulated / cushioned handling)</span>
          </label>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
              Additional Receiver / Handling Notes
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => {
                setDetails(e.target.value);
                resetPrepared();
              }}
              placeholder="Receiver name, gate code, or special rider instructions..."
              className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-4 py-3 text-sm focus:border-[#FFC107] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[#FFC107] text-[#0A0A0A] px-6 py-3 text-sm font-extrabold hover:bg-[#F2B705] cursor-pointer shadow-lg shadow-[#FFC107]/15"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Prepare WhatsApp Dispatch</span>
            </button>

            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] text-white px-6 py-3 text-sm font-extrabold hover:brightness-105"
              >
                <span>Open WhatsApp Now</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>
        </motion.form>
      </div>
    </div>
  );
};
