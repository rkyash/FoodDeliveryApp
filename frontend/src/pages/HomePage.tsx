import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Star, Clock, Truck } from 'lucide-react';
import type { Restaurant } from '../types';
import { api, handleApiError, getImageUrl } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const HomePage: React.FC = () => {
  const [featuredRestaurants, setFeaturedRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchFeaturedRestaurants();
  }, []);

  const fetchFeaturedRestaurants = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/public/restaurants?limit=6');
      if (response.data.success) {
        setFeaturedRestaurants(response.data.data?.restaurants || []);
      }
    } catch (error) {
      setError(handleApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/restaurants?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const cuisineTypes = [
    { name: 'Italian', icon: '🍝' },
    { name: 'Chinese', icon: '🥡' },
    { name: 'Mexican', icon: '🌮' },
    { name: 'Indian', icon: '🍛' },
    { name: 'American', icon: '🍔' },
    { name: 'Japanese', icon: '🍣' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-6">
              Delicious Food, Delivered Fast
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Discover amazing restaurants in your area and get your favorite meals delivered to your door
            </p>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-10 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="Search restaurants, cuisines, or dishes..."
                />
              </div>
              <button
                type="submit"
                className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg transition duration-200 transform hover:scale-105"
              >
                Find Restaurants
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Cuisine Categories */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Explore by Cuisine
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {cuisineTypes.map((cuisine) => (
              <Link
                key={cuisine.name}
                to={`/restaurants?cuisine=${encodeURIComponent(cuisine.name)}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 text-center group hover:scale-105 transform"
              >
                <div className="text-4xl mb-3">{cuisine.icon}</div>
                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {cuisine.name}
                </h3>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Restaurants */}
        <section>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Featured Restaurants
            </h2>
            <Link
              to="/restaurants"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
            >
              View all →
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchFeaturedRestaurants}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          )}

          {!isLoading && !error && featuredRestaurants.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No restaurants available at the moment
              </p>
              <button
                onClick={fetchFeaturedRestaurants}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Refresh
              </button>
            </div>
          )}
        </section>

        {/* App Features */}
        <section className="mt-16 bg-gray-100 dark:bg-gray-800 rounded-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Why Choose Us?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Fast Delivery
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Get your food delivered quickly with real-time tracking
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Quality Food
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Only the best restaurants with high ratings and fresh ingredients
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                24/7 Service
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Order anytime, anywhere. We're always here for you
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const RestaurantCard: React.FC<{ restaurant: Restaurant }> = ({ restaurant }) => {
  return (
    <Link
      to={`/restaurants/${restaurant.id}`}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden group"
    >
      <div className="aspect-w-16 aspect-h-9">
        <img
          src={restaurant.image ? getImageUrl(restaurant.image) : '/placeholder-restaurant.jpg'}
          alt={restaurant.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder-restaurant.jpg';
          }}
        />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {restaurant.name}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {restaurant.description}
        </p>
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-3">
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-400 mr-1" />
            <span>{restaurant.rating}</span>
            <span className="mx-1">•</span>
            <span>{restaurant.reviewCount} reviews</span>
          </div>
          <div className="text-sm font-medium">
            {'$'.repeat(restaurant.priceRange)}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4 mr-1" />
            <span>{restaurant.deliveryTime?.min || 20}-{restaurant.deliveryTime?.max || 30} min</span>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            ${(restaurant.deliveryFee || 0).toFixed(2)} delivery
          </div>
        </div>
        <div className="mt-3">
          <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs">
            {restaurant.cuisineType}
          </span>
          {restaurant.isOpen ? (
            <span className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs ml-2">
              Open now
            </span>
          ) : (
            <span className="inline-block bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded-full text-xs ml-2">
              Closed
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default HomePage;