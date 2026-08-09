/**
 * Shopify New Customer Accounts (Customer Account API) — headless OAuth + account data.
 */

export {
  getCustomerAccountConfig,
  getCustomerAccountCallbackUrl,
  getCustomerAccountLogoutRedirectUrl,
  isCustomerAccountConfigured,
  type CustomerAccountConfig,
} from "./config"
export {
  discoverOpenIdConfiguration,
  discoverCustomerAccountApi,
} from "./discovery"
export {
  beginCustomerLogin,
  completeCustomerLogin,
  beginCustomerLogout,
  refreshCustomerAccessToken,
} from "./oauth"
export {
  customerAccountFetch,
  getCustomerAccessToken,
} from "./client"
export {
  isCustomerLoggedIn,
  readCustomerSession,
  clearCustomerSession,
  readCartIdCookie,
  CART_ID_COOKIE,
  CUSTOMER_LOGGED_IN_COOKIE,
} from "./session"
export {
  getCustomerDashboard,
  getCustomerProfile,
  getCustomerOrders,
  getCustomerOrderById,
  getCustomerAddresses,
  updateCustomerProfile,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
} from "./account"
export {
  attachCustomerToCart,
  withSilentCheckoutSso,
  CART_BUYER_IDENTITY_UPDATE,
} from "./cartBuyer"
