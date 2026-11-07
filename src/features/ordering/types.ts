export type ProductCategory = "salad" | "protein" | "extra" | "dressing";

export type DiscountType = "percentage" | "fixed";

export type OrderStatus =
  | "awaiting_pix"
  | "paid"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type CustomerDetails = {
  name: string;
  phone: string;
};

export type DeliveryAddress = {
  street: string;
  number: string;
  neighborhood: string;
  complement?: string;
  reference?: string;
};

export type OrderDraftItem = {
  productId: string;
  quantity: number;
  comboId?: string;
  notes?: string;
};

export type OrderDraftDelivery = {
  deliveryDayId: string;
  items: OrderDraftItem[];
};

export type OrderDraft = {
  customer: CustomerDetails;
  address: DeliveryAddress;
  deliveries: OrderDraftDelivery[];
  notes?: string;
};

export type CatalogProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  priceCents: number;
  active: boolean;
  available: boolean;
  slug?: string;
  description?: string;
  ingredients?: string[];
  imagePath?: string | null;
  sortOrder?: number;
};

export type CatalogCombo = {
  id: string;
  name: string;
  minimumDeliveryCount: number;
  discountType: DiscountType;
  discountValue: number;
  eligibleProductIds: string[];
  active: boolean;
  description?: string;
  sortOrder?: number;
};

export type CatalogDeliveryDay = {
  id: string;
  date: string;
  enabled: boolean;
  capacity: number | null;
  reservedQuantity: number;
  feeCents: number | null;
  timeWindow?: string | null;
  cutoffAt?: string | null;
};

export type CatalogSnapshot = {
  products: CatalogProduct[];
  combos: CatalogCombo[];
  deliveryDays: CatalogDeliveryDay[];
  defaultDeliveryFeeCents: number;
};

export type OrderPreviewItem = {
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  comboId?: string;
  notes?: string;
};

export type OrderPreviewDelivery = {
  deliveryDayId: string;
  date: string;
  timeWindow?: string | null;
  items: OrderPreviewItem[];
  subtotalCents: number;
  feeCents: number;
};

export type ComboDiscountPreview = {
  comboId: string;
  comboName: string;
  discountCents: number;
};

export type OrderPreview = {
  deliveries: OrderPreviewDelivery[];
  discounts: ComboDiscountPreview[];
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
};

export type OrderReceiptItem = {
  productId?: string | null;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  comboId?: string | null;
  notes?: string;
};

export type OrderReceiptDelivery = {
  deliveryDayId?: string;
  date: string;
  feeCents: number;
  items: OrderReceiptItem[];
  timeWindow?: string | null;
};

export type OrderReceipt = {
  id?: string;
  orderNumber: string;
  status: OrderStatus;
  customer: CustomerDetails;
  address: DeliveryAddress;
  customerNotes?: string;
  deliveries: OrderReceiptDelivery[];
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  createdAt?: string;
};

export type BusinessSettings = {
  businessName: string;
  whatsappNumber: string;
  pixKey: string;
  pixRecipient: string;
  pixKeyType?: string;
  paymentInstructions?: string;
};

export type OrderDomainErrorCode =
  | "EMPTY_ORDER"
  | "DUPLICATE_DELIVERY_DAY"
  | "DELIVERY_DAY_UNAVAILABLE"
  | "DELIVERY_DAY_FULL"
  | "EMPTY_DELIVERY"
  | "INVALID_QUANTITY"
  | "INVALID_MONEY"
  | "PRODUCT_UNAVAILABLE"
  | "COMBO_UNAVAILABLE"
  | "COMBO_PRODUCT_NOT_ELIGIBLE"
  | "COMBO_MINIMUM_DELIVERIES";

export class OrderDomainError extends Error {
  readonly code: OrderDomainErrorCode;

  constructor(code: OrderDomainErrorCode, message: string) {
    super(message);
    this.name = "OrderDomainError";
    this.code = code;
  }
}
