import React, { useState } from 'react';
import { Star, X, Check, Loader2 } from 'lucide-react';
import { usePassengerStore } from '../../store/passengerStore';

interface RatingModalProps {
  rideId: string;
  driverName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const FEEDBACK_TAGS = [
  'Smooth driving',
  'Clean vehicle',
  'Polite driver',
  'Great conversation',
  'On time',
  'Safe route',
];

export const RatingModal: React.FC<RatingModalProps> = ({
  rideId,
  driverName = 'your driver',
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { submitRating } = usePassengerStore();
  const [score, setScore] = useState(5);
  const [hoverScore, setHoverScore] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await submitRating(rideId, {
        score,
        comment: comment.trim() || undefined,
        tags: selectedTags,
      });
      setIsSubmitting(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.response?.data?.message || 'Failed to submit rating');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative border border-gray-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Star className="w-8 h-8 fill-amber-400 stroke-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">How was your trip?</h3>
          <p className="text-sm text-gray-500 mt-1">
            Rate your experience with <span className="font-semibold text-gray-700">{driverName}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star selector */}
          <div className="flex justify-center items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 transition-transform hover:scale-125 focus:outline-none"
                onMouseEnter={() => setHoverScore(star)}
                onMouseLeave={() => setHoverScore(0)}
                onClick={() => setScore(star)}
              >
                <Star
                  className={`w-9 h-9 transition-colors ${
                    (hoverScore || score) >= star
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-200'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Feedback tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              What went well?
            </label>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional review comment */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Add a note (optional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what you loved about this ride..."
              className="w-full text-sm p-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-2xl transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Rating</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
