import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import SupermarketScreen from './SupermarketScreen';
import FinancesScreen from './FinancesScreen';
import ProductivityScreen from './ProductivityScreen';

const App: React.FC = () => {
  const [activeButton, setActiveButton] = useState<string>('dashboard');
  const [clicked, setClicked] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
        const storedTheme = window.localStorage.getItem('zenith-theme');
        if (storedTheme === 'light' || storedTheme === 'dark') {
            return storedTheme;
        }
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
    }
    return 'light';
  });

  const toggleTheme = () => {
      setTheme(prevTheme => {
          const newTheme = prevTheme === 'light' ? 'dark' : 'light';
          window.localStorage.setItem('zenith-theme', newTheme);
          return newTheme;
      });
  };

  useEffect(() => {
      if (theme === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [theme]);

  const handleIconClick = (name: string) => {
    setActiveButton(name);
    setClicked(name);
    setTimeout(() => setClicked(null), 300); // Duration of the bounce animation
  };

  return (
    <main className="h-screen w-screen bg-gray-100 dark:bg-black antialiased">
      {/* App Screen Container */}
      <div className="relative w-full h-full overflow-hidden">
        
        {/* Background Image using Tailwind CSS */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-500 ease-in-out hover:scale-105 bg-[url('https://i.pinimg.com/originals/a1/83/83/a183833f4a38543d3513aa67c130b05b.jpg')]"
        >
            {/* Frosted glass overlay for better content visibility */}
            <div className="absolute inset-0 bg-gray-900/10 dark:bg-black/10 backdrop-blur-sm"></div>
        </div>

        {/* Content Layer - Now centers content */}
        <div className="relative z-10 h-full w-full flex items-center justify-center p-6">
          {activeButton === 'dashboard' && <Dashboard navigateTo={handleIconClick} theme={theme} toggleTheme={toggleTheme} />}
          {activeButton === 'supermarket' && <SupermarketScreen />}
          {activeButton === 'finances' && <FinancesScreen />}
          {activeButton === 'productivity' && <ProductivityScreen />}
        </div>
        
        {/* Floating Menu with Animated Border */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm h-20 p-[1.5px] rounded-3xl overflow-hidden shadow-lg z-20">
          <div className="animated-border w-full h-full">
            <div className="w-full h-full bg-gray-200/30 dark:bg-black/30 backdrop-blur-lg rounded-[22px] flex items-center justify-around">
              
              {/* Dashboard Icon */}
              <button 
                onClick={() => handleIconClick('dashboard')}
                className={`group w-16 h-16 flex items-center justify-center rounded-2xl transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-black/50 dark:focus:ring-white/50 ${activeButton === 'dashboard' ? '' : 'hover:bg-black/5 dark:hover:bg-white/10'}`} 
                aria-label="Dashboard"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-9 w-9 transition-all duration-300 ${activeButton === 'dashboard' ? 'text-black dark:text-white' : 'text-gray-600 dark:text-white/70 group-hover:text-black dark:group-hover:text-white group-hover:rotate-6 group-hover:scale-110'} ${clicked === 'dashboard' ? 'animate-bounce-click' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={1.5}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25v2.25A2.25 2.25 0 018.25 20.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6A2.25 2.25 0 0115.75 3.75h2.25A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75A2.25 2.25 0 0115.75 13.5h2.25a2.25 2.25 0 012.25 2.25v2.25A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" 
                  />
                </svg>
              </button>

              {/* Supermarket Icon */}
              <button 
                onClick={() => handleIconClick('supermarket')}
                className={`group w-16 h-16 flex items-center justify-center rounded-2xl transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-black/50 dark:focus:ring-white/50 ${activeButton === 'supermarket' ? '' : 'hover:bg-black/5 dark:hover:bg-white/10'}`} 
                aria-label="Supermercado"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-9 w-9 transition-all duration-300 ${activeButton === 'supermarket' ? 'text-black dark:text-white' : 'text-gray-600 dark:text-white/70 group-hover:text-black dark:group-hover:text-white group-hover:rotate-6 group-hover:scale-110'} ${clicked === 'supermarket' ? 'animate-bounce-click' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={1.5}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .962-.343 1.087-.835l1.823-6.44a1.125 1.125 0 00-1.087-1.437H5.25M7.5 14.25L5.106 5.165m0 0a1.125 1.125 0 011.125-1.125h9.75c.621 0 1.125.504 1.125 1.125M7.5 14.25v1.875c0 .621.504 1.125 1.125 1.125h3.375c.621 0 1.125-.504 1.125-1.125V14.25m0-9.375h-3.375c-.621 0-1.125.504-1.125 1.125v1.875m-3.375 0h11.218" />
                </svg>
              </button>

              {/* Productivity Icon */}
              <button 
                onClick={() => handleIconClick('productivity')}
                className={`group w-16 h-16 flex items-center justify-center rounded-2xl transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-black/50 dark:focus:ring-white/50 ${activeButton === 'productivity' ? '' : 'hover:bg-black/5 dark:hover:bg-white/10'}`} 
                aria-label="Produtividade"
              >
                 <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-9 w-9 transition-all duration-300 ${activeButton === 'productivity' ? 'text-black dark:text-white' : 'text-gray-600 dark:text-white/70 group-hover:text-black dark:group-hover:text-white group-hover:rotate-6 group-hover:scale-110'} ${clicked === 'productivity' ? 'animate-bounce-click' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Finances Icon */}
              <button 
                onClick={() => handleIconClick('finances')}
                className={`group w-16 h-16 flex items-center justify-center rounded-2xl transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-black/50 dark:focus:ring-white/50 ${activeButton === 'finances' ? '' : 'hover:bg-black/5 dark:hover:bg-white/10'}`} 
                aria-label="Finanças"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-9 w-9 transition-all duration-300 ${activeButton === 'finances' ? 'text-black dark:text-white' : 'text-gray-600 dark:text-white/70 group-hover:text-black dark:group-hover:text-white group-hover:rotate-6 group-hover:scale-110'} ${clicked === 'finances' ? 'animate-bounce-click' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default App;
