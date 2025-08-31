import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  MapPin, 
  ShoppingBag, 
  Eye, 
  RefreshCw,
  Calendar,
  DollarSign,
  Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, handleApiError } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ReviewForm from '../components/reviews/ReviewForm';
import type { Order, OrderStatus } from '../types';

const OrderHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchOrders();
  }, [isAuthenticated, navigate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders');
      if (response.data.success) {
        const ordersData = response.data.data?.orders || [];
        
        // Transform backend order data to match frontend types
        const transformedOrders: Order[] = ordersData.map((order: any) => ({
        id: order.id,
        userId: order.userId,
        restaurantId: order.restaurantId,
        items: order.items || [],
        status: order.status as OrderStatus,
        totalAmount: order.totalAmount || 0,
        deliveryFee: order.deliveryFee || 0,
        tax: order.tax || 0,
        tip: order.tip || 0,
        deliveryAddress: order.deliveryAddress || {
          id: '',
          userId: order.userId,
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'US',
          isDefault: false
        },
        paymentMethod: order.paymentMethod || { type: 'credit_card', details: {} },
        specialInstructions: order.specialInstructions,
        estimatedDeliveryTime: order.estimatedDeliveryTime || '',
        actualDeliveryTime: order.actualDeliveryTime,
        trackingUpdates: order.trackingUpdates || [],
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }));
      
      setOrders(transformedOrders);
      } else {
        setError('Failed to load order history');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleWriteReview = (order: Order) => {
    setSelectedOrder(order);
    setShowReviewForm(true);
  };

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    setSelectedOrder(null);
    // Optionally refresh orders to update review status
    fetchOrders();
  };

  const getStatusColor = (status: OrderStatus) => {
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

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'preparing': return 'Preparing';
      case 'ready_for_pickup': return 'Ready for Pickup';
      case 'picked_up': return 'Picked Up';
      case 'on_the_way': return 'On the Way';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Order History</h1>
          <button 
            onClick={fetchOrders}
            className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No orders yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start ordering from your favorite restaurants
            </p>
            <button 
              onClick={() => navigate('/restaurants')}
              className="btn-primary"
            >
              Browse Restaurants
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        <span>${(order.totalAmount + order.deliveryFee + order.tax + order.tip).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <ShoppingBag className="h-4 w-4 mr-1" />
                        <span>{order.items.length} items</span>
                      </div>
                      
                      {order.estimatedDeliveryTime && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>ETA: {new Date(order.estimatedDeliveryTime).toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {order.deliveryAddress && (
                      <div className="flex items-start mt-2">
                        <MapPin className="h-4 w-4 mr-1 mt-0.5 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="flex items-center px-4 py-2 text-primary-600 dark:text-primary-400 border border-primary-600 dark:border-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </button>
                    
                    {(order.status === 'confirmed' || order.status === 'preparing' || order.status === 'ready_for_pickup' || order.status === 'picked_up' || order.status === 'on_the_way') && (
                      <button 
                        onClick={() => navigate(`/orders/${order.id}/track`)}
                        className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Track Order
                      </button>
                    )}
                    
                    {order.status === 'delivered' && (
                      <button 
                        onClick={() => handleWriteReview(order)}
                        className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Write Review
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Items Preview */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex flex-wrap gap-2">
                    {order.items.slice(0, 3).map((item, index) => (
                      <span key={index} className="text-sm text-gray-600 dark:text-gray-400">
                        {item.quantity}x {item.name}
                        {index < Math.min(order.items.length, 3) - 1 && ','}
                      </span>
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-sm text-gray-500 dark:text-gray-500">
                        +{order.items.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Review Form Modal */}
        {showReviewForm && selectedOrder && (
          <ReviewForm
            restaurantId={selectedOrder.restaurantId}
            orderId={selectedOrder.id}
            onClose={() => {
              setShowReviewForm(false);
              setSelectedOrder(null);
            }}
            onSuccess={handleReviewSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default OrderHistoryPage;