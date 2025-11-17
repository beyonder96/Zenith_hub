import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getTasks, addTask, updateTask, deleteTask, Task, Subtask, NewTaskData } from './firebaseDb';
import { GoogleGenAI, Type } from "@google/genai";

const FOCUS_DURATION = 25 * 60; // 25 minutes
const BREAK_DURATION = 5 * 60; // 5 minutes

type Importance = 'low' | 'medium' | 'high';
type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

const importanceMap: Record<Importance, { label: string; color: string }> = {
    low: { label: 'Baixa', color: 'bg-sky-400' },
    medium: { label: 'Média', color: 'bg-orange-400' },
    high: { label: 'Alta', color: 'bg-rose-500' },
};

const recurrenceMap: Record<RecurrenceFrequency, string> = {
    daily: 'Diária',
    weekly: 'Semanal',
    monthly: 'Mensal',
    yearly: 'Anual',
};

const sortTasks = (tasks: Task[]): Task[] => {
    const importanceOrder: Record<Importance, number> = { high: 1, medium: 2, low: 3 };
    
    return [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (!a.completed) {
            const aImportance = a.importance ? importanceOrder[a.importance] : 4;
            const bImportance = b.importance ? importanceOrder[b.importance] : 4;
            if (aImportance !== bImportance) return aImportance - bImportance;

            const aDate = a.dueDate ? new Date(a.dueDate) : null;
            const bDate = b.dueDate ? new Date(b.dueDate) : null;
            if (aDate && !bDate) return -1;
            if (!aDate && bDate) return 1;
            if (aDate && bDate) return aDate.getTime() - bDate.getTime();
        }
        // Firestore IDs are strings, so we can't subtract them.
        // A simple string comparison is fine for sorting by creation time if IDs are time-ordered.
        // However, for stability, we can just compare them lexicographically.
        if (a.id < b.id) return 1;
        if (a.id > b.id) return -1;
        return 0;
    });
};

// --- iOS-style Date Picker Component ---
interface DatePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
    initialDate?: Date | null;
}

