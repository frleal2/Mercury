import React, { useState } from 'react';
import { SparklesIcon, TruckIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

export default function AIDispatchRecommend({ loadId, onSelectDriver, isOpen, onClose }) {
  const { session, refreshAccessToken } = useSession();
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${BASE_URL}/api/ai/dispatch-recommend/${loadId}/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      setRecommendations(res.data);
    } catch (err) {
      if (err.response?.status === 401) await refreshAccessToken();
      setError(err.response?.data?.error || 'Failed to get recommendations.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-white" />
              <h2 className="text-white font-semibold">AI Dispatch Recommendations</h2>
            </div>
            <p className="text-blue-100 text-xs mt-1">
              AI analyzes driver availability, HOS, location, and safety records
            </p>
          </div>

          <div className="p-5">
            {/* Initial state — show button */}
            {!recommendations && !loading && !error && (
              <div className="text-center py-6">
                <TruckIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-4">
                  Get AI-powered driver & truck recommendations for this load
                </p>
                <button
                  onClick={fetchRecommendations}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  <SparklesIcon className="h-4 w-4" />
                  Analyze & Recommend
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm text-gray-500">Analyzing drivers, HOS data, and equipment...</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={fetchRecommendations}
                  className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Results */}
            {recommendations && (
              <>
                {/* Summary */}
                {recommendations.summary && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">{recommendations.summary}</p>
                  </div>
                )}

                {/* Recommendations list */}
                {recommendations.recommendations?.length > 0 ? (
                  <div className="space-y-3">
                    {recommendations.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition cursor-pointer"
                        onClick={() => {
                          if (onSelectDriver) {
                            onSelectDriver({
                              driverId: rec.driver_id,
                              truckId: rec.truck_id,
                            });
                          }
                          onClose();
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-gray-800">
                                #{i + 1} {rec.driver_name}
                              </span>
                              {rec.truck_unit && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                  {rec.truck_unit}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{rec.reasoning}</p>
                          </div>
                          <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${getScoreColor(rec.score)}`}>
                            {rec.score}
                          </span>
                        </div>

                        {/* Warnings */}
                        {rec.warnings?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {rec.warnings.map((w, j) => (
                              <div key={j} className="flex items-center gap-1.5 text-xs text-amber-600">
                                <ExclamationTriangleIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                {w}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <ExclamationTriangleIcon className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No suitable drivers found for this load.</p>
                  </div>
                )}

                {recommendations.processing_time_ms && (
                  <p className="text-[10px] text-gray-400 mt-3 text-right">
                    Analyzed in {(recommendations.processing_time_ms / 1000).toFixed(1)}s
                  </p>
                )}

                {/* Retry button */}
                <div className="mt-4 flex justify-between">
                  <button
                    onClick={fetchRecommendations}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Re-analyze
                  </button>
                  <button
                    onClick={onClose}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
