import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getTasks, Task, getItems, ListItem as SupermarketItem } from './db';

// --- Type Definitions (to be shared or defined locally) ---
interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
}

const STORAGE_KEYS = {
    TRANSACTIONS: 'zenith-finances-transactions',
    PROFILE_PIC: 'zenith-profile-pic',
};
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });


// --- Celestial Greeting Components ---
type CelestialIconType = 'rising-sun' | 'setting-sun' | 'moon';

const CelestialIcon: React.FC<{ type: CelestialIconType }> = ({ type }) => {
    const baseClasses = "celestial-body";
    const typeClasses: Record<CelestialIconType, string> = {
        'rising-sun': 'rising-sun-icon',
        'setting-sun': 'setting-sun-icon',
        'moon': 'moon-icon',
    };
    return <div className={`${baseClasses} ${typeClasses[type]}`}></div>;
};

const getGreetingInfo = (): { text: string; iconType: CelestialIconType } => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { text: 'Bom Dia', iconType: 'rising-sun' };
    } else if (hour >= 12 && hour < 18) {
      return { text: 'Boa Tarde', iconType: 'setting-sun' };
    } else {
      return { text: 'Boa Noite', iconType: 'moon' };
    }
};


// --- Week Calendar Component ---
interface WeekCalendarProps {
    today: Date;
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    tasks: Task[];
}

const WeekCalendar: React.FC<WeekCalendarProps> = ({ today, selectedDate, onDateSelect, tasks }) => {
    const [dates, setDates] = useState<Date[]>([]);

    useEffect(() => {
        const generatedDates: Date[] = [];
        const current = new Date(selectedDate);
        const firstDayOfWeek = new Date(current.setDate(current.getDate() - current.getDay()));

        for (let i = 0; i < 7; i++) {
            const date = new Date(firstDayOfWeek);
            date.setDate(firstDayOfWeek.getDate() + i);
            generatedDates.push(date);
        }
        setDates(generatedDates);
    }, [selectedDate]);

    const isSameDay = (date1: Date, date2: Date) => {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    };
    
    const getTaskCountForDate = (date: Date) => {
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
        return tasks.filter(task => task.dueDate === dateString && !task.completed).length;
    };


    return (
        <div className="flex w-full justify-center space-x-2 p-2 rounded-2xl bg-gray-200/50 dark:bg-white/5 backdrop-blur-sm">
            {dates.map((date, index) => {
                const dayOfMonth = date.getDate();
                const dayName = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).slice(0, 3).toUpperCase();
                
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, today);
                const taskCount = getTaskCountForDate(date);

                return (
                    <button
                        key={index}
                        onClick={() => onDateSelect(date)}
                        className={`
                            relative
                            flex flex-col items-center justify-center w-12 h-16 rounded-xl 
                            transition-all duration-300 ease-in-out transform focus:outline-none
                            ${isSelected 
                                ? 'bg-gradient-to-br from-orange-400 to-pink-500 text-white shadow-lg scale-105' 
                                : `text-gray-600 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white ${isToday ? 'border border-black/20 dark:border-white/30' : ''}`}
                        `}
                    >
                        {taskCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-gray-100 dark:ring-black">
                                {taskCount}
                            </div>
                        )}
                        <span className="text-xs font-medium">{dayName}</span>
                        <span className="text-xl font-bold">{dayOfMonth}</span>
                    </button>
                );
            })}
        </div>
    );
};


// --- Day Summary Component ---
interface DaySummaryProps {
    selectedDate: Date;
    transactions: Transaction[];
    supermarketItems: SupermarketItem[];
    tasks: Task[];
    onNavigate: (screen: 'finances' | 'supermarket' | 'productivity') => void;
}