const DatePicker: React.FC<DatePickerProps> = ({ isOpen, onClose, onConfirm, initialDate }) => {
    const [pickerDate, setPickerDate] = useState(initialDate || new Date());

    const ITEM_HEIGHT = 56;
    const CONTAINER_HEIGHT = 224;
    
    // Using an inner container with padding is more robust for aligning scroll-snap
    const PADDING_TOP_BOTTOM = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2;

    // --- Original Data Arrays ---
    const originalYears = useMemo(() => Array.from({ length: 41 }, (_, i) => new Date().getFullYear() - 20 + i), []);
    const originalMonths = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('pt-BR', { month: 'long' })), []);
    const daysInMonth = useMemo(() => new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 0).getDate(), [pickerDate]);
    const originalDays = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

    // --- Triplicated Data for Looping Effect ---
    const years = useMemo(() => [...originalYears, ...originalYears, ...originalYears], [originalYears]);
    const months = useMemo(() => [...originalMonths, ...originalMonths, ...originalMonths], [originalMonths]);
    const days = useMemo(() => [...originalDays, ...originalDays, ...originalDays], [originalDays]);
    
    // --- Refs ---
    const dayRef = useRef<HTMLDivElement>(null);
    const monthRef = useRef<HTMLDivElement>(null);
    const yearRef = useRef<HTMLDivElement>(null);
    const isTeleporting = useRef({ day: false, month: false, year: false });
    const scrollTimeout = useRef<{ day?: number; month?: number; year?: number }>({});

    // --- Effects for Initialization and Synchronization ---
    useEffect(() => {
        if (isOpen) {
            const date = initialDate ? new Date(initialDate) : new Date();
            // Ensure date is valid (adjusting for timezone offset)
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
            setPickerDate(date);
            
            setTimeout(() => {
                if (dayRef.current) dayRef.current.scrollTop = (originalDays.length + date.getDate() - 1) * ITEM_HEIGHT;
                if (monthRef.current) monthRef.current.scrollTop = (originalMonths.length + date.getMonth()) * ITEM_HEIGHT;
                if (yearRef.current) yearRef.current.scrollTop = (originalYears.length + originalYears.indexOf(date.getFullYear())) * ITEM_HEIGHT;
            }, 0);
        }
    }, [isOpen, initialDate]);

    useEffect(() => {
        if (!dayRef.current) return;
        const currentDay = pickerDate.getDate();
        const targetScrollTop = (originalDays.length + currentDay - 1) * ITEM_HEIGHT;
        if (Math.abs(dayRef.current.scrollTop - targetScrollTop) > ITEM_HEIGHT / 2) {
             dayRef.current.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
        }
    }, [originalDays]); // Runs when daysInMonth changes

    // --- Scroll Handling with Looping Logic ---
    const handleScroll = (type: 'day' | 'month' | 'year') => {
        if (isTeleporting.current[type]) return;
        clearTimeout(scrollTimeout.current[type]);

        scrollTimeout.current[type] = window.setTimeout(() => {
            const refs = { day: dayRef, month: monthRef, year: yearRef };
            const originalDataSets = { day: originalDays, month: originalMonths, year: originalYears };
            
            const ref = refs[type];
            const originalData = originalDataSets[type];
            if (!ref.current) return;

            const scrollTop = ref.current.scrollTop;
            const index = Math.round(scrollTop / ITEM_HEIGHT);

            // Update date state
            setPickerDate(current => {
                const newDate = new Date(current);
                const valIndex = index % originalData.length;

                if (type === 'day') newDate.setDate(originalData[valIndex] as number);
                if (type === 'month') newDate.setMonth(valIndex);
                if (type === 'year') newDate.setFullYear(originalData[valIndex] as number);
                
                const maxDays = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
                if (newDate.getDate() > maxDays) newDate.setDate(maxDays);
                
                return newDate;
            });
            
            // Teleport if scroll is near the edges
            if (index < originalData.length || index >= originalData.length * 2) {
                isTeleporting.current[type] = true;
                const newIndex = (index % originalData.length) + originalData.length;
                ref.current.scrollTop = newIndex * ITEM_HEIGHT;
                setTimeout(() => { isTeleporting.current[type] = false; }, 50);
            }
        }, 150);
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/30 dark:bg-black/30 z-40 flex items-end justify-center animate-fade-in" onClick={onClose}>
            <div className="bg-gray-200/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-t-2xl w-full max-w-md animate-slide-in-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-black/10 dark:border-white/20">
                    <button onClick={onClose} className="text-orange-500 dark:text-orange-400 px-2 py-1 text-lg">Cancelar</button>
                    <button onClick={() => onConfirm(pickerDate)} className="text-orange-500 dark:text-orange-400 font-bold px-2 py-1 text-lg">Confirmar</button>
                </div>
                <div className="flex justify-center items-center h-[224px] p-4 relative date-picker-wheels-container">
                    <div className="absolute top-1/2 left-4 right-4 h-[56px] -translate-y-1/2 bg-black/5 dark:bg-white/5 border-y border-black/10 dark:border-white/20 rounded-lg pointer-events-none z-10"></div>
                    <div ref={dayRef} onScroll={() => handleScroll('day')} className="date-picker-wheel w-1/4">
                         <div style={{ paddingTop: `${PADDING_TOP_BOTTOM}px`, paddingBottom: `${PADDING_TOP_BOTTOM}px` }}>
                            {days.map((day, index) => <div key={index} className="date-picker-item text-xl text-gray-800 dark:text-gray-200">{day}</div>)}
                        </div>
                    </div>
                    <div ref={monthRef} onScroll={() => handleScroll('month')} className="date-picker-wheel w-1/2">
                         <div style={{ paddingTop: `${PADDING_TOP_BOTTOM}px`, paddingBottom: `${PADDING_TOP_BOTTOM}px` }}>
                            {months.map((month, index) => <div key={index} className="date-picker-item text-xl capitalize text-gray-800 dark:text-gray-200">{month}</div>)}
                        </div>
                    </div>
                    <div ref={yearRef} onScroll={() => handleScroll('year')} className="date-picker-wheel w-1/4">
                        <div style={{ paddingTop: `${PADDING_TOP_BOTTOM}px`, paddingBottom: `${PADDING_TOP_BOTTOM}px` }}>
                            {years.map((year, index) => <div key={index} className="date-picker-item text-xl text-gray-800 dark:text-gray-200">{year}</div>)}
                        </div>
                    </div>
                </div>
                 {/* Padding to push content above the floating menu */}
                <div className="h-28"></div>
            </div>
        </div>
    );
};

