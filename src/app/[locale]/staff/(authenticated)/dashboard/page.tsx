'use client';

import { useEffect } from 'react';

export default function DashboardPage() {
  useEffect(() => {
    // Redirect to the V13 Slate Botanical dashboard (served as static HTML from public/)
    window.location.replace('/dashboard.html');
  }, []);
  return null;
}
