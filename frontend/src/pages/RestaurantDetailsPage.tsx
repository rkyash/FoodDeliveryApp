import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Star, 
  Clock, 
  DollarSign, 
  MapPin, 
  Phone, 
  Plus, 
  Minus,
  ShoppingCart,
  ArrowLeft,
  Heart,
  Share2
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api, handleApiError, getImageUrl } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ReviewList from '../components/reviews/ReviewList';
import type { Restaurant, MenuCategory, MenuItem } from '../types';

interface RestaurantWithMenu extends Restaurant {
  menu?: MenuCategory[];
}

interface MenuItemWithCategory extends MenuItem {
  categoryName?: string;
}

const RestaurantDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, setRestaurant } = useCart();
  const { isAuthenticated } = useAuth();
  
  const [restaurant, setRestaurantData] = useState<RestaurantWithMenu | null>(null);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (id) {
      fetchRestaurantDetails();
      fetchMenu();
    }
  }, [id]);

  const fetchRestaurantDetails = async () => {
    try {
      const response = await api.get(`/public/restaurants/${id}`);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch restaurant');
      }
      const restaurantData = response.data.data;
      
      // Transform backend response to match frontend types
      const transformedRestaurant: Restaurant = {
        id: restaurantData.id,
        name: restaurantData.name,
        description: restaurantData.description,
        cuisineType: restaurantData.cuisineType,
        address: restaurantData.address,
        phone: restaurantData.phone,
        email: restaurantData.email,
        rating: restaurantData.rating || 0,
        reviewCount: restaurantData.reviewCount || 0,
        priceRange: restaurantData.priceRange,
        deliveryFee: restaurantData.deliveryFee || 0,
        deliveryTime: {
          min: restaurantData.minDeliveryTime || 30,
          max: restaurantData.maxDeliveryTime || 60
        },
        isOpen: restaurantData.isOpen,
        openingHours: [], // Will be implemented later
        image: restaurantData.image || '',
        gallery: [], // Will be implemented later
        ownerId: restaurantData.ownerId,
        createdAt: restaurantData.createdAt,
        updatedAt: restaurantData.updatedAt
      };
      
      setRestaurantData(transformedRestaurant);
      setRestaurant(transformedRestaurant);
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      setError('Failed to load restaurant details');
    }
  };

  const fetchMenu = async () => {
    try {
      const response = await api.get(`/public/restaurants/${id}/menu`);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch menu');
      }
      const menuData = response.data.data || [];
      
      // Transform menu data to match frontend types
      const transformedMenu: MenuCategory[] = menuData.map((category: any) => ({
        id: category.id,
        restaurantId: category.restaurantId,
        name: category.name,
        description: category.description,
        order: category.order,
        isActive: category.isActive,
        menuItems: (category.menuItems || []).map((item: any) => ({
          id: item.id,
          restaurantId: item.restaurantId,
          categoryId: item.categoryId,
          name: item.name,
          description: item.description,
          price: item.price,
          image: item.image,
          isAvailable: item.isAvailable,
          preparationTime: item.preparationTime || 15,
          allergens: typeof item.allergens === 'string' ? item.allergens.split(',').filter(Boolean) : [],
          customizations: [], // Will be implemented later
          nutritionInfo: item.calories ? {
            calories: item.calories,
            protein: item.protein || 0,
            carbs: item.carbs || 0,
            fat: item.fat || 0,
            fiber: item.fiber || 0,
            sodium: item.sodium || 0
          } : undefined
        }))
      }));
      
      setMenu(transformedMenu);
      if (transformedMenu.length > 0) {
        setSelectedCategory(transformedMenu[0].id);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      setError('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (itemId: string, change: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + change)
    }));
  };

  const handleAddToCart = (item: MenuItem) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const quantity = quantities[item.id] || 1;
    addItem(item, quantity, [], undefined);
    
    // Reset quantity after adding
    setQuantities(prev => ({
      ...prev,
      [item.id]: 0
    }));

    // You can add a toast notification here
    alert(`Added ${quantity} ${item.name}(s) to cart!`);
  };

  const getPriceRangeText = (range: number) => {
    switch (range) {
      case 1: return '$';
      case 2: return '$$';
      case 3: return '$$$';
      default: return '$';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Restaurant not found'}</p>
            <button 
              onClick={() => navigate('/restaurants')}
              className="btn-primary"
            >
              Back to Restaurants
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedMenuItems = menu.find(cat => cat.id === selectedCategory)?.menuItems || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button 
            onClick={() => navigate('/restaurants')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Restaurants
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Restaurant Image */}
            <div className="w-full lg:w-80 h-60 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
              {restaurant.image ? (
                <img 
                  src={getImageUrl(restaurant.image)} 
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  🍽️
                </div>
              )}
            </div>
            
            {/* Restaurant Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {restaurant.name}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {restaurant.description}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 text-gray-500 hover:text-red-500 transition-colors">
                    <Heart className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-blue-500 transition-colors">
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-yellow-400 mr-1" />
                  <span className="text-gray-900 dark:text-white font-medium">
                    {restaurant.rating.toFixed(1)}
                  </span>
                  <span className="text-gray-500 ml-1">({restaurant.reviewCount} reviews)</span>
                </div>
                
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Clock className="h-5 w-5 mr-1" />
                  <span>{restaurant.deliveryTime.min}-{restaurant.deliveryTime.max} min</span>
                </div>
                
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <DollarSign className="h-5 w-5 mr-1" />
                  <span>{getPriceRangeText(restaurant.priceRange)} • ${restaurant.deliveryFee.toFixed(2)} delivery</span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{restaurant.address}</span>
                </div>
                
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Phone className="h-4 w-4 mr-1" />
                  <span>{restaurant.phone}</span>
                </div>
                
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  restaurant.isOpen 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {restaurant.isOpen ? 'Open' : 'Closed'}
                </div>
                
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium capitalize">
                  {restaurant.cuisineType}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Menu Categories Sidebar */}
          {menu.length > 0 && (
            <div className="lg:w-64">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 lg:sticky lg:top-8">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Menu Categories</h3>
                <div className="space-y-2">
                  {menu.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="font-medium">{category.name}</span>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">
                        {category.menuItems?.length || 0} items
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Menu Items */}
          <div className="flex-1">
            {menu.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">No menu available for this restaurant yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {selectedMenuItems.map((item) => (
                  <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Item Image */}
                      <div className="w-full sm:w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img 
                            src={getImageUrl(item.image)} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-2xl">
                            🍽️
                          </div>
                        )}
                      </div>
                      
                      {/* Item Details */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {item.name}
                          </h4>
                          <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                            ${item.price.toFixed(2)}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          {item.description}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
                          <div className="flex items-center text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{item.preparationTime} min</span>
                          </div>
                          
                          {item.nutritionInfo && (
                            <div className="text-gray-500">
                              <span>{item.nutritionInfo.calories} cal</span>
                            </div>
                          )}
                          
                          {item.allergens.length > 0 && (
                            <div className="text-orange-600 dark:text-orange-400 text-xs">
                              Allergens: {item.allergens.join(', ')}
                            </div>
                          )}
                          
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.isAvailable
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {item.isAvailable ? 'Available' : 'Unavailable'}
                          </div>
                        </div>
                        
                        {/* Add to Cart Controls */}
                        {item.isAvailable && restaurant.isOpen && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => handleQuantityChange(item.id, -1)}
                                className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                disabled={(quantities[item.id] || 0) <= 0}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              
                              <span className="font-medium text-gray-900 dark:text-white min-w-[2rem] text-center">
                                {quantities[item.id] || 0}
                              </span>
                              
                              <button
                                onClick={() => handleQuantityChange(item.id, 1)}
                                className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            
                            <button
                              onClick={() => handleAddToCart(item)}
                              disabled={(quantities[item.id] || 0) === 0}
                              className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                            >
                              <ShoppingCart className="h-4 w-4" />
                              <span>Add to Cart</span>
                            </button>
                          </div>
                        )}
                        
                        {!item.isAvailable && (
                          <p className="text-red-600 dark:text-red-400 font-medium">Currently unavailable</p>
                        )}
                        
                        {!restaurant.isOpen && (
                          <p className="text-orange-600 dark:text-orange-400 font-medium">Restaurant is currently closed</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <ReviewList restaurantId={id!} />
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetailsPage;