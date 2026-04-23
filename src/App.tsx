import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { UploadCloud, Loader2, DollarSign, Wallet, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractReceiptData } from './lib/gemini';

type ExpenseItem = {
    name: string;
    price: number;
    category: string;
};

type ReceiptData = {
    id: string;
    personName: string;
    date: string;
    merchant: string;
    currency: string;
    items: ExpenseItem[];
    total: number;
    tax: number;
};

export default function App() {
    const [userPersonName, setUserPersonName] = useState('');
    const [setupName, setSetupName] = useState('');

    const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'budgets'>('dashboard');
    const [appState, setAppState] = useState<'upload' | 'loading' | 'dashboard'>('upload');
    const [receipts, setReceipts] = useState<ReceiptData[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);

    const [budget, setBudget] = useState(2000);
    const [tempBudget, setTempBudget] = useState("2000");
    const [editingBudget, setEditingBudget] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        if (!uploadDate) {
            alert('Please provide a Date before uploading.');
            return;
        }
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result?.toString().split(',')[1];
            if (!base64String) return;

            setAppState('loading');

            try {
                const extracted = await extractReceiptData(base64String, file.type);
                const newReceipt: ReceiptData = {
                    id: Math.random().toString(36).substring(7),
                    personName: userPersonName,
                    date: uploadDate,
                    merchant: extracted.merchant || 'Unknown Merchant',
                    currency: extracted.currency || 'USD',
                    items: extracted.items || [],
                    total: extracted.total || 0,
                    tax: extracted.tax || 0
                };
                setReceipts(prev => [newReceipt, ...prev]);
                setAppState('dashboard');
            } catch (e: any) {
                console.error(e);
                alert('Error extracting data: ' + (e.message || 'Unknown error. Please check browser console.'));
                setAppState('upload');
            }
        };
        reader.readAsDataURL(file);
    };

    const onDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = () => {
        setIsDragging(false);
    };

    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    };

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        try {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
        } catch {
            return `${currency} ${amount.toFixed(2)}`;
        }
    };

    // Rollups
    const totalsByCurrency = receipts.reduce((acc, r) => {
        acc[r.currency] = (acc[r.currency] || 0) + r.total;
        return acc;
    }, {} as Record<string, number>);

    const receiptsByDate = receipts.reduce((acc, r) => {
        if (!acc[r.date]) acc[r.date] = [];
        acc[r.date].push(r);
        return acc;
    }, {} as Record<string, ReceiptData[]>);

    // Sorting dates descending
    const sortedDates = Object.keys(receiptsByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // Get total in default assumed currency for budget calculation (simple implementation assuming USD or main currency focus)
    const totalSpend = receipts.reduce((sum, r) => sum + r.total, 0);

    if (!userPersonName) {
        return (
            <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-8">
                <div className="max-w-md w-full bg-white p-10 rounded-3xl border border-gray-200 shadow-sm text-center">
                    <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center mx-auto mb-6">
                        <div className="w-6 h-6 border-2 border-white rounded-md"></div>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Welcome to SnapSpense</h1>
                    <p className="text-gray-500 mb-8 text-sm">Please enter your name to start tracking your receipts and expenses.</p>
                    <input
                        type="text"
                        value={setupName}
                        onChange={(e) => setSetupName(e.target.value)}
                        placeholder="Your Name"
                        className="w-full px-5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg bg-gray-50 mb-4"
                        onKeyDown={(e) => { if (e.key === 'Enter' && setupName.trim()) setUserPersonName(setupName.trim()) }}
                    />
                    <button
                        onClick={() => { if (setupName.trim()) setUserPersonName(setupName.trim()) }}
                        className="w-full py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-900 transition-colors"
                    >
                        Continue
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9FAFB] text-[#111827] font-sans flex flex-col overflow-x-hidden">
            {/* Top Navigation */}
            <nav className="h-16 border-b border-gray-200 bg-white px-8 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
                    </div>
                    <span className="text-xl font-semibold tracking-tight hidden sm:block">SnapSpense AI</span>
                </div>
                <div className="flex items-center gap-6 text-sm font-medium">
                    <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-black' : 'text-gray-500 hover:text-gray-800'}>Dashboard</button>
                    <button onClick={() => setActiveTab('expenses')} className={activeTab === 'expenses' ? 'text-black' : 'text-gray-500 hover:text-gray-800'}>Expenses</button>
                    <button onClick={() => setActiveTab('budgets')} className={activeTab === 'budgets' ? 'text-black' : 'text-gray-500 hover:text-gray-800'}>Budgets</button>

                    <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block"></div>

                    <div className="hidden sm:flex flex-col text-right">
                        <div className="text-xs font-bold text-gray-900">{userPersonName}</div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        {userPersonName.charAt(0).toUpperCase()}
                    </div>
                </div>
            </nav>

            <main className="flex-1 p-4 sm:p-8 w-full max-w-6xl mx-auto grid gap-8 relative items-start">

                {/* DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                    <AnimatePresence mode="wait">
                        {appState === 'upload' && (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="max-w-xl mx-auto w-full bg-white border border-gray-200 rounded-3xl p-8 flex flex-col mt-4 sm:mt-10"
                            >
                                <div className="flex flex-col mb-8 text-center sm:text-left">
                                    <h2 className="text-2xl font-semibold">Scan a Receipt</h2>
                                    <p className="text-gray-400 text-sm mt-1">Ready to track, {userPersonName}? Review the date before uploading.</p>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Date *</label>
                                    <input
                                        type="date"
                                        value={uploadDate}
                                        onChange={e => setUploadDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                    />
                                </div>

                                <div
                                    className={`
                    flex-1 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-all duration-300 cursor-pointer group py-16 px-6
                    ${isDragging ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' : ''}
                  `}
                                    onDragOver={onDragOver}
                                    onDragLeave={onDragLeave}
                                    onDrop={onDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-105 transition-transform text-gray-400">
                                        <UploadCloud size={32} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-600">Drop your receipt here</span>
                                    <span className="text-xs text-gray-400 mt-1">Or click to select image</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={onFileChange}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {appState === 'loading' && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="max-w-xl mx-auto py-24 flex flex-col items-center justify-center text-center mt-10"
                            >
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
                                <h3 className="text-xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                                    Gemini Vision is parsing {userPersonName}'s receipt...
                                </h3>
                                <p className="text-gray-500 mt-2">Checking items, extracting text, calculating tax...</p>
                            </motion.div>
                        )}

                        {appState === 'dashboard' && receipts.length > 0 && (
                            <motion.div
                                key="dashboard"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="grid grid-cols-1 md:grid-cols-12 gap-8 w-full"
                            >
                                <div className="md:col-span-5 space-y-6">
                                    <div className="bg-white border border-gray-200 rounded-3xl p-6">
                                        <span className="text-sm text-gray-400 font-medium">Total Tracked Expenses</span>
                                        <div className="mt-4 space-y-3">
                                            {Object.entries(totalsByCurrency).length === 0 && (
                                                <div className="text-2xl font-bold">$0.00</div>
                                            )}
                                            {Object.entries(totalsByCurrency).map(([curr, amt]) => (
                                                <div key={curr} className="flex justify-between items-center text-xl font-bold bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                                                    <span>{formatCurrency(amt as number, curr)}</span>
                                                    <span className="text-xs font-semibold bg-gray-200 text-gray-600 px-2 py-1 rounded">{curr}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setAppState('upload'); }}
                                        className="w-full py-4 bg-black text-white rounded-2xl shadow-sm text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <UploadCloud size={18} /> Add Another Receipt
                                    </button>
                                </div>
                                <div className="md:col-span-7 bg-white border border-gray-200 rounded-3xl flex flex-col overflow-hidden">
                                    <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
                                        <h3 className="text-lg font-semibold">Recent Scan Details</h3>
                                        <span className="text-sm text-gray-500">{receipts[0]?.merchant}</span>
                                    </div>
                                    <div className="p-8">
                                        <p className="text-gray-600 text-sm mb-4">Your most recently scanned receipt items will appear here. Navigate to the <strong>Expenses</strong> tab to see all organized spending.</p>
                                        {receipts[0] && (
                                            <div className="space-y-4">
                                                {receipts[0].items.slice(0, 5).map((it, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                                                        <div>
                                                            <div className="font-medium">{it.name}</div>
                                                            <div className="text-xs text-gray-500 mt-1">{it.category}</div>
                                                        </div>
                                                        <div className="font-semibold">{formatCurrency(it.price, receipts[0].currency)}</div>
                                                    </div>
                                                ))}
                                                {receipts[0].items.length > 5 && (
                                                    <div className="text-sm text-center text-gray-500 pt-2">And {receipts[0].items.length - 5} more items...</div>
                                                )}
                                                <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between items-center font-bold">
                                                    <span>Total ({receipts[0].currency})</span>
                                                    <span>{formatCurrency(receipts[0].total, receipts[0].currency)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}

                {/* EXPENSES TAB */}
                {activeTab === 'expenses' && (
                    <div className="flex flex-col gap-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2"><Calendar className="text-gray-400" /> Expenses Timeline</h2>

                        {sortedDates.length === 0 ? (
                            <div className="bg-white border border-gray-200 p-12 text-center rounded-3xl text-gray-500">
                                You haven't scanned any expenses yet. Go dashboard and upload a receipt.
                            </div>
                        ) : (
                            sortedDates.map(date => (
                                <div key={date} className="bg-white border border-gray-200 rounded-3xl flex flex-col overflow-hidden shadow-sm">
                                    <div className="px-5 py-4 sm:px-8 bg-gray-50/80 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <h3 className="font-semibold text-gray-800">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                                        <span className="text-sm font-medium text-gray-500">{receiptsByDate[date].length} Receipt(s)</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                    <th className="px-5 sm:px-8 py-3 w-1/2">Store / Items</th>
                                                    <th className="px-4 py-3 hidden sm:table-cell">Category</th>
                                                    <th className="px-5 sm:px-8 py-3 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm divide-y divide-gray-50">
                                                {receiptsByDate[date].flatMap((receipt) => receipt.items.map((item, idx) => (
                                                    <tr key={`${receipt.id}-${idx}`} className="hover:bg-gray-50/30 transition-colors">
                                                        <td className="px-5 sm:px-8 py-4">
                                                            <div className="font-medium text-gray-900">{item.name}</div>
                                                            <div className="text-xs text-gray-400 mt-0.5">Purchased at: {receipt.merchant}</div>
                                                            <div className="mt-2 sm:hidden"><CategoryPill category={item.category} /></div>
                                                        </td>
                                                        <td className="px-4 py-4 hidden sm:table-cell">
                                                            <CategoryPill category={item.category} />
                                                        </td>
                                                        <td className="px-5 sm:px-8 py-4 text-right font-semibold text-gray-900">
                                                            {formatCurrency(item.price, receipt.currency)}
                                                        </td>
                                                    </tr>
                                                )))}

                                                {/* Daily Summary within table footer */}
                                                <tr className="bg-gray-50/50">
                                                    <td colSpan={3} className="px-5 sm:px-8 py-4 text-right">
                                                        <span className="text-gray-500 text-sm mr-4">Daily Total:</span>
                                                        <span className="font-bold text-lg">
                                                            {formatCurrency(receiptsByDate[date].reduce((sum, r) => sum + r.total, 0), receiptsByDate[date][0]?.currency || 'USD')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* BUDGETS TAB */}
                {activeTab === 'budgets' && (
                    <div className="flex flex-col gap-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2"><Wallet className="text-gray-400" /> Monthly Budget Tracking</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Budget Editor Card */}
                            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Total Target Budget</span>

                                        {editingBudget ? (
                                            <div className="flex items-center gap-3 mt-2">
                                                <div className="relative">
                                                    <DollarSign size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="number"
                                                        className="pl-9 pr-4 py-2 border-2 border-blue-500 rounded-lg outline-none font-bold text-xl w-32 sm:w-40"
                                                        value={tempBudget}
                                                        onChange={(e) => setTempBudget(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setBudget(Number(tempBudget) || 0);
                                                        setEditingBudget(false);
                                                    }}
                                                    className="bg-black text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800"
                                                >Save</button>
                                            </div>
                                        ) : (
                                            <div className="flex items-baseline gap-4 mt-1">
                                                <h3 className="text-4xl sm:text-5xl font-bold">${budget.toLocaleString()}</h3>
                                                <button
                                                    onClick={() => {
                                                        setTempBudget(budget.toString());
                                                        setEditingBudget(true);
                                                    }}
                                                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
                                                >Edit Limit</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-8 sm:mt-10">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-2 gap-1 sm:gap-0">
                                        <div>
                                            <span className="text-2xl font-bold text-gray-900">${totalSpend.toFixed(0)}</span>
                                            <span className="text-sm text-gray-500 ml-2">spent this month</span>
                                        </div>
                                        <div className="text-sm font-medium text-gray-500">
                                            ${Math.max(budget - totalSpend, 0).toFixed(0)} remaining
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((totalSpend / budget) * 100, 100)}%` }}
                                            transition={{ duration: 1, ease: 'easeOut' }}
                                            className={`h-full ${totalSpend > budget ? 'bg-red-500' : 'bg-black'} rounded-full`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Insight Card */}
                            <div className="bg-white border border-gray-200 rounded-3xl p-8 flex flex-col justify-center items-center text-center">
                                <ProgressDial percentage={budget > 0 ? (totalSpend / budget) * 100 : 0} />
                                <h4 className="font-semibold text-lg mt-6">Budget Health Track</h4>
                                <p className="text-sm text-gray-500 mt-2 max-w-xs">
                                    {totalSpend > budget
                                        ? "You've exceeded your monthly budget. Time to review your expenses."
                                        : "You're currently within your budget limits. Great job tracking!"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function ProgressDial({ percentage }: { percentage: number }) {
    const clamped = Math.min(percentage, 100);
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clamped / 100) * circumference;

    return (
        <div className="relative h-24 w-24 flex-shrink-0 mx-auto">
            <svg className="h-24 w-24 transform -rotate-90">
                <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    stroke="rgba(0,0,0,0.05)"
                    strokeWidth="10"
                    fill="transparent"
                />
                <motion.circle
                    cx="48"
                    cy="48"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={percentage >= 100 ? "text-red-500" : "text-black"}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.1 }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold leading-none">{Math.round(clamped)}%</span>
            </div>
        </div>
    );
}

function CategoryPill({ category }: { category: string }) {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-700';

    const cat = category.toLowerCase();

    if (cat.includes('grocer') || cat.includes('food') || cat.includes('market')) {
        bgColor = 'bg-emerald-100';
        textColor = 'text-emerald-700';
    } else if (cat.includes('din') || cat.includes('restaurant') || cat.includes('cafe') || cat.includes('coffee')) {
        bgColor = 'bg-orange-100';
        textColor = 'text-orange-700';
    } else if (cat.includes('entertain') || cat.includes('fun') || cat.includes('movie')) {
        bgColor = 'bg-purple-100';
        textColor = 'text-purple-700';
    } else if (cat.includes('tech') || cat.includes('electronic') || cat.includes('software')) {
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-700';
    } else if (cat.includes('health') || cat.includes('medical') || cat.includes('pharmacy')) {
        bgColor = 'bg-rose-100';
        textColor = 'text-rose-700';
    } else if (cat.includes('transport') || cat.includes('travel') || cat.includes('gas')) {
        bgColor = 'bg-cyan-100';
        textColor = 'text-cyan-700';
    }

    return (
        <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${bgColor} ${textColor} inline-block`}>
            {category}
        </span>
    );
}
