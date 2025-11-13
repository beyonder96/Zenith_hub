import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getTasks, addTask, updateTask, deleteTask, Task } from './db';
import { GoogleGenAI, Type } from "@google/genai";

const FOCUS_DURATION = 25 * 60; // 25 minutes
const BREAK_DURATION = 5 * 60; // 5 minutes

type Importance = 'low' | 'medium' | 'high';

const importanceMap: Record<Importance, { label: string; color: string }> = {
    low: { label: 'Baixa', color: 'bg-sky-400' },
    medium: { label: 'Média', color: 'bg-orange-400' },
    high: { label: 'Alta', color: 'bg-rose-500' },
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
        return b.id - a.id;
    });
};

const ProductivityScreen: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loadingTaskId, setLoadingTaskId] = useState<number | null>(null);
    const [focusedTaskId, setFocusedTaskId] = useState<number | null>(null);

    const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');
    const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [pomodoroCount, setPomodoroCount] = useState(0);
    const timerIntervalRef = useRef<number | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [formText, setFormText] = useState('');
    const [formDueDate, setFormDueDate] = useState('');
    const [formImportance, setFormImportance] = useState<Importance | undefined>(undefined);

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
            const updatedTask = { ...editingTask, text: formText, dueDate: formDueDate || undefined, importance: formImportance };
            setTasks(prev => sortTasks(prev.map(t => t.id === editingTask.id ? updatedTask : t)));
            await updateTask(updatedTask);
        } else {
            const newTask: Task = {
                id: Date.now(),
                text: formText,
                completed: false,
                dueDate: formDueDate || undefined,
                importance: formImportance,
            };
            setTasks(prev => sortTasks([newTask, ...prev]));
            await addTask(newTask);
        }
        closeModal();
    };

    const handleToggleTask = async (task: Task) => {
        const updatedTask = { ...task, completed: !task.completed };
        setTasks(prev => sortTasks(prev.map(t => t.id === task.id ? updatedTask : t)));
        await updateTask(updatedTask);
    };

    const handleDeleteTask = async (id: number) => {
        if (focusedTaskId === id) setFocusedTaskId(null);
        setTasks(prev => prev.filter(t => t.id !== id));
        await deleteTask(id);
    };
    
    const handleSelectFocusTask = (task: Task) => {
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
            const subtasks: string[] = result.subtasks || [];
            
            const newTasks: Task[] = subtasks.map((subtaskText, index) => ({ id: Date.now() + index, text: subtaskText, completed: false }));
            for (const newTask of newTasks) await addTask(newTask);
            
            const remainingTasks = tasks.filter(t => t.id !== task.id);
            setTasks(sortTasks([...remainingTasks, ...newTasks]));
            await deleteTask(task.id);

        } catch (error) {
            console.error("Error with Gemini API:", error);
        } finally {
            setLoadingTaskId(null);
        }
    };

    const resetForm = () => {
        setFormText('');
        setFormDueDate('');
        setFormImportance(undefined);
        setEditingTask(null);
    };
    const openAddModal = () => { resetForm(); setIsModalOpen(true); };
    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setFormText(task.text);
        setFormDueDate(task.dueDate || '');
        setFormImportance(task.importance);
        setIsModalOpen(true);
    };
    const closeModal = () => setIsModalOpen(false);

    const toggleTimer = () => setIsTimerActive(!isTimerActive);
    const resetTimer = () => {
        setIsTimerActive(false);
        setTimeLeft(timerMode === 'focus' ? FOCUS_DURATION : BREAK_DURATION);
    };

    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const seconds = (timeLeft % 60).toString().padStart(2, '0');
    const progress = (timerMode === 'focus' ? (FOCUS_DURATION - timeLeft) / FOCUS_DURATION : (BREAK_DURATION - timeLeft) / BREAK_DURATION) * 100;

    const isOverdue = (dueDate?: string) => dueDate && new Date(dueDate) < new Date(new Date().toDateString());
    const formatDate = (dateString?: string) => dateString ? new Date(dateString + 'T12:00:00').toLocaleDateString('pt-BR') : '';

    const formInputClasses = "w-full bg-white/80 dark:bg-white/10 backdrop-blur-sm border border-black/10 dark:border-white/20 rounded-lg px-4 py-3 text-black dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-orange-400/80 transition-all duration-300";

    return (
        <div className="relative flex flex-col h-full w-full max-w-md text-gray-800 dark:text-white">
            <div className="flex-shrink-0">
                <h1 className="text-4xl font-light mb-6 text-center bg-gradient-to-r from-orange-300 via-rose-400 to-pink-500 bg-clip-text text-transparent">
                    Produtividade
                </h1>
                <div className="flex flex-col items-center justify-center bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-black/10 dark:border-white/20 rounded-2xl p-6 mb-6">
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
                            <button onClick={toggleTimer} className={`w-32 text-center text-lg font-semibold py-2 rounded-lg transition-colors text-white ${isTimerActive ? 'bg-rose-500 hover:bg-rose-600' : 'bg-green-500 hover:bg-green-600'}`}>{isTimerActive ? 'Pausar' : 'Iniciar'}</button>
                            <button onClick={resetTimer} aria-label="Resetar timer" className="w-10 h-10 flex items-center justify-center bg-black/5 dark:bg-white/10 rounded-full text-gray-500 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/20 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M4 9a8 8 0 0111.95-6.95M20 15h-5v5m0-5a8 8 0 01-11.95 6.95" /></svg>
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-white/60 mt-3">Sessões de foco concluídas: {pomodoroCount}</p>
                </div>
            </div>
            
            <div className="flex flex-col flex-grow bg-gray-200/50 dark:bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden">
                <div className="flex-grow overflow-y-auto p-4">
                    {tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-white/60">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="font-medium">Nenhuma tarefa pendente.</p><p className="text-sm">Adicione uma tarefa para começar!</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {tasks.map(task => (
                                <li key={task.id} className="relative flex items-center bg-white/50 dark:bg-black/10 rounded-lg animate-pop-in overflow-hidden pl-2">
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${task.importance ? importanceMap[task.importance].color : 'bg-transparent'}`}></div>
                                    <button onClick={() => handleToggleTask(task)} className="flex items-center flex-grow text-left group p-3">
                                        <div className={`w-6 h-6 mr-4 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-orange-400 border-orange-400' : 'border-gray-400 dark:border-white/40 group-hover:border-orange-300'}`}>
                                            {task.completed && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <div className="flex-grow">
                                            <span className={`transition-colors ${task.completed ? 'line-through text-gray-500 dark:text-white/50' : 'text-gray-900 dark:text-white'}`}>{task.text}</span>
                                            {task.dueDate && <p className={`text-xs mt-1 ${!task.completed && isOverdue(task.dueDate) ? 'text-rose-500 font-semibold' : 'text-gray-500 dark:text-white/60'}`}>{formatDate(task.dueDate)}</p>}
                                        </div>
                                    </button>
                                    
                                    <div className="flex items-center flex-shrink-0 pr-1">
                                        {!task.completed && (<>
                                            <button onClick={() => openEditModal(task)} aria-label="Editar tarefa" className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                                            </button>
                                            <button onClick={() => handleSelectFocusTask(task)} aria-label="Focar nesta tarefa" className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${focusedTaskId === task.id ? 'bg-orange-500/20 text-orange-500' : 'text-gray-500 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/10'}`}>
                                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </button>
                                        </>)}
                                        {loadingTaskId === task.id ? <div className="w-5 h-5 border-2 border-t-transparent border-orange-400 rounded-full animate-spin mx-2"></div>
                                        : <button onClick={() => handleBreakdownTask(task)} aria-label="Dividir tarefa com IA" className="w-8 h-8 text-gray-500 dark:text-white/50 hover:text-orange-500 dark:hover:text-orange-400 rounded-full flex items-center justify-center transition-colors">
                                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
                                        </button>}
                                        <button onClick={() => handleDeleteTask(task.id)} aria-label="Deletar tarefa" className="w-8 h-8 text-gray-500 dark:text-white/50 hover:text-rose-500 dark:hover:text-rose-400 rounded-full flex items-center justify-center transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </li>
                            ))}
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
                            <div className="flex gap-4">
                                <div className="w-1/2">
                                    <label htmlFor="task-date" className="text-sm text-gray-600 dark:text-white/70 mb-1 block">Data de Conclusão</label>
                                    <input id="task-date" type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} className={formInputClasses} />
                                </div>
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
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductivityScreen;