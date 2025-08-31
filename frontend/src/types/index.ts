export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'customer' | 'restaurant_owner' | 'admin';
  address?: Address[];
  favorites: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisineType: string;
  address: string;
  phone: string;
  email: string;
  rating: number;
  reviewCount: number;
  priceRange: 1 | 2 | 3;
  deliveryFee: number;
  deliveryTime: {
    min: number;
    max: number;
  };
  isOpen: boolean;
  openingHours: OpeningHours[];
  image: string;
  gallery: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpeningHours {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  order: number;
  isActive: boolean;
  menuItems?: MenuItem[];
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  isAvailable: boolean;
  preparationTime: number;
  allergens: string[];
  customizations: MenuItemCustomization[];
  nutritionInfo?: NutritionInfo;
}

export interface MenuItemCustomization {
  id: string;
  name: string;
  type: 'size' | 'addon' | 'choice';
  required: boolean;
  maxSelections: number;
  options: CustomizationOption[];
}

export interface CustomizationOption {
  id: string;
  name: string;
  priceModifier: number;
  isAvailable: boolean;
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
}

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  customizations: SelectedCustomization[];
  specialInstructions?: string;
  totalPrice: number;
}

export interface SelectedCustomization {
  customizationId: string;
  optionIds: string[];
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  deliveryFee: number;
  tax: number;
  tip: number;
  deliveryAddress: Address;
  paymentMethod: PaymentMethod;
  specialInstructions?: string;
  estimatedDeliveryTime: string;
  actualDeliveryTime?: string;
  trackingUpdates: TrackingUpdate[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  customizations: SelectedCustomization[];
  specialInstructions?: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'preparing' 
  | 'ready_for_pickup' 
  | 'picked_up' 
  | 'on_the_way' 
  | 'delivered' 
  | 'cancelled';

export interface TrackingUpdate {
  id: string;
  status: OrderStatus;
  message: string;
  timestamp: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface PaymentMethod {
  type: 'credit_card' | 'debit_card' | 'digital_wallet' | 'cash';
  details: {
    last4?: string;
    brand?: string;
    walletType?: string;
  };
}

export interface Review {
  id: string;
  userId: string;
  restaurantId: string;
  orderId: string;
  rating: number;
  comment: string;
  photos: string[];
  userName?: string;
  response?: {
    message: string;
    timestamp: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SearchFilters {
  query?: string;
  cuisineTypes: string[];
  priceRange: number[];
  rating: number;
  deliveryTime: number;
  sortBy: 'rating' | 'deliveryTime' | 'deliveryFee' | 'distance';
  location?: {
    lat: number;
    lng: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface CartState {
  items: CartItem[];
  restaurant: Restaurant | null;
  totalItems: number;
  totalAmount: number;
}

export interface AppTheme {
  mode: 'light' | 'dark';
}