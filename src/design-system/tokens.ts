export interface ColorTokens {
  background: '#101311'
  surface: '#181D1A'
  surfaceElevated: '#222A25'
  campaignBlack: '#0B0D0C'
  textPrimary: '#F5F7F4'
  textSecondary: '#B9C3BC'
  actionGreen: '#49D17D'
  actionPrimaryBackground: '#F5F7F4'
  actionPrimaryText: '#101311'
  border: '#58675C'
  focus: '#8EF0B3'
  error: '#FF7A7A'
}

export interface TypographyTokens {
  fontFamilySans: string
  fontWeightRegular: 400
  fontWeightMedium: 500
  fontWeightSemibold: 600
  fontWeightBold: 700
  fontSize12: '12px'
  fontSize14: '14px'
  fontSize16: '16px'
  fontSize20: '20px'
  fontSize24: '24px'
  fontSize32: '32px'
  fontSize40: '40px'
  lineHeightBody: 1.5
}

export interface SpacingTokens {
  space4: '4px'
  space8: '8px'
  space12: '12px'
  space16: '16px'
  space24: '24px'
  space32: '32px'
  space40: '40px'
  space48: '48px'
  space64: '64px'
}

export interface RadiusTokens {
  radius4: '4px'
  radius8: '8px'
  radius12: '12px'
  radius16: '16px'
  radiusPill: '999px'
}

export interface ShadowTokens {
  raised: '0 8px 24px rgba(0,0,0,0.28)'
  overlay: '0 16px 40px rgba(0,0,0,0.40)'
}

export interface BreakpointTokens {
  compactMax: 767
  intermediateMin: 768
  intermediateMax: 1199
  wideMin: 1200
}

export interface DesignTokenCatalog {
  color: ColorTokens
  typography: TypographyTokens
  space: SpacingTokens
  radius: RadiusTokens
  shadow: ShadowTokens
  breakpoint: BreakpointTokens
}

export const tokens = {
  color: {
    background: '#101311',
    surface: '#181D1A',
    surfaceElevated: '#222A25',
    campaignBlack: '#0B0D0C',
    textPrimary: '#F5F7F4',
    textSecondary: '#B9C3BC',
    actionGreen: '#49D17D',
    actionPrimaryBackground: '#F5F7F4',
    actionPrimaryText: '#101311',
    border: '#58675C',
    focus: '#8EF0B3',
    error: '#FF7A7A',
  },
  typography: {
    fontFamilySans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightSemibold: 600,
    fontWeightBold: 700,
    fontSize12: '12px',
    fontSize14: '14px',
    fontSize16: '16px',
    fontSize20: '20px',
    fontSize24: '24px',
    fontSize32: '32px',
    fontSize40: '40px',
    lineHeightBody: 1.5,
  },
  space: {
    space4: '4px',
    space8: '8px',
    space12: '12px',
    space16: '16px',
    space24: '24px',
    space32: '32px',
    space40: '40px',
    space48: '48px',
    space64: '64px',
  },
  radius: {
    radius4: '4px',
    radius8: '8px',
    radius12: '12px',
    radius16: '16px',
    radiusPill: '999px',
  },
  shadow: {
    raised: '0 8px 24px rgba(0,0,0,0.28)',
    overlay: '0 16px 40px rgba(0,0,0,0.40)',
  },
  breakpoint: {
    compactMax: 767,
    intermediateMin: 768,
    intermediateMax: 1199,
    wideMin: 1200,
  },
} satisfies DesignTokenCatalog

export type { ColorTokens as UniCoreColorTokens }
