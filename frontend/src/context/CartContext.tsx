import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { CartItem, CartState, Restaurant, MenuItem, SelectedCustomization } from '../types';

interface CartContextType extends CartState {
  addItem: (item: MenuItem, quantity: number, customizations: SelectedCustomization[], specialInstructions?: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  setRestaurant: (restaurant: Restaurant) => void;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_RESTAURANT'; payload: Restaurant }
  | { type: 'LOAD_CART'; payload: CartState };

const initialState: CartState = {
  items: [],
  restaurant: null,
  totalItems: 0,
  totalAmount: 0,
};

const calculateTotals = (items: CartItem[]) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  return { totalItems, totalAmount };
};

const calculateItemPrice = (
  menuItem: MenuItem,
  quantity: number,
  customizations: SelectedCustomization[]
): number => {
  let basePrice = menuItem.price;
  
  // Handle cases where customizations might be empty or undefined
  if (menuItem.customizations && menuItem.customizations.length > 0) {
    menuItem.customizations.forEach(customization => {
      const selectedCustomization = customizations.find(c => c.customizationId === customization.id);
      if (selectedCustomization) {
        selectedCustomization.optionIds.forEach(optionId => {
          const option = customization.options.find(o => o.id === optionId);
          if (option) {
            basePrice += option.priceModifier;
          }
        });
      }
    });
  }

  return basePrice * quantity;
};

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(
        item => item.menuItem.id === action.payload.menuItem.id &&
        JSON.stringify(item.customizations) === JSON.stringify(action.payload.customizations)
      );

      let newItems;
      if (existingItemIndex >= 0) {
        newItems = [...state.items];
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + action.payload.quantity,
          totalPrice: newItems[existingItemIndex].totalPrice + action.payload.totalPrice,
        };
      } else {
        newItems = [...state.items, action.payload];
      }

      const { totalItems, totalAmount } = calculateTotals(newItems);
      return { ...state, items: newItems, totalItems, totalAmount };
    }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item => {
        if (item.id === action.payload.itemId) {
          const newQuantity = action.payload.quantity;
          if (newQuantity <= 0) return null;
          
          const newTotalPrice = calculateItemPrice(
            item.menuItem,
            newQuantity,
            item.customizations
          );
          
          return { ...item, quantity: newQuantity, totalPrice: newTotalPrice };
        }
        return item;
      }).filter(Boolean) as CartItem[];

      const { totalItems, totalAmount } = calculateTotals(newItems);
      return { ...state, items: newItems, totalItems, totalAmount };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload);
      const { totalItems, totalAmount } = calculateTotals(newItems);
      return { ...state, items: newItems, totalItems, totalAmount };
    }

    case 'CLEAR_CART':
      return { ...initialState };

    case 'SET_RESTAURANT':
      return { ...state, restaurant: action.payload };

    case 'LOAD_CART':
      return action.payload;

    default:
      return state;
  }
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        dispatch({ type: 'LOAD_CART', payload: parsedCart });
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state));
  }, [state]);

  const addItem = (
    menuItem: MenuItem,
    quantity: number,
    customizations: SelectedCustomization[],
    specialInstructions?: string
  ): void => {
    const totalPrice = calculateItemPrice(menuItem, quantity, customizations);
    const cartItem: CartItem = {
      id: `${menuItem.id}-${Date.now()}`,
      menuItem,
      quantity,
      customizations,
      specialInstructions,
      totalPrice,
    };

    dispatch({ type: 'ADD_ITEM', payload: cartItem });
  };

  const updateItemQuantity = (itemId: string, quantity: number): void => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
  };

  const removeItem = (itemId: string): void => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId });
  };

  const clearCart = (): void => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const setRestaurant = (restaurant: Restaurant): void => {
    if (state.restaurant && state.restaurant.id !== restaurant.id && state.items.length > 0) {
      const confirmClear = window.confirm(
        'You have items from another restaurant in your cart. Adding items from a different restaurant will clear your cart. Continue?'
      );
      if (confirmClear) {
        dispatch({ type: 'CLEAR_CART' });
        dispatch({ type: 'SET_RESTAURANT', payload: restaurant });
      }
    } else {
      dispatch({ type: 'SET_RESTAURANT', payload: restaurant });
    }
  };

  const value: CartContextType = {
    ...state,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    setRestaurant,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};