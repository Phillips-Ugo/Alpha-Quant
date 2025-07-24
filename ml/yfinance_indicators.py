import yfinance as yf
import json

def fetch_economic_indicators():
    # Example tickers for proxies (can be replaced with better ones)

    # Interest Rate: US 10Y Treasury Yield
    interest = yf.Ticker('^TNX').history(period='1d')
    interest_rate = float(interest['Close'].iloc[-1]) if not interest.empty else None
    interest_str = f"{round(interest_rate,2)}% (US 10Y Treasury Yield)" if interest_rate is not None else "N/A"

    # Inflation Rate: Use TIP ETF (iShares TIPS Bond ETF) as proxy
    inflation = yf.Ticker('TIP').history(period='5d')
    inflation_rate = float(inflation['Close'].iloc[-1]) if not inflation.empty else None
    inflation_str = f"{round(inflation_rate,2)} (TIP ETF Price)" if inflation_rate is not None else "N/A"

    # Unemployment Rate: Use ^DJI (Dow Jones Industrial Average) as economic health proxy
    unemployment = yf.Ticker('^DJI').history(period='1d')
    unemployment_rate = float(unemployment['Close'].iloc[-1]) if not unemployment.empty else None
    unemployment_str = f"{round(unemployment_rate,2)} (Dow Jones Index)" if unemployment_rate is not None else "N/A"

    # GDP Growth: Use ^GSPC (S&P 500 Index) as proxy
    gdp = yf.Ticker('^GSPC').history(period='1d')
    gdp_growth = float(gdp['Close'].iloc[-1]) if not gdp.empty else None
    gdp_str = f"{round(gdp_growth,2)} (S&P 500 Index)" if gdp_growth is not None else "N/A"

    return {
        'interestRate': interest_str,
        'inflationRate': inflation_str,
        'unemploymentRate': unemployment_str,
        'gdpGrowth': gdp_str
    }

if __name__ == '__main__':
    try:
        indicators = fetch_economic_indicators()
        print(json.dumps(indicators))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        exit(1)
