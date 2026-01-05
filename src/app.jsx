import React, { useState, useEffect } from 'react';
import { Banknote, Languages, Globe, Wallet, ArrowRightLeft } from 'lucide-react';

// Images for specific denominations
const JASMINE_IMG = "https://cdn-icons-png.flaticon.com/512/5075/5075794.png";

// Currency Denominations Data
const DENOMS = [
  { v: 500, n: { ar: 'سنابل القمح', en: 'Wheat Ears' }, s: '🌾' },
  { v: 200, n: { ar: 'أغصان الزيتون', en: 'Olive Branches' }, s: '🫒' },
  { v: 100, n: { ar: 'القطن السوري', en: 'Syrian Cotton' }, s: '☁️' }, 
  { v: 50, n: { ar: 'الحمضيات', en: 'Citrus' }, s: '🍊' },
  { v: 25, n: { ar: 'العنب', en: 'Grapes' }, s: '🍇' },
  { v: 10, n: { ar: 'ياسمين الشام', en: 'Damask Jasmine' }, s: null, img: JASMINE_IMG }, 
];

const TRANSLATIONS = {
  ar: {
    title: "دليل الليرة",
    subtitle: "دليل العملة السورية الجديدة",
    oldToNew: "من قديم لجديد",
    newToOld: "من جديد لقديم",
    enterAmount: "أدخل المبلغ",
    result: "الصافي المعادل",
    howToPay: "توزيع الفئات النقدية",
    unitOld: "ل.س قديمة",
    unitNew: "ليرة جديدة",
    footer: "دليلك المالي للتحول الجديد"
  },
  en: {
    title: "Lira Guide",
    subtitle: "Syrian New Currency Guide",
    oldToNew: "Old to New",
    newToOld: "New to Old",
    enterAmount: "Enter Amount",
    result: "Equivalent Result",
    howToPay: "Banknote Distribution",
    unitOld: "Old SYP",
    unitNew: "New Lira",
    footer: "Your financial transition guide"
  }
};

export default function App() {
  const [lang, setLang] = useState('ar');
  const [val, setVal] = useState('');
  const [mode, setMode] = useState('oldToNew'); 
  const [parts, setParts] = useState([]);

  const t = TRANSLATIONS[lang];
  const isOldToNew = mode === 'oldToNew';
  const numVal = parseFloat(val) || 0;
  
  // Logic: 100 Old = 1 New
  const currentResult = isOldToNew ? (numVal / 100) : (numVal * 100);
  const amountInNew = isOldToNew ? currentResult : numVal;

  // Calculate Banknotes Distribution
  useEffect(() => {
    let current = amountInNew;
    const res = [];
    if (current > 0) {
      DENOMS.forEach(d => {
        const count = Math.floor(current / d.v);
        if (count > 0) {
          res.push({ ...d, count });
          current = Math.round((current - (count * d.v)) * 100) / 100;
        }
      });
    }
    setParts(res);
  }, [amountInNew]);

  return (
    <div className={`min-h-screen bg-slate-50 p-4 font-sans ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-md mx-auto space-y-4">
        
        {/* Header Section */}
        <div className="flex items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-100 italic">
              د
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 leading-none">{t.title}</h1>
              <p className="text-[10px] text-indigo-600 font-bold uppercase mt-1 tracking-widest">{t.subtitle}</p>
            </div>
          </div>
          <button 
            onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')} 
            className="p-3 bg-slate-50 rounded-xl text-slate-600 border border-slate-200 active:scale-95 transition-transform"
          >
            <Languages size={20} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex p-1.5 bg-slate-200/50 rounded-2xl">
          <button 
            onClick={() => setMode('oldToNew')} 
            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${isOldToNew ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}
          >
            {t.oldToNew}
          </button>
          <button 
            onClick={() => setMode('newToOld')} 
            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${!isOldToNew ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}
          >
            {t.newToOld}
          </button>
        </div>

        {/* Input & Result Card */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-white relative overflow-hidden">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">
            {t.enterAmount} {isOldToNew ? `(${t.unitOld})` : `(${t.unitNew})`}
          </label>
          <input 
            type="number" 
            inputMode="decimal"
            value={val} 
            onChange={(e) => setVal(e.target.value)} 
            placeholder="0.00" 
            className="w-full text-5xl font-black outline-none text-slate-900 placeholder:text-slate-100 bg-transparent"
          />
          
          <div className="mt-8 pt-8 border-t-2 border-slate-50 flex justify-between items-end">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t.result}</span>
              <span className="text-4xl font-black text-indigo-600">
                {currentResult.toLocaleString(lang === 'ar' ? 'ar-SY' : 'en-US')}
              </span>
            </div>
            <span className="text-xs font-black text-slate-300 italic mb-1">
              {!isOldToNew ? t.unitOld : t.unitNew}
            </span>
          </div>
        </div>

        {/* Banknotes Distribution List */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-slate-50">
          <h2 className="text-xs font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
            <Banknote size={16} className="text-indigo-600" /> {t.howToPay}
          </h2>

          {amountInNew > 0 ? (
            <div className="space-y-3">
              {parts.map(p => (
                <div key={p.v} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl">
                      {p.img ? <img src={p.img} className="w-8 h-8 object-contain" alt="" /> : p.s}
                    </div>
                    <div>
                      <div className="text-xl font-black text-slate-900 leading-none">{p.v}</div>
                      <div className="text-[10px] font-bold text-indigo-600 mt-1 uppercase">{p.n[lang]}</div>
                    </div>
                  </div>
                  <div className="bg-slate-900 text-white px-5 py-2 rounded-xl text-2xl font-black shadow-lg">
                    ×{p.count}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center opacity-20 flex flex-col items-center">
               <Globe size={40} className="mb-4 text-slate-300" />
               <p className="text-[10px] font-black tracking-[4px] uppercase">
                 {lang === 'ar' ? 'بانتظار المبلغ...' : 'Waiting for amount...'}
               </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[9px] text-slate-300 font-black uppercase tracking-[5px] pt-4 italic opacity-60">
          {t.footer}
        </p>
      </div>
    </div>
  );
}