const calculateNextDueDate = (currentDateStr: string, frequency: RecurrenceFrequency): string => {
    // Use midday to avoid timezone boundary issues
    const date = new Date(currentDateStr + 'T12:00:00');
    switch (frequency) {
        case 'daily': date.setDate(date.getDate() + 1); break;
        case 'weekly': date.setDate(date.getDate() + 7); break;
        case 'monthly': date.setMonth(date.getMonth() + 1); break;
        case 'yearly': date.setFullYear(date.getFullYear() + 1); break;
    }
    // Manually build string to avoid timezone shifts from toISOString()
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


const ProductivityScreen: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
    const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');
    const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [pomodoroCount, setPomodoroCount] = useState(0);
    const [isPomodoroExpanded, setIsPomodoroExpanded] = useState(false);
    const timerIntervalRef = useRef<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [formText, setFormText] = useState('');
    const [formDueDate, setFormDueDate] = useState('');
    const [formImportance, setFormImportance] = useState<Importance | undefined>(undefined);
    const [formIsRecurring, setFormIsRecurring] = useState(false);
    const [formRecurrenceFrequency, setFormRecurrenceFrequency] = useState<RecurrenceFrequency>('monthly');
    
    // State for Drag and Drop
    const [dragOverInfo, setDragOverInfo] = useState<{ subtaskId: number; position: 'top' | 'bottom' } | null>(null);
    const draggedSubtaskRef = useRef<{ taskId: string; subtask: Subtask } | null>(null);

    const focusedTask = useMemo(() => tasks.find(t => t.id === focusedTaskId), [tasks, focusedTaskId]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const dbTasks = await getTasks();
                setTasks(sortTasks(dbTasks));
            } catch (error) {
                console.error("Error loading tasks from DB", error);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openMenuId !== null && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openMenuId]);


    useEffect(() => {
        if (isTimerActive) {
            timerIntervalRef.current = window.setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [isTimerActive]);

    useEffect(() => {
        if (timeLeft <= 0) {
            if (timerMode === 'focus') {
                setTimerMode('break');
                setTimeLeft(BREAK_DURATION);
                setPomodoroCount(prev => prev + 1);
            } else {
                setTimerMode('focus');
                setTimeLeft(FOCUS_DURATION);
            }
            setIsTimerActive(false);
            new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3').play().catch(e => console.error("Error playing sound", e));
        }
    }, [timeLeft, timerMode]);

    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formText.trim() === '') return;
    
        if (editingTask) {
            const updatedTask: Task = {
                ...editingTask,
                text: formText,
                dueDate: formDueDate || undefined,
                importance: formImportance,
                recurring: formIsRecurring ? { frequency: formRecurrenceFrequency } : undefined,
            };
            if (formIsRecurring) {
                updatedTask.completed = false; // Recurring tasks should be active
            }
            await updateTask(updatedTask);
            setTasks(prev => sortTasks(prev.map(t => t.id === editingTask.id ? updatedTask : t)));
        } else {
            const newTaskData: NewTaskData = {
                text: formText,
                completed: false,
                dueDate: formDueDate || undefined,
                importance: formImportance,
                recurring: formIsRecurring ? { frequency: formRecurrenceFrequency } : undefined,
                subtasks: [],
            };
            try {
                const newTask = await addTask(newTaskData);
                setTasks(prev => sortTasks([newTask, ...prev]));
            } catch (error) {
                console.error("Failed to add task:", error);
                // Optionally: show an error message to the user
            }
        }
        closeModal();
    };

    const handleToggleTask = async (task: Task) => {
        if (task.recurring && !task.completed) {
            const nextDueDate = calculateNextDueDate(
                task.dueDate || new Date().toISOString().split('T')[0], 
                task.recurring.frequency
            );
            const resetSubtasks = task.subtasks?.map(st => ({ ...st, completed: false }));
            const updatedTask = { ...task, dueDate: nextDueDate, subtasks: resetSubtasks };
            
            setTasks(prev => sortTasks(prev.map(t => t.id === task.id ? updatedTask : t)));
            await updateTask(updatedTask);
    
        } else {
            const updatedTask = { ...task, completed: !task.completed };
            setTasks(prev => sortTasks(prev.map(t => t.id === task.id ? updatedTask : t)));
            await updateTask(updatedTask);
        }
        setOpenMenuId(null);
    };

    const handleToggleSubtask = async (taskId: string, subtaskId: number) => {
        const taskToUpdate = tasks.find(t => t.id === taskId);
        if (!taskToUpdate || !taskToUpdate.subtasks) return;

        const updatedSubtasks = taskToUpdate.subtasks.map(st => 
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );

        const updatedTask = { ...taskToUpdate, subtasks: updatedSubtasks };
        
        // Update state without re-sorting main task list to preserve UI stability
        setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
        await updateTask(updatedTask);
    };


    const handleDeleteTask = async (id: string) => {
        if (focusedTaskId === id) setFocusedTaskId(null);
        setTasks(prev => prev.filter(t => t.id !== id));
        await deleteTask(id);
        setOpenMenuId(null);
    };
    
    const handleSelectFocusTask = (task: Task) => {
        if (task.completed) return;
        if (isTimerActive) {
            alert("Pause o timer para trocar de tarefa.");
            return;
        }
        setFocusedTaskId(prev => prev === task.id ? null : task.id);
        if (timerMode !== 'focus' || timeLeft !== FOCUS_DURATION) {
            setTimerMode('focus');
            setTimeLeft(FOCUS_DURATION);
        }
    };

    const handleBreakdownTask = async (task: Task) => {
        setOpenMenuId(null);
        setLoadingTaskId(task.id);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Você é um assistente de produtividade. Sua tarefa é dividir uma tarefa complexa em uma lista de subtarefas menores e acionáveis. A tarefa é: "${task.text}"`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.OBJECT, properties: { subtasks: { type: Type.ARRAY, description: "Uma lista de strings representando as subtarefas.", items: { type: Type.STRING }}}, required: ["subtasks"] }
                }
            });

            const result = JSON.parse(response.text);
            const subtaskTexts: string[] = result.subtasks || [];
            
            if (subtaskTexts.length > 0) {
                 const newSubtasks: Subtask[] = subtaskTexts.map((subtaskText, index) => ({
                    id: Date.now() + index,
                    text: subtaskText,
                    completed: false,
                }));

                const updatedTask = {
                    ...task,
                    subtasks: [...(task.subtasks || []), ...newSubtasks],
                };
                
                setTasks(prev => sortTasks(prev.map(t => t.id === task.id ? updatedTask : t)));
                await updateTask(updatedTask);
            }

        } catch (error) {
            console.error("Error with Gemini API:", error);
        } finally {
            setLoadingTaskId(null);
        }
    };
    
    const handleMenuToggle = (taskId: string) => {
        setOpenMenuId(prev => (prev === taskId ? null : taskId));
    };

    const resetForm = () => {
        setFormText('');
        setFormDueDate('');
        setFormImportance(undefined);
        setEditingTask(null);
        setFormIsRecurring(false);
        setFormRecurrenceFrequency('monthly');
    };
    const openAddModal = () => { resetForm(); setIsModalOpen(true); };
    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setFormText(task.text);
        setFormDueDate(task.dueDate || '');
        setFormImportance(task.importance);
        setFormIsRecurring(!!task.recurring);
        setFormRecurrenceFrequency(task.recurring?.frequency || 'monthly');
        setOpenMenuId(null);
        setIsModalOpen(true);
    };
    const closeModal = () => setIsModalOpen(false);

    const handleStartTimer = () => {
        setIsPomodoroExpanded(true);
        if (!isTimerActive) {
            setIsTimerActive(true);
        }
    };
    
    const toggleTimer = () => setIsTimerActive(!isTimerActive);
    
    const resetTimer = () => {
        setIsTimerActive(false);
        setTimeLeft(timerMode === 'focus' ? FOCUS_DURATION : BREAK_DURATION);
        setIsPomodoroExpanded(false);
    };
    
    // --- Subtask Drag and Drop Handlers ---
    const handleSubtaskDragStart = (e: React.DragEvent<HTMLLIElement>, taskId: string, subtask: Subtask) => {
        draggedSubtaskRef.current = { taskId, subtask };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', subtask.id.toString()); // For Firefox compatibility
        setTimeout(() => {
            if (e.target instanceof HTMLElement) e.target.classList.add('dragging');
        }, 0);
    };

    const handleSubtaskDragOver = (e: React.DragEvent<HTMLLIElement>, subtaskId: number) => {
        e.preventDefault();
        if (!draggedSubtaskRef.current || draggedSubtaskRef.current.subtask.id === subtaskId) return;
        const targetElement = e.currentTarget;
        const rect = targetElement.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position = e.clientY < midY ? 'top' : 'bottom';
        if (dragOverInfo?.subtaskId !== subtaskId || dragOverInfo?.position !== position) {
            setDragOverInfo({ subtaskId, position });
        }
    };

    const handleSubtaskDragLeave = () => {
        setDragOverInfo(null);
    };

    const handleSubtaskDrop = async (e: React.DragEvent<HTMLLIElement>, targetTaskId: string, targetSubtask: Subtask) => {
        e.preventDefault();
        if (!draggedSubtaskRef.current) return;

        const { taskId: sourceTaskId, subtask: sourceSubtask } = draggedSubtaskRef.current;
        if (sourceTaskId !== targetTaskId || sourceSubtask.id === targetSubtask.id) return;

        const taskToUpdate = tasks.find(t => t.id === targetTaskId);
        if (!taskToUpdate || !taskToUpdate.subtasks) return;

        let subtasks = [...taskToUpdate.subtasks];
        const sourceIndex = subtasks.findIndex(st => st.id === sourceSubtask.id);
        const targetIndex = subtasks.findIndex(st => st.id === targetSubtask.id);
        
        const [movedItem] = subtasks.splice(sourceIndex, 1);
        const adjustedTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;

        if (dragOverInfo?.position === 'top') {
            subtasks.splice(adjustedTargetIndex, 0, movedItem);
        } else {
            subtasks.splice(adjustedTargetIndex + 1, 0, movedItem);
        }
        
        const updatedTask = { ...taskToUpdate, subtasks };
        setTasks(prevTasks => prevTasks.map(t => t.id === targetTaskId ? updatedTask : t));
        await updateTask(updatedTask);
        
        setDragOverInfo(null);
    };

    const handleSubtaskDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
        if (e.target instanceof HTMLElement) e.target.classList.remove('dragging');
        draggedSubtaskRef.current = null;
        setDragOverInfo(null);
    };

    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const seconds = (timeLeft % 60).toString().padStart(2, '0');
    const progress = (timerMode === 'focus' ? (FOCUS_DURATION - timeLeft) / FOCUS_DURATION : (BREAK_DURATION - timeLeft) / BREAK_DURATION) * 100;
    
    const formatDate = (dateString?: string) => dateString ? new Date(dateString + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sem data';
    const getCardDate = (dateString?: string) => {
        if (!dateString) return { day: '—', month: '' };
        const date = new Date(dateString + 'T12:00:00');
        const monthStr = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        return {
            day: date.getDate().toString(),
            month: monthStr.toUpperCase(),
        };
    };

    const formInputClasses = "w-full bg-white/80 dark:bg-white/10 backdrop-blur-sm border border-black/10 dark:border-white/20 rounded-lg px-4 py-3 text-black dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-orange-400/80 transition-all duration-300";

    return (
        <div className="relative flex flex-col h-full w-full max-w-md text-gray-800 dark:text-white">
            <div className="flex-shrink-0">
                <h1 className="text-4xl font-light mb-6 text-center bg-gradient-to-r from-orange-300 via-rose-400 to-pink-500 bg-clip-text text-transparent">
                    Projetos
                </h1>
                 <div className={`mb-6 overflow-hidden transition-all duration-500 ease-in-out ${
                    isPomodoroExpanded 
                        ? 'w-full bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-black/10 dark:border-white/20 rounded-2xl' 
                        : 'w-4/5 mx-auto bg-gray-200/30 dark:bg-black/30 backdrop-blur-lg rounded-2xl shadow-lg border border-black/5 dark:border-white/10'
                }`}>
                    {!isPomodoroExpanded ? (
                        <div 
                            className="flex items-center justify-center p-2 animate-fade-in cursor-pointer" 
                            onClick={() => { if (isTimerActive) setIsPomodoroExpanded(true); }}
                        >
                             {!isTimerActive ? (
                                 <button 
                                    onClick={handleStartTimer} 
                                    className="w-10 h-10 bg-gradient-to-br from-orange-300 to-rose-400 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-black focus:ring-orange-300"
                                    aria-label="Iniciar timer de foco"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9.894 8.243l3.433 2.146a.5.5 0 010 .854l-3.433 2.146A.5.5 0 019 13.016V7.05a.5.5 0 01.894-.434z" />
                                    </svg>
                                </button>
                             ) : (
                                <div className="flex items-center justify-between w-full px-4">
                                     <span className="text-sm uppercase tracking-widest text-gray-500 dark:text-white/60">{timerMode === 'focus' ? 'Foco' : 'Pausa'}</span>
                                     <span className="text-xl font-bold tracking-tighter text-gray-900 dark:text-white">{minutes}:{seconds}</span>
                                </div>
                             )}
                        </div>
                    ) : (
                        <div className="relative flex flex-col items-center justify-center p-6 animate-fade-in">
                            <button onClick={() => setIsPomodoroExpanded(false)} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/5 dark:bg-white/10 rounded-full text-gray-500 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/20 transition-colors" aria-label="Minimizar timer">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            <div className="relative w-40 h-40">
                                <svg className="w-full h-full" viewBox="0 0 100 100">
                                    <circle className="stroke-current text-gray-200/60 dark:text-white/10" strokeWidth="8" cx="50" cy="50" r="45" fill="transparent"></circle>
                                    <circle className={`stroke-current ${timerMode === 'focus' ? 'text-orange-500' : 'text-teal-400'}`} strokeWidth="8" cx="50" cy="50" r="45" fill="transparent" strokeLinecap="round" transform="rotate(-90 50 50)" strokeDasharray={`${2 * Math.PI * 45}`} strokeDashoffset={`${(2 * Math.PI * 45) * (1 - progress / 100)}`} style={{ transition: 'stroke-dashoffset 0.5s linear' }}></circle>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-bold tracking-tighter text-gray-900 dark:text-white">{minutes}:{seconds}</span>
                                    <span className="text-xs uppercase tracking-widest text-gray-500 dark:text-white/60">{timerMode === 'focus' ? 'Foco' : 'Pausa'}</span>
                                </div>
                            </div>
                            <div className="text-center mt-4 h-12 px-2"><p className="text-sm text-gray-500 dark:text-white/60">{focusedTask ? (<>Focando em: <span className="font-semibold italic">"{focusedTask.text}"</span></>) : timerMode === 'focus' ? "Selecione uma tarefa para focar." : "Aproveite sua pausa!"}</p></div>
                            <div className="flex items-center gap-4">
                                <button onClick={toggleTimer} className={`w-32 text-center text-lg font-semibold py-2 rounded-lg transition-colors text-white ${isTimerActive ? 'bg-rose-500 hover:bg-rose-600' : 'bg-green-500 hover:bg-green-600'}`}>{isTimerActive ? 'Pausar' : 'Continuar'}</button>
                                <button onClick={resetTimer} aria-label="Resetar e fechar timer" className="w-10 h-10 flex items-center justify-center bg-black/5 dark:bg-white/10 rounded-full text-gray-500 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/20 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-4.991-2.696L7.985 5.644m0 0l-3.182 3.182m3.182-3.182v4.992" /></svg>
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-white/60 mt-3">Sessões de foco concluídas: {pomodoroCount}</p>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex flex-col flex-grow bg-transparent rounded-2xl overflow-hidden">
                <div className="flex-grow overflow-y-auto p-1 pb-28">
                    {tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-white/60">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="font-medium">Nenhuma tarefa pendente.</p><p className="text-sm">Adicione uma tarefa para começar!</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {tasks.map(task => {
                                const { day, month } = getCardDate(task.dueDate);
                                const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                                const completedSubtasks = hasSubtasks ? task.subtasks.filter(st => st.completed).length : 0;
                                const totalSubtasks = hasSubtasks ? task.subtasks.length : 0;
                                const progressPercentage = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

                                return (
                                <li key={task.id} className={`flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm animate-pop-in transition-all duration-300 ${task.completed ? 'opacity-50' : ''} ${focusedTaskId === task.id ? 'ring-2 ring-orange-400' : ''}`}>
                                    <div className="flex w-full">
                                        <div className={`w-1.5 flex-shrink-0 rounded-l-xl ${task.importance ? importanceMap[task.importance].color : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                        
                                        <div 
                                            onClick={() => handleSelectFocusTask(task)} 
                                            className="flex items-center p-4 flex-grow cursor-pointer"
                                        >
                                            <div className="flex flex-col items-center justify-center w-12 text-center mr-4 flex-shrink-0">
                                                <span className="text-2xl font-bold text-gray-800 dark:text-white">{day}</span>
                                                <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">{month}</span>
                                            </div>

                                            <div className="flex-grow">
                                                <p className={`font-semibold text-gray-900 dark:text-white ${task.completed ? 'line-through' : ''}`}>{task.text}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(task.dueDate)}</span>
                                                    {task.recurring && (
                                                        <div title={`Repete ${recurrenceMap[task.recurring.frequency].toLowerCase()}`}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-500 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-4.991-2.696L7.985 5.644m0 0l-3.182 3.182m3.182-3.182v4.992" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center pr-2 flex-shrink-0">
                                            {loadingTaskId === task.id ? (
                                                <div className="w-6 h-6 border-2 border-t-transparent border-orange-400 rounded-full animate-spin mx-1"></div>
                                            ) : (
                                            <button onClick={() => handleMenuToggle(task.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                            </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                     {openMenuId === task.id && (
                                        <div ref={menuRef} className="absolute right-4 top-14 mt-1 w-56 bg-gray-200/90 dark:bg-gray-900/90 backdrop-blur-lg border border-black/10 dark:border-white/10 rounded-lg shadow-xl z-20 animate-pop-in">
                                            <div className="py-1">
                                                <button onClick={() => handleToggleTask(task)} className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        {task.completed ? <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-4.991-2.696L7.985 5.644m0 0l-3.182 3.182m3.182-3.182v4.992" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                                                    </svg>
                                                    <span>{task.completed ? 'Reabrir Tarefa' : task.recurring ? 'Concluir Ciclo' : 'Concluir Tarefa'}</span>
                                                </button>
                                                <button onClick={() => openEditModal(task)} className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                                                    <span>Editar</span>
                                                </button>
                                                 <button onClick={() => handleBreakdownTask(task)} className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
                                                    <span>Dividir c/ IA</span>
                                                </button>
                                                <div className="my-1 h-px bg-black/10 dark:bg-white/10"></div>
                                                <button onClick={() => handleDeleteTask(task.id)} className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-rose-500 hover:bg-rose-500/10 transition-colors">
                                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    <span>Deletar</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {hasSubtasks && (
                                        <div className="px-4 pb-4 w-full">
                                            <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10">
                                                <div className="mb-2">
                                                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                        <span>Progresso</span>
                                                        <span>{completedSubtasks} / {totalSubtasks}</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                        <div 
                                                            className="bg-orange-400 h-1.5 rounded-full transition-all duration-500" 
                                                            style={{ width: `${progressPercentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <ul className="space-y-1 mt-2" onDragLeave={handleSubtaskDragLeave}>
                                                    {task.subtasks.map(subtask => (
                                                        <li 
                                                            key={subtask.id} 
                                                            className={`flex items-center rounded-lg transition-all duration-200
                                                                ${dragOverInfo?.subtaskId === subtask.id && dragOverInfo.position === 'top' ? 'drop-indicator-top' : ''} 
                                                                ${dragOverInfo?.subtaskId === subtask.id && dragOverInfo.position === 'bottom' ? 'drop-indicator-bottom' : ''}`}
                                                            draggable={!task.completed}
                                                            onDragStart={(e) => handleSubtaskDragStart(e, task.id, subtask)}
                                                            onDragOver={(e) => handleSubtaskDragOver(e, subtask.id)}
                                                            onDrop={(e) => handleSubtaskDrop(e, task.id, subtask)}
                                                            onDragEnd={handleSubtaskDragEnd}
                                                        >
                                                            <button 
                                                                onClick={() => handleToggleSubtask(task.id, subtask.id)}
                                                                className="flex items-center w-full text-left py-1"
                                                            >
                                                                <div className="w-5 h-5 mr-3 flex-shrink-0 rounded border-2 border-gray-400 dark:border-white/40 flex items-center justify-center transition-all duration-300">
                                                                    {subtask.completed && <div className="w-2.5 h-2.5 bg-orange-400 rounded-sm"></div>}
                                                                </div>
                                                                <span className={`text-sm flex-grow transition-all duration-300 ${subtask.completed ? 'line-through text-gray-500 dark:text-white/50' : 'text-gray-700 dark:text-white/90'}`}>
                                                                    {subtask.text}
                                                                </span>
                                                            </button>
                                                            <div className="text-gray-400 dark:text-gray-500 touch-none" style={{ cursor: task.completed ? 'default' : 'grab' }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                </svg>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </div>
             {!isModalOpen && (
                <button onClick={openAddModal} className="absolute bottom-28 right-6 z-30 w-16 h-16 bg-gradient-to-br from-orange-400 to-pink-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-black focus:ring-orange-300" aria-label="Adicionar Nova Tarefa">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
            )}

            {isModalOpen && (
                <div className="absolute inset-0 bg-gray-100 dark:bg-black z-40 flex flex-col animate-slide-in-up">
                    <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10">
                        <button type="button" onClick={closeModal} className="text-orange-500 dark:text-orange-400 px-2 py-1">Cancelar</button>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
                        <button type="submit" form="task-form" className="text-orange-500 dark:text-orange-400 font-bold px-2 py-1">Salvar</button>
                    </div>
                    <div className="flex-grow overflow-y-auto p-4">
                        <form id="task-form" onSubmit={handleSaveTask} className="space-y-6">
                            <div>
                                <label htmlFor="task-text" className="text-sm text-gray-600 dark:text-white/70 mb-1 block">Tarefa</label>
                                <input id="task-text" type="text" value={formText} onChange={e => setFormText(e.target.value)} placeholder="Ex: Preparar relatório trimestral" className={formInputClasses} required />
                            </div>
                            <div>
                                <label htmlFor="task-date" className="text-sm text-gray-600 dark:text-white/70 mb-1 block">Data de Conclusão</label>
                                <button
                                    id="task-date"
                                    type="button"
                                    onClick={() => setIsDatePickerOpen(true)}
                                    className={formInputClasses + " text-left"}
                                >
                                    {formDueDate ? formatDate(formDueDate) : <span className="text-gray-500 dark:text-white/50">Selecione uma data</span>}
                                </button>
                            </div>
                            <div>
                                <span className="text-sm text-gray-600 dark:text-white/70 mb-2 block">Importância</span>
                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.keys(importanceMap) as Importance[]).map(key => (
                                        <button key={key} type="button" onClick={() => setFormImportance(key)} className={`p-3 rounded-lg border text-center transition-colors ${formImportance === key ? `${importanceMap[key].color} text-white border-transparent` : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/20'}`}>
                                            {importanceMap[key].label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-4 rounded-lg">
                                <label htmlFor="isRecurring" className="font-medium text-gray-900 dark:text-white/90">Tarefa Recorrente</label>
                                <button type="button" role="switch" aria-checked={formIsRecurring} onClick={() => setFormIsRecurring(!formIsRecurring)} id="isRecurring" className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-black focus:ring-orange-400 ${formIsRecurring ? 'bg-orange-500' : 'bg-gray-400 dark:bg-gray-700'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formIsRecurring ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                            </div>
                            {formIsRecurring && (<div className="animate-pop-in">
                                <label htmlFor="recurrenceFrequency" className="text-sm text-gray-600 dark:text-white/70 mb-1 block">Frequência</label>
                                <select id="recurrenceFrequency" value={formRecurrenceFrequency} onChange={e => setFormRecurrenceFrequency(e.target.value as RecurrenceFrequency)} className={formInputClasses}>
                                    {(Object.keys(recurrenceMap) as RecurrenceFrequency[]).map(key => 
                                        <option key={key} value={key} className="bg-gray-300 dark:bg-gray-900">{recurrenceMap[key]}</option>
                                    )}
                                </select>
                            </div>)}
                        </form>
                    </div>
                </div>
            )}
             <DatePicker
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                initialDate={formDueDate ? new Date(formDueDate) : null}
                onConfirm={(date) => {
                    const adjustedDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                    setFormDueDate(adjustedDate.toISOString().split('T')[0]);
                    setIsDatePickerOpen(false);
                }}
            />
        </div>
    );
};

export default ProductivityScreen;
