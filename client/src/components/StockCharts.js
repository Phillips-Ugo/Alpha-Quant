import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const StockCharts = ({ predictionData }) => {
  if (!predictionData || !predictionData.dates) {
    return null;
  }

  const { 
    dates, 
    actual_prices, 
    predicted_prices, 
    prediction_dates,
    rolling_mean_20, 
    rolling_mean_50, 
    rolling_mean_200,
    rsi,
    volatility 
  } = predictionData;

  // Combine historical and prediction dates
  const allDates = [...dates, ...prediction_dates];
  const allActualPrices = [...actual_prices, ...Array(predicted_prices.length).fill(null)];
  const allPredictedPrices = [...Array(actual_prices.length).fill(null), ...predicted_prices];

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#FFD700',
          font: {
            family: 'monospace',
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#FFD700',
        bodyColor: '#00FF00',
        borderColor: '#FFD700',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        },
        ticks: {
          color: '#00FF00',
          font: {
            family: 'monospace',
            size: 10
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        },
        ticks: {
          color: '#00FF00',
          font: {
            family: 'monospace',
            size: 10
          }
        }
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart'
    }
  };

  // Price Chart Data
  const priceChartData = {
    labels: allDates,
    datasets: [
      {
        label: 'Actual Price',
        data: allActualPrices,
        borderColor: '#00FF00',
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6
      },
      {
        label: 'Predicted Price',
        data: allPredictedPrices,
        borderColor: '#FF6B6B',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderDash: [5, 5]
      }
    ]
  };

  // Rolling Means Chart Data
  const rollingMeansData = {
    labels: dates,
    datasets: [
      {
        label: 'Price',
        data: actual_prices,
        borderColor: '#00FF00',
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4
      },
      {
        label: 'SMA 20',
        data: rolling_mean_20,
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4
      },
      {
        label: 'SMA 50',
        data: rolling_mean_50,
        borderColor: '#FF6B6B',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4
      },
      {
        label: 'SMA 200',
        data: rolling_mean_200,
        borderColor: '#4ECDC4',
        backgroundColor: 'rgba(78, 205, 196, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4
      }
    ]
  };

  // RSI Chart Data
  const rsiData = {
    labels: dates,
    datasets: [
      {
        label: 'RSI (14)',
        data: rsi,
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4
      }
    ]
  };

  // Volatility Chart Data
  const volatilityData = {
    labels: dates,
    datasets: [
      {
        label: 'Volatility (20d)',
        data: volatility,
        borderColor: '#FF6B6B',
        backgroundColor: 'rgba(255, 107, 107, 0.2)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }
    ]
  };

  const rsiOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        }
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Price Prediction Chart */}
      <div className="card-quant">
        <h3 className="text-xl font-bold text-quant-gold mb-4 font-mono flex items-center gap-2">
          📈 Price Prediction Analysis
        </h3>
        <div className="h-80">
          <Line data={priceChartData} options={chartOptions} />
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-quant-dark p-3 rounded-lg border border-quant-gold">
            <div className="text-quant-green font-mono">Current Price</div>
            <div className="text-quant-gold font-bold">${predictionData.current_price?.toFixed(2)}</div>
          </div>
          <div className="bg-quant-dark p-3 rounded-lg border border-quant-gold">
            <div className="text-quant-green font-mono">Predicted Price</div>
            <div className="text-quant-gold font-bold">${predictionData.predicted_price?.toFixed(2)}</div>
          </div>
          <div className="bg-quant-dark p-3 rounded-lg border border-quant-gold">
            <div className="text-quant-green font-mono">Confidence</div>
            <div className="text-quant-gold font-bold">{(predictionData.confidence * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-quant-dark p-3 rounded-lg border border-quant-gold">
            <div className="text-quant-green font-mono">Days Ahead</div>
            <div className="text-quant-gold font-bold">{predictionData.days_ahead}</div>
          </div>
        </div>
      </div>

      {/* Rolling Means Chart */}
      <div className="card-quant">
        <h3 className="text-xl font-bold text-quant-gold mb-4 font-mono flex items-center gap-2">
          📊 Moving Averages
        </h3>
        <div className="h-80">
          <Line data={rollingMeansData} options={chartOptions} />
        </div>
        <div className="mt-4 text-quant-green font-mono text-sm">
          <p>• <span className="text-quant-gold">SMA 20:</span> Short-term trend indicator</p>
          <p>• <span className="text-quant-gold">SMA 50:</span> Medium-term trend indicator</p>
          <p>• <span className="text-quant-gold">SMA 200:</span> Long-term trend indicator</p>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* RSI Chart */}
        <div className="card-quant">
          <h3 className="text-xl font-bold text-quant-gold mb-4 font-mono flex items-center gap-2">
            🔄 Relative Strength Index (RSI)
          </h3>
          <div className="h-64">
            <Line data={rsiData} options={rsiOptions} />
          </div>
          <div className="mt-4 text-quant-green font-mono text-sm">
            <p>• <span className="text-red-400">Overbought:</span> RSI &gt; 70</p>
            <p>• <span className="text-green-400">Oversold:</span> RSI &lt; 30</p>
            <p>• <span className="text-quant-gold">Current RSI:</span> {rsi[rsi.length - 1]?.toFixed(2) || 'N/A'}</p>
          </div>
        </div>

        {/* Volatility Chart */}
        <div className="card-quant">
          <h3 className="text-xl font-bold text-quant-gold mb-4 font-mono flex items-center gap-2">
            📉 Volatility Analysis
          </h3>
          <div className="h-64">
            <Line data={volatilityData} options={chartOptions} />
          </div>
          <div className="mt-4 text-quant-green font-mono text-sm">
            <p>• <span className="text-quant-gold">Current Volatility:</span> {(volatility[volatility.length - 1] * 100)?.toFixed(2) || 'N/A'}%</p>
            <p>• <span className="text-quant-gold">Period:</span> 20-day rolling standard deviation</p>
            <p>• <span className="text-quant-gold">Risk Level:</span> {volatility[volatility.length - 1] > 0.03 ? 'High' : volatility[volatility.length - 1] > 0.02 ? 'Medium' : 'Low'}</p>
          </div>
        </div>
      </div>

      {/* Model Information */}
      <div className="card-quant">
        <h3 className="text-xl font-bold text-quant-gold mb-4 font-mono flex items-center gap-2">
          🤖 LSTM Model Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
            <h4 className="text-quant-gold font-bold mb-2 font-mono">Model Architecture</h4>
            <div className="text-quant-green font-mono text-sm space-y-1">
              <p>• 3 LSTM layers (100, 80, 60 units)</p>
              <p>• Batch normalization & dropout</p>
              <p>• Dense layers with ReLU activation</p>
              <p>• Adam optimizer</p>
            </div>
          </div>
          <div className="bg-quant-dark p-4 rounded-lg border border-quant-gold">
            <h4 className="text-quant-gold font-bold mb-2 font-mono">Features Used</h4>
            <div className="text-quant-green font-mono text-sm">
              <p>• <span className="text-quant-gold">Total Features:</span> {predictionData.features_used}</p>
              <p>• <span className="text-quant-gold">Top Features:</span></p>
              <ul className="ml-4 mt-1">
                {predictionData.top_features?.slice(0, 3).map((feature, index) => (
                  <li key={index}>• {feature}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockCharts; 