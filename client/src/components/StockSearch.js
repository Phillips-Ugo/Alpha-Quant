import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

const StockSearch = ({ onStockSelect, placeholder = "Search stocks..." }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchStocks = async () => {
      if (query.length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get(`/api/stocks/search?query=${encodeURIComponent(query)}`);
        if (response.data.success) {
          setResults(response.data.results || []);
          setShowResults(true);
          setSelectedIndex(-1);
        }
      } catch (error) {
        console.error('Search error:', error);
        toast.error('Failed to search stocks');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchStocks, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < results.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleStockSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowResults(false);
      setSelectedIndex(-1);
    }
  };

  const handleStockSelect = (stock) => {
    onStockSelect(stock);
    setQuery(stock.symbol);
    setShowResults(false);
    setSelectedIndex(-1);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 border border-quant-gold bg-quant-dark text-quant-gold rounded-lg font-mono focus:ring-2 focus:ring-green-400 focus:outline-none transition-all duration-200"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-quant-gold transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-quant-dark border border-quant-gold rounded-lg p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-quant-gold mx-auto"></div>
          <p className="text-quant-green mt-2 font-mono">Searching...</p>
        </div>
      )}

      {/* Search results */}
      {showResults && results.length > 0 && !loading && (
        <div 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-quant-dark border border-quant-gold rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          {results.map((stock, index) => (
            <div
              key={`${stock.symbol}-${stock.exchange}`}
              onClick={() => handleStockSelect(stock)}
              className={`px-4 py-3 cursor-pointer transition-colors ${
                index === selectedIndex 
                  ? 'bg-quant-gold text-quant-dark' 
                  : 'hover:bg-gray-700 text-quant-gold'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="font-bold text-lg">{stock.symbol}</div>
                  <div className="text-quant-green text-sm font-mono">
                    {stock.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 font-mono">
                    {stock.exchange}
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    {stock.type}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {showResults && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-quant-dark border border-quant-gold rounded-lg p-4 text-center">
          <p className="text-quant-green font-mono">No stocks found for "{query}"</p>
        </div>
      )}
    </div>
  );
};

export default StockSearch; 