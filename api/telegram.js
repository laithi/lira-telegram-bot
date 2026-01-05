import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowUpDown,
  Wallet,
  AlertTriangle,
  RefreshCw,
  Banknote,
  Globe,
  Languages
} from 'lucide-react';

const JASMINE_IMG = "https://cdn-icons-png.flaticon.com/512/5075/5075794.png";

// فئات الإصدار الجديد
const DENOMS_NEW = [
  { v: 500, n: { ar: 'سنابل القمح', en: 'Wheat Ears' }, s: '🌾', img: null },
  { v: 200, n: { ar: 'أغصان الزيتون', en: 'Olive Branches' }, s: '🫒', img: null },
  { v: 100, n: { ar: 'القطن السوري', en: 'Syrian Cotton' }, s: '☁️', img: null },
  { v: 50,  n: { ar: 'الحمضيات', en: 'Citrus' }, s: '🍊', img: null },
  { v: 25,  n: { ar: 'العنب', en: 'Grapes' }, s: '🍇', img: null },
  { v: 10,  n: { ar: 'ياسمين الشام', en: 'Damask Jasmine' }, s: null, img: JASMINE_IMG },
];

// فئات الإصدار القديم (حسب اللي عطيتني ياها) — مرتبة تنازلياً
const DENOMS_OLD = [
  { v: 5000, n: { ar: '5000 قديم', en: '5000 Old' }, s: '💴', img: null },
  { v: 2000, n: { ar: '2000 قديم', en: '2000 Old' }, s: '💴', img: null },
  { v: 1000, n: { ar: '1000 قديم', en: '1000 Old' }, s: '💴', img: null },
  { v: 200,  n: { ar: '200 قديم',  en: '200 Old'  }, s: '💴', img: null },
  { v: 100,  n: { ar: '100 قديم',  en: '100 Old'  }, s: '💴', img: null },
  { v: 50,   n: { ar: '50 قديم',   en: '50 Old'   }, s: '💴', img: null },
];

const TRANSLATIONS = {
  ar: {
    title: "دليل الليرة",
    subtitle: "دليل العملة السورية الجديدة",
    oldToNew: "من قديم لجديد",
    newToOld: "من جديد لقديم",
    enterAmount: "أدخل المبلغ",
    old: "قديم",
    new: "جديد",
    result: "الناتج",
    howToPay: "توزيع الفئات النقدية",
    newDenoms: "حسب الإصدار الجديد",
    oldDenoms: "حسب الإصدار القديم",
    changeNote: "ملاحظة الفراطة",
    // قديم → جديد: الباقي بالجديد وندفعه بالقديم
    changeDescOldToNew: "بقي {leftover} ليرة جديدة، تدفعها بالقديم: ({otherAmount} ل.س).",
    // جديد → قديم: الباقي بالقديم وندفعه بالجديد
    changeDescNewToOld: "بقي {leftover} ل.س قديمة، تدفعها بالجديد: ({otherAmount} ليرة جديدة).",
    footer: "دليلك المالي للتحول الجديد",
    million: "مليون",
    unitOld: "ل.س قديمة",
    unitNew: "ليرة جديدة",
    enterKey: "enter"
  },
  en: {
    title: "Lira Guide",
    subtitle: "Syrian New Currency Guide",
    oldToNew: "Old to New",
    newToOld: "New to Old",
    enterAmount: "Enter Amount",
    old: "Old",
    new: "New",
    result: "Result",
    howToPay: "Banknote Distribution",
    newDenoms: "New Issuance Layout",
    oldDenoms: "Old Issuance Layout",
    changeNote: "Small Change",
    changeDescOldToNew: "{leftover} New leftover, pay in Old: ({otherAmount} SYP).",
    changeDescNewToOld: "{leftover} Old leftover, pay in New: ({otherAmount} New).",
    footer: "Your guide to the currency transition",
    million: "Million",
    unitOld: "Old SYP",
    unitNew: "New Lira",
    enterKey: "go"
  }
};

const App = () => {
  const [lang, setLang] = useState('ar');
  const [val, setVal] = useState('');
  const [mode, setMode] = useState('oldToNew');
  const [parts, setParts] = useState([]);
  const [leftover, setLeftover] = useState(0);
  const inputRef = useRef(null);

  const t = TRANSLATIONS[lang];
  const isOldToNew = mode === 'oldToNew';
  const isRtl = lang === 'ar';

  const numVal = parseFloat(val) || 0;

  // معامل التحويل: 100 قديم = 1 جديد
  const currentResult = isOldToNew ? (numVal / 100) : (numVal * 100);

  // مبالغ محسوبة في العملتين
  const amountInNew = isOldToNew ? currentResult : numVal;
  const amountInOld = isOldToNew ? numVal : currentResult;

  // اختيار عملة/فئات التوزيع حسب الاتجاه
  const breakdownDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;
  const breakdownAmount = isOldToNew ? amountInNew : amountInOld;

  // وظيفة لتحويل الأرقام العربية إلى إنجليزية
  const convertArabicNumbers = (str) => {
    const arabicNums = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    if (typeof str === 'string') {
      for (let i = 0; i < 10; i++) {
        str = str.replace(arabicNums[i], i);
      }
    }
    return str;
  };

  const handleInputChange = (e) => {
    const rawValue = e.target.value;
    const cleanValue = convertArabicNumbers(rawValue);
    // السماح فقط بالأرقام والنقطة العشرية
    if (/^[0-9.]*$/.test(cleanValue)) {
      setVal(cleanValue);
    }
  };

  // توزيع الفئات + الفراطة حسب عملة التوزيع (جديد/قديم)
  useEffect(() => {
    let current = breakdownAmount;
    const res = [];
    if (current > 0) {
      breakdownDenoms.forEach(d => {
        const count = Math.floor(current / d.v);
        if (count > 0) {
          res.push({ ...d, count });
          // بما أننا نتعامل مع أعداد صحيحة عملياً، نترك rounding كأمان
          current = Math.round((current - (count * d.v)) * 100) / 100;
        }
      });
    }
    setParts(res);
    setLeftover(current);
  }, [breakdownAmount, isOldToNew]);

  const performToggle = (targetMode) => {
    if (targetMode === mode) return;
    if (val !== '') setVal(currentResult.toString());
    setMode(targetMode);
  };

  const switchMode = () => {
    if (val !== '') setVal(currentResult.toString());
    setMode(prev => prev === 'oldToNew' ? 'newToOld' : 'oldToNew');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  // نص ملاحظة الفراطة حسب الاتجاه:
  // - قديم → جديد: leftover بالجديد، otherAmount بالقديم (×100)
  // - جديد → قديم: leftover بالقديم، otherAmount بالجديد (÷100)
  const changeText = () => {
    if (!(leftover > 0 && breakdownAmount > 0)) return '';

    if (isOldToNew) {
      const otherAmount = Math.round(leftover * 100); // ادفعها بالقديم
      return t.changeDescOldToNew
        .replace('{leftover}', leftover.toLocaleString(lang === 'ar' ? 'ar-SY' : 'en-US'))
        .replace('{otherAmount}', otherAmount.toLocaleString(lang === 'ar' ? 'ar-SY' : 'en-US'));
    } else {
      const otherAmount = Math.round((leftover / 100) * 100) / 100; // ادفعها بالجديد
      return t.changeDescNewToOld
        .replace('{leftover}', leftover.toLocaleString(lang === 'ar' ? 'ar-SY' : 'en-US'))
        .replace('{otherAmount}', otherAmount.toLocaleString(lang === 'ar' ? 'ar-SY' : 'en-US'));
    }
  };

  return (
    <div
      className={`min-h-screen bg-slate-50 text-slate-900 font-sans p-4 select-none ${isRtl ? 'rtl' : 'ltr'}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="max-w-md mx-auto space-y-6 pb-24">

        {/* Header */}
        <div className="flex items-center justify-between px-2 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100 text-3xl border-b-4 border-indigo-800 italic">د</div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 leading-none">{t.title}</h1>
              <p className="text-[10px] text-indigo-600 font-bold mt-1 uppercase tracking-widest">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
              className="p-3 bg-white rounded-xl border border-slate-200 text-slate-600 shadow-sm flex items-center gap-2 font-black text-xs active:scale-95 transition-all"
            >
              <Languages className="w-4 h-4" />
              {lang === 'ar' ? 'EN' : 'عربي'}
            </button>
            <button
              onClick={() => { setVal(''); inputRef.current?.focus(); }}
              className="p-3 bg-white rounded-xl border border-slate-200 text-slate-400 shadow-sm active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 bg-slate-200/50 rounded-2xl">
          <button
            onClick={() => performToggle('oldToNew')}
            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 ${isOldToNew ? 'bg-white shadow-md text-indigo-600 scale-[1.02]' : 'text-slate-500'}`}
          >
            {t.oldToNew}
          </button>
          <button
            onClick={() => performToggle('newToOld')}
            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 ${!isOldToNew ? 'bg-white shadow-md text-indigo-600 scale-[1.02]' : 'text-slate-500'}`}
          >
            {t.newToOld}
          </button>
        </div>

        {/* Calculation Card */}
        <div className="relative bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/60 p-8 border border-white">
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4 px-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {t.enterAmount} {isOldToNew ? `(${t.old})` : `(${t.new})`}
              </span>
              <div className="flex gap-1.5">
                {[50000, 1000000].map(q => (
                  <button
                    key={q}
                    onClick={() => setVal(q.toString())}
                    className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-black transition-all border border-slate-200/50"
                  >
                    {q >= 1000000 ? t.million : q / 1000 + "k"}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              {/* type=text للتحكم بتحويل الأرقام */}
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                enterKeyHint={lang === 'ar' ? 'enter' : 'go'}
                value={val}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="0.00"
                className="w-full text-5xl font-black bg-transparent outline-none text-slate-900 placeholder:text-slate-100"
              />
              <div className={`absolute ${isRtl ? 'left-0' : 'right-0'} bottom-1 text-slate-300 font-black text-xs italic`}>
                {isOldToNew ? t.unitOld : t.unitNew}
              </div>
            </div>
          </div>

          <div className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 z-20">
            <button
              onClick={switchMode}
              className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all border-4 border-white"
            >
              <ArrowUpDown className={`w-4 h-4 transition-transform duration-500 ${!isOldToNew ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="mt-4 pt-8 border-t-2 border-slate-50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              {t.result}
            </span>
            <div className="flex items-baseline gap-2 overflow-hidden">
              <span className="text-4xl font-black text-indigo-600 truncate">
                {currentResult.toLocaleString(lang === 'ar' ? 'ar-SY' : 'en-US', { maximumFractionDigits: 2 })}
              </span>
              <span className="text-slate-400 font-black text-sm italic">
                {isOldToNew ? t.unitNew : t.unitOld}
              </span>
            </div>
          </div>
        </div>

        {/* Banknotes Breakdown */}
        <div className={`bg-white rounded-[2.5rem] p-8 shadow-lg shadow-slate-200/40 border-2 transition-all duration-500 ${!isOldToNew ? 'border-indigo-100' : 'border-white'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-xl transition-colors ${!isOldToNew ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-600'}`}>
              {!isOldToNew ? <Banknote className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-800 uppercase leading-none">{t.howToPay}</h2>
              <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wider opacity-70">
                {isOldToNew ? t.newDenoms : t.oldDenoms}
              </p>
            </div>
          </div>

          {breakdownAmount > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {parts.map((p) => (
                <div
                  key={p.v}
                  className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex items-center justify-between hover:bg-white hover:border-indigo-200 transition-all group"
                >
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-slate-900 leading-none">{p.v}</span>
                    <span className="text-xs font-black text-indigo-600 mt-2 flex items-center gap-2">
                      <span className="w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform overflow-hidden">
                        {p.img ? (
                          <img src={p.img} alt={p.n.ar} className="w-7 h-7 object-contain" />
                        ) : <span className="text-2xl">{p.s}</span>}
                      </span>
                      {p.n[lang]}
                    </span>
                  </div>
                  <div className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-2xl font-black shadow-lg">
                    ×{p.count}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center opacity-20 flex flex-col items-center border-2 border-dashed border-slate-200 rounded-[2rem]">
              <Globe className="w-12 h-12 mb-3 text-slate-300" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] italic">
                {lang === 'ar' ? 'أدخل مبلغاً للمتابعة...' : 'Enter amount to proceed...'}
              </p>
            </div>
          )}
        </div>

        {/* Change Note Section */}
        {leftover > 0 && breakdownAmount > 0 && (
          <div className="p-8 bg-amber-50 rounded-[2.5rem] border-2 border-amber-200 border-b-[10px] shadow-md">
            <div className="flex items-center gap-3 text-amber-700 mb-3">
              <AlertTriangle className="w-7 h-7" />
              <span className="text-sm font-black uppercase tracking-wider">{t.changeNote}</span>
            </div>
            <p className="text-lg text-amber-900 font-black italic leading-relaxed">
              {changeText()}
            </p>
          </div>
        )}

        <p className="text-center text-[10px] text-slate-300 font-black uppercase tracking-[5px] pt-4 italic opacity-50">
          {t.footer}
        </p>
      </div>
    </div>
  );
};

export default App;
```0
