import { useState, useEffect, useRef } from 'react';
import { Share2, Copy, Check, MessageCircle, Mail } from 'lucide-react';

// Reusable share control. Uses the native share sheet on mobile (where it
// actually works) and a small popover with Copy-link / WhatsApp / Email on
// desktop, where navigator.share is unreliable and can show a broken sheet.
export default function ShareMenu({
  title,
  text,
  url,
  label = 'Share',
}: {
  title: string; // native share sheet title
  text: string;  // message body (native share + WhatsApp + Email)
  url: string;   // link being shared
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const canNativeShare =
    typeof navigator !== 'undefined' &&
    !!navigator.share &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const onShareClick = async () => {
    if (canNativeShare) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // Cancelled or failed — fall back to the popover.
      }
    }
    setOpen((o) => !o);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => { setCopied(false); setOpen(false); }, 1200);
    } catch {
      setOpen(false);
    }
  };

  const openShare = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const items = [
    { key: 'copy', label: copied ? 'Link copied!' : 'Copy link', icon: copied ? Check : Copy, onClick: copyLink, color: copied ? '#0C831F' : '#374151' },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, onClick: () => openShare(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`), color: '#25D366' },
    { key: 'email', label: 'Email', icon: Mail, onClick: () => openShare(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n${url}`)}`), color: '#374151' },
  ];

  return (
    <div className="relative flex-shrink-0" ref={boxRef}>
      <button
        onClick={onShareClick}
        aria-label={label}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-green-600 hover:text-green-700 hover:bg-green-50 transition-colors text-xs font-bold"
      >
        <Share2 size={15} /> <span className="hidden sm:inline">{label}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 w-48 bg-white rounded-xl py-1.5 z-50 animate-fade-in"
          style={{ border: '1px solid #E8E8E8', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
        >
          {items.map((it) => (
            <button
              key={it.key}
              onClick={it.onClick}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <it.icon size={16} style={{ color: it.color }} />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
