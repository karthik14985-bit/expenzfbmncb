
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  ScanLine, 
  X, 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  Trash2,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Target,
  Edit2,
  HelpCircle,
  Info,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { Transaction, Category, Budget } from './types';
import { scanReceipt } from './services/geminiService';

// Mock Categories
const CATEGORIES: Category[] = [
  'Food & Drink', 'Shopping', 'Housing', 'Transport', 'Travel',
  'Entertainment', 'Health', 'Income', 'Utilities', 'Other'
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#71717a', '#fb923c'];

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('budgets');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'budgets'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Delete Confirmation State
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Transaction>>({
    amount: 0,
    description: '',
    category: 'Food & Drink',
    date: new Date().toISOString().split('T')[0],
    type: 'expense'
  });

  // Budget Form State
  const [budgetFormData, setBudgetFormData] = useState<{ category: Category; limit: number }>({
    category: 'Food & Drink',
    limit: 0
  });

  // Validation State
  const [formErrors, setFormErrors] = useState<{ amount?: string; description?: string }>({});
  const [touched, setTouched] = useState<{ amount?: boolean; description?: boolean }>({});

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('budgets', JSON.stringify(budgets));
  }, [budgets]);

  // Real-time validation logic
  useEffect(() => {
    const errors: { amount?: string; description?: string } = {};
    
    if (touched.description && (!formData.description || formData.description.trim() === '')) {
      errors.description = "Description is required";
    }
    
    if (touched.amount) {
      if (formData.amount === undefined || formData.amount === null || isNaN(formData.amount)) {
        errors.amount = "Amount is required";
      } else if (formData.amount <= 0) {
        errors.amount = "Amount must be a positive number";
      }
    }
    
    setFormErrors(errors);
  }, [formData, touched]);

  const isFormValid = useMemo(() => {
    return (
      formData.description && 
      formData.description.trim() !== '' && 
      formData.amount !== undefined && 
      formData.amount > 0
    );
  }, [formData]);

  const stats = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [transactions]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      data[t.category] = (data[t.category] || 0) + t.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const currentMonthSpending = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    
    const data: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense' && t.date >= startOfMonth)
      .forEach(t => {
        data[t.category] = (data[t.category] || 0) + t.amount;
      });
    return data;
  }, [transactions]);

  const budgetProgress = useMemo(() => {
    return budgets.map(b => {
      const spent = currentMonthSpending[b.category] || 0;
      const percentage = b.limit > 0 ? (spent / b.limit) * 100 : 0;
      return { ...b, spent, percentage };
    });
  }, [budgets, currentMonthSpending]);

  const handleAddTransaction = () => {
    if (!isFormValid) {
      setTouched({ amount: true, description: true });
      return;
    }
    
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      amount: Number(formData.amount),
      description: formData.description || 'Untitled',
      category: formData.category as Category || 'Other',
      date: formData.date || new Date().toISOString().split('T')[0],
      type: formData.type as 'income' | 'expense' || 'expense',
    };
    setTransactions(prev => [newTx, ...prev]);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
      amount: 0, 
      description: '', 
      category: 'Food & Drink', 
      date: new Date().toISOString().split('T')[0], 
      type: 'expense' 
    });
    setFormErrors({});
    setTouched({});
  };

  const handleSaveBudget = () => {
    if (budgetFormData.limit <= 0) return;
    
    setBudgets(prev => {
      const existingIdx = prev.findIndex(b => b.category === budgetFormData.category);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...budgetFormData };
        return updated;
      }
      return [...prev, { ...budgetFormData }];
    });
    setIsBudgetModalOpen(false);
  };

  const confirmDelete = () => {
    if (transactionToDelete) {
      setTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
      setTransactionToDelete(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const data = await scanReceipt(base64);
      if (data) {
        setFormData({
          amount: data.amount,
          description: data.description,
          category: data.category as Category,
          date: data.date,
          type: 'expense'
        });
        setTouched({ amount: true, description: true });
        setIsModalOpen(true);
      }
      setIsScanning(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-64 transition-all">
      {/* Sidebar - Desktop */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-slate-900/40 backdrop-blur-xl border-r border-slate-800/50 p-6 z-40">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-900/20">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Gemini Spend</h1>
        </div>

        <div className="space-y-2 flex-1">
          <SidebarItem 
            icon={<LayoutDashboard />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={<History />} 
            label="Transactions" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
          />
          <SidebarItem 
            icon={<Target />} 
            label="Budgets" 
            active={activeTab === 'budgets'} 
            onClick={() => setActiveTab('budgets')} 
          />
        </div>

        <div className="space-y-3 mt-auto">
          <button 
            onClick={() => setIsHelpModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-slate-400 hover:bg-white/5 hover:text-slate-200 group"
          >
            <HelpCircle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="font-medium">Help Center</span>
          </button>
          
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20"
          >
            <PlusCircle className="w-5 h-5" />
            Add Transaction
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        {/* Header Mobile */}
        <div className="md:hidden flex items-center justify-between mb-8 bg-slate-900/40 backdrop-blur-md p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold">Gemini Spend</h1>
          </div>
          <div className="flex gap-2">
             <button 
              onClick={() => setIsHelpModalOpen(true)}
              className="bg-slate-800 p-2 rounded-full cursor-pointer hover:bg-slate-700 transition-colors"
             >
               <HelpCircle className="w-5 h-5 text-slate-400" />
             </button>
             <label className="bg-slate-800 p-2 rounded-full cursor-pointer hover:bg-slate-700 transition-colors">
               <ScanLine className="w-5 h-5 text-blue-400" />
               <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
             </label>
             <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="bg-blue-600 p-2 rounded-full shadow-lg"
             >
               <PlusCircle className="w-5 h-5" />
             </button>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                label="Total Balance" 
                value={stats.balance} 
                icon={<Wallet className="text-blue-400" />} 
                className="bg-slate-900/60 backdrop-blur-md border-white/5 shadow-xl"
              />
              <StatCard 
                label="Total Income" 
                value={stats.income} 
                icon={<TrendingUp className="text-emerald-400" />} 
                className="bg-slate-900/60 backdrop-blur-md border-white/5 shadow-xl"
              />
              <StatCard 
                label="Total Expenses" 
                value={stats.expenses} 
                icon={<TrendingDown className="text-rose-400" />} 
                className="bg-slate-900/60 backdrop-blur-md border-white/5 shadow-xl"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white/90">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Expenses by Category
                </h2>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white/90">
                  <Target className="w-5 h-5 text-blue-500" />
                  Budget Progress (This Month)
                </h2>
                <div className="space-y-6 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar no-scrollbar">
                  {budgetProgress.length > 0 ? (
                    budgetProgress.slice(0, 5).map(b => (
                      <div key={b.category} className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-slate-300">{b.category}</span>
                          <span className={`${b.percentage > 100 ? 'text-rose-500' : 'text-slate-400'}`}>
                            ${b.spent.toFixed(0)} / ${b.limit}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-700 ${b.percentage > 90 ? 'bg-rose-500' : b.percentage > 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(b.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                      <Target className="w-12 h-12 opacity-20 mb-3" />
                      <p className="text-sm">Set your first budget to track goals!</p>
                      <button 
                        onClick={() => setActiveTab('budgets')}
                        className="mt-4 text-xs font-bold text-blue-400 hover:underline uppercase tracking-widest transition-colors"
                      >
                        Go to Budgets
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Transactions Snippet */}
            <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white/90">Recent Transactions</h2>
                <button 
                  onClick={() => setActiveTab('history')}
                  className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {transactions.slice(0, 5).map(t => (
                  <TransactionRow key={t.id} transaction={t} onDelete={(tx) => setTransactionToDelete(tx)} />
                ))}
                {transactions.length === 0 && (
                  <p className="text-slate-500 text-center py-8">No transactions found. Add one to see it here!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold mb-6 text-white/90">Transaction History</h2>
            <div className="space-y-3">
              {transactions.map(t => (
                <TransactionRow key={t.id} transaction={t} onDelete={(tx) => setTransactionToDelete(tx)} />
              ))}
              {transactions.length === 0 && (
                <div className="text-center py-20 text-slate-500">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Your transaction history is currently empty.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'budgets' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white/90">Monthly Budgets</h2>
                <p className="text-slate-400 text-sm">Control your spending across categories</p>
              </div>
              <button 
                onClick={() => {
                  setBudgetFormData({ category: 'Food & Drink', limit: 0 });
                  setIsBudgetModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-blue-600/20"
              >
                <PlusCircle className="w-4 h-4" /> Set Limit
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CATEGORIES.filter(c => c !== 'Income').map(category => {
                const budget = budgetProgress.find(b => b.category === category);
                return (
                  <div key={category} className="bg-slate-900/60 backdrop-blur-md border border-white/5 p-6 rounded-2xl transition-all hover:border-blue-500/30 group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-white/90">{category}</h3>
                        <p className="text-slate-500 text-xs">MONTHLY SPENDING</p>
                      </div>
                      <button 
                        onClick={() => {
                          setBudgetFormData({ category, limit: budget?.limit || 0 });
                          setIsBudgetModalOpen(true);
                        }}
                        className="p-2 text-slate-500 hover:text-blue-400 bg-white/5 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>

                    {budget ? (
                      <div className="space-y-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-white/95">${budget.spent.toFixed(0)}</span>
                          <span className="text-slate-500 text-sm">of ${budget.limit}</span>
                        </div>
                        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${budget.percentage > 90 ? 'bg-rose-500' : budget.percentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className={`${budget.percentage > 100 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                            {budget.percentage > 100 ? 'Exceeded' : `${budget.percentage.toFixed(0)}% used`}
                          </span>
                          <span className="text-slate-500 italic">
                            ${Math.max(0, budget.limit - budget.spent).toFixed(0)} left
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl group-hover:border-blue-500/20 transition-colors">
                        <p className="text-slate-600 text-sm mb-3">No limit set for this category</p>
                        <button 
                          onClick={() => {
                            setBudgetFormData({ category, limit: 0 });
                            setIsBudgetModalOpen(true);
                          }}
                          className="text-xs text-blue-500 hover:text-blue-400 font-bold uppercase tracking-wider"
                        >
                          + CREATE BUDGET
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Navigation - Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around z-50 px-4">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard'} icon={<LayoutDashboard />} />
        <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History />} />
        <NavButton active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} icon={<Target />} />
      </div>

      {/* Help Information Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-2xl rounded-3xl p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3 text-blue-400">
                <HelpCircle className="w-8 h-8" />
                <h2 className="text-2xl font-bold text-white">Gemini Spend Help</h2>
              </div>
              <button onClick={() => setIsHelpModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-8">
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                   <ScanLine className="w-5 h-5" /> AI Receipt Scanning
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Upload photos of your receipts using the <ScanLine className="inline-block w-4 h-4 text-blue-400" /> icon. 
                  Gemini AI will automatically extract the store name, total amount, category, and date, making it 
                  effortless to log your expenses.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                   <Target className="w-5 h-5" /> Setting Budgets
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Keep your spending in check by setting monthly limits for different categories like <b>Food & Drink</b>, 
                  <b>Travel</b>, or <b>Utilities</b>. Track your progress in real-time on the Dashboard.
                </p>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <Info className="w-4 h-4 text-emerald-400" />
                    <span>Progress bars change color from green to red as you approach your limit.</span>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
                   <LayoutDashboard className="w-5 h-5" /> Visual Insights
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Use the charts on your Dashboard to understand where your money goes. 
                  The <b>Category Distribution</b> shows your biggest spending areas, while the 
                  <b>Recent Activity</b> bar chart helps identify daily trends.
                </p>
              </section>

              <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-sm">
                 <p>v1.2.0 • Powered by Gemini AI</p>
                 <button 
                  onClick={() => setIsHelpModalOpen(false)}
                  className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-6 py-2 rounded-full font-bold transition-all border border-blue-400/20"
                 >
                   Got it!
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-white">New Transaction</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex bg-white/5 p-1 rounded-xl">
                <button 
                  onClick={() => setFormData(p => ({ ...p, type: 'expense' }))}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${formData.type === 'expense' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
                >
                  Expense
                </button>
                <button 
                  onClick={() => setFormData(p => ({ ...p, type: 'income' }))}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${formData.type === 'income' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
                >
                  Income
                </button>
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2 block">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-500">$</span>
                  <input 
                    type="number" 
                    value={formData.amount === 0 ? '' : formData.amount} 
                    onChange={e => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      setFormData(p => ({ ...p, amount: val }));
                    }}
                    onBlur={() => setTouched(p => ({ ...p, amount: true }))}
                    className={`w-full bg-white/5 text-3xl font-bold p-4 pl-10 rounded-2xl border transition-all focus:outline-none ${formErrors.amount ? 'border-rose-500' : 'border-transparent focus:border-blue-500'}`}
                    placeholder="0.00"
                  />
                </div>
                {formErrors.amount && (
                  <p className="text-rose-500 text-xs mt-2 flex items-center gap-1 animate-in slide-in-from-top-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.amount}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2 block">Description</label>
                <input 
                  type="text" 
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  onBlur={() => setTouched(p => ({ ...p, description: true }))}
                  className={`w-full bg-white/5 p-4 rounded-2xl border transition-all focus:outline-none ${formErrors.description ? 'border-rose-500' : 'border-transparent focus:border-blue-500'}`}
                  placeholder="e.g. Starbucks, Grocery..."
                />
                {formErrors.description && (
                  <p className="text-rose-500 text-xs mt-2 flex items-center gap-1 animate-in slide-in-from-top-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2 block">Category</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData(p => ({ ...p, category: e.target.value as Category }))}
                    className="w-full bg-white/5 p-4 rounded-2xl appearance-none focus:outline-none cursor-pointer"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c} className="bg-slate-900">{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2 block">Date</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                    className="w-full bg-white/5 p-4 rounded-2xl focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <button 
                onClick={handleAddTransaction}
                disabled={!isFormValid}
                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-95 ${isFormValid ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}
              >
                Save Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-sm rounded-3xl p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-white">Set Monthly Limit</h2>
              <button onClick={() => setIsBudgetModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2 block">Category</label>
                <select 
                  value={budgetFormData.category}
                  onChange={e => setBudgetFormData(p => ({ ...p, category: e.target.value as Category }))}
                  className="w-full bg-white/5 p-4 rounded-2xl appearance-none focus:outline-none cursor-pointer"
                >
                  {CATEGORIES.filter(c => c !== 'Income').map(c => (
                    <option key={c} value={c} className="bg-slate-900">{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2 block">Monthly Limit</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-500">$</span>
                  <input 
                    type="number" 
                    value={budgetFormData.limit || ''} 
                    onChange={e => setBudgetFormData(p => ({ ...p, limit: Number(e.target.value) }))}
                    className="w-full bg-white/5 text-2xl font-bold p-4 pl-10 rounded-2xl border border-transparent focus:border-blue-500 focus:outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button 
                onClick={handleSaveBudget}
                disabled={budgetFormData.limit <= 0}
                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-95 ${budgetFormData.limit > 0 ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}
              >
                Save Budget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {transactionToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-sm rounded-3xl p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Delete Transaction?</h2>
              <p className="text-slate-400 mb-6 leading-relaxed">
                Are you sure you want to delete <span className="text-slate-200 font-semibold italic">"{transactionToDelete.description}"</span>? 
                This action cannot be undone.
              </p>
              
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={confirmDelete}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-rose-900/20"
                >
                  Yes, Delete it
                </button>
                <button 
                  onClick={() => setTransactionToDelete(null)}
                  className="w-full bg-white/5 hover:bg-white/10 text-slate-200 py-4 rounded-2xl font-bold transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scanning Overlay */}
      {isScanning && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[110] flex flex-col items-center justify-center">
          <div className="relative w-64 h-64 mb-10">
            <div className="absolute inset-0 border-4 border-blue-500/10 rounded-[3rem]" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 shadow-[0_0_30px_#3b82f6] animate-pulse" 
                 style={{ animationDuration: '2s' }} />
            <ScanLine className="w-full h-full text-blue-500/20 p-16" />
          </div>
          <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Scanning Receipt</h3>
          <p className="text-slate-400 font-medium">Gemini AI is extracting the details...</p>
        </div>
      )}
    </div>
  );
};

// --- Subcomponents ---

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
  >
    {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
    <span className="font-medium">{label}</span>
    {active && <div className="absolute right-3 w-1 h-1 bg-white rounded-full" />}
  </button>
);

const NavButton: React.FC<{ icon: React.ReactNode, active: boolean, onClick: () => void }> = ({ icon, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-2xl transition-all duration-300 ${active ? 'text-blue-400 bg-white/5 scale-110' : 'text-slate-500 hover:text-slate-400'}`}
  >
    {React.cloneElement(icon as React.ReactElement, { className: 'w-7 h-7' })}
  </button>
);

const StatCard: React.FC<{ label: string, value: number, icon: React.ReactNode, className: string }> = ({ label, value, icon, className }) => (
  <div className={`p-6 rounded-2xl border transition-all duration-500 hover:translate-y--1 hover:shadow-2xl ${className}`}>
    <div className="flex items-center gap-3 mb-4">
      <div className="bg-white/5 p-2 rounded-xl group-hover:scale-110 transition-transform">{icon}</div>
      <span className="text-sm font-semibold tracking-wide text-slate-400 uppercase">{label}</span>
    </div>
    <div className="text-3xl font-bold tracking-tight text-white/95">
      ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
    </div>
  </div>
);

const TransactionRow: React.FC<{ transaction: Transaction, onDelete: (tx: Transaction) => void }> = ({ transaction, onDelete }) => (
  <div className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group border border-transparent hover:border-white/5">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${transaction.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
        {transaction.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
      </div>
      <div>
        <h4 className="font-bold text-white/90 leading-tight">{transaction.description}</h4>
        <p className="text-xs text-slate-500 flex gap-2 items-center mt-1">
          <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{transaction.category}</span>
          <span>•</span>
          <span className="font-medium">{transaction.date}</span>
        </p>
      </div>
    </div>
    <div className="flex items-center gap-6">
      <span className={`font-black text-lg ${transaction.type === 'income' ? 'text-emerald-400' : 'text-white/90'}`}>
        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
      </span>
      <button 
        onClick={() => onDelete(transaction)}
        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-500 transition-all p-2 hover:bg-rose-500/10 rounded-lg"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export default App;
