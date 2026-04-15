import { useState } from 'react';
import { X, Star } from 'lucide-react';

interface RatingModalProps {
  bookingReference: string;
  currentRating?: number;
  onSave: (rating: number) => void;
  onClose: () => void;
}

export function RatingModal({ bookingReference, currentRating, onSave, onClose }: RatingModalProps) {
  const [rating, setRating] = useState(currentRating || 0);
  const [hoveredStar, setHoveredStar] = useState(0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Noter l'invite</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-600 mb-4">Reservation : {bookingReference}</p>
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setRating(star)}
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
              onClick={() => { if (rating > 0) onSave(rating); }}
              disabled={rating === 0}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-40"
            >
              Enregistrer
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
