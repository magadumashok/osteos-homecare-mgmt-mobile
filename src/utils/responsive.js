import { useWindowDimensions } from "react-native";

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
};

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const shortestSide = Math.min(width, height);
  const isTablet = shortestSide >= BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.desktop;

  return {
    width,
    height,
    isTablet,
    isDesktop,
    // Keeps content comfortable on large displays while fluid on phones.
    contentMaxWidth: isDesktop ? 920 : isTablet ? 760 : 520,
    horizontalPadding: isTablet ? 28 : 16,
    cardPadding: isTablet ? 22 : 16,
    headingSize: isTablet ? 34 : 28,
    bodySize: isTablet ? 16 : 14,
    controlHeight: isTablet ? 52 : 48,
  };
}
