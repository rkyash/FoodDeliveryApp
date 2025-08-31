import React, { useState, useEffect } from 'react';
import { 
  Store,
  ShoppingBag, 
  DollarSign, 
  Clock, 
  CheckCircle,
  Activity,
  Eye,
  Filter,
  Plus,
  Edit,
  ToggleLeft,
  ToggleRight,
  Settings,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api, handleApiError } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ImageUpload from '../components/ui/ImageUpload';
import MultiImageUpload from '../components/ui/MultiImageUpload';
import MenuCategoryForm from '../components/menu/MenuCategoryForm';
import MenuItemForm from '../components/menu/MenuItemForm';
import type { Restaurant as RestaurantType, MenuCategory, MenuItem, Order } from '../types';

interface RestaurantStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  averageOrderValue: number;
  rating: number;
  reviewCount: number;
}

interface RestaurantOrder extends Order {
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

interface MenuCategoryFormData {
  name: string;
  description: string;
  order: number;
}

interface MenuItemFormData {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  preparationTime: number;
  allergens: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
}

interface RestaurantSettingsFormProps {
  restaurant: RestaurantType;
  onUpdate: (updatedRestaurant: RestaurantType) => void;
}

const RestaurantSettingsForm: React.FC<RestaurantSettingsFormProps> = ({ restaurant, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: restaurant.name,
    description: restaurant.description,
    cuisineType: restaurant.cuisineType,
    address: restaurant.address,
    phone: restaurant.phone,
    email: restaurant.email,
    deliveryTime: restaurant.deliveryTime || { min: 20, max: 30 },
    deliveryFee: restaurant.deliveryFee || 0,
    priceRange: restaurant.priceRange,
    image: restaurant.image,
    gallery: restaurant.gallery || []
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('deliveryTime.')) {
      const field = name.split('.')[1] as 'min' | 'max';
      setFormData(prev => ({
        ...prev,
        deliveryTime: {
          ...prev.deliveryTime,
          [field]: parseInt(value) || 0
        }
      }));
    } else if (name === 'deliveryFee' || name === 'priceRange') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageUpload = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      image: imageUrl
    }));
    setError('');
  };

  const handleImageRemove = () => {
    setFormData(prev => ({
      ...prev,
      image: ''
    }));
  };

  const handleGalleryChange = (images: string[]) => {
    setFormData(prev => ({
      ...prev,
      gallery: images
    }));
    setError('');
  };

  const handleUploadError = (error: string) => {
    setError(error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await api.put(`/restaurants/${restaurant.id}`, formData);
      if (response.data.success) {
        const updatedRestaurant = response.data.data;
        onUpdate(updatedRestaurant);
        setSuccessMessage('Restaurant updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error: any) {
      console.error('Error updating restaurant:', error);
      setError(handleApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const cuisineOptions = [
    'Italian', 'Chinese', 'Indian', 'Mexican', 'Thai', 'Japanese', 
    'American', 'Mediterranean', 'French', 'Korean', 'Vietnamese', 
    'Greek', 'Middle Eastern', 'Spanish', 'German', 'Other'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Basic Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Restaurant Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="cuisineType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cuisine Type
            </label>
            <select
              id="cuisineType"
              name="cuisineType"
              required
              value={formData.cuisineType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select cuisine type</option>
              {cuisineOptions.map(cuisine => (
                <option key={cuisine} value={cuisine}>{cuisine}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={3}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Contact Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              required
              value={formData.address}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              required
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Service Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Service Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Delivery Time (minutes)
            </label>
            <div className="flex space-x-2">
              <div className="flex-1">
                <input
                  type="number"
                  name="deliveryTime.min"
                  min="10"
                  max="120"
                  value={formData.deliveryTime.min}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <span className="self-center text-gray-500">-</span>
              <div className="flex-1">
                <input
                  type="number"
                  name="deliveryTime.max"
                  min="10"
                  max="120"
                  value={formData.deliveryTime.max}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="deliveryFee" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Delivery Fee ($)
            </label>
            <input
              type="number"
              id="deliveryFee"
              name="deliveryFee"
              min="0"
              step="0.01"
              value={formData.deliveryFee}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="priceRange" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Price Range
            </label>
            <select
              id="priceRange"
              name="priceRange"
              value={formData.priceRange}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value={1}>$ - Budget Friendly</option>
              <option value={2}>$$ - Moderate</option>
              <option value={3}>$$$ - Expensive</option>
              <option value={4}>$$$$ - Very Expensive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Restaurant Images</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Main Restaurant Image
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              This will be the primary image displayed on your restaurant card
            </p>
            <ImageUpload
              type="restaurant"
              currentImage={formData.image}
              onUploadSuccess={handleImageUpload}
              onUploadError={handleUploadError}
              onRemoveImage={handleImageRemove}
              className="max-w-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Restaurant Gallery
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Add additional photos of your restaurant, food, and atmosphere (up to 6 images)
            </p>
            <MultiImageUpload
              type="restaurant"
              images={formData.gallery}
              onImagesChange={handleGalleryChange}
              onUploadError={handleUploadError}
              maxImages={6}
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="text-red-600 dark:text-red-400">{error}</div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="text-green-600 dark:text-green-400">{successMessage}</div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary flex items-center"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Settings className="h-4 w-4 mr-2" />
              Update Restaurant
            </>
          )}
        </button>
      </div>
    </form>
  );
};

const RestaurantDashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'menu' | 'settings'>('overview');
  const [restaurant, setRestaurant] = useState<RestaurantType | null>(null);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter states
  const [orderStatusFilter, setOrderStatusFilter] = useState('');

  // Modal states
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (user?.role !== 'restaurant_owner') {
      navigate('/');
      return;
    }
    
    fetchRestaurant();
  }, [isAuthenticated, user, navigate]);

  const fetchRestaurant = async () => {
    try {
      setLoading(true);
      const response = await api.get('/restaurants/me');
      if (response.data.data) {
        setRestaurant(response.data.data);
      } else {
        // No restaurant found, redirect to create one
        navigate('/restaurants/create');
        return;
      }
    } catch (error: any) {
      console.error('Error fetching restaurant:', error);
      if (error.response?.status === 404) {
        // Restaurant not found, redirect to create one
        navigate('/restaurants/create');
        return;
      }
      setError('Failed to load restaurant data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const params = new URLSearchParams({
        page: '1',
        limit: '20'
      });
      
      if (orderStatusFilter) params.append('status', orderStatusFilter);

      const response = await api.get(`/restaurant/orders?${params}`);
      setOrders(response.data.data?.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchMenu = async () => {
    if (!restaurant) return;
    
    try {
      setMenuLoading(true);
      const response = await api.get(`/public/restaurants/${restaurant.id}/menu`);
      setMenuCategories(response.data.data || []);
    } catch (error) {
      console.error('Error fetching menu:', error);
      setError('Failed to load menu');
    } finally {
      setMenuLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/restaurant/orders/${orderId}/status`, { status });
      fetchOrders(); // Refresh orders
      alert(`Order status updated to ${status}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const toggleMenuItemAvailability = async (itemId: string) => {
    try {
      await api.patch(`/menu/items/${itemId}/toggle`);
      fetchMenu(); // Refresh menu
    } catch (error) {
      console.error('Error toggling item availability:', error);
      alert('Failed to update item availability');
    }
  };

  const handleRestaurantUpdate = (updatedRestaurant: RestaurantType) => {
    setRestaurant(updatedRestaurant);
  };

  const handleCreateCategory = async (data: MenuCategoryFormData) => {
    setFormLoading(true);
    try {
      const response = await api.post('/menu/categories', data);
      if (response.data.success) {
        setCategoryFormOpen(false);
        fetchMenu(); // Refresh menu
      }
    } catch (error: any) {
      console.error('Error creating category:', error);
      alert('Failed to create category');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategory(category);
    setCategoryFormOpen(true);
  };

  const handleUpdateCategory = async (data: MenuCategoryFormData) => {
    if (!editingCategory) return;
    
    setFormLoading(true);
    try {
      const response = await api.put(`/menu/categories/${editingCategory.id}`, data);
      if (response.data.success) {
        setCategoryFormOpen(false);
        setEditingCategory(null);
        fetchMenu(); // Refresh menu
      }
    } catch (error: any) {
      console.error('Error updating category:', error);
      alert('Failed to update category');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateMenuItem = async (data: MenuItemFormData) => {
    setFormLoading(true);
    try {
      const payload = {
        ...data,
        allergens: data.allergens.split(',').map(a => a.trim()).filter(a => a),
        calories: data.calories || undefined,
        protein: data.protein || undefined,
        carbs: data.carbs || undefined,
        fat: data.fat || undefined,
        fiber: data.fiber || undefined,
        sodium: data.sodium || undefined,
      };
      
      const response = await api.post('/menu/items', payload);
      if (response.data.success) {
        setItemFormOpen(false);
        fetchMenu(); // Refresh menu
      }
    } catch (error: any) {
      console.error('Error creating menu item:', error);
      alert('Failed to create menu item');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditMenuItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemFormOpen(true);
  };

  const handleUpdateMenuItem = async (data: MenuItemFormData) => {
    if (!editingItem) return;
    
    setFormLoading(true);
    try {
      const payload = {
        ...data,
        allergens: data.allergens.split(',').map(a => a.trim()).filter(a => a),
        calories: data.calories || undefined,
        protein: data.protein || undefined,
        carbs: data.carbs || undefined,
        fat: data.fat || undefined,
        fiber: data.fiber || undefined,
        sodium: data.sodium || undefined,
      };
      
      const response = await api.put(`/menu/items/${editingItem.id}`, payload);
      if (response.data.success) {
        setItemFormOpen(false);
        setEditingItem(null);
        fetchMenu(); // Refresh menu
      }
    } catch (error: any) {
      console.error('Error updating menu item:', error);
      alert('Failed to update menu item');
    } finally {
      setFormLoading(false);
    }
  };

  const closeCategoryForm = () => {
    setCategoryFormOpen(false);
    setEditingCategory(null);
  };

  const closeItemForm = () => {
    setItemFormOpen(false);
    setEditingItem(null);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'orders' && orders.length === 0) {
      fetchOrders();
    } else if (tab === 'menu' && menuCategories.length === 0) {
      fetchMenu();
    }
  };

  const calculateStats = (): RestaurantStats => {
    if (!restaurant || orders.length === 0) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        completedOrders: 0,
        averageOrderValue: 0,
        rating: restaurant?.rating || 0,
        reviewCount: restaurant?.reviewCount || 0
      };
    }

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => 
      sum + order.totalAmount + order.deliveryFee + order.tax + order.tip, 0
    );
    const pendingOrders = orders.filter(order => 
      ['pending', 'confirmed', 'preparing'].includes(order.status)
    ).length;
    const completedOrders = orders.filter(order => 
      order.status === 'delivered'
    ).length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      averageOrderValue,
      rating: restaurant.rating,
      reviewCount: restaurant.reviewCount
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'preparing': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'ready_for_pickup': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'picked_up': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 'on_the_way': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getNextStatusOptions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending': return ['confirmed', 'cancelled'];
      case 'confirmed': return ['preparing', 'cancelled'];
      case 'preparing': return ['ready_for_pickup', 'cancelled'];
      case 'ready_for_pickup': return ['picked_up'];
      case 'picked_up': return ['on_the_way'];
      case 'on_the_way': return ['delivered'];
      default: return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <button 
              onClick={fetchRestaurant}
              className="mt-4 btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {restaurant?.name || 'Restaurant'} Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your restaurant, orders, menu and settings
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: Activity },
              { key: 'orders', label: 'Orders', icon: ShoppingBag },
              { key: 'menu', label: 'Menu', icon: Store },
              { key: 'settings', label: 'Settings', icon: Settings }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === key
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && restaurant && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ShoppingBag className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Total Orders
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {stats.totalOrders.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {stats.completedOrders} completed
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Total Revenue
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {formatCurrency(stats.totalRevenue)}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Avg: {formatCurrency(stats.averageOrderValue)}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Pending Orders
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {stats.pendingOrders.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Rating
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {stats.rating.toFixed(1)}/5.0
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {stats.reviewCount} reviews
                  </div>
                </div>
              </div>
            </div>

            {/* Restaurant Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Restaurant Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Basic Details</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-500">Cuisine:</span> {restaurant.cuisineType}</p>
                      <p><span className="text-gray-500">Address:</span> {restaurant.address}</p>
                      <p><span className="text-gray-500">Phone:</span> {restaurant.phone}</p>
                      <p><span className="text-gray-500">Email:</span> {restaurant.email}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Service Details</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-500">Delivery Time:</span> {restaurant.deliveryTime?.min || 20}-{restaurant.deliveryTime?.max || 30} min</p>
                      <p><span className="text-gray-500">Delivery Fee:</span> {formatCurrency(restaurant.deliveryFee || 0)}</p>
                      <p><span className="text-gray-500">Price Range:</span> {'$'.repeat(restaurant.priceRange)}</p>
                      <p>
                        <span className="text-gray-500">Status:</span> 
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                          restaurant.isOpen 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {restaurant.isOpen ? 'Open' : 'Closed'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Order Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Order Status
                  </label>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready_for_pickup">Ready for Pickup</option>
                    <option value="picked_up">Picked Up</option>
                    <option value="on_the_way">On the Way</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={fetchOrders}
                    className="w-full btn-primary flex items-center justify-center"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Orders List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Order Management</h3>
              </div>

              {ordersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No orders found</p>
                </div>
              ) : (
                <div className="space-y-4 p-6">
                  {orders.map((order) => (
                    <div key={order.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              Order #{order.id.slice(-8).toUpperCase()}
                            </h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <p>Customer: {order.user?.firstName} {order.user?.lastName}</p>
                            <p>Phone: {order.user?.phone}</p>
                            <p>Date: {formatDate(order.createdAt)}</p>
                            <p>Items: {order.items.length} items</p>
                          </div>
                        </div>
                        
                        <div className="text-right space-y-2">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(order.totalAmount + order.deliveryFee + order.tax + order.tip)}
                          </p>
                          
                          <div className="space-y-2">
                            <button
                              onClick={() => navigate(`/orders/${order.id}`)}
                              className="block w-full text-primary-600 hover:text-primary-800 dark:text-primary-400 text-sm"
                            >
                              <Eye className="h-4 w-4 mr-1 inline" />
                              View Details
                            </button>
                            
                            {getNextStatusOptions(order.status).length > 0 && (
                              <div>
                                <select
                                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700"
                                  defaultValue=""
                                >
                                  <option value="" disabled>Update Status</option>
                                  {getNextStatusOptions(order.status).map(status => (
                                    <option key={status} value={status}>
                                      {status.replace('_', ' ')}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Menu Management</h3>
              <div className="space-x-2">
                <button 
                  onClick={() => setCategoryFormOpen(true)}
                  className="btn-secondary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </button>
                <button 
                  onClick={() => setItemFormOpen(true)}
                  className="btn-primary"
                  disabled={menuCategories.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </button>
              </div>
            </div>

            {menuLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : menuCategories.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No menu items yet</h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Start building your menu by adding categories and items</p>
                <button 
                  onClick={() => setCategoryFormOpen(true)}
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Category
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {menuCategories.map((category) => (
                  <div key={category.id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">{category.name}</h4>
                        <button 
                          onClick={() => handleEditCategory(category)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                      {category.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{category.description}</p>
                      )}
                    </div>
                    
                    <div className="p-6">
                      {category.menuItems && category.menuItems.length > 0 ? (
                        <div className="space-y-4">
                          {category.menuItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <h5 className="font-medium text-gray-900 dark:text-white">{item.name}</h5>
                                  <span className="text-lg font-bold text-primary-600">
                                    {formatCurrency(item.price)}
                                  </span>
                                  <button
                                    onClick={() => toggleMenuItemAvailability(item.id, !item.isAvailable)}
                                    className={`flex items-center text-sm ${
                                      item.isAvailable ? 'text-green-600' : 'text-red-600'
                                    }`}
                                  >
                                    {item.isAvailable ? (
                                      <ToggleRight className="h-5 w-5 mr-1" />
                                    ) : (
                                      <ToggleLeft className="h-5 w-5 mr-1" />
                                    )}
                                    {item.isAvailable ? 'Available' : 'Unavailable'}
                                  </button>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                                {item.preparationTime && (
                                  <p className="text-xs text-gray-500 mt-1">Prep time: {item.preparationTime} min</p>
                                )}
                              </div>
                              <button 
                                onClick={() => handleEditMenuItem(item)}
                                className="ml-4 text-gray-500 hover:text-gray-700"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500 dark:text-gray-400">No items in this category</p>
                          <button 
                            onClick={() => setItemFormOpen(true)}
                            className="mt-2 text-primary-600 hover:text-primary-800 text-sm"
                          >
                            Add Item
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && restaurant && (
          <RestaurantSettingsForm 
            restaurant={restaurant} 
            onUpdate={handleRestaurantUpdate}
          />
        )}
      </div>

      {/* Modal Components */}
      <MenuCategoryForm
        isOpen={categoryFormOpen}
        onClose={closeCategoryForm}
        onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
        editCategory={editingCategory}
        loading={formLoading}
      />

      <MenuItemForm
        isOpen={itemFormOpen}
        onClose={closeItemForm}
        onSubmit={editingItem ? handleUpdateMenuItem : handleCreateMenuItem}
        categories={menuCategories}
        editItem={editingItem}
        loading={formLoading}
      />
    </div>
  );
};

export default RestaurantDashboardPage;