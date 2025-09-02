import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Star, Clock, MapPin, SlidersHorizontal } from 'lucide-react';
import type { Restaurant, SearchFilters } from '../types';
import { api, handleApiError, getImageUrl } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const RestaurantsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    cuisineTypes: searchParams.get('cuisine') ? [searchParams.get('cuisine')!] : [],
    priceRange: [1, 3],
    rating: 0,
    deliveryTime: 60,
    sortBy: 'rating',
  });

  const cuisineOptions = [
    'Italian', 'Chinese', 'Mexican', 'Indian', 'American', 'Japanese',
    'Thai', 'Mediterranean', 'French', 'Korean', 'Vietnamese', 'Greek'
  ];

  const sortOptions = [
    { value: 'rating', label: 'Rating' },
    { value: 'deliveryTime', label: 'Delivery Time' },
    { value: 'deliveryFee', label: 'Delivery Fee' },
    { value: 'distance', label: 'Distance' },
  ];

  useEffect(() => {
    fetchRestaurants();
  }, [filters]);

  const fetchRestaurants = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.query) queryParams.append('q', filters.query);
      if (filters.cuisineTypes.length > 0) {
        // Use the first cuisine type for now (backend expects single cuisine parameter)
        queryParams.append('cuisine', filters.cuisineTypes[0]);
      }
      if (filters.priceRange[1] < 4) queryParams.append('maxPrice', filters.priceRange[1].toString());
      if (filters.rating > 0) queryParams.append('minRating', filters.rating.toString());
      queryParams.append('sortBy', filters.sortBy);
      queryParams.append('limit', '20');

      const response = await api.get(`/public/restaurants/search?${queryParams.toString()}`);
      if (response.data.success) {
        setRestaurants(response.data.data?.restaurants || []);
      }
    } catch (error) {
      setError(handleApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSearchParams = new URLSearchParams(searchParams);
    if (filters.query) {
      newSearchParams.set('q', filters.query);
    } else {
      newSearchParams.delete('q');
    }
    setSearchParams(newSearchParams);
    fetchRestaurants();
  };

  const handleCuisineToggle = (cuisine: string) => {
    const newCuisines = filters.cuisineTypes.includes(cuisine)
      ? filters.cuisineTypes.filter(c => c !== cuisine)
      : [...filters.cuisineTypes, cuisine];
    
    setFilters(prev => ({
      ...prev,
      cuisineTypes: newCuisines
    }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      cuisineTypes: [],
      priceRange: [1, 3],
      rating: 0,
      deliveryTime: 60,
      sortBy: 'rating',
    });
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Restaurants
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Discover amazing restaurants in your area
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Search restaurants, cuisines, or dishes..."
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition duration-200 flex items-center gap-2"
            >
              <SlidersHorizontal className="h-5 w-5" />
              Filters
            </button>
          </form>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Cuisine Types */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Cuisine Type</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cuisineOptions.map(cuisine => (
                      <label key={cuisine} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.cuisineTypes.includes(cuisine)}
                          onChange={() => handleCuisineToggle(cuisine)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{cuisine}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Price Range</h3>
                  <div className="space-y-2">
                    {[1, 2, 3].map(price => (
                      <label key={price} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.priceRange[0] <= price && filters.priceRange[1] >= price}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setFilters(prev => {
                              let newRange = [...prev.priceRange];
                              if (isChecked) {
                                if (price < newRange[0]) newRange[0] = price;
                                if (price > newRange[1]) newRange[1] = price;
                              } else {
                                if (price === newRange[0]) newRange[0] = Math.min(newRange[1], price + 1);
                                if (price === newRange[1]) newRange[1] = Math.max(newRange[0], price - 1);
                              }
                              return { ...prev, priceRange: newRange };
                            });
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          {'$'.repeat(price)} {price === 1 ? '(Budget)' : price === 2 ? '(Mid-range)' : '(Premium)'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Minimum Rating</h3>
                  <select
                    value={filters.rating}
                    onChange={(e) => setFilters(prev => ({ ...prev, rating: Number(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value={0}>Any Rating</option>
                    <option value={4}>4+ Stars</option>
                    <option value={4.5}>4.5+ Stars</option>
                    <option value={4.8}>4.8+ Stars</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Sort By</h3>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={clearFilters}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Clear all filters
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-400">
            {!isLoading && `${restaurants.length} restaurants found`}
          </p>
        </div>

        {/* Restaurant List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchRestaurants}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Try Again
            </button>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No restaurants found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Try adjusting your search criteria or filters
            </p>
            <button
              onClick={clearFilters}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map(restaurant => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const RestaurantCard: React.FC<{ restaurant: Restaurant }> = ({ restaurant }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      <div className="relative">
        <img
          src={restaurant.image ? getImageUrl(restaurant.image) : '/placeholder-restaurant.jpg'}
          alt={restaurant.name}
          className="w-full h-48 object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder-restaurant.jpg';
          }}
        />
        {restaurant.isOpen ? (
          <span className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            Open
          </span>
        ) : (
          <span className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            Closed
          </span>
        )}
      </div>
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {restaurant.name}
          </h3>
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {'$'.repeat(restaurant.priceRange)}
          </div>
        </div>
        
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
        </div>
        
        <div className="flex items-center justify-between text-sm mb-4">
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4 mr-1" />
            <span>{restaurant.deliveryTime?.min || 20}-{restaurant.deliveryTime?.max || 30} min</span>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            ${(restaurant.deliveryFee || 0).toFixed(2)} delivery
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs">
            {restaurant.cuisineType}
          </span>
          <div className="flex items-center text-gray-600 dark:text-gray-400 text-xs">
            <MapPin className="h-3 w-3 mr-1" />
            <span>{restaurant.address}</span>
          </div>
        </div>
        
        <button
          onClick={() => window.location.href = `/restaurants/${restaurant.id}`}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
        >
          View Menu
        </button>
      </div>
    </div>
  );
};

export default RestaurantsPage;