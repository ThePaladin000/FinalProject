// UI Constants
export const UI_CONSTANTS = {
  // Modal and Popup Settings
  MODAL_MAX_WIDTH: 'max-w-lg',
  MODAL_MAX_HEIGHT: 'max-h-[90vh]',
  MODAL_PADDING: 'p-6',
  MODAL_BACKGROUND_OPACITY: 'bg-opacity-50',
  MODAL_Z_INDEX: 'z-50',
  
  // Button Sizes
  BUTTON_PADDING_SMALL: 'px-2 py-1',
  BUTTON_PADDING_MEDIUM: 'px-3 py-1',
  BUTTON_PADDING_LARGE: 'px-4 py-2',
  BUTTON_PADDING_XL: 'px-6 py-3',
  
  // Text Sizes
  TEXT_SIZE_XS: 'text-xs',
  TEXT_SIZE_SM: 'text-sm',
  TEXT_SIZE_BASE: 'text-base',
  TEXT_SIZE_LG: 'text-lg',
  TEXT_SIZE_XL: 'text-xl',
  TEXT_SIZE_2XL: 'text-2xl',
  
  // Spacing
  SPACING_1: 'gap-1',
  SPACING_2: 'gap-2',
  SPACING_3: 'gap-3',
  SPACING_4: 'gap-4',
  SPACING_6: 'gap-6',
  SPACING_8: 'gap-8',
  
  // Border Radius
  BORDER_RADIUS_SM: 'rounded',
  BORDER_RADIUS_MD: 'rounded-lg',
  BORDER_RADIUS_LG: 'rounded-xl',
  BORDER_RADIUS_FULL: 'rounded-full',
  
  // Icon Sizes
  ICON_SIZE_SM: 'w-3 h-3',
  ICON_SIZE_MD: 'w-4 h-4',
  ICON_SIZE_LG: 'w-6 h-6',
  ICON_SIZE_XL: 'w-8 h-8',
  
  // Loading Spinner Sizes
  SPINNER_SIZE_SM: 16,
  SPINNER_SIZE_MD: 24,
  SPINNER_SIZE_LG: 32,
  SPINNER_SIZE_XL: 64,
  
  // Animation Durations
  TRANSITION_DURATION_FAST: 'duration-200',
  TRANSITION_DURATION_NORMAL: 'duration-300',
  TRANSITION_DURATION_SLOW: 'duration-500',
  
  // Hover Effects
  HOVER_SCALE: 'hover:scale-105',
  HOVER_SCALE_LARGE: 'hover:scale-[1.02]',
} as const;

// Form Constants
export const FORM_CONSTANTS = {
  // Input Limits
  NEXUS_NAME_MAX_LENGTH: 100,
  NEXUS_DESCRIPTION_MAX_LENGTH: 500,
  CHUNK_CONTENT_MAX_LENGTH: 10000,
  TAG_NAME_MAX_LENGTH: 50,
  TAG_DESCRIPTION_MAX_LENGTH: 200,
  
  // Textarea Settings
  TEXTAREA_MIN_HEIGHT: '44px',
  TEXTAREA_MAX_HEIGHT: '200px',
  TEXTAREA_ROWS: 3,
  
  // Validation Messages
  REQUIRED_FIELD_MESSAGE: 'is required',
  MAX_LENGTH_EXCEEDED: 'exceeds maximum length',
} as const;

// API Constants
export const API_CONSTANTS = {
  // Timeouts
  REQUEST_TIMEOUT: 30000, // 30 seconds
  DEBOUNCE_DELAY: 300, // 300ms
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Retry Settings
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Color Constants
export const COLOR_CONSTANTS = {
  // Primary Colors
  PRIMARY_GRADIENT: 'from-purple-500 to-blue-600',
  PRIMARY_GRADIENT_HOVER: 'from-purple-600 to-blue-700',
  
  // Secondary Colors
  SECONDARY_GRADIENT: 'from-orange-500 to-purple-600',
  SECONDARY_GRADIENT_HOVER: 'from-orange-600 to-purple-700',
  
  // Status Colors
  SUCCESS_COLOR: 'text-green-400',
  SUCCESS_BG: 'bg-green-900/20',
  SUCCESS_BORDER: 'border-green-700',
  
  ERROR_COLOR: 'text-red-400',
  ERROR_BG: 'bg-red-900/20',
  ERROR_BORDER: 'border-red-700',
  
  WARNING_COLOR: 'text-yellow-400',
  WARNING_BG: 'bg-yellow-900/20',
  WARNING_BORDER: 'border-yellow-500',
  
  // Neutral Colors
  GRAY_400: 'text-gray-400',
  GRAY_600: 'bg-gray-600',
  GRAY_700: 'bg-gray-700',
  GRAY_800: 'bg-gray-800',
  GRAY_900: 'bg-gray-900',
} as const;

// Layout Constants
export const LAYOUT_CONSTANTS = {
  // Container Sizes
  CONTAINER_MAX_WIDTH: 'max-w-4xl',
  CONTAINER_MAX_WIDTH_LG: 'max-w-6xl',
  
  // Viewport Heights
  VIEWPORT_HEIGHT_70: '70vh',
  VIEWPORT_HEIGHT_90: '90vh',
  
  // Flex Settings
  FLEX_CENTER: 'flex items-center justify-center',
  FLEX_BETWEEN: 'flex items-center justify-between',
  FLEX_COLUMN: 'flex flex-col',
  FLEX_ROW: 'flex flex-row',
} as const;

// Keyboard Constants
export const KEYBOARD_CONSTANTS = {
  ESCAPE_KEY: 'Escape',
  ENTER_KEY: 'Enter',
  CTRL_KEY: 'ctrlKey',
  META_KEY: 'metaKey',
} as const;

// Animation Constants
export const ANIMATION_CONSTANTS = {
  // Spinner Animation
  SPINNER_ANIMATION: 'animate-spin',
  
  // Fade Animations
  FADE_IN: 'opacity-0',
  FADE_IN_ACTIVE: 'opacity-100',
  
  // Scale Animations
  SCALE_HOVER: 'transform hover:scale-105',
  SCALE_HOVER_LARGE: 'transform hover:scale-[1.02]',
  
  // Transition Classes
  TRANSITION_ALL: 'transition-all',
  TRANSITION_COLORS: 'transition-colors',
  TRANSITION_DURATION_300: 'duration-300',
} as const;

// System Constants
export const SYSTEM_CONSTANTS = {
  // Guest User Limits
  GUEST_NEXUS_LIMIT: 1,
  GUEST_SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  
  // Default Values
  DEFAULT_USER_MANUAL_NAME: 'USER MANUAL',
  DEFAULT_SHARD_BALANCE: 0,
  DEFAULT_MONTHLY_ALLOWANCE: 1000,
  
  // Meta Tag Colors
  META_TAG_COLORS: {
    BLUE: 'BLUE',
    GREEN: 'GREEN',
    YELLOW: 'YELLOW',
    RED: 'RED',
    PURPLE: 'PURPLE',
  } as const,
} as const;

// Export all constants as a single object for easy access
export const CONSTANTS = {
  UI: UI_CONSTANTS,
  FORM: FORM_CONSTANTS,
  API: API_CONSTANTS,
  COLOR: COLOR_CONSTANTS,
  LAYOUT: LAYOUT_CONSTANTS,
  KEYBOARD: KEYBOARD_CONSTANTS,
  ANIMATION: ANIMATION_CONSTANTS,
  SYSTEM: SYSTEM_CONSTANTS,
} as const;
