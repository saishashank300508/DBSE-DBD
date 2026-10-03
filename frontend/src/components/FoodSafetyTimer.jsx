import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export default function FoodSafetyTimer({ expiresAt, compact = false }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isExpired: false, totalMinutes: 0 });

  useEffect(() => {
    const calculateTime = () => {
      if (!expiresAt) return;
      const target = new Date(expiresAt).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true, totalMinutes: 0 });
        return;
      }

      const totalMinutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isExpired: false, totalMinutes });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (timeLeft.isExpired) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
        <AlertTriangle size={12} />
        EXPIRED
      </span>
    );
  }

  // Color logic: > 2 hrs green, 1-2 hrs orange, < 1 hr red urgent
  let colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let label = 'Safe to consume:';

  if (timeLeft.totalMinutes < 60) {
    colorClasses = 'bg-red-50 text-red-700 border-red-200 animate-pulse font-extrabold';
    label = 'URGENT:';
  } else if (timeLeft.totalMinutes < 120) {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
    label = 'Expires soon:';
  }

  const formattedTime = `${String(timeLeft.hours).padStart(2, '0')}h ${String(timeLeft.minutes).padStart(2, '0')}m${timeLeft.hours < 1 ? ` ${String(timeLeft.seconds).padStart(2, '0')}s` : ''}`;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${colorClasses}`}>
      <Clock size={12} className="flex-shrink-0" />
      <span>{compact ? formattedTime : `${label} ${formattedTime}`}</span>
    </span>
  );
}
