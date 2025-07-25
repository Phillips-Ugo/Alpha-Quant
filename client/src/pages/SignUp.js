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
      // Store file for later processing after user registration
      const formData = new FormData();
      formData.append('file', file);
      
      // For now, just store the file and we'll process it after signup
      setUploadedFile(file);
      toast.success('File ready for upload. Complete signup to process your portfolio.');
      
    } catch (error) {
      console.error('File preparation error:', error);
      toast.error('Failed to prepare portfolio file');
    } finally {
      setLoading(false);
    }
  };

  const switchUploadMethod = (method) => {
    setUploadMethod(method);
    // Clear data when switching methods
    if (method === 'manual') {
      setUploadedFile(null);
    } else {
      setPortfolio([]);
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
        const token = localStorage.getItem('token');
        
        // Handle file upload first if there's an uploaded file
        if (uploadedFile && uploadMethod === 'upload') {
          try {
            const fileFormData = new FormData();
            fileFormData.append('file', uploadedFile);

            const uploadResponse = await fetch('/api/upload/portfolio', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: fileFormData
            });

            if (uploadResponse.ok) {
              const uploadData = await uploadResponse.json();
              toast.success(`Portfolio uploaded! ${uploadData.stocksFound} stocks processed.`);
            } else {
              const errorData = await uploadResponse.json();
              toast.error(`Upload failed: ${errorData.error}`);
            }
          } catch (uploadError) {
            console.error('Upload error:', uploadError);
            toast.error('Failed to upload portfolio file');
          }
        }
        
        // Handle manual portfolio entry if there are stocks and no file upload
        else if (portfolio.length > 0 && uploadMethod === 'manual') {
          try {
            // Filter out empty stocks
            const validStocks = portfolio.filter(stock => 
              stock.symbol && stock.shares && stock.purchasePrice
            );

            if (validStocks.length > 0) {
              const portfolioResponse = await fetch('/api/portfolio/batch-add', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  stocks: validStocks
                })
              });

              if (portfolioResponse.ok) {
                const portfolioData = await portfolioResponse.json();
                toast.success(`Portfolio created with ${validStocks.length} stocks!`);
              } else {
                const errorData = await portfolioResponse.json();
                toast.error(`Portfolio creation failed: ${errorData.error}`);
              }
            }
          } catch (portfolioError) {
            console.error('Portfolio creation error:', portfolioError);
            toast.error('Failed to create portfolio');
          }
        }
        
        navigate('/');
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-quant-gradient flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="card-quant overflow-hidden">
          <div className="md:flex">
            {/* Left side - Form */}
            <div className="md:w-1/2 p-8">
              <div className="text-center mb-8">
                <ChartBarIcon className="h-12 w-12 text-quant-green mx-auto mb-4" />
                <h2 className="text-3xl font-extrabold text-quant-gold font-mono">Create Account - Alpha Quant</h2>
                <p className="text-quant-green font-mono mt-2">Start your financial analysis journey</p>
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
                  onClick={() => switchUploadMethod('manual')}
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
                  onClick={() => switchUploadMethod('upload')}
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
                <div className="space-y-4">
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
                        <p className="text-gray-600 text-sm">
                          Drag & drop a PDF, CSV, or Excel file, or click to browse
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Supported formats: PDF, CSV, Excel (.xlsx), Text files
                        </p>
                        {uploadedFile && (
                          <div className="mt-3 p-2 bg-green-50 rounded-md">
                            <p className="text-sm text-green-600 font-medium">
                              ✓ File ready: {uploadedFile.name}
                            </p>
                            <p className="text-xs text-green-500">
                              Complete signup to process your portfolio
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {uploadedFile && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <DocumentArrowUpIcon className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-blue-800">
                            Portfolio file uploaded
                          </h4>
                          <p className="text-sm text-blue-600">
                            Your portfolio will be processed using our AI-powered RAG pipeline after account creation.
                          </p>
                        </div>
                      </div>
                    </div>
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