import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Circle, 
  Truck, 
  ChefHat, 
  Package,
  Phone,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, handleApiError } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { Order, OrderStatus, TrackingUpdate } from '../types';

const OrderTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (id) {
      fetchOrder();
      
      // Set up polling for real-time updates
      const interval = setInterval(() => {
        if (!loading) {
          fetchOrder(true); // silent refresh
        }
      }, 30000); // Update every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [id, isAuthenticated, navigate]);

  const fetchOrder = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      const response = await api.get(`/orders/${id}`);
      if (response.data.success) {
        const orderData = response.data.data;
      
      // Transform backend order data to match frontend types
      const transformedOrder: Order = {
        id: orderData.id,
        userId: orderData.userId,
        restaurantId: orderData.restaurantId,
        items: orderData.items || [],
        status: orderData.status as OrderStatus,
        totalAmount: orderData.totalAmount || 0,
        deliveryFee: orderData.deliveryFee || 0,
        tax: orderData.tax || 0,
        tip: orderData.tip || 0,
        deliveryAddress: orderData.deliveryAddress || {
          id: '',
          userId: orderData.userId,
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'US',
          isDefault: false
        },
        paymentMethod: orderData.paymentMethod || { type: 'credit_card', details: {} },
        specialInstructions: orderData.specialInstructions,
        estimatedDeliveryTime: orderData.estimatedDeliveryTime || '',
        actualDeliveryTime: orderData.actualDeliveryTime,
        trackingUpdates: orderData.trackingUpdates || [],
        createdAt: orderData.createdAt,
        updatedAt: orderData.updatedAt
      };
      
      setOrder(transformedOrder);
      } else {
        setError('Failed to load order details');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      setError(handleApiError(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: OrderStatus, isActive: boolean) => {
    const iconProps = {
      className: `h-5 w-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`,
    };
    
    switch (status) {
      case 'pending': return <Circle {...iconProps} />;
      case 'confirmed': return isActive ? <CheckCircle {...iconProps} /> : <Circle {...iconProps} />;
      case 'preparing': return <ChefHat {...iconProps} />;
      case 'ready_for_pickup': return <Package {...iconProps} />;
      case 'picked_up': return <Package {...iconProps} />;
      case 'on_the_way': return <Truck {...iconProps} />;
      case 'delivered': return <CheckCircle {...iconProps} />;
      default: return <Circle {...iconProps} />;
    }
  };

  const getStatusSteps = (): { status: OrderStatus; label: string; description: string }[] => [
    { status: 'confirmed', label: 'Order Confirmed', description: 'Restaurant received your order' },
    { status: 'preparing', label: 'Preparing', description: 'Chef is preparing your food' },
    { status: 'ready_for_pickup', label: 'Ready for Pickup', description: 'Order is ready for delivery' },
    { status: 'picked_up', label: 'Picked Up', description: 'Driver picked up your order' },
    { status: 'on_the_way', label: 'On the Way', description: 'Driver is heading to you' },
    { status: 'delivered', label: 'Delivered', description: 'Order has been delivered' },
  ];

  const getCurrentStepIndex = (currentStatus: OrderStatus): number => {
    const steps = ['confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way', 'delivered'];
    return steps.indexOf(currentStatus);
  };

  const getEstimatedTimeRemaining = (): string => {
    if (!order || !order.estimatedDeliveryTime) return 'Calculating...';
    
    const now = new Date();
    const estimated = new Date(order.estimatedDeliveryTime);
    const diffMinutes = Math.max(0, Math.floor((estimated.getTime() - now.getTime()) / (1000 * 60)));
    
    if (diffMinutes === 0) return 'Any moment now!';
    if (diffMinutes < 60) return `${diffMinutes} minutes`;
    
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Order not found'}</p>
            <button 
              onClick={() => navigate('/orders')}
              className="btn-primary"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusSteps = getStatusSteps();
  const currentStepIndex = getCurrentStepIndex(order.status);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/orders')}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Back to Orders
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Order #{order.id.slice(-8).toUpperCase()}
            </h1>
          </div>
          
          <button 
            onClick={() => fetchOrder()}
            className={`flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors ${refreshing ? 'animate-spin' : ''}`}
            disabled={refreshing}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Status */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Status Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Order Status</h2>
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Estimated delivery</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {getEstimatedTimeRemaining()}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Status Progress */}
              <div className="space-y-4">
                {statusSteps.map((step, index) => {
                  const isCompleted = index < currentStepIndex;
                  const isActive = index === currentStepIndex;
                  const isPending = index > currentStepIndex;
                  
                  return (
                    <div key={step.status} className="flex items-center">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        isCompleted
                          ? 'bg-green-500 border-green-500'
                          : isActive
                          ? 'bg-primary-600 border-primary-600'
                          : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-white" />
                        ) : (
                          getStatusIcon(step.status, isActive)
                        )}
                      </div>
                      
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-medium ${
                            isCompleted || isActive
                              ? 'text-gray-900 dark:text-white'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {step.label}
                          </h3>
                          
                          {isActive && (
                            <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-300 rounded-full text-xs font-medium">
                              Current
                            </span>
                          )}
                        </div>
                        
                        <p className={`text-sm ${
                          isCompleted || isActive
                            ? 'text-gray-600 dark:text-gray-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {step.description}
                        </p>
                      </div>
                      
                      {index < statusSteps.length - 1 && (
                        <div className={`absolute left-5 mt-10 w-0.5 h-6 ${
                          index < currentStepIndex
                            ? 'bg-green-500'
                            : index === currentStepIndex
                            ? 'bg-primary-600'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`} style={{ transform: 'translateY(20px)' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delivery Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Delivery Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Delivery Address</p>
                  <p className="text-gray-900 dark:text-white">
                    {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
                  </p>
                </div>
                
                {order.specialInstructions && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Special Instructions</p>
                    <p className="text-gray-900 dark:text-white">{order.specialInstructions}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Payment Method</p>
                  <p className="text-gray-900 dark:text-white capitalize">
                    {order.paymentMethod.type.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            {/* Items */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Items</h3>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-gray-900 dark:text-white">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Total</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-900 dark:text-white">${order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Delivery Fee</span>
                  <span className="text-gray-900 dark:text-white">${order.deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tax</span>
                  <span className="text-gray-900 dark:text-white">${order.tax.toFixed(2)}</span>
                </div>
                {order.tip > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tip</span>
                    <span className="text-gray-900 dark:text-white">${order.tip.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-gray-900 dark:text-white">
                      ${(order.totalAmount + order.deliveryFee + order.tax + order.tip).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact */}
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Need Help?</h3>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Restaurant
                  </button>
                  <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat Support
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;