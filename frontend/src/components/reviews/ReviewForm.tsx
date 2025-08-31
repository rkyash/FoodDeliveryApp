import React, { useState } from 'react';
import { Star, X, Upload, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, handleApiError } from '../../services/api';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ReviewFormProps {
  restaurantId: string;
  orderId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ 
  restaurantId, 
  orderId, 
  onClose, 
  onSuccess 
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    
    if (!comment.trim()) {
      setError('Please write a comment');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const reviewData = {
        orderId,
        rating,
        comment: comment.trim(),
        photos
      };

      await api.post(`/restaurants/${restaurantId}/reviews`, reviewData);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      setError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleStarClick = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleStarHover = (selectedRating: number) => {
    setHoveredRating(selectedRating);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1;
      const isActive = starValue <= (hoveredRating || rating);
      
      return (
        <button
          key={i}
          type="button"
          onClick={() => handleStarClick(starValue)}
          onMouseEnter={() => handleStarHover(starValue)}
          onMouseLeave={handleStarLeave}
          className="focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              isActive 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300 dark:text-gray-600 hover:text-yellow-200'
            }`}
          />
        </button>
      );
    });
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Select a rating';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Write a Review
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-400 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
              </p>
            </div>
          )}

          {/* Rating */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Rating *
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {renderStars()}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-4">
                {getRatingText(hoveredRating || rating)}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label 
              htmlFor="comment" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Your Review *
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Share your experience with this restaurant..."
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {comment.length}/500 characters
            </p>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Photos (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Photo upload feature coming soon
              </p>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Reviewing as: <span className="font-medium text-gray-900 dark:text-white">
                {user?.firstName} {user?.lastName}
              </span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary flex items-center justify-center"
              disabled={loading || rating === 0 || !comment.trim()}
            >
              {loading ? (
                <LoadingSpinner />
              ) : (
                'Submit Review'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewForm;