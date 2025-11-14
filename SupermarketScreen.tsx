import React, { useState, useEffect, useMemo } from 'react';
import { getItems, addItem, updateItem, deleteItem, clearAllItems, ListItem } from './db';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const SupermarketScreen: React.FC = () => {
  const [items, setItems] = useState<ListItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [modalItem, setModalItem] = useState<ListItem | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const dbItems = await getItems();
        // Items from IndexedDB are not guaranteed to be sorted.
        setItems(dbItems.sort((a, b) => b.id - a.id));
      } catch (error) {
        console.error("Error loading items from DB", error);
      }
    };
    loadData();
  }, []);
  
  const shoppingTotal = useMemo(() => {
    return items.reduce((total, item) => total + (item.totalPrice || 0), 0);
  }, [items]);

  const modalItemTotal = useMemo(() => {
    const q = parseFloat(quantity.replace(',', '.'));
    const p = parseFloat(unitPrice.replace(',', '.'));
    if (!isNaN(q) && q > 0 && !isNaN(p) && p >= 0) {
        return q * p;
    }
    return 0;
  }, [quantity, unitPrice]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '') return;
    const newItem: ListItem = {
      id: Date.now(),
      text: inputValue,
      completed: false,
    };
    // Optimistic UI update
    setItems(prevItems => [newItem, ...prevItems]);
    setInputValue('');
    // Async DB update
    try {
      await addItem(newItem);
    } catch (error) {
      console.error("Failed to add item to DB", error);
      // Here you could add logic to revert the UI state on failure
    }
  };

  const handleCheckmarkClick = async (item: ListItem) => {
    if (item.completed) {
      const updatedItem = { 
        ...item, 
        completed: false, 
        quantity: undefined, 
        unitPrice: undefined, 
        totalPrice: undefined 
      };
      setItems(items.map(i => i.id === item.id ? updatedItem : i));
      try {
        await updateItem(updatedItem);
      } catch (error) {
        console.error("Failed to update item in DB", error);
      }
    } else {
      setModalItem(item);
      setQuantity(item.quantity?.toString() || '1');
      setUnitPrice(item.unitPrice?.toString() || '');
    }
  };

  const handleModalConfirm = async () => {
    if (!modalItem || modalItemTotal <= 0) return;
    
    const updatedItem = { 
      ...modalItem, 
      completed: true, 
      quantity: parseFloat(quantity.replace(',', '.')), 
      unitPrice: parseFloat(unitPrice.replace(',', '.')), 
      totalPrice: modalItemTotal 
    };
    
    setItems(items.map(item => item.id === modalItem.id ? updatedItem : item));
    try {
      await updateItem(updatedItem);
    } catch(error) {
      console.error("Failed to update item in DB", error);
    }

    setModalItem(null);
    setQuantity('1');
    setUnitPrice('');
  };

  const handleDeleteItem = async (id: number) => {
    // Optimistic UI update
    setItems(items.filter(item => item.id !== id));
    // Async DB update
    try {
      await deleteItem(id);
    } catch(error) {
      console.error("Failed to delete item from DB", error);
    }
  };

  const handleFinalizePurchase = () => {
    const completedItems = items.filter(item => item.completed && item.totalPrice);
    if (completedItems.length === 0) {
        alert("Nenhum item comprado para finalizar.");
        return;
    }

    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Recibo da Compra', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 29);

    const tableColumn = ["Item", "Qtd.", "Preço Unit.", "Total"];
    const tableRows: (string | number)[][] = [];

    completedItems.forEach(item => {
        const itemData = [
            item.text,
            item.quantity || 1,
            currencyFormatter.format(item.unitPrice || 0),
            currencyFormatter.format(item.totalPrice || 0)
        ];
        tableRows.push(itemData);
    });

    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'striped',
        headStyles: { fillColor: [31, 41, 55] },
        styles: { halign: 'right' },
        columnStyles: { 0: { halign: 'left' } }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Gasto:', 14, finalY + 10);
    doc.text(currencyFormatter.format(shoppingTotal), 200, finalY + 10, { align: 'right' });

    doc.save(`recibo-compra-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const confirmClearList = async () => {
    try {
        await clearAllItems();
        setItems([]);
    } catch (error) {
        console.error("Failed to clear items from DB", error);
    }
    setShowClearConfirm(false);
  };
  
  const formInputClasses = "w-full bg-white/80 dark:bg-white/10 backdrop-blur-sm border border-black/10 dark:border-white/20 rounded-lg px-4 py-2 text-black dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-orange-400/80 transition-all duration-300";

  return (
    <>
      {modalItem && (
        <div className="fixed inset-0 bg-gray-900/60 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gray-100/90 dark:bg-black/50 backdrop-blur-xl rounded-2xl p-6 w-full max-w-sm border border-black/10 dark:border-white/10 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 text-center mb-1">Adicionar detalhes para:</h3>
            <p className="text-center text-gray-900 dark:text-white mb-4 truncate">{modalItem.text}</p>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label htmlFor="quantity" className="text-sm text-gray-600 dark:text-white/70 mb-1 block">Quantidade</label>
                  <input id="quantity" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="1" className={formInputClasses} />
                </div>
                <div className="w-1/2">
                  <label htmlFor="unitPrice" className="text-sm text-gray-600 dark:text-white/70 mb-1 block">Preço Unitário (R$)</label>
                  <input id="unitPrice" type="text" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="ex: 5,50" className={formInputClasses} />
                </div>
              </div>
              <div className="text-center bg-black/5 dark:bg-black/20 p-3 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-white/70">Total do Item</p>
                <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">{currencyFormatter.format(modalItemTotal)}</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setModalItem(null)} className="bg-black/10 dark:bg-white/10 text-gray-800 dark:text-white/80 px-4 py-2 rounded-lg hover:bg-black/20 dark:hover:bg-white/20 transition-colors">Cancelar</button>
                <button onClick={handleModalConfirm} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={modalItemTotal <= 0}>
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
          <div className="fixed inset-0 bg-gray-900/60 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-gray-100/90 dark:bg-black/50 backdrop-blur-xl rounded-2xl p-6 w-full max-w-sm border border-black/10 dark:border-white/10 shadow-2xl animate-scale-in">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 text-center mb-2">Limpar a Lista?</h3>
                  <p className="text-center text-gray-600 dark:text-white/70 mb-6">Todos os itens serão removidos permanentemente. Esta ação não pode ser desfeita.</p>
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowClearConfirm(false)} className="bg-black/10 dark:bg-white/10 text-gray-800 dark:text-white/80 px-4 py-2 rounded-lg hover:bg-black/20 dark:hover:bg-white/20 transition-colors">Cancelar</button>
                      <button onClick={confirmClearList} className="bg-rose-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-rose-600 transition-colors">Sim, Limpar</button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col h-full w-full max-w-md text-gray-800 dark:text-white">
        <h1 className="text-4xl font-light mb-4 text-center bg-gradient-to-r from-orange-300 via-rose-400 to-pink-500 bg-clip-text text-transparent">
          Lista de Compras
        </h1>
        
        <div className="flex-shrink-0 mb-4 flex gap-4">
            <button 
                onClick={handleFinalizePurchase}
                disabled={items.filter(i => i.completed).length === 0}
                className="flex-1 bg-green-500 text-white px-4 py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Finalizar</span>
            </button>
            <button 
                onClick={() => setShowClearConfirm(true)}
                disabled={items.length === 0}
                className="flex-1 bg-rose-500 text-white px-4 py-3 rounded-xl font-semibold hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                <span>Limpar</span>
            </button>
        </div>

        <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-black/10 dark:border-white/20 rounded-2xl p-4 text-center mb-4">
          <p className="text-sm text-gray-600 dark:text-white/70">Total Gasto na Compra</p>
          <p className="text-3xl font-bold tracking-tight">{currencyFormatter.format(shoppingTotal)}</p>
        </div>

        <form onSubmit={handleAddItem} className="flex gap-2 mb-6">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Adicionar novo item..."
            className="flex-grow bg-white/80 dark:bg-white/10 backdrop-blur-sm border border-black/10 dark:border-white/20 rounded-xl px-4 py-3 text-black dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-400/80 transition-all duration-300"
          />
          <button 
              type="submit" 
              aria-label="Adicionar item"
              className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-orange-400 to-pink-500 text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-black focus:ring-orange-300 disabled:opacity-50"
              disabled={!inputValue.trim()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </form>

        <div className="flex-grow w-full bg-gray-200/50 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-4 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-white/60">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <p className="font-medium">Sua lista está vazia.</p>
              <p className="text-sm">Adicione um item para começar!</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map(item => (
                <li 
                  key={item.id} 
                  className="flex items-center bg-white/50 dark:bg-black/10 p-3 rounded-lg transition-all duration-300"
                >
                  <button 
                    onClick={() => handleCheckmarkClick(item)}
                    className="flex items-center flex-grow text-left"
                  >
                    <div className="w-6 h-6 mr-4 flex-shrink-0 rounded-full border-2 border-gray-400 dark:border-white/40 flex items-center justify-center transition-all duration-300">
                      {item.completed && <div className="w-3 h-3 bg-orange-400 rounded-full"></div>}
                    </div>
                    <div className="flex-grow">
                        <span className={`transition-all duration-300 ${item.completed ? 'line-through text-gray-500 dark:text-white/50' : 'text-gray-900 dark:text-white'}`}>
                            {item.text}
                        </span>
                        {item.completed && item.totalPrice != null && (
                            <span className="block text-xs text-gray-500 dark:text-white/60 font-mono mt-1">
                                {item.quantity} un x {currencyFormatter.format(item.unitPrice || 0)} = {currencyFormatter.format(item.totalPrice)}
                            </span>
                        )}
                    </div>
                  </button>
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    aria-label="Deletar item"
                    className="ml-4 w-8 h-8 flex-shrink-0 text-gray-500 dark:text-white/50 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-black/5 dark:hover:bg-white/10 rounded-full flex items-center justify-center transition-all duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};

export default SupermarketScreen;
