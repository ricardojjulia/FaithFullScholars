'use client';

import React, { useEffect, useRef } from 'react';

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: (error: string) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
    onTurnstileLoaded?: () => void;
  }
}

export function TurnstileCaptcha({
  onVerify,
  onError,
  onExpire,
  className = '',
}: TurnstileCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    '1x00000000000000000000AA'; // Standard Cloudflare test always-pass sitekey

  useEffect(() => {
    // If running in test environment or mock key, automatically emit mock token
    if (process.env.NODE_ENV === 'test') {
      onVerify('mock-turnstile-token');
      return;
    }

    let isMounted = true;

    function renderWidget() {
      if (window.turnstile && containerRef.current && isMounted) {
        try {
          if (!widgetIdRef.current) {
            widgetIdRef.current = window.turnstile.render(containerRef.current, {
              sitekey: siteKey,
              callback: (token) => {
                if (isMounted) onVerify(token);
              },
              'error-callback': (err) => {
                if (isMounted && onError) onError(err);
              },
              'expired-callback': () => {
                if (isMounted && onExpire) onExpire();
              },
              theme: 'auto',
            });
          }
        } catch (e) {
          console.error('Turnstile render error:', e);
        }
      }
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.getElementById('turnstile-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'turnstile-script';
        script.src =
          'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          renderWidget();
        };
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener('load', renderWidget);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [siteKey, onVerify, onError, onExpire]);

  return (
    <div className={`turnstile-wrapper my-3 flex justify-center ${className}`}>
      <div ref={containerRef} data-testid="turnstile-container" />
    </div>
  );
}
