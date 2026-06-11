export interface CheckoutSession {
  sessionId: string;
  publicKey: string;
  amountInCents: number;
  currency: string;
  reference: string;
}

export type WompiEventName = "onClose" | "onApproved" | "onDeclined" | "onEvent";

export interface WompiWidgetProps {
  session: CheckoutSession;
  onClose?: () => void;
  onApproved?: (event: WompiEventDetail) => void;
  onDeclined?: (event: WompiEventDetail) => void;
  onEvent?: (event: WompiEventDetail) => void;
  locale?: "es" | "en";
}

export interface WompiEventDetail {
  transaction?: {
    id: string;
    status: string;
    amountInCents: number;
    reference: string;
  };
  type?: string;
}

declare global {
  interface Window {
    WidgetCheckout?: WompiGlobalApi;
  }
}

export interface WompiGlobalApi {
  open: (config: WompiOpenConfig) => WompiInstance;
}

export interface WompiOpenConfig {
  currency: string;
  amountInCents: number;
  reference: string;
  publicKey: string;
  redirectUrl?: string;
  sessionId?: string;
  customerData?: {
    email?: string;
    fullName?: string;
    phoneNumber?: string;
    phoneNumberPrefix?: string;
    legalId?: string;
    legalIdType?: string;
  };
}

export interface WompiInstance {
  on: (event: WompiEventName, handler: (detail: WompiEventDetail) => void) => void;
  unmount?: () => void;
}
