/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import {
  Users,
  Settings,
  FileJson,
  Download,
  Plus,
  Trash2,
  Edit3,
  X,
  Save,
  DollarSign,
  Activity,
  Lock,
  PlusCircle,
  Mail,
  Phone,
  MapPin,
  Zap,
  Image as ImageIcon,
} from "lucide-react";
import {
  fetchQuotes,
  fetchTechs,
  addTech,
  deleteTech,
  fetchSettings,
  saveSettings,
  setAdminPin,
  updateGeneratorPricing,
  updateLoadShedLadder,
  updateTechPin,
} from "../../lib/api";
import { getAllQuotesLocal } from "../../lib/storage";

export default function AdminPage() {
  const [auth, setAuth] = useState(false);
  const [pin, setPin] = useState("");
  const [quotes, setQuotes] = useState<any[]>(() => getAllQuotesLocal());
  const [techs, setTechs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [displayLimit, setDisplayLimit] = useState(6);

  // Modal States
  const [activeModal, setActiveModal] = useState<"loadShed" | "pricing" | null>(
    null,
  );
  const [modalData, setModalData] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  useEffect(() => {
    const load = async () => {
      try {
        const t = await fetchTechs();
        setTechs(t);
        const s = await fetchSettings();
        setSettings(s);
      } catch (err) {
        console.error("Load failed", err);
      }
    };
    load();
  }, []);

  // --- Auth & Original Functions (Keeping exactly as provided) ---
  const tryAuth = () => {
    if (!settings) return alert("Settings not loaded yet");
    if (pin === settings.masterPin) {
      setAdminPin(pin);
      setAuth(true);
    } else {
      alert("Invalid admin PIN");
    }
  };

  const refreshQuotes = async () => {
    const q = await fetchQuotes().catch(() => getAllQuotesLocal());
    setQuotes(q);
  };

  useEffect(() => {
    if (auth) refreshQuotes();
  }, [auth]);

  const handleAddTech = async () => {
    const name = prompt("Tech name");
    const pin = prompt("4-digit PIN");
    if (!name || !pin) return;
    try {
      const tech = await addTech(name, pin);
      setTechs((prev) => [...prev, tech]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const removeTech = async (name: string) => {
    if (!confirm("Remove tech?")) return;
    try {
      await deleteTech(name);
      setTechs((prev) => prev.filter((t) => t.name !== name));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const updateMasterPin = () => {
    const next = prompt("New master PIN (4 digits)", settings.masterPin);
    if (!next) return;
    const s = { ...settings, masterPin: next };
    saveSettings(s).then(() => setSettings(s));
  };

  const exportQuotes = () => {
    const blob = new Blob([JSON.stringify(quotes, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quotes-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const editCompany = () => {
    const name = prompt("Company name", settings?.company?.name);
    const address = prompt("Company address", settings?.company?.address);
    const phone = prompt("Company phone", settings?.company?.phone);
    const logoUrl = prompt("Logo URL", settings?.company?.logoUrl);
    if (!name) return;
    const s = { ...settings, company: { name, address, phone, logoUrl } };
    saveSettings(s).then(() => setSettings(s));
  };

  const openModal = (type: "loadShed" | "pricing") => {
    setActiveModal(type);
    setModalData(
      type === "pricing"
        ? [...(settings?.generatorPricing || [])]
        : [...(settings?.loadShedLadder || [])],
    );
  };

  const handleModalInputChange = (index: number, field: string, value: any) => {
    const newData = [...modalData];
    newData[index] = { ...newData[index], [field]: Number(value) };
    setModalData(newData);
  };

  const addNewRow = () => {
    if (activeModal === "pricing") {
      setModalData([...modalData, { kw: 0, basePrice: 0, installPrice: 0 }]);
    } else {
      setModalData([...modalData, { min: 0, max: 0, price: 0 }]);
    }
  };

  const removeRow = (index: number) => {
    setModalData(modalData.filter((_, i) => i !== index));
  };

  const saveModalData = async () => {
    try {
      if (activeModal === "pricing") {
        const updated = await updateGeneratorPricing(modalData);
        setSettings({ ...settings, generatorPricing: updated });
      } else {
        const updated = await updateLoadShedLadder(modalData);
        setSettings({ ...settings, loadShedLadder: updated });
      }
      alert("Updated successfully!");
      setActiveModal(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!auth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Header />
        <main className="grow flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 text-center">
            <div className="w-20 h-20 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3 shadow-lg">
              <Lock size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">
              Admin Portal
            </h2>
            <p className="text-slate-500 mb-8 font-medium">
              Please enter your master PIN
            </p>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full text-center text-3xl tracking-[1rem] p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-0 transition-all outline-none mb-4"
            />
            <button
              onClick={tryAuth}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 transition-all"
            >
              Unlock System
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-20">
      <Header />

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Actions Bar (Activity, Pricing, Export) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-slate-500 font-medium">
              Control center for GarSan Plumbing
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => openModal("loadShed")}
              className="bg-white hover:bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-xl font-bold border-2 border-indigo-100 flex items-center gap-2 transition-all shadow-sm"
            >
              <Activity size={18} /> Load Shed
            </button>
            <button
              onClick={() => openModal("pricing")}
              className="bg-white hover:bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-xl font-bold border-2 border-emerald-100 flex items-center gap-2 transition-all shadow-sm"
            >
              <DollarSign size={18} /> Pricing
            </button>
            <button
              onClick={exportQuotes}
              className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-slate-200"
            >
              <Download size={18} /> Export Data
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: Company & Techs */}
          <div className="lg:col-span-4 space-y-8">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full z-0 opacity-50" />
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                    <Settings size={20} className="text-blue-500" /> Company
                    Info
                  </h3>
                  <button
                    onClick={editCompany}
                    className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
                <div className="flex flex-col items-center mb-6 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <img
                    src={settings?.company?.logoUrl}
                    alt="logo"
                    className="h-12 object-contain mb-3"
                  />
                  <span className="text-lg font-black text-slate-800 text-center">
                    {settings?.company?.name}
                  </span>
                </div>
                <button
                  onClick={updateMasterPin}
                  className="w-full py-3 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Change Master PIN
                </button>
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                  <Users size={20} className="text-blue-500" /> Technicians
                </h3>
                <button
                  onClick={handleAddTech}
                  className="p-2 bg-blue-600 text-white rounded-xl shadow-lg"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="space-y-3">
                {techs.map((t) => (
                  <div
                    key={t.name}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group border border-transparent hover:border-blue-200 transition-all"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{t.name}</p>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-400 font-mono uppercase">
                        PIN: {t.pin}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* UPDATE PIN BUTTON */}
                      <button
                        onClick={async () => {
                          const nextPin = prompt(
                            `Enter new 4-digit PIN for ${t.name}`,
                            t.pin,
                          );
                          if (!nextPin || nextPin === t.pin) return;

                          try {
                            // Using the new API function
                            const updatedTech = await updateTechPin(
                              t.name,
                              nextPin,
                            );

                            // Update local state
                            setTechs((prev) =>
                              prev.map((tech) =>
                                tech.name === t.name ? updatedTech : tech,
                              ),
                            );
                            alert("PIN updated successfully");
                          } catch (err: any) {
                            alert(err.message || "Update failed");
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                        title="Update PIN"
                      >
                        <Edit3 size={18} />
                      </button>

                      {/* DELETE BUTTON */}
                      <button
                        onClick={() => removeTech(t.name)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT: Clickable Quotes List */}
          <div className="lg:col-span-8">
            <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 min-h-full">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xl">
                  <FileJson size={24} className="text-blue-500" /> Recent Quotes
                </h3>
                <span className="bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-sm font-bold">
                  {quotes.length} Total
                </span>
              </div>

              <div className="space-y-4">
                {quotes.length === 0 && (
                  <div className="py-20 text-center text-slate-400 font-medium italic">
                    No quotes recorded yet.
                  </div>
                )}

                {/* Use .slice() to only show the number of items currently allowed by displayLimit */}
                {quotes.slice(0, displayLimit).map((q) => (
                  <div
                    key={q._id?.$oid || q.date?.$date || q.date}
                    onClick={() => setSelectedQuote(q)}
                    className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-blue-400 hover:bg-white transition-all cursor-pointer group"
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-black text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                          {q.customerName || "No Name"}
                        </h4>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                          <span>
                            {q.date?.$date
                              ? new Date(q.date.$date).toLocaleDateString()
                              : new Date(q.date).toLocaleDateString()}
                          </span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full" />
                          <span className="text-blue-500">Tech: {q.tech}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-2xl font-black text-emerald-600">
                          ${q.pricing?.total?.toLocaleString() || "0"}
                        </div>
                        <div className="flex gap-1 mt-1 font-black uppercase text-[10px]">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                            {q.recommendedKw}kW
                          </span>
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                            {q.brand}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Show More Button logic */}
                {/* Show More / Show Less Buttons */}
                {quotes.length > 6 && (
                  <div className="pt-6 flex flex-wrap justify-center gap-4">
                    {/* Show More Button - Visible if there are more quotes to show */}
                    {quotes.length > displayLimit && (
                      <button
                        onClick={() => setDisplayLimit((prev) => prev + 6)}
                        className="px-8 py-3 bg-white border-2 border-slate-100 text-slate-600 font-bold rounded-xl hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                      >
                        <Plus size={18} />
                        Show More ({quotes.length - displayLimit} remaining)
                      </button>
                    )}

                    {/* Show Less Button - Visible if we have expanded the list */}
                    {displayLimit > 6 && (
                      <button
                        onClick={() => setDisplayLimit(6)}
                        className="px-8 py-3 bg-slate-50 border-2 border-transparent text-slate-500 font-bold rounded-xl hover:bg-slate-100 hover:text-slate-700 transition-all active:scale-95 flex items-center gap-2"
                      >
                        <X size={18} />
                        Show Less
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* --- MODAL: QUOTE DETAILS --- */}
      {selectedQuote && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <FileJson size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">
                    {selectedQuote.customerName}
                  </h2>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">
                    Quote ID:{" "}
                    {selectedQuote?._id?.$oid?.slice(-6).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedQuote(null)}
                className="p-3 hover:bg-slate-200 rounded-full transition-all"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-8">
              {/* Top Grid: Info & Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">
                    Customer Info
                  </h3>
                  <div className="space-y-2 text-slate-600 font-medium text-sm">
                    <p className="flex items-center gap-2">
                      <Mail size={16} className="text-blue-500" />{" "}
                      {selectedQuote.email || "N/A"}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone size={16} className="text-blue-500" />{" "}
                      {selectedQuote.phone || "N/A"}
                    </p>
                    <p className="flex items-start gap-2">
                      <MapPin size={16} className="text-blue-500 shrink-0" />{" "}
                      {selectedQuote.address || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">
                    Technical Specs
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Size
                      </p>
                      <p className="font-black text-slate-800">
                        {selectedQuote.recommendedKw}kW
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Brand
                      </p>
                      <p className="font-black text-slate-800">
                        {selectedQuote.brand}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Gas Line
                      </p>
                      <p className="font-black text-slate-800">
                        {selectedQuote.gasFt} ft
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Elec Line
                      </p>
                      <p className="font-black text-slate-800">
                        {selectedQuote.elecFt} ft
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-100 flex flex-col justify-between">
                  <h3 className="text-xs font-black text-blue-200 uppercase tracking-widest">
                    Total Investment
                  </h3>
                  <div>
                    <div className="text-4xl font-black">
                      ${selectedQuote.pricing?.total?.toLocaleString()}
                    </div>
                    <p className="text-[10px] font-bold text-blue-200 uppercase mt-1">
                      Package: {selectedQuote.packageType?.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Middle Section: Loads & Photos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Loads Table */}
                <div className="space-y-4">
                  <h3 className="font-black text-slate-800 flex items-center gap-2">
                    <Zap className="text-yellow-500" /> Selected Loads
                  </h3>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                        <tr>
                          <th className="p-4">Load Description</th>
                          <th className="p-4 text-center">Qty</th>
                          <th className="p-4 text-right">Watts</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-bold text-slate-600 divide-y divide-slate-50">
                        {selectedQuote.loads
                          ?.filter((l: any) => l.qty > 0)
                          .map((load: any, i: number) => (
                            <tr key={i}>
                              <td className="p-4">{load.label}</td>
                              <td className="p-4 text-center bg-blue-50/30 text-blue-600">
                                {load.qty}
                              </td>
                              <td className="p-4 text-right">
                                {load.watts * load.qty}W
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Job Site Photos */}
                <div className="space-y-4">
                  <h3 className="font-black text-slate-800 flex items-center gap-2">
                    <ImageIcon className="text-blue-500" /> Site Documentation
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedQuote.photos?.map((photo: any, i: number) => (
                      <div
                        key={i}
                        className="relative group rounded-2xl overflow-hidden border border-slate-100 aspect-video bg-slate-100"
                      >
                        <img
                          src={photo.dataUrl || photo.url}
                          alt={photo.category}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50 text-white text-[10px] font-black uppercase tracking-widest text-center backdrop-blur-sm">
                          {photo.category}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-end gap-4">
              {/* <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all">
                    <Download size={18} /> Download PDF
                </button> */}
              <button
                onClick={() => setSelectedQuote(null)}
                className="px-10 py-3 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-900 transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIG MODALS (LoadShed / Pricing) --- */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-800">
                  {activeModal === "pricing"
                    ? "Generator Pricing"
                    : "Load Shed Ladder"}
                </h2>
                <p className="text-sm font-medium text-slate-500">
                  Manage list items and values
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-4">
              {modalData.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="p-5 border-2 border-slate-100 rounded-2xl flex items-end gap-3 bg-slate-50/30 group"
                >
                  <div className="grow grid grid-cols-3 gap-3">
                    {activeModal === "pricing" ? (
                      <>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-tighter">
                            kW Size
                          </label>
                          <input
                            type="number"
                            value={item.kw}
                            onChange={(e) =>
                              handleModalInputChange(idx, "kw", e.target.value)
                            }
                            className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-tighter">
                            Base Price
                          </label>
                          <input
                            type="number"
                            value={item.basePrice}
                            onChange={(e) =>
                              handleModalInputChange(
                                idx,
                                "basePrice",
                                e.target.value,
                              )
                            }
                            className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-tighter">
                            Install Price
                          </label>
                          <input
                            type="number"
                            value={item.installPrice}
                            onChange={(e) =>
                              handleModalInputChange(
                                idx,
                                "installPrice",
                                e.target.value,
                              )
                            }
                            className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:border-emerald-500"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-tighter">
                            Min Units
                          </label>
                          <input
                            type="number"
                            value={item.min}
                            onChange={(e) =>
                              handleModalInputChange(idx, "min", e.target.value)
                            }
                            className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-tighter">
                            Max Units
                          </label>
                          <input
                            type="number"
                            value={item.max}
                            onChange={(e) =>
                              handleModalInputChange(idx, "max", e.target.value)
                            }
                            className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-tighter">
                            Price ($)
                          </label>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) =>
                              handleModalInputChange(
                                idx,
                                "price",
                                e.target.value,
                              )
                            }
                            className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:border-indigo-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => removeRow(idx)}
                    className="p-3 text-red-400 hover:text-red-600 transition-all mb-0.5"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              <button
                onClick={addNewRow}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold flex items-center justify-center gap-2 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all"
              >
                <PlusCircle size={20} /> Add New Entry
              </button>
            </div>

            <div className="p-8 border-t border-slate-100 flex justify-end gap-4 bg-white">
              <button
                onClick={() => setActiveModal(null)}
                className="px-6 py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveModalData}
                className="flex items-center gap-2 px-10 py-3 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
              >
                <Save size={20} /> Update Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