const DaySummary: React.FC<DaySummaryProps> = ({ selectedDate, transactions, supermarketItems, tasks, onNavigate }) => {
    const summaryData = useMemo(() => {
        const dateString = selectedDate.toISOString().split('T')[0];
        
        const dayTransactions = transactions.filter(tx => tx.date === dateString);
        const dayNetTotal = dayTransactions.reduce((sum, tx) => sum + tx.amount, 0);

        const completedItems = supermarketItems.filter(item => item.completed).length;
        
        const dayTasks = tasks.filter(task => task.dueDate === dateString);
        const completedTasks = dayTasks.filter(task => task.completed).length;

        return {
            dayTransactionsCount: dayTransactions.length,
            dayNetTotal,
            totalSupermarketItems: supermarketItems.length,
            completedSupermarketItems: completedItems,
            totalTasks: dayTasks.length,
            completedTasks: completedTasks,
        };
    }, [selectedDate, transactions, supermarketItems, tasks]);

    return (
        <div className="w-full mt-6 grid grid-cols-1 gap-4">
            {/* Finances Card */}
            <button onClick={() => onNavigate('finances')} className="bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-black/10 dark:border-white/20 rounded-2xl p-4 text-left hover:bg-white dark:hover:bg-white/20 transition-all duration-300 w-full focus:outline-none focus:ring-2 focus:ring-orange-400/80">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 dark:text-white/90">Finanças do Dia</h3>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                </div>
                {summaryData.dayTransactionsCount > 0 ? (
                    <div>
                        <p className="text-sm text-gray-600 dark:text-white/70">{summaryData.dayTransactionsCount} transaç{summaryData.dayTransactionsCount > 1 ? 'ões' : 'ão'}</p>
                        <p className={`text-xl font-bold ${summaryData.dayNetTotal > 0 ? 'text-teal-500' : summaryData.dayNetTotal < 0 ? 'text-rose-500' : 'text-gray-700 dark:text-white/80'}`}>
                            {currencyFormatter.format(summaryData.dayNetTotal)}
                        </p>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 dark:text-white/60 italic">Nenhuma atividade registrada.</p>
                )}
            </button>

            {/* Supermarket Card */}
            <button onClick={() => onNavigate('supermarket')} className="bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-black/10 dark:border-white/20 rounded-2xl p-4 text-left hover:bg-white dark:hover:bg-white/20 transition-all duration-300 w-full focus:outline-none focus:ring-2 focus:ring-orange-400/80">
                 <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 dark:text-white/90">Lista de Compras</h3>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                {summaryData.totalSupermarketItems > 0 ? (
                    <div>
                        <p className="text-sm text-gray-600 dark:text-white/70">{summaryData.totalSupermarketItems} itens na lista</p>
                        <p className="text-xl font-bold text-gray-700 dark:text-white/80">{summaryData.completedSupermarketItems} / {summaryData.totalSupermarketItems} concluídos</p>
                    </div>
                ) : (
                     <p className="text-sm text-gray-500 dark:text-white/60 italic">Lista de compras vazia.</p>
                )}
            </button>
            
            {/* Productivity Card */}
            <button onClick={() => onNavigate('productivity')} className="bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-black/10 dark:border-white/20 rounded-2xl p-4 text-left hover:bg-white dark:hover:bg-white/20 transition-all duration-300 w-full focus:outline-none focus:ring-2 focus:ring-orange-400/80">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 dark:text-white/90">Tarefas do Dia</h3>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                {summaryData.totalTasks > 0 ? (
                    <div>
                        <p className="text-sm text-gray-600 dark:text-white/70">{summaryData.totalTasks} tarefa{summaryData.totalTasks > 1 ? 's' : ''} para hoje</p>
                        <p className="text-xl font-bold text-gray-700 dark:text-white/80">{summaryData.completedTasks} / {summaryData.totalTasks} concluída{summaryData.totalTasks > 1 ? 's' : ''}</p>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 dark:text-white/60 italic">Nenhuma tarefa para hoje.</p>
                )}
            </button>
        </div>
    );
};


// --- Main Dashboard Component ---
interface DashboardProps {
    navigateTo: (screen: 'finances' | 'supermarket' | 'productivity') => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ navigateTo, theme, toggleTheme }) => {
    const getNormalizedToday = () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now;
    };
    
    const [greetingInfo, setGreetingInfo] = useState(getGreetingInfo);
    const [today, setToday] = useState(getNormalizedToday);
    const [selectedDate, setSelectedDate] = useState(today);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [supermarketItems, setSupermarketItems] = useState<SupermarketItem[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const profileContainerRef = useRef<HTMLDivElement>(null);

    // Effect to load data from storage on mount
    useEffect(() => {
        try {
            // Load transactions from localStorage
            const storedTransactions = window.localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
            setTransactions(storedTransactions ? JSON.parse(storedTransactions) : []);
            
            // Load profile picture from localStorage
            const storedProfilePic = window.localStorage.getItem(STORAGE_KEYS.PROFILE_PIC);
            if (storedProfilePic) {
                setProfilePic(storedProfilePic);
            }

            // Load tasks from IndexedDB
            const loadTasks = async () => {
                try {
                    const dbTasks = await getTasks();
                    setTasks(dbTasks);
                } catch (error) {
                    console.error("Error loading tasks from DB", error);
                }
            };
            loadTasks();

            // Load supermarket items from IndexedDB
            const loadSupermarketItems = async () => {
                try {
                    const dbItems = await getItems();
                    setSupermarketItems(dbItems);
                } catch (error) {
                    console.error("Error loading supermarket items from DB on Dashboard", error);
                }
            };
            loadSupermarketItems();

        } catch (error) {
            console.error("Error reading data from storage on Dashboard", error);
        }
    }, []);
    
    // Effect to handle clicks outside the profile menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                profileContainerRef.current &&
                !profileContainerRef.current.contains(event.target as Node)
            ) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    // Effect to update greeting (Bom dia, etc.) periodically.
    useEffect(() => {
        const greetingTimer = setInterval(() => {
            setGreetingInfo(getGreetingInfo());
        }, 60 * 1000); // Check every minute
        return () => clearInterval(greetingTimer);
    }, []);

    // Effect to update the calendar's sense of "today" at midnight.
    useEffect(() => {
        const isSameDay = (date1: Date, date2: Date) => {
            return date1.getFullYear() === date2.getFullYear() &&
                   date1.getMonth() === date2.getMonth() &&
                   date1.getDate() === date2.getDate();
        };

        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const msUntilMidnight = midnight.getTime() - now.getTime();

        const midnightTimer = setTimeout(() => {
            const newToday = getNormalizedToday();
            setToday(newToday);
            setSelectedDate(currentSelectedDate => {
                if (isSameDay(currentSelectedDate, today)) {
                    return newToday;
                }
                return currentSelectedDate;
            });
        }, msUntilMidnight + 1000);

        return () => clearTimeout(midnightTimer);
    }, [today]);

    const handleProfilePicClick = () => {
        setIsMenuOpen(prev => !prev);
    };
    
    const handleEditPhotoClick = () => {
        fileInputRef.current?.click();
        setIsMenuOpen(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Image = e.target?.result as string;
                setProfilePic(base64Image);
                try {
                    window.localStorage.setItem(STORAGE_KEYS.PROFILE_PIC, base64Image);
                } catch (error) {
                    console.error("Error saving profile picture to localStorage", error);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full w-full max-w-lg">
            <div className="absolute top-8 left-8 z-10 flex items-center gap-x-4">
                <CelestialIcon type={greetingInfo.iconType} />
                <p className="text-xl font-medium text-gray-700 dark:text-white/80">{greetingInfo.text}</p>
            </div>

            <div ref={profileContainerRef} className="absolute top-8 right-8 z-10">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg"
                />
                <button
                    onClick={handleProfilePicClick}
                    className="w-12 h-12 rounded-full bg-gray-200/50 dark:bg-white/10 border-2 border-black/10 dark:border-white/20 flex items-center justify-center overflow-hidden transition-transform duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-black focus:ring-orange-400"
                    aria-label="Menu de perfil"
                >
                    {profilePic ? (
                        <img src={profilePic} alt="Foto de perfil" className="w-full h-full object-cover" />
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-500 dark:text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    )}
                </button>

                {isMenuOpen && (
                    <div 
                        className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-gray-100/80 dark:bg-black/50 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-lg animate-pop-in"
                        role="menu" aria-orientation="vertical"
                    >
                        <div className="py-1">
                            <button
                                onClick={handleEditPhotoClick}
                                className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 transition-colors rounded-t-lg"
                                role="menuitem"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                                <span>Editar Foto</span>
                            </button>
                            <button
                                onClick={toggleTheme}
                                className="flex items-center justify-between w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 transition-colors rounded-b-lg"
                                role="menuitem"
                            >
                                <div className="flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                                    <span>Alterar Tema</span>
                                </div>
                                <div role="switch" aria-checked={theme === 'dark'} className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${theme === 'dark' ? 'bg-orange-500' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ${theme === 'dark' ? 'translate-x-5' : ''}`}></div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center w-full">
                <h1 className="text-5xl font-extralight tracking-[0.3em] bg-gradient-to-r from-orange-300 via-rose-400 to-pink-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-[shine_5s_linear_infinite]">
                    ZENITH
                </h1>
                <p className="mt-4 mb-8 text-sm font-light text-gray-600 dark:text-white/70">
                    Aguardando suas coordenadas.
                </p>
                <WeekCalendar 
                    today={today} 
                    selectedDate={selectedDate} 
                    onDateSelect={setSelectedDate}
                    tasks={tasks}
                />
                <DaySummary 
                    selectedDate={selectedDate} 
                    transactions={transactions}
                    supermarketItems={supermarketItems}
                    tasks={tasks}
                    onNavigate={navigateTo}
                />
            </div>
        </div>
    );
};

export default Dashboard;
