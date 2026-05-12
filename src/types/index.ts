import { AppRole } from '@/lib/constants/roles'

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  originalPrice?: number
  discount?: number
  image: string
  images?: string[]
  category: Category
  categorySlug: string
  categoryId: string
  stock: number
  sku: string
  barcode?: string
  weight?: number
  unit: string
  isActive: boolean
  isFeatured: boolean
  rating?: number
  reviewCount?: number
  isExempt?: boolean
  tags?: string[]
  nutritionalInfo?: NutritionalInfo
  lowStockThreshold: number
  nutritionalSeals?: number
  isRealtimeTracked?: boolean
  createdAt: string
  updatedAt: string
}

export interface NutritionalInfo {
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber?: number
  sodium?: number
  servingSize: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image?: string
  icon?: string
  parentId?: string
  children?: Category[]
  productCount?: number
  isActive: boolean
  order: number
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Cart {
  items: CartItem[]
  totalItems: number
  subtotal: number
  discount: number
  shipping: number
  total: number
}

export interface User {
  id: string
  email: string
  name?: string
  firstName: string
  lastName: string
  rut?: string
  phone?: string
  avatar?: string
  role: AppRole
  addresses: Address[]
  loyaltyPoints: number
  identityVerified: boolean
  wishlist: string[]
  purchaseHistory: Order[]
  storeId?: string
  tier?: 'austral' | 'archipielago' | 'patagonia'
  createdAt: string
  updatedAt: string
}

export interface Address {
  id: string
  name: string
  street: string
  number: string
  apartment?: string
  commune: string
  city: string
  region: string
  postalCode?: string
  isDefault: boolean
  instructions?: string
}

export interface Order {
  id: string
  orderNumber: string
  userId: string
  user?: User
  items: OrderItem[]
  subtotal: number
  discount: number
  shipping: number
  total: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: string
  shippingAddress: Address
  billingAddress: Address
  trackingNumber?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  productId: string
  product: Product
  quantity: number
  price: number
  total: number
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'

export interface Payment {
  id: string
  orderId: string
  amount: number
  method: 'webpay' | 'flow' | 'cash' | 'transfer'
  status: PaymentStatus
  transactionId?: string
  paidAt?: string
  createdAt: string
}

export interface Review {
  id: string
  productId: string
  userId: string
  user: User
  rating: number
  comment: string
  images?: string[]
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface StoreConfig {
  name: string
  slogan?: string
  description?: string
  logo?: string
  favicon?: string
  primaryColor: string
  secondaryColor: string
  contact: {
    email: string
    phone: string
    whatsapp?: string
    address: string
  }
  social?: {
    facebook?: string
    instagram?: string
    twitter?: string
  }
  businessHours: {
    monday: string
    tuesday: string
    wednesday: string
    thursday: string
    friday: string
    saturday: string
    sunday: string
  }
  shipping: {
    freeShippingThreshold: number
    defaultShippingCost: number
    regions: ShippingRegion[]
  }
  isJunaebEnabled?: boolean
  getnetIsBoleta?: boolean
}

export interface ShippingRegion {
  name: string
  cost: number
  estimatedDays: string
}

export interface Banner {
  id: string
  title: string
  subtitle?: string
  image: string
  link?: string
  position: 'hero' | 'top' | 'middle' | 'bottom'
  isActive: boolean
  startDate?: string
  endDate?: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  createdAt: string
}

export interface Branch {
  id: string
  storeId: string
  name: string
  address?: string
  isMain: boolean
  isActive: boolean
  createdAt: string
}

export interface Inventory {
  id: string
  productId: string
  branchId: string
  stock: number
  updatedAt: string
}
export interface Store {
  id: string;
  name: string;
  slug: string;
  tier: 'austral' | 'archipielago' | 'patagonia';
  payment_status: 'paid' | 'pending' | 'overdue';
  next_payment_date: string | null;
  is_active: boolean;
  owner_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  merchant_id?: string;
  config?: Record<string, unknown>;
  custom_domain?: string | null;
  domain_verified?: boolean;
  subdomain?: string | null;
}

export interface FinancialStats {
  income: number;
  expense: number;
  profit: number;
  monthlyData: Array<{ month: string; income: number; expense: number }>;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  type: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
  category: string;
}
