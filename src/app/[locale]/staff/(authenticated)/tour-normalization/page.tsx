'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface TourProduct {
  id: string;
  name_en: string;
  vendor_name: string;
}

interface TourMapping {
  id: string;
  original_name: string;
  suggested_product_id: string | null;
  confirmed_product_id: string | null;
  suggested_name: string | null;
  confirmed_name: string | null;
  confidence_score: number | null;
  is_ignored: boolean;
}

export default function TourNormalizationPage() {
  const [mappings, setMappings] = useState<TourMapping[]>([]);
  const [products, setProducts] = useState<TourProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [mappingsRes, productsRes] = await Promise.all([
        fetch('/api/admin/tour-normalization'),
        fetch('/api/tour-products?active=true')
      ]);

      const mappingsData = await mappingsRes.json();
      const productsData = await productsRes.json();

      if (mappingsRes.ok) setMappings(mappingsData.mappings);
      if (productsRes.ok) setProducts(productsData.products);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAnalyze() {
    setIsAnalyzing(true);
    setStatus('AI is analyzing tour names...');
    try {
      const res = await fetch('/api/admin/tour-normalization', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatus(`Analysis complete: ${data.processed || 0} names processed.`);
        fetchData();
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleUpdateMapping(id: string, productId: string | null, isIgnored: boolean = false) {
    try {
      const res = await fetch('/api/admin/tour-normalization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, confirmed_product_id: productId, is_ignored: isIgnored })
      });

      if (res.ok) {
        setMappings(prev => prev.map(m => 
          m.id === id ? { ...m, confirmed_product_id: productId, is_ignored: isIgnored } : m
        ));
      }
    } catch (error) {
      console.error('Error updating mapping:', error);
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center">Loading normalization data...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tour Name Normalization</h1>
          <p className="text-sm text-gray-500">
            Map inconsistent tour names from legacy CSVs to official tour products.
          </p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
        >
          {isAnalyzing ? (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
          {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
        </button>
      </div>

      {status && (
        <div className={`p-4 rounded-lg text-sm ${status.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
          {status}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Name (CSV)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Suggestion</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confirmed Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mappings.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                  No tour names found for normalization. Import a &quot;Tour Bookings&quot; CSV to get started.
                </td>
              </tr>
            ) : (
              mappings.map((mapping) => (
                <tr key={mapping.id} className={mapping.confirmed_product_id ? 'bg-green-50/30' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {mapping.original_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mapping.suggested_name ? (
                      <div className="flex flex-col">
                        <span className="text-gray-900">{mapping.suggested_name}</span>
                        <span className="text-xs text-purple-600 font-medium">
                          Confidence: {(mapping.confidence_score! * 100).toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span className="italic">No suggestion</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <select
                      value={mapping.confirmed_product_id || ''}
                      onChange={(e) => handleUpdateMapping(mapping.id, e.target.value || null)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name_en} ({p.vendor_name})</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mapping.confirmed_product_id ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Confirmed
                      </span>
                    ) : mapping.suggested_product_id ? (
                      <button
                        onClick={() => handleUpdateMapping(mapping.id, mapping.suggested_product_id)}
                        className="text-purple-600 hover:text-purple-900 font-medium"
                      >
                        Accept Suggestion
                      </button>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
