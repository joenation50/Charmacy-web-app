import React from 'react';
import { Bike, Package } from 'lucide-react';

interface ShippingLoaderProps {
  title?: string;
  subtitle?: string;
}

export const ShippingLoader: React.FC<ShippingLoaderProps> = ({
  title = 'Locating your rider...',
  subtitle = 'Syncing live GPS telemetry and route coordinates',
}) => {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-8 sm:p-10 text-center space-y-5 shadow-sm">
      <div className="relative mx-auto w-64 h-16 overflow-hidden rounded-xl bg-neutral-100 dark:bg-[#0A0A0A] border border-neutral-200 dark:border-white/10 flex flex-col justify-end pb-3 px-4">
        <div className="animate-delivery-bike flex items-center gap-1.5 text-[#FFC107] w-fit">
          <Package className="w-3.5 h-3.5 text-emerald-500" />
          <Bike className="w-7 h-7" />
        </div>
        <div className="w-full h-[3px] animate-road-dash rounded-full opacity-90" />
      </div>

      <div className="space-y-1">
        <h2 className="font-display text-2xl font-black tracking-tight">{title}</h2>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
          {subtitle}
        </p>
      </div>
    </div>
  );
};
