// src/pages/Lab.jsx - Simplified Focus on Flight Simulator
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ForecastCanvas from "../components/ForecastCanvas";
import ScenarioControls from "../components/ScenarioControls";
import { loadROIClientSide } from "../lib/roiClient";

export default function Lab() {
  const [roi, setRoi] = useState([]);
  const [roiStats, setRoiStats] = useState(null);
  const [state, setState] = useState({
    startGP: 10_000_000,
    targetGP: 2147483647,
    horizon: 365,
    paths: 1500,
    risk: 1.0,
    util: 0.85,
  });

  useEffect(() => {
    loadROIClientSide().then(({ roi, startNet, stats }) => {
      setRoi(roi);
      setRoiStats(stats);
      setState((s) => ({ ...s, startGP: startNet || s.startGP }));
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            🧪 The Lab
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Advanced analytics and forecasting tools powered by your trading data.
          </p>

          {/* Quick Navigation Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
            <Link
              to="/universe"
              className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6 hover:from-blue-600/30 hover:to-purple-600/30 transition-all duration-300 hover:scale-105 group"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">🌌</div>
              <h3 className="text-xl font-bold mb-2">Flip Universe Map</h3>
              <p className="text-gray-400 text-sm">
                Explore your item portfolio in an interactive galaxy. Discover trading patterns and profit opportunities through advanced visualization.
              </p>
              <div className="mt-4 text-blue-400 text-sm font-medium">
                Explore Universe →
              </div>
            </Link>

            <div className="bg-gradient-to-br from-green-600/20 to-yellow-600/20 border border-green-500/30 rounded-2xl p-6">
              <div className="text-3xl mb-3">🚀</div>
              <h3 className="text-xl font-bold mb-2">Max-Cash Flight Simulator</h3>
              <p className="text-gray-400 text-sm">
                Monte Carlo simulation to forecast your path to max cash based on your actual trading performance.
              </p>
              <div className="mt-4 text-green-400 text-sm font-medium">
                Active Below ↓
              </div>
            </div>
          </div>
        </div>

        {/* Flight Simulator Section */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl overflow-hidden">

          {/* Simulator Header */}
          <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-green-600/10 to-yellow-600/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">🚀 Max-Cash Flight Simulator</h2>
                <p className="text-gray-400">
                  Powered by {roi.length.toLocaleString()} trading sessions •
                  {roiStats && (
                    <span className="ml-2">
                      Avg ROI: <span className="text-green-400 font-mono">{(roiStats.avgROI * 100).toFixed(1)}%</span>
                    </span>
                  )}
                </p>
              </div>

              {/* Quick Stats */}
              {roiStats && (
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-green-400 font-mono font-bold">
                      {(roiStats.avgROI * 100).toFixed(1)}%
                    </div>
                    <div className="text-gray-400">Avg ROI</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-mono font-bold">
                      {roiStats.winRate ? (roiStats.winRate * 100).toFixed(0) : '0'}%
                    </div>
                    <div className="text-gray-400">Win Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-400 font-mono font-bold">
                      {roi.length.toLocaleString()}
                    </div>
                    <div className="text-gray-400">Sessions</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Simulator Content */}
          <div className="grid lg:grid-cols-4 gap-6 p-6">

            {/* Controls Panel */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-600">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  ⚙️ Simulation Controls
                </h3>
                <ScenarioControls state={state} setState={setState} />

                {/* Simulation Info */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Simulation Details</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Monte Carlo Paths:</span>
                      <span className="text-white">{state.paths.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time Horizon:</span>
                      <span className="text-white">{state.horizon} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Risk Factor:</span>
                      <span className="text-white">{(state.risk * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Utilization:</span>
                      <span className="text-white">{(state.util * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                {roiStats && (
                  <div className="mt-6 pt-4 border-t border-gray-700">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Your Performance</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Best ROI:</span>
                        <span className="text-green-400 font-mono">
                          {((roiStats.maxROI || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Worst ROI:</span>
                        <span className="text-red-400 font-mono">
                          {((roiStats.minROI || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Volatility:</span>
                        <span className="text-yellow-400 font-mono">
                          {((roiStats.stdROI || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chart Area */}
            <div className="lg:col-span-3">
              <div className="bg-gray-800/30 rounded-xl border border-gray-600 h-[600px] flex flex-col">
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Wealth Projection</h3>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <span className="text-gray-300">Success Paths</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <span className="text-gray-300">Risk Paths</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <span className="text-gray-300">Target</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-4">
                  <ForecastCanvas
                    roi={roi}
                    state={state}
                    width="100%"
                    height="100%"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="p-6 border-t border-gray-700 bg-gray-800/30">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">~{Math.round(state.horizon / 365)} years</div>
                <div className="text-sm text-gray-300">Estimated Timeline</div>
                <div className="text-xs text-gray-400 mt-1">
                  To reach {formatGP(state.targetGP)} from {formatGP(state.startGP)}
                </div>
              </div>

              <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{state.paths.toLocaleString()}</div>
                <div className="text-sm text-gray-300">Simulation Paths</div>
                <div className="text-xs text-gray-400 mt-1">
                  Monte Carlo scenarios analyzed
                </div>
              </div>

              <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {roiStats ? (roiStats.avgROI * 100).toFixed(1) : '0.0'}%
                </div>
                <div className="text-sm text-gray-300">Average ROI</div>
                <div className="text-xs text-gray-400 mt-1">
                  Based on your trading history
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Tools Preview */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-center mb-8">More Tools Coming Soon</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center opacity-60">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-semibold mb-2">Portfolio Optimizer</h3>
              <p className="text-gray-400 text-sm">
                AI-powered recommendations for optimal item allocation and risk management.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center opacity-60">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-lg font-semibold mb-2">Market Predictor</h3>
              <p className="text-gray-400 text-sm">
                Machine learning models to forecast price movements and market trends.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center opacity-60">
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="text-lg font-semibold mb-2">Auto-Trader</h3>
              <p className="text-gray-400 text-sm">
                Automated trading strategies based on your proven patterns and preferences.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function for formatting GP values
function formatGP(value) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
}