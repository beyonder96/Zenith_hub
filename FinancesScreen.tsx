import React, { useState, useMemo, useEffect, useRef } from 'react';

// --- Ícones para Categorias ---
const IconWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-gray-800 dark:text-white/80">
        {children}
    </div>
);
const SalaryIcon = () => <IconWrapper><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg></IconWrapper>;
const ShoppingIcon = () => <IconWrapper><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg></IconWrapper>;
const FoodIcon = () => <IconWrapper><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" /></svg></IconWrapper>;
const BillsIcon = () => <IconWrapper><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></IconWrapper>;
const TransportIcon = () => <IconWrapper><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg></IconWrapper>;
const OtherIcon = () => <IconWrapper><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg></IconWrapper>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

const categoryIcons: { [key: string]: React.ReactNode } = {
    salary: <SalaryIcon />,
    shopping: <ShoppingIcon />,
    food: <FoodIcon />,
    bills: <BillsIcon />,
    transport: <TransportIcon />,
    other: <OtherIcon />,
};

type Category = 'salary' | 'shopping' | 'food' | 'transport' | 'bills' | 'other';
type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

const categoryLabels: Record<Category, string> = {
    salary: 'Salário',
    shopping: 'Compras',
    food: 'Alimentação',
    bills: 'Contas',
    transport: 'Transporte',
    other: 'Outros',
}

// --- Tipos e Dados ---
interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: Category;
  recurring?: {
    frequency: RecurrenceFrequency;
  };
}
interface FormState {
    description: string;
    amount: string;
    date: string;
    type: 'expense' | 'income';
    category: Category;
    isRecurring: boolean;
    recurrenceFrequency: RecurrenceFrequency;
}

const mockTransactions: Transaction[] = [];

const STORAGE_KEY = 'zenith-finances-transactions';
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const SWIPE_THRESHOLD = 60; // pixels

// --- Monthly Expenses Chart Component ---
const MonthlyExpensesChart: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    const chartData = useMemo(() => {
        const data: { [key: string]: { income: number; expenses: number } } = {};
        const monthLabels: { [key: string]: string } = {};
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth();
            const key = `${year}-${String(month + 1).padStart(2, '0')}`;
            data[key] = { income: 0, expenses: 0 };
            monthLabels[key] = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '').toUpperCase();
        }

        transactions.forEach(tx => {
            const txDate = new Date(tx.date + 'T12:00:00');
            const key = tx.date.substring(0, 7); // YYYY-MM

            if (data.hasOwnProperty(key)) {
                if (tx.amount > 0) {
                    data[key].income += tx.amount;
                } else {
                    data[key].expenses += Math.abs(tx.amount);
                }
            }
        });

        return Object.keys(data).map(key => ({
            month: monthLabels[key],
            income: data[key].income,
            expenses: data[key].expenses,
        }));
    }, [transactions]);

    const hasData = useMemo(() => chartData.some(d => d.income > 0 || d.expenses > 0), [chartData]);
    const maxAmount = useMemo(() => Math.max(...chartData.flatMap(d => [d.income, d.expenses]), 1), [chartData]);

    if (!hasData) {
        return (
            <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-black/10 dark:border-white/20 rounded-2xl p-4 text-center mb-4">
                <p className="text-sm text-gray-500 dark:text-white/60 italic">Nenhum dado financeiro nos últimos 6 meses para exibir no gráfico.</p>
            </div>
        );
    }
    
    const width = 320;
    const height = 160;
    const padding = { top: 20, right: 20, bottom: 30, left: 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const createPoints = (dataKey: 'income' | 'expenses') => {
        return chartData.map((d, i) => {
            const x = padding.left + (i * chartWidth) / (chartData.length - 1);
            const y = padding.top + chartHeight - (d[dataKey] / maxAmount) * chartHeight;
            return { x, y };
        });
    };

    const createPath = (points: {x: number, y: number}[]) => {
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    };
    
    const createAreaPath = (linePath: string, points: {x: number, y: number}[]) => {
        return `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;
    };

    const incomePoints = createPoints('income');
    const expensesPoints = createPoints('expenses');

    const incomeLinePath = createPath(incomePoints);
    const expensesLinePath = createPath(expensesPoints);

    const incomeAreaPath = createAreaPath(incomeLinePath, incomePoints);
    const expensesAreaPath = createAreaPath(expensesLinePath, expensesPoints);

    return (
        <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-black/10 dark:border-white/20 rounded-2xl p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/80">Receitas e Despesas (Últimos 6 Meses)</h3>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                        <span className="text-gray-600 dark:text-white/70">Receitas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                        <span className="text-gray-600 dark:text-white/70">Despesas</span>
                    </div>
                </div>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                <defs>
                    {/* Expense Gradients */}
                    <linearGradient id="expenseChartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(251, 146, 60, 0.4)" />
                        <stop offset="100%" stopColor="rgba(236, 72, 153, 0.05)" />
                    </linearGradient>
                    <linearGradient id="expenseLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#fb923c" />
                        <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>

                    {/* Income Gradients */}
                    <linearGradient id="incomeChartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(45, 212, 191, 0.4)" />
                        <stop offset="100%" stopColor="rgba(45, 212, 191, 0.05)" />
                    </linearGradient>
                    <linearGradient id="incomeLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#2dd4bf" />
                        <stop offset="100%" stopColor="#67e8f9" />
                    </linearGradient>
                </defs>
                
                {/* Grid Lines */}
                {[0.25, 0.5, 0.75, 1].map(factor => (
                    <line
                        key={factor}
                        x1={padding.left}
                        y1={padding.top + chartHeight - (chartHeight * factor)}
                        x2={width - padding.right}
                        y2={padding.top + chartHeight - (chartHeight * factor)}
                        className="stroke-black/10 dark:stroke-white/10"
                        strokeWidth="1"
                    />
                ))}

                {/* Expense Line and Area */}
                <path d={expensesAreaPath} fill="url(#expenseChartGradient)" />
                <path d={expensesLinePath} fill="none" stroke="url(#expenseLineGradient)" strokeWidth="2" />

                {/* Income Line and Area */}
                <path d={incomeAreaPath} fill="url(#incomeChartGradient)" />
                <path d={incomeLinePath} fill="none" stroke="url(#incomeLineGradient)" strokeWidth="2" />
                 
                {/* Data Points */}
                {expensesPoints.map((p, i) => (
                    <circle key={`exp-${i}`} cx={p.x} cy={p.y} r="3" className="fill-gray-200 dark:fill-gray-800" stroke="#fb923c" strokeWidth="1.5" />
                ))}
                {incomePoints.map((p, i) => (
                    <circle key={`inc-${i}`} cx={p.x} cy={p.y} r="3" className="fill-gray-200 dark:fill-gray-800" stroke="#2dd4bf" strokeWidth="1.5" />
                ))}

                {/* X-axis Labels */}
                {chartData.map((d, i) => (
                    <text
                        key={d.month}
                        x={padding.left + (i * chartWidth) / (chartData.length - 1)}
                        y={height - 10}
                        textAnchor="middle"
                        className="text-[10px] font-medium fill-gray-600 dark:fill-white/60"
                    >
                        {d.month}
                    </text>
                ))}
            </svg>
        </div>
    );
};


const FinancesScreen: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>(() => {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : mockTransactions;
        } catch (error) {
            console.error("Error reading transactions from localStorage", error);
            return mockTransactions;
        }
    });

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [category, setCategory] = useState<Category>('shopping');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('monthly');
    
    const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    
    const [formInitialState, setFormInitialState] = useState<FormState | null>(null);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

    const swipeItemRef = useRef<{ id: string | null; el: HTMLLIElement | null }>({ id: null, el: null });
    const dragInfo = useRef({ startX: 0, deltaX: 0, isDragging: false });
    
    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        } catch (error) {
            console.error("Error writing transactions to localStorage", error);
        }
    }, [transactions]);
    
    const { totalBalance, monthlyIncome, monthlyExpenses } = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return transactions.reduce((acc, tx) => {
            acc.totalBalance += tx.amount;
            const txDate = new Date(tx.date + 'T12:00:00'); // Use midday to avoid timezone issues
            if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
                if (tx.amount > 0) {
                    acc.monthlyIncome += tx.amount;
                } else {
                    acc.monthlyExpenses += tx.amount;
                }
            }
            return acc;
        }, { totalBalance: 0, monthlyIncome: 0, monthlyExpenses: 0 });
    }, [transactions]);
    
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        transactions.forEach(tx => {
            months.add(tx.date.substring(0, 7)); // YYYY-MM
        });
        return Array.from(months).sort().reverse();
    }, [transactions]);

    const filteredAndSortedTransactions = useMemo(() => {
        const filtered = transactions.filter(tx => {
            if (selectedMonth === 'all') return true;
            return tx.date.startsWith(selectedMonth);
        });
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, selectedMonth]);

    const hasUnsavedChanges = useMemo(() => {
        if (!isFormVisible || !formInitialState) return false;
        const currentAmountStr = amount.replace(',', '.').trim();
        const initialAmountStr = formInitialState.amount.replace(',', '.').trim();
        return (
            description.trim() !== formInitialState.description.trim() ||
            currentAmountStr !== initialAmountStr ||
            date !== formInitialState.date ||
            type !== formInitialState.type ||
            (type === 'expense' && category !== formInitialState.category) ||
            isRecurring !== formInitialState.isRecurring ||
            (isRecurring && recurrenceFrequency !== formInitialState.recurrenceFrequency)
        );
    }, [description, amount, date, type, category, isRecurring, recurrenceFrequency, formInitialState, isFormVisible]);
    
    const closeForm = () => {
        setIsFormVisible(false);
        setEditingTransactionId(null);
        setFormInitialState(null);
        // Do not reset form fields here, to allow animation to finish smoothly
    };

    const resetFormFields = () => {
        setDescription('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setType('expense');
        setCategory('shopping');
        setIsRecurring(false);
        setRecurrenceFrequency('monthly');
    };

    const openFormForNew = () => {
        resetFormFields();
        const initialDate = new Date().toISOString().split('T')[0];
        setFormInitialState({
            description: '', amount: '', date: initialDate, type: 'expense',
            category: 'shopping', isRecurring: false, recurrenceFrequency: 'monthly'
        });
        setEditingTransactionId(null);
        setIsFormVisible(true);
    };

    const openFormForEdit = (transaction: Transaction) => {
        const initialState: FormState = {
            description: transaction.description,
            amount: Math.abs(transaction.amount).toString().replace('.', ','),
            date: transaction.date,
            type: transaction.amount > 0 ? 'income' : 'expense',
            category: transaction.category,
            isRecurring: !!transaction.recurring,
            recurrenceFrequency: transaction.recurring?.frequency || 'monthly',
        };
        
        setDescription(initialState.description);
        setAmount(initialState.amount);
        setDate(initialState.date);
        setType(initialState.type);
        setCategory(initialState.category);
        setIsRecurring(initialState.isRecurring);
        setRecurrenceFrequency(initialState.recurrenceFrequency);
        
        setFormInitialState(initialState);
        setEditingTransactionId(transaction.id);
        setIsFormVisible(true);
    };

    const handleCancelClick = () => {
        if (hasUnsavedChanges) {
            setShowCancelConfirm(true);
        } else {
            closeForm();
        }
    };

    const handleDelete = (id: string) => {
        setDeletingId(id);
        setTimeout(() => {
            setTransactions(prev => prev.filter(tx => tx.id !== id));
            setDeletingId(null);
        }, 300); // Match animation duration
    };
    
    const handleSaveTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount.replace(',', '.'));
        if (!description.trim() || isNaN(numericAmount) || numericAmount <= 0) return;

        const transactionData = {
            description,
            amount: type === 'income' ? numericAmount : -numericAmount,
            date,
            category: type === 'income' ? 'salary' : category,
            ...(isRecurring && { recurring: { frequency: recurrenceFrequency } })
        };

        if (editingTransactionId) {
            setTransactions(prev => prev.map(tx => tx.id === editingTransactionId ? { ...tx, ...transactionData } : tx));
            setNewlyAddedId(null);
        } else {
            const newTransaction: Transaction = { id: Date.now().toString(), ...transactionData };
            setTransactions(prev => [newTransaction, ...prev]);
            setNewlyAddedId(newTransaction.id);
        }
        
        setShowSuccessAnimation(true);
        setTimeout(() => {
            closeForm();
            setTimeout(() => setShowSuccessAnimation(false), 500); // Reset after form is gone
        }, 1500);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, txId: string) => {
        if (e.button !== 0 || isFormVisible) return;
        dragInfo.current = { startX: e.clientX, deltaX: 0, isDragging: true };
        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);
        target.style.transition = 'none'; // Disable transition during drag
        swipeItemRef.current = { id: txId, el: target.parentElement as HTMLLIElement };
    };
    
    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragInfo.current.isDragging) return;
        const deltaX = e.clientX - dragInfo.current.startX;
        dragInfo.current.deltaX = deltaX;
        e.currentTarget.style.transform = `translateX(${deltaX}px)`;
    
        const editAction = swipeItemRef.current.el?.querySelector('.swipe-action-edit') as HTMLElement;
        const deleteAction = swipeItemRef.current.el?.querySelector('.swipe-action-delete') as HTMLElement;
        const opacity = Math.min(Math.abs(deltaX) / SWIPE_THRESHOLD, 1);
        if (deltaX > 0 && editAction) editAction.style.opacity = opacity.toString();
        if (deltaX < 0 && deleteAction) deleteAction.style.opacity = opacity.toString();
    };
    
    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>, transaction: Transaction) => {
        if (!dragInfo.current.isDragging) return;
        const target = e.currentTarget;
        target.style.transition = 'transform 0.3s ease-out';
        
        const { deltaX } = dragInfo.current;
        if (deltaX > SWIPE_THRESHOLD) { // Swiped right (Edit)
            openFormForEdit(transaction);
        } else if (deltaX < -SWIPE_THRESHOLD) { // Swiped left (Delete)
            handleDelete(transaction.id);
        }
        target.style.transform = `translateX(0px)`;
    
        const editAction = swipeItemRef.current.el?.querySelector('.swipe-action-edit') as HTMLElement;
        const deleteAction = swipeItemRef.current.el?.querySelector('.swipe-action-delete') as HTMLElement;
        if (editAction) editAction.style.opacity = '0';
        if (deleteAction) deleteAction.style.opacity = '0';
    
        dragInfo.current = { startX: 0, deltaX: 0, isDragging: false };
        try { target.releasePointerCapture(e.pointerId); } catch (error) {}
        swipeItemRef.current = { id: null, el: null };
    };

    const handleExportPDF = () => {
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF();
    
        if (filteredAndSortedTransactions.length === 0) {
            alert("Nenhuma transação para exportar no período selecionado.");
            return;
        }
    
        const summary = filteredAndSortedTransactions.reduce((acc, tx) => {
            if (tx.amount > 0) acc.income += tx.amount;
            else acc.expenses += tx.amount;
            acc.balance += tx.amount;
            return acc;
        }, { income: 0, expenses: 0, balance: 0 });
    
        const monthLabel = selectedMonth === 'all' 
            ? 'Todos os Meses' 
            : new Date(selectedMonth + '-02T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
        doc.setFontSize(18);
        doc.text('Relatório Financeiro', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Período: ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`, 14, 29);
    
        const summaryY = 40;
        doc.setFontSize(10);
        doc.text(`Receitas: ${currencyFormatter.format(summary.income)}`, 14, summaryY);
        doc.text(`Despesas: ${currencyFormatter.format(summary.expenses)}`, 70, summaryY);
        doc.text(`Saldo do Período: ${currencyFormatter.format(summary.balance)}`, 130, summaryY);
    
        const tableColumn = ["Data", "Descrição", "Categoria", "Valor"];
        const tableRows: (string | number)[][] = [];
    
        filteredAndSortedTransactions.forEach(tx => {
            const txData = [
                new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR'),
                tx.description,
                categoryLabels[tx.category],
                currencyFormatter.format(tx.amount)
            ];
            tableRows.push(txData);
        });
    
        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 50,
            theme: 'striped',
            headStyles: { fillColor: [31, 41, 55] },
        });
        
        const dateStr = new Date().toISOString().split('T')[0];
        doc.save(`relatorio-financeiro-${dateStr}.pdf`);
    };

    const formInputClasses = "w-full bg-white/80 dark:bg-white/10 backdrop-blur-sm border border-black/10 dark:border-white/20 rounded-lg px-4 py-3 text-black dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-orange-400/80 transition-all duration-300";

    return (
        <div className="relative flex flex-col h-full w-full max-w-md text-gray-800 dark:text-white">
             {showCancelConfirm && (
                <div className="fixed inset-0 bg-gray-900/60 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-gray-100/90 dark:bg-black/50 backdrop-blur-xl rounded-2xl p-6 w-full max-w-sm border border-black/10 dark:border-white/10 shadow-2xl animate-scale-in">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 text-center mb-2">Descartar Alterações?</h3>
                        <p className="text-center text-gray-600 dark:text-white/70 mb-6">Você tem alterações não salvas. Tem certeza de que quer sair?</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowCancelConfirm(false)} className="bg-black/10 dark:bg-white/10 text-gray-800 dark:text-white/80 px-4 py-2 rounded-lg hover:bg-black/20 dark:hover:bg-white/20 transition-colors">Continuar Editando</button>
                            <button onClick={() => { setShowCancelConfirm(false); closeForm(); }} className="bg-rose-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-rose-600 transition-colors">Descartar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-y-auto pb-28 px-4 pt-4">
                <h1 className="text-4xl font-light mb-6 text-center bg-gradient-to-r from-orange-300 via-rose-400 to-pink-500 bg-clip-text text-transparent flex-shrink-0">Finanças</h1>
                <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-black/10 dark:border-white/20 rounded-2xl p-6 text-center mb-4 flex-shrink-0">
                    <p className="text-sm text-gray-600 dark:text-white/70">Saldo Atual</p>
                    <p className="text-4xl font-bold tracking-tight">{currencyFormatter.format(totalBalance)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4 flex-shrink-0">
                    <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-black/10 dark:border-white/20 rounded-2xl p-4">
                        <p className="text-xs text-gray-600 dark:text-white/70 mb-1">Receitas (Mês)</p>
                        <p className="text-xl font-semibold text-teal-500 dark:text-teal-400">{currencyFormatter.format(monthlyIncome)}</p>
                    </div>
                    <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-black/10 dark:border-white/20 rounded-2xl p-4">
                        <p className="text-xs text-gray-600 dark:text-white/70 mb-1">Despesas (Mês)</p>
                        <p className="text-xl font-semibold text-rose-500 dark:text-rose-400">{currencyFormatter.format(monthlyExpenses)}</p>
                    </div>
                </div>
                <div className="flex-shrink-0"><MonthlyExpensesChart transactions={transactions} /></div>
                
                <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-black/10 dark:border-white/20 rounded-2xl p-4 mb-6 flex-shrink-0 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-grow w-full">
                        <label htmlFor="month-filter" className="text-xs text-gray-600 dark:text-white/70 mb-1 block">Filtrar por Mês</label>
                        <select 
                            id="month-filter"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            className="w-full bg-gray-200/50 dark:bg-black/30 border border-black/10 dark:border-white/20 rounded-lg px-3 py-2 text-gray-800 dark:text-white/90 focus:outline-none focus:ring-1 focus:ring-orange-400/80"
                        >
                            <option value="all" className="bg-gray-300 dark:bg-gray-900">Todos os Meses</option>
                            {availableMonths.map(month => (
                                <option key={month} value={month} className="bg-gray-300 dark:bg-gray-900">
                                    {new Date(month + '-02T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button 
                        onClick={handleExportPDF}
                        className="w-full sm:w-auto self-end h-11 bg-orange-500 text-white px-4 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-shrink-0"
                        disabled={filteredAndSortedTransactions.length === 0}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Exportar</span>
                    </button>
                </div>

                <h2 className="text-lg font-medium text-gray-900 dark:text-white/90 mb-3 px-2 flex-shrink-0">Histórico</h2>
                
                {filteredAndSortedTransactions.length > 0 ? (
                    <ul className="space-y-3">
                        {filteredAndSortedTransactions.map(tx => (
                            <li key={tx.id} className={`relative rounded-2xl overflow-hidden ${tx.id === newlyAddedId ? 'animate-pop-in' : ''} ${tx.id === deletingId ? 'animate-shrink-out' : ''}`}>
                                <div className="swipe-action swipe-action-edit left-0 bg-orange-500"><EditIcon /></div>
                                <div className="swipe-action swipe-action-delete right-0 bg-rose-500"><DeleteIcon /></div>
                                <div 
                                    onPointerDown={(e) => handlePointerDown(e, tx.id)} 
                                    onPointerMove={handlePointerMove} 
                                    onPointerUp={(e) => handlePointerUp(e, tx)} 
                                    onPointerCancel={(e) => handlePointerUp(e, tx)} 
                                    className="relative flex items-center justify-between p-5 bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-black/10 dark:border-white/20 w-full z-10 touch-pan-y hover:bg-white dark:hover:bg-white/20 transition-colors duration-200" 
                                    style={{ cursor: isFormVisible ? 'default' : 'grab' }}
                                >
                                    <div className="flex items-center gap-5">
                                        {categoryIcons[tx.category]}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-gray-900 dark:text-white text-lg">{tx.description}</p>
                                                {tx.recurring && (
                                                    <div title="Transação Recorrente">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-500 dark:text-cyan-300/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-4.991-2.696L7.985 5.644m0 0l-3.182 3.182m3.182-3.182v4.992" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-white/60 mt-1">{new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                                        </div>
                                    </div>
                                    <p className={`font-semibold text-lg ${tx.amount > 0 ? 'text-teal-500 dark:text-teal-400' : 'text-rose-500 dark:text-rose-400'}`}>{tx.amount > 0 ? '+' : ''}{currencyFormatter.format(tx.amount)}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-black/10 dark:border-white/20 rounded-2xl p-8 text-center">
                        <p className="text-sm text-gray-500 dark:text-white/60 italic">Nenhuma transação registrada para o período selecionado.</p>
                    </div>
                )}
            </div>

            {!isFormVisible && (
                <button onClick={openFormForNew} className="absolute bottom-28 right-6 z-30 w-16 h-16 bg-gradient-to-br from-orange-400 to-pink-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-black focus:ring-orange-300" aria-label="Adicionar Nova Transação">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
            )}

            {isFormVisible && (
                <div className="absolute inset-0 bg-gray-100 dark:bg-black z-40 flex flex-col animate-slide-in-up" onAnimationEnd={() => newlyAddedId && setNewlyAddedId(null)}>
                    <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10">
                        <button type="button" onClick={handleCancelClick} className="text-orange-500 dark:text-orange-400 px-2 py-1">Cancelar</button>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">{editingTransactionId ? 'Editar Transação' : 'Nova Transação'}</h2>
                        <button type="submit" form="transaction-form" className="text-orange-500 dark:text-orange-400 font-bold px-2 py-1">
                            {editingTransactionId ? 'Atualizar' : 'Salvar'}
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto p-4">
                        <form id="transaction-form" onSubmit={handleSaveTransaction} className="space-y-6">
                            <div><label htmlFor="description" className="text-sm text-gray-600 dark:text-white/70 mb-1 block">Descrição</label><input id="description" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Aluguel" className={formInputClasses} required /></div>
                            <div className="flex gap-4">
                                <div className="w-1/2"><label htmlFor="amount" className="text-sm text-gray-600 dark:text-white/70 mb-1 block">Valor (R$)</label><input id="amount" type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="25,50" className={formInputClasses} required /></div>
                                <div className="w-1/2"><label htmlFor="date" className="text-sm text-gray-600 dark:text-white/70 mb-1 block">Data</label><input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className={formInputClasses} required /></div>
                            </div>
                            <div>
                                <span className="text-sm text-gray-600 dark:text-white/70 mb-2 block">Tipo</span>
                                <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setType('expense')} className={`p-3 rounded-lg border text-center transition-colors ${type === 'expense' ? 'bg-rose-500/20 border-rose-500' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/20'}`}>Despesa</button><button type="button" onClick={() => setType('income')} className={`p-3 rounded-lg border text-center transition-colors ${type === 'income' ? 'bg-teal-400/20 border-teal-400' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/20'}`}>Receita</button></div>
                            </div>
                             {type === 'expense' && (<div className="animate-pop-in"><label htmlFor="category" className="text-sm text-gray-600 dark:text-white/70 mb-1 block">Categoria</label><select id="category" value={category} onChange={e => setCategory(e.target.value as Category)} className={formInputClasses}>
                                {Object.entries(categoryLabels).filter(([key]) => key !== 'salary').map(([key, label]) => <option key={key} value={key} className="bg-gray-300 dark:bg-gray-900">{label}</option>)}
                            </select></div>)}
                             <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-4 rounded-lg">
                                <label htmlFor="isRecurring" className="font-medium text-gray-900 dark:text-white/90">Transação Recorrente</label>
                                <button type="button" role="switch" aria-checked={isRecurring} onClick={() => setIsRecurring(!isRecurring)} id="isRecurring" className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-black focus:ring-orange-400 ${isRecurring ? 'bg-orange-500' : 'bg-gray-400 dark:bg-gray-700'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isRecurring ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                            </div>
                            {isRecurring && (<div className="animate-pop-in"><label htmlFor="recurrenceFrequency" className="text-sm text-gray-600 dark:text-white/70 mb-1 block">Frequência</label><select id="recurrenceFrequency" value={recurrenceFrequency} onChange={e => setRecurrenceFrequency(e.target.value as RecurrenceFrequency)} className={formInputClasses}>
                                <option value="daily" className="bg-gray-300 dark:bg-gray-900">Diária</option><option value="weekly" className="bg-gray-300 dark:bg-gray-900">Semanal</option><option value="monthly" className="bg-gray-300 dark:bg-gray-900">Mensal</option><option value="yearly" className="bg-gray-300 dark:bg-gray-900">Anual</option>
                            </select></div>)}
                        </form>
                    </div>

                    {showSuccessAnimation && (
                        <div className="absolute inset-0 bg-gray-100/90 dark:bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in">
                            <div className="success-checkmark__container">
                                <div className="success-checkmark">
                                    <svg className="w-full h-full" viewBox="0 0 52 52">
                                        <circle className="success-checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                                        <path className="success-checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                                    </svg>
                                </div>
                            </div>
                            <p className="mt-4 text-lg font-medium text-gray-800 dark:text-white/90 animate-fade-in">Salvo com Sucesso!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FinancesScreen;