// Color mappings for meta tags
export const META_TAG_COLORS = {
  BLUE: {
    bg: 'bg-blue-500',
    border: 'border-blue-500',
    text: 'text-blue-500',
    bgLight: 'bg-blue-100',
    bgDark: 'bg-blue-900',
    borderLight: 'border-blue-300',
  },
  GREEN: {
    bg: 'bg-green-500',
    border: 'border-green-500',
    text: 'text-green-500',
    bgLight: 'bg-green-100',
    bgDark: 'bg-green-900',
    borderLight: 'border-green-300',
  },
  YELLOW: {
    bg: 'bg-yellow-500',
    border: 'border-yellow-500',
    text: 'text-yellow-500',
    bgLight: 'bg-yellow-100',
    bgDark: 'bg-yellow-900',
    borderLight: 'border-yellow-300',
  },
  RED: {
    bg: 'bg-red-500',
    border: 'border-red-500',
    text: 'text-red-500',
    bgLight: 'bg-red-100',
    bgDark: 'bg-red-900',
    borderLight: 'border-red-300',
  },
  PURPLE: {
    bg: 'bg-purple-500',
    border: 'border-purple-500',
    text: 'text-purple-500',
    bgLight: 'bg-purple-100',
    bgDark: 'bg-purple-900',
    borderLight: 'border-purple-300',
  },
} as const;

export type MetaTagColor = keyof typeof META_TAG_COLORS;

// Get color classes for a meta tag color
export function getMetaTagColorClasses(color: MetaTagColor, variant: keyof typeof META_TAG_COLORS.BLUE = 'border') {
  return META_TAG_COLORS[color][variant];
}

// Get all color classes for a meta tag
export function getAllMetaTagColorClasses(color: MetaTagColor) {
  return META_TAG_COLORS[color];
} 