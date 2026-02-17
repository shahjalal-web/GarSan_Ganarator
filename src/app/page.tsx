/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useRef } from "react";
import Header from "../components/Header";
import PhotoUploader, { PhotoItem } from "../components/PhotoUploader";
import {
  User,
  MapPin,
  Zap,
  Package,
  Image as ImageIcon,
  PlusCircle,
  Trash2,
  ShieldCheck,
  FileText,
  Share2,
  LogIn,
  RefreshCcw,
  Activity,
} from "lucide-react";
import {
  chooseGeneratorKw,
  recommendBrandForKw,
  calcQuoteTotal,
  PACKAGE_RULES,
  calcExtraFootage,
  calcLoadShedPrice,
  generatorBasePriceForKw,
} from "../lib/calc";
import {
  saveQuote,
  uploadImageToBackend,
  uploadImageToCloudinary,
  fetchTechs,
  fetchSettings,
  loginTech,
} from "../lib/api";

export default function Home() {
  const [techs, setTechs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetchTechs()
      .then(setTechs)
      .catch(() => setTechs([]));
    fetchSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  const [authName, setAuthName] = useState("");
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [packageType, setPackageType] = useState<
    "value" | "premium_underground"
  >("value");
  const [gasFt, setGasFt] = useState<number>(15);
  const [elecFt, setElecFt] = useState<number>(15);

  const defaultLoads = [
    { id: "ac", label: "Central A/C (per unit)", watts: 3500, qty: 1 },
    { id: "refrig", label: "Refrigerator", watts: 200, qty: 1 },
    { id: "dryer", label: "Electric dryer", watts: 3000, qty: 0 },
    { id: "ev", label: "EV charger (level 2)", watts: 7000, qty: 0 },
    { id: "pool", label: "Pool pump", watts: 1500, qty: 0 },
    { id: "well", label: "Well pump", watts: 2500, qty: 0 },
    { id: "lights", label: "Lighting & outlets (est)", watts: 800, qty: 1 },
  ];

  const [loads, setLoads] = useState(defaultLoads);
  const [selectedLoadShedCount, setSelectedLoadShedCount] = useState(0);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [quoteSaved, setQuoteSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const setPhotosAndMarkDirty = (p: PhotoItem[]) => {
    setPhotos(p);
    setQuoteSaved(false);
  };

  const proposalRef = useRef<HTMLDivElement | null>(null);

  const onAuth = async () => {
    try {
      await loginTech(authName, pin);
      setIsAuthenticated(true);
    } catch {
      alert("Invalid tech or PIN");
    }
  };

  const totalWatts = loads.reduce((s, l) => s + l.watts * (l.qty || 0), 0);
  const recommendedKw = chooseGeneratorKw(totalWatts || 0 || 7000);
  const brand = recommendBrandForKw(recommendedKw);

  const pricing = calcQuoteTotal({
    kw: recommendedKw,
    packageType,
    gasFt,
    elecFt,
    loadShedCount: selectedLoadShedCount,
    miscFees: 0,
    labor: 0,
  });

  // --- Original Save & PDF Logic (Kept exactly as requested) ---
  async function onSaveQuote() {
    if (!isAuthenticated) return alert("Please log in with your tech PIN");
    setLoading(true);
    const quote = {
      tech: authName,
      customerName,
      address,
      phone,
      email,
      date: new Date().toISOString(),
      recommendedKw,
      brand,
      packageType,
      gasFt,
      elecFt,
      loads,
      loadShedCount: selectedLoadShedCount,
      pricing,
      photos: photos.map((p) => ({
        id: p.id,
        dataUrl: p.dataUrl,
        category: p.category,
      })),
    };
    try {
      const cloudPromises = photos.map(async (p) => {
        if (!p.file) return p;
        try {
          const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_API;
          const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET;
          let url: string | undefined;
          if (cloudName && uploadPreset) {
            url = await uploadImageToCloudinary(p.file);
          } else if (process.env.NEXT_PUBLIC_API_BASE) {
            url = await uploadImageToBackend(p.file);
          } else {
            return p;
          }
          return { ...p, uploadedUrl: url };
        } catch (err) {
          setLoading(false);
          return p;
        }
      });
      const uploaded = await Promise.all(cloudPromises);
      quote.photos = uploaded.map((p) => ({
        id: p.id,
        dataUrl: (p as any).uploadedUrl ?? p.dataUrl,
        category: p.category,
      }));
    } catch (err) {
      setLoading(false);
      alert("Failed to upload photos");
      return;
    }
    await saveQuote(quote);
    setQuoteSaved(true);
    setLoading(false);
    alert("Quote saved successfully!");
  }

async function onGeneratePdf() {
    if (!quoteSaved) return alert("Save the quote first.");

    const generateStructuredPdf = async () => {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40; // Increased margin for a cleaner look
      const pageWidth = pdf.internal.pageSize.getWidth();
      let y = 40;

      // --- Helper Functions ---
      const formatCurrency = (n: number) => `$${n.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
      
      async function loadImageAsPngDataUrl(url?: string, maxW = 400) {
        if (!url) return null;
        try {
          const resp = await fetch(url);
          if (!resp.ok) return null;
          const blob = await resp.blob();
          const objectUrl = URL.createObjectURL(blob);
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.crossOrigin = "anonymous";
            i.onload = () => resolve(i);
            i.onerror = (err) => reject(err);
            i.src = objectUrl;
          });
          const ratio = Math.min(1, maxW / img.width || 1);
          const cw = Math.max(1, Math.round(img.width * ratio));
          const ch = Math.max(1, Math.round(img.height * ratio));
          const canvas = document.createElement("canvas");
          canvas.width = cw; canvas.height = ch;
          const ctx = canvas.getContext("2d");
          if (!ctx) { URL.revokeObjectURL(objectUrl); return null; }
          ctx.drawImage(img, 0, 0, cw, ch);
          URL.revokeObjectURL(objectUrl);
          return canvas.toDataURL("image/png");
        } catch (_) { return null; }
      }

      // --- 1. Header Section ---
      const logoData = await loadImageAsPngDataUrl(settings?.company?.logoUrl ?? "/logo.jpeg", 200);
      if (logoData) {
        pdf.addImage(logoData, "PNG", margin, y, 100, 40);
      }

      // Company Info (Right Aligned)
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.setFont("helvetica", "bold");
      const companyName = settings?.company?.name || "GarSan Plumbing Services LLC";
      pdf.text(companyName.toUpperCase(), pageWidth - margin, y + 10, { align: 'right' });
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      if (settings?.company?.address) pdf.text(settings.company.address, pageWidth - margin, y + 22, { align: 'right' });
      if (settings?.company?.phone) pdf.text(settings.company.phone, pageWidth - margin, y + 34, { align: 'right' });

      y += 70;

      // --- 2. Title Banner ---
      pdf.setFillColor(30, 41, 59); // Navy Blue (#1e293b)
      pdf.rect(0, y, pageWidth, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("GENERATOR INSTALLATION PROPOSAL", margin, y + 25);
      
      pdf.setFontSize(10);
      const dateStr = `DATE: ${new Date().toLocaleDateString()}`;
      pdf.text(dateStr, pageWidth - margin, y + 25, { align: 'right' });

      y += 70;

      // --- 3. Client & Recommendation Info ---
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(12);
      pdf.text("PROPOSAL PREPARED FOR", margin, y);
      
      pdf.setDrawColor(30, 41, 59);
      pdf.setLineWidth(1.5);
      pdf.line(margin, y + 5, margin + 160, y + 5);

      y += 25;
      pdf.setTextColor(0);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text(customerName || "Valued Customer", margin, y);
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      y += 18;
      pdf.text(address || "No address provided", margin, y);

      // Recommendation Box (Right Side)
      const boxY = y - 43;
      pdf.setFillColor(248, 250, 252); // Light Slate
      pdf.roundedRect(pageWidth / 2 + 20, boxY, (pageWidth / 2) - margin - 20, 60, 5, 5, 'F');
      pdf.setTextColor(30, 41, 59);
      pdf.setFont("helvetica", "bold");
      pdf.text("RECOMMENDED UNIT", pageWidth / 2 + 35, boxY + 20);
      pdf.setFontSize(12);
      pdf.setTextColor(2, 132, 199); // Sky Blue
      pdf.text(`${recommendedKw} kW — ${brand}`, pageWidth / 2 + 35, boxY + 40);

      y += 60;

      // --- 4. Scope & Pricing Table ---
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("SCOPE OF WORK & PRICING", margin, y);
      y += 15;

      // Table Header
      pdf.setFillColor(241, 245, 249);
      pdf.rect(margin, y, pageWidth - (margin * 2), 25, 'F');
      pdf.setFontSize(10);
      pdf.text("DESCRIPTION", margin + 10, y + 17);
      pdf.text("AMOUNT", pageWidth - margin - 10, y + 17, { align: 'right' });

      y += 40;
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0);

      // Line Items
      const footage = calcExtraFootage(packageType as any, gasFt, elecFt);
      const pkg = PACKAGE_RULES[packageType as "value" | "premium_underground"];
      const basePrice = pricing.basePrice ?? generatorBasePriceForKw(recommendedKw as any);
      const items = [
        { desc: `Generator Unit (${recommendedKw} kW — ${brand})`, price: basePrice },
        { desc: `Installation Package: ${packageType === 'value' ? 'Above Ground' : 'Underground'}`, price: 0 },
        { desc: `Gas Line: ${gasFt} ft (${footage.extraGas} ft extra @ $${pkg.gasPerFt}/ft)`, price: footage.gasCharge },
        { desc: `Electrical Line: ${elecFt} ft (${footage.extraElec} ft extra @ $${pkg.elecPerFt}/ft)`, price: footage.elecCharge }
      ];

      if (selectedLoadShedCount > 0) {
        items.push({ 
          desc: `Load Management System (${selectedLoadShedCount} loads)`, 
          price: calcLoadShedPrice(selectedLoadShedCount) 
        });
      }

      items.forEach(item => {
        pdf.text(item.desc, margin + 10, y);
        pdf.text(formatCurrency(item.price), pageWidth - margin - 10, y, { align: 'right' });
        y += 20;
      });

      // --- 5. Total Section ---
      y += 10;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, y, pageWidth - margin, y);
      
      y += 30;
      pdf.setFillColor(30, 41, 59);
      pdf.rect(pageWidth / 2, y - 20, (pageWidth / 2) - margin, 40, 'F');
      
      pdf.setTextColor(255);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("TOTAL INVESTMENT", (pageWidth / 2) + 15, y + 5);
      
      const totalStr = formatCurrency(pricing.total);
      pdf.setFontSize(16);
      pdf.text(totalStr, pageWidth - margin - 15, y + 5, { align: 'right' });

      // --- 6. Footer ---
      y = 740;
      pdf.setTextColor(100);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "italic");
      pdf.text("Notes: Gas utility upgrades (if required) are coordinated by the customer with the provider.", margin, y);
      
      y += 15;
      pdf.setFont("helvetica", "normal");
      pdf.text("This proposal is valid for 30 days from the date issued.", margin, y);

      pdf.setFillColor(30, 41, 59);
      pdf.rect(0, 810, pageWidth, 40, 'F');
      pdf.setTextColor(255);
      pdf.setFontSize(8);
      pdf.text("Regulated by TSBPE, 7915 Cameron Rd, Austin, TX 78754", pageWidth / 2, 828, { align: 'center' });

      return pdf;
    };

    try {
      const pdf = await generateStructuredPdf();
      const blob = pdf.output("blob");
      const file = new File([blob], `proposal-${Date.now()}.pdf`, { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      
      // Native Share API
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: "GarSan Proposal",
          text: `Generator Proposal for ${customerName}`
        }).catch(() => {});
      }
    } catch (err) {
      alert("PDF generation failed.");
    }
  }

  // --- UI RENDER ---
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />

      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        {!isAuthenticated ? (
          /* MODERN LOGIN CARD */
          <div className="flex justify-center items-center py-20">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl w-full max-w-md border border-slate-100 text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-100">
                <LogIn size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">
                Technician Sign-in
              </h2>
              <p className="text-slate-500 mb-8 font-medium">
                Select your name and enter PIN
              </p>

              <div className="space-y-4">
                <select
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                >
                  <option value="">Select Technician</option>
                  {techs.map((t: any) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  className="w-full text-center p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold tracking-widest"
                />

                <div className="flex gap-3">
                  <button
                    onClick={onAuth}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition-transform active:scale-95"
                  >
                    Start Estimating
                  </button>
                  <a
                    href="/admin"
                    className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                  >
                    Admin
                  </a>
                </div>
              </div>
              <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                GarSan Plumbing Services LLC
              </p>
            </div>
          </div>
        ) : (
          /* MODERN QUOTE FORM */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-20">
            {/* STEP 1: CUSTOMER INFO */}
            <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">
                  1
                </div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <User size={20} className="text-blue-500" /> Customer & Site
                  Details
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">
                    Customer Full Name
                  </label>
                  <input
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setQuoteSaved(false);
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                    placeholder="John Doe"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">
                    Installation Address
                  </label>
                  <input
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setQuoteSaved(false);
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                    placeholder="123 Main St, City, TX"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">
                    Phone Number
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setQuoteSaved(false);
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                    placeholder="(000) 000-0000"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">
                    Email Address
                  </label>
                  <input
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setQuoteSaved(false);
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
            </section>

            {/* STEP 2: PACKAGE & FOOTAGE */}
            <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">
                  2
                </div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Package size={20} className="text-indigo-500" /> Package &
                  Footage
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 block">
                    Choose Package
                  </label>
                  <select
                    value={packageType}
                    onChange={(e) => {
                      setPackageType(e.target.value as any);
                      setQuoteSaved(false);
                    }}
                    className="w-full p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl font-bold text-indigo-900 outline-none"
                  >
                    <option value="value">Value (Above Ground)</option>
                    <option value="premium_underground">
                      Premium Underground
                    </option>
                  </select>
                  <p className="text-[10px] text-slate-400 font-bold italic px-2 tracking-tight">
                    Included: 15 ft gas + 15 ft electrical
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">
                      Gas (ft)
                    </label>
                    <input
                      type="number"
                      value={gasFt}
                      onChange={(e) => {
                        setGasFt(Number(e.target.value));
                        setQuoteSaved(false);
                      }}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">
                      Electrical (ft)
                    </label>
                    <input
                      type="number"
                      value={elecFt}
                      onChange={(e) => {
                        setElecFt(Number(e.target.value));
                        setQuoteSaved(false);
                      }}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div>
                  Gas Rate:{" "}
                  <span className="text-indigo-600">
                    ${PACKAGE_RULES[packageType].gasPerFt}/ft
                  </span>
                </div>
                <div>
                  Electrical Rate:{" "}
                  <span className="text-indigo-600">
                    ${PACKAGE_RULES[packageType].elecPerFt}/ft
                  </span>
                </div>
              </div>
            </section>

            {/* STEP 3: LOADS */}
            <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black">
                  3
                </div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Zap size={20} className="text-emerald-500" /> Essential Loads
                </h3>
              </div>

              <div className="space-y-3">
                {loads.map((l, idx) => (
                  <div
                    key={l.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${l.qty > 0 ? "bg-emerald-50/50 border-emerald-200" : "bg-slate-50 border-transparent hover:border-slate-200"}`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded-lg text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        checked={(l.qty || 0) > 0}
                        onChange={(e) => {
                          setLoads(
                            loads.map((x, i) =>
                              i === idx
                                ? {
                                    ...x,
                                    qty: e.target.checked ? x.qty || 1 : 0,
                                  }
                                : x,
                            ),
                          );
                          setQuoteSaved(false);
                        }}
                      />
                      <div>
                        <div className="text-sm font-black text-slate-800 leading-tight">
                          {l.label}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">
                          {l.watts} Watts
                        </div>
                      </div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={l.qty || 0}
                      onChange={(e) => {
                        setLoads(
                          loads.map((x, i) =>
                            i === idx
                              ? { ...x, qty: Number(e.target.value) }
                              : x,
                          ),
                        );
                        setQuoteSaved(false);
                      }}
                      className="w-16 p-2 bg-white border border-slate-200 rounded-xl font-black text-center text-slate-700 outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* Load Management */}
              <div className="mt-8 p-6 bg-slate-900 rounded-4xl text-white">
                <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
                  <div>
                    <h4 className="font-black flex items-center gap-2">
                      <Activity size={18} className="text-emerald-400" /> Load
                      Management
                    </h4>
                    <p className="text-xs text-slate-400 font-medium">
                      Add shedding modules for high-wattage appliances.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase text-slate-500">
                      Qty:
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={selectedLoadShedCount}
                      onChange={(e) => {
                        setSelectedLoadShedCount(Number(e.target.value));
                        setQuoteSaved(false);
                      }}
                      className="w-20 p-3 bg-slate-800 border border-slate-700 rounded-xl font-black text-center text-emerald-400 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* STEP 4: PHOTOS */}
            <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-black">
                  4
                </div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <ImageIcon size={20} className="text-amber-500" /> Site
                  Documentation
                </h3>
              </div>
              <PhotoUploader
                photos={photos}
                setPhotos={setPhotosAndMarkDirty}
                max={10}
              />
            </section>

            {/* STEP 5: PREVIEW & FINAL ACTIONS */}
            <section className="bg-slate-900 p-2 md:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-20 z-0" />

              <div className="relative z-10 space-y-8">
                <div className="flex justify-between items-center px-4 md:px-0">
                  <h3 className="text-2xl font-black text-white">
                    Proposal Review
                  </h3>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Grand Total
                    </p>
                    <p className="text-3xl font-black text-emerald-400">
                      $
                      {pricing.total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                {/* PROPOSAL PREVIEW CARD */}
                <div
                  className="bg-white rounded-4xl overflow-hidden"
                  ref={proposalRef}
                >
                  <div className="p-8 border-b border-slate-100 flex justify-between items-start">
                    <div className="flex gap-4 items-center">
                      <img
                        src={settings?.company?.logoUrl ?? "/logo.jpeg"}
                        alt="logo"
                        className="w-24 h-12 object-contain"
                      />
                      <div className="hidden sm:block">
                        <p className="font-black text-slate-900 leading-tight">
                          GarSan Plumbing Services LLC
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                          {settings?.company?.address ?? "Texas, USA"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-400 uppercase italic">
                        {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest border-b border-slate-100 pb-1">
                          Prepared For
                        </p>
                        <p className="font-black text-slate-800 text-lg leading-tight">
                          {customerName || "Customer Name"}
                        </p>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                          {address || "Installation Address"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest border-b border-slate-100 pb-1">
                          Recommended Unit
                        </p>
                        <p className="font-black text-blue-600 text-lg leading-tight">
                          {recommendedKw} kW — {brand}
                        </p>
                        <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-tighter">
                          {packageType.replace("_", " ")} Package
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Scope of Work & Financials
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between font-bold text-slate-700">
                          <span>Main Generator Unit ({recommendedKw}kW)</span>
                          <span>${pricing.basePrice?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-400 text-xs font-medium italic">
                          <span>
                            Standard Installation (Included 15ft Gas/Elec)
                          </span>
                          <span>$0.00</span>
                        </div>

                        {gasFt > 15 && (
                          <div className="flex justify-between text-slate-600 text-sm font-bold">
                            <span>Additional Gas Piping ({gasFt - 15}ft)</span>
                            <span>
                              $
                              {(
                                (gasFt - 15) *
                                PACKAGE_RULES[packageType].gasPerFt
                              ).toFixed(2)}
                            </span>
                          </div>
                        )}

                        {elecFt > 15 && (
                          <div className="flex justify-between text-slate-600 text-sm font-bold">
                            <span>Additional Electrical ({elecFt - 15}ft)</span>
                            <span>
                              $
                              {(
                                (elecFt - 15) *
                                PACKAGE_RULES[packageType].elecPerFt
                              ).toFixed(2)}
                            </span>
                          </div>
                        )}

                        {selectedLoadShedCount > 0 && (
                          <div className="flex justify-between text-slate-600 text-sm font-bold">
                            <span>
                              Load Management Modules ({selectedLoadShedCount})
                            </span>
                            <span>${pricing.loadShedPrice.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-8 p-6 bg-slate-50 rounded-2xl flex justify-between items-center">
                      <span className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                        Investment Total
                      </span>
                      <span className="text-3xl font-black text-slate-900">
                        ${pricing.total.toFixed(2)}
                      </span>
                    </div>

                    <div className="pt-4 space-y-2">
                      <p className="text-[9px] font-medium text-slate-400 leading-relaxed italic">
                        * Gas meter upgrades are performed by the utility
                        provider; costs vary and are coordinated by the
                        homeowner.
                      </p>
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                        Regulated by Texas State Board of Plumbing Examiners
                        (TSBPE), 7915 Cameron Rd, Austin, TX 78754
                      </p>
                    </div>
                  </div>
                </div>

                {/* FINAL BUTTONS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                  <button
                    onClick={onSaveQuote}
                    className="flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95"
                  >
                    <ShieldCheck size={20} /> {loading ? "Saving..." : quoteSaved ? "Quote Saved" : "Save Quote"}
                  </button>

                  <button
                    onClick={onGeneratePdf}
                    disabled={!quoteSaved}
                    className={`flex items-center justify-center gap-2 py-4 font-black rounded-2xl shadow-xl transition-all active:scale-95 ${
                      quoteSaved
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                    }`}
                  >
                    <Share2 size={20} />{" "}
                    {quoteSaved ? "Share Proposal" : "Save First"}
                  </button>

                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl transition-all"
                  >
                    <RefreshCcw size={20} /> Reset Form
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
