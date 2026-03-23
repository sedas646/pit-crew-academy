import { useEffect, useState } from 'react';

interface XPPopupProps {
  amount: number;
  onDone: () => void;
}

export default function XPPopup({ amount, onDone }: XPPopupProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className="fixed top-20 right-8 z-50 xp-popup pointer-events-none">
      <div className="bg-xp-bar/90 text-white font-bold px-4 py-2 rounded-full shadow-lg text-lg">
        +{amount} XP
      </div>
    </div>
  );
}
