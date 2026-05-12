import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/dist/ScrollToPlugin';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
  
  // Configuración global de ScrollTrigger para mejor rendimiento
  ScrollTrigger.config({
    limitCallbacks: true,
    ignoreMobileResize: true,
  });
}

export const ensureGsapRegistered = () => {
  if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
  }
};

export const toArray = (selector: string | Element | null, scope?: Element | Document | null): Element[] => {
  if (!selector) return [];
  return gsap.utils.toArray(selector, scope ?? undefined);
};

export * from 'gsap';
export { ScrollTrigger, ScrollToPlugin };
export default gsap;
