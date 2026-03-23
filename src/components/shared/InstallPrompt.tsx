import { useState, useEffect, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if user previously dismissed
    if (localStorage.getItem('pca-install-dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;

      // Show after 30 seconds of usage
      setTimeout(() => {
        if (deferredPrompt.current) {
          setShow(true);
        }
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    deferredPrompt.current = null;
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pca-install-dismissed', '1');
    deferredPrompt.current = null;
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-lg border border-racing-border bg-racing-panel/95 px-4 py-3 shadow-xl backdrop-blur-sm md:left-auto md:right-6 md:max-w-sm">
      <p className="text-sm text-slate-200">
        Install Pit Crew Academy on your device!
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={handleInstall}
          className="rounded-md bg-racing-red px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-700"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="text-slate-400 transition-colors hover:text-white"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
