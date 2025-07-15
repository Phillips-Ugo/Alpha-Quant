import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDropzone } from 'react-dropzone';
import { 
  DocumentArrowUpIcon, 
  PlusIcon, 
  XMarkIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const SignUp = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [portfolio, setPortfolio] = useState([]);
  const [uploadMethod, setUploadMethod] = useState('manual'); // 'manual' or 'upload'
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/portfolio', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setPortfolio(data.extractedData || []);
        toast.success('Portfolio uploaded successfully!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload portfolio file');
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const addStock = () => {
    setPortfolio([...portfolio, {
      id: Date.now(),
      symbol: '',
      shares: '',
      purchasePrice: '',
      purchaseDate: new Date().toISOString().split('T')[0]
    }]);
  };

  const removeStock = (id) => {
    setPortfolio(portfolio.filter(stock => stock.id !== id));
  };

  const updateStock = (id, field, value) => {
    setPortfolio(portfolio.map(stock => 
      stock.id === id ? { ...stock, [field]: value } : stock
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await signup(formData.name, formData.email, formData.password);
      
      if (result.success) {
        // Add portfolio stocks if any
        if (portfolio.length > 0) {
          for (const stock of portfolio) {
            if (stock.symbol && stock.shares && stock.purchasePrice) {
              await fetch('/api/portfolio/add', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                  symbol: stock.symbol,
                  shares: stock.shares,
                  purchasePrice: stock.purchasePrice,
                  purchaseDate: stock.purchaseDate
                })
              });
            }
          }
        }
        
        navigate('/');
      }
    } catch (error) {
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="md:flex">
            {/* Left side - Form */}
            <div className="md:w-1/2 p-8">
              <div className="text-center mb-8">
                <ChartBarIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
                <p className="text-gray-600 mt-2">Start your financial analysis journey</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                    placeholder="Create a password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                    placeholder="Confirm your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>

            {/* Right side - Portfolio Setup */}
            <div className="md:w-1/2 bg-gray-50 p-8">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Portfolio Setup
                </h3>
                <p className="text-gray-600">
                  Add your current stock holdings to get personalized insights
                </p>
              </div>

              {/* Upload Method Toggle */}
              <div className="flex bg-white rounded-lg p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setUploadMethod('manual')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    uploadMethod === 'manual'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Manual Entry
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMethod('upload')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    uploadMethod === 'upload'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Upload File
                </button>
              </div>

              {uploadMethod === 'upload' ? (
                <div {...getRootProps()} className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                `}>
                  <input {...getInputProps()} />
                  <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  {loading ? (
                    <div className="spinner mx-auto mb-4"></div>
                  ) : (
                    <>
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        {isDragActive ? 'Drop your file here' : 'Upload Portfolio File'}
                      </p>
                      <p className="text-gray-600">
                        Drag & drop a PDF, CSV, or Excel file, or click to browse
                      </p>
                      {uploadedFile && (
                        <p className="text-sm text-green-600 mt-2">
                          ✓ {uploadedFile.name}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {portfolio.map((stock) => (
                    <div key={stock.id} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-900">Stock #{portfolio.indexOf(stock) + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeStock(stock.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Symbol (e.g., AAPL)"
                          value={stock.symbol}
                          onChange={(e) => updateStock(stock.id, 'symbol', e.target.value.toUpperCase())}
                          className="input-field text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Shares"
                          value={stock.shares}
                          onChange={(e) => updateStock(stock.id, 'shares', e.target.value)}
                          className="input-field text-sm"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Purchase Price"
                          value={stock.purchasePrice}
                          onChange={(e) => updateStock(stock.id, 'purchasePrice', e.target.value)}
                          className="input-field text-sm"
                        />
                        <input
                          type="date"
                          value={stock.purchaseDate}
                          onChange={(e) => updateStock(stock.id, 'purchaseDate', e.target.value)}
                          className="input-field text-sm"
                        />
                      </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={addStock}
                    className="w-full flex items-center justify-center py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Stock
                  </button>
                </div>
              )}

              {portfolio.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Portfolio Summary</h4>
                  <p className="text-sm text-blue-700">
                    {portfolio.length} stock{portfolio.length !== 1 ? 's' : ''} added
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp; 