import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { ctaTokens, iconButtonToken, modalTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';

interface RatingModalProps {
  bookingReference: string;
  currentRating?: number;
  onSave: (rating: number) => void;
  onClose: () => void;
}

export function RatingModal({ bookingReference, currentRating, onSave, onClose }: RatingModalProps) {
  const modalTitleId = 'rating-modal-title';
  const [rating, setRating] = useState(currentRating || 0);
  const [hoveredStar, setHoveredStar] = useState(0);

  return (
    <div className={modalTokens.overlay} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        className={`${modalTokens.panel} max-w-sm`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 id={modalTitleId} className="text-lg font-bold text-slate-900">{fr.rating.title}</h2>
          <button type="button" onClick={onClose} aria-label={fr.common.close} className={iconButtonToken}>
            <X size={20} />
          </button>
        </div>
        <div className="p-5">
          <p className="mb-4 text-sm text-slate-600">{fr.rating.bookingLabel} : {bookingReference}</p>
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setRating(star)}
                aria-label={fr.rating.starAria(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={32}
                  className={`transition-colors ${
                    star <= (hoveredStar || rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { if (rating > 0) onSave(rating); }}
              disabled={rating === 0}
              className={`flex-1 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium disabled:opacity-40 ${ctaTokens.primary}`}
            >
              {fr.common.save}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${ctaTokens.secondary}`}
            >
              {fr.common.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
