import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowLeft, 
  MapPin,
  CreditCard,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api, handleApiError } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { Address, PaymentMethod } from '../types';

interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  instructions?: string;
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, restaurant, totalItems, totalAmount, updateItemQuantity, removeItem, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  
  const [step, setStep] = useState<'cart' | 'address' | 'payment' | 'review'>('cart');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    instructions: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>({
    type: 'credit_card',
    details: {}
  });

  const deliveryFee = restaurant?.deliveryFee || 3.99;
  const tax = totalAmount * 0.08; // 8% tax
  const finalTotal = totalAmount + deliveryFee + tax;

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  // Show empty cart if no items
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12">
            <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your cart is empty</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Add some delicious items to get started
            </p>
            <button 
              onClick={() => navigate('/restaurants')}
              className="btn-primary"
            >
              Browse Restaurants
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
    } else {
      updateItemQuantity(itemId, newQuantity);
    }
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.zipCode) {
      setError('Please fill in all required address fields');
      return;
    }
    setError('');
    setStep('payment');
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError('');

    try {
      const orderData = {
        restaurantId: restaurant?.id,
        items: items.map(item => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          customizations: item.customizations,
          specialInstructions: item.specialInstructions
        })),
        deliveryAddress: {
          street: deliveryAddress.street,
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          zipCode: deliveryAddress.zipCode
        },
        paymentMethod,
        tip: 0, // Can be implemented later
        specialInstructions: deliveryAddress.instructions
      };

      const response = await api.post('/orders', orderData);
      if (response.data.success) {
        const order = response.data.data;
        
        // Clear cart after successful order
        clearCart();
        
        // Navigate to order tracking or success page
        navigate(`/orders/${order.id}`);
      } else {
        setError('Failed to place order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      setError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const renderCartStep = () => (
    <div className="space-y-6">
      {/* Restaurant Info */}
      {restaurant && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-300">{restaurant.name}</h3>
              <p className="text-blue-700 dark:text-blue-400 text-sm">{restaurant.cuisineType} • {restaurant.address}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-700 dark:text-blue-400 text-sm flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {restaurant.deliveryTime.min}-{restaurant.deliveryTime.max} min
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cart Items */}
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-start space-x-4">
              {/* Item Image */}
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                {item.menuItem.image ? (
                  <img 
                    src={item.menuItem.image} 
                    alt={item.menuItem.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl">
                    🍽️
                  </div>
                )}
              </div>
              
              {/* Item Details */}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{item.menuItem.name}</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">${item.menuItem.price.toFixed(2)} each</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                {item.specialInstructions && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                    Note: {item.specialInstructions}
                  </p>
                )}
                
                {/* Quantity Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    
                    <span className="font-medium text-gray-900 dark:text-white min-w-[2rem] text-center">
                      {item.quantity}
                    </span>
                    
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${item.totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Subtotal ({totalItems} items)</span>
            <span className="text-gray-900 dark:text-white">${totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Delivery Fee</span>
            <span className="text-gray-900 dark:text-white">${deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Tax</span>
            <span className="text-gray-900 dark:text-white">${tax.toFixed(2)}</span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
            <div className="flex justify-between font-semibold text-lg">
              <span className="text-gray-900 dark:text-white">Total</span>
              <span className="text-gray-900 dark:text-white">${finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setStep('address')}
          className="w-full mt-6 btn-primary"
        >
          Continue to Address
        </button>
      </div>
    </div>
  );

  const renderAddressStep = () => (
    <form onSubmit={handleAddressSubmit} className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          Delivery Address
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-sm flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Street Address *
            </label>
            <input
              type="text"
              value={deliveryAddress.street}
              onChange={(e) => setDeliveryAddress(prev => ({ ...prev, street: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="123 Main Street"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              City *
            </label>
            <input
              type="text"
              value={deliveryAddress.city}
              onChange={(e) => setDeliveryAddress(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="New York"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              State *
            </label>
            <input
              type="text"
              value={deliveryAddress.state}
              onChange={(e) => setDeliveryAddress(prev => ({ ...prev, state: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="NY"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ZIP Code *
            </label>
            <input
              type="text"
              value={deliveryAddress.zipCode}
              onChange={(e) => setDeliveryAddress(prev => ({ ...prev, zipCode: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="10001"
              required
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Delivery Instructions (Optional)
            </label>
            <textarea
              value={deliveryAddress.instructions}
              onChange={(e) => setDeliveryAddress(prev => ({ ...prev, instructions: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="e.g., Leave at door, Ring doorbell, etc."
            />
          </div>
        </div>
        
        <div className="flex space-x-4 mt-6">
          <button 
            type="button"
            onClick={() => setStep('cart')}
            className="flex-1 btn-secondary"
          >
            Back to Cart
          </button>
          <button 
            type="submit"
            className="flex-1 btn-primary"
          >
            Continue to Payment
          </button>
        </div>
      </div>
    </form>
  );

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <CreditCard className="h-5 w-5 mr-2" />
          Payment Method
        </h3>
        
        <div className="space-y-4">
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="payment"
                value="credit_card"
                checked={paymentMethod.type === 'credit_card'}
                onChange={(e) => setPaymentMethod({ type: 'credit_card' as const, details: {} })}
                className="mr-3"
              />
              <span className="text-gray-900 dark:text-white">Credit Card</span>
            </label>
          </div>
          
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="payment"
                value="cash"
                checked={paymentMethod.type === 'cash'}
                onChange={(e) => setPaymentMethod({ type: 'cash' as const, details: {} })}
                className="mr-3"
              />
              <span className="text-gray-900 dark:text-white">Cash on Delivery</span>
            </label>
          </div>
        </div>
        
        <div className="flex space-x-4 mt-6">
          <button 
            onClick={() => setStep('address')}
            className="flex-1 btn-secondary"
          >
            Back to Address
          </button>
          <button 
            onClick={() => setStep('review')}
            className="flex-1 btn-primary"
          >
            Review Order
          </button>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Order Review */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Review</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-sm flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </p>
          </div>
        )}
        
        {/* Restaurant */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">From: {restaurant?.name}</h4>
        </div>
        
        {/* Items */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Items ({totalItems})</h4>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {item.quantity}x {item.menuItem.name}
                </span>
                <span className="text-gray-900 dark:text-white">${item.totalPrice.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Address */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Delivery Address</h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {deliveryAddress.street}, {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.zipCode}
            {deliveryAddress.instructions && (
              <><br />Instructions: {deliveryAddress.instructions}</>
            )}
          </p>
        </div>
        
        {/* Payment */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Payment Method</h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm capitalize">
            {paymentMethod.type.replace('_', ' ')}
          </p>
        </div>
        
        {/* Total */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
              <span className="text-gray-900 dark:text-white">${totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Delivery Fee</span>
              <span className="text-gray-900 dark:text-white">${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Tax</span>
              <span className="text-gray-900 dark:text-white">${tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-300 dark:border-gray-600 pt-2">
              <div className="flex justify-between font-semibold text-lg">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-gray-900 dark:text-white">${finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-4 mt-6">
          <button 
            onClick={() => setStep('payment')}
            className="flex-1 btn-secondary"
            disabled={loading}
          >
            Back to Payment
          </button>
          <button 
            onClick={handlePlaceOrder}
            className="flex-1 btn-primary flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <LoadingSpinner />
            ) : (
              'Place Order'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const getStepTitle = () => {
    switch (step) {
      case 'cart': return 'Shopping Cart';
      case 'address': return 'Delivery Address';
      case 'payment': return 'Payment Method';
      case 'review': return 'Review Order';
      default: return 'Checkout';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button 
              onClick={() => {
                if (step === 'cart') {
                  navigate(-1);
                } else {
                  const steps = ['cart', 'address', 'payment', 'review'];
                  const currentIndex = steps.indexOf(step);
                  if (currentIndex > 0) {
                    setStep(steps[currentIndex - 1] as any);
                  }
                }
              }}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{getStepTitle()}</h1>
          </div>
          
          {/* Step Indicator */}
          <div className="hidden md:flex space-x-2">
            {(['cart', 'address', 'payment', 'review'] as const).map((stepName, index) => {
              const steps = ['cart', 'address', 'payment', 'review'];
              const currentIndex = steps.indexOf(step);
              const isActive = stepName === step;
              const isCompleted = steps.indexOf(stepName) < currentIndex;
              
              return (
                <div
                  key={stepName}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {index + 1}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        {step === 'cart' && renderCartStep()}
        {step === 'address' && renderAddressStep()}
        {step === 'payment' && renderPaymentStep()}
        {step === 'review' && renderReviewStep()}
      </div>
    </div>
  );
};

export default CheckoutPage;