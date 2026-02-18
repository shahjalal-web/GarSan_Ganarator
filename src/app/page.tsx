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
  ShieldCheck,
  Share2,
  LogIn,
  RefreshCcw,
  Activity,
  CheckCircle2,
} from "lucide-react";
import {
  chooseGeneratorKw,
  calcQuoteTotal,
  calcExtraFootage,
  calcLoadShedPrice,
  GeneratorBrand,
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
  console.log(settings);
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

  // --- Customer Info ---
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // --- Brand & Sizing (Spec 1 & 2) ---
  const [brand, setBrand] = useState<GeneratorBrand>("Generac");
  const [acCount, setAcCount] = useState<number>(0);
  const [majorLoads, setMajorLoads] = useState([
    { id: "range", label: "Electric range/oven", checked: false },
    { id: "dryer", label: "Electric dryer", checked: false },
    { id: "water_heater", label: "Electric water heater", checked: false },
    { id: "pool", label: "Pool pump", checked: false },
    { id: "well", label: "Well pump", checked: false },
    { id: "ev", label: "EV charger", checked: false },
  ]);
  const [otherLoadNotes, setOtherLoadNotes] = useState("");

  // --- Package & Footage ---
  const [packageType, setPackageType] = useState<
    "value" | "premium_underground"
  >("value");
  const [gasFt, setGasFt] = useState<number>(15);
  const [elecFt, setElecFt] = useState<number>(15);

  // --- Load Management & Gas Upgrade (Spec 8 & 9) ---
  const [loadShedCount, setLoadShedCount] = useState(0);
  const [gasMeterUpgrade, setGasMeterUpgrade] = useState(false);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [quoteSaved, setQuoteSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const setPhotosAndMarkDirty = (p: PhotoItem[]) => {
    setPhotos(p);
    setQuoteSaved(false);
  };

  const onAuth = async () => {
    try {
      await loginTech(authName, pin);
      setIsAuthenticated(true);
    } catch {
      alert("Invalid tech or PIN");
    }
  };

  // Logic based on Client Specs
  const totalPoints = majorLoads.filter((l) => l.checked).length;
  const recommendedKw = chooseGeneratorKw(
    acCount,
    totalPoints,
    brand,
    settings,
  );

  const pricing = calcQuoteTotal({
    brand,
    kw: recommendedKw,
    packageType,
    gasFt,
    elecFt,
    loadShedCount,
    settings,
  });

  // --- Save Quote Logic ---
  async function onSaveQuote() {
    if (!isAuthenticated) return alert("Please log in with your tech PIN");

    if (!customerName || !address || !phone) {
      alert("Please fill in Name, Address, and Phone Number.");
      return;
    }

    if (!photos || photos.length === 0) {
      alert(
        "Please upload at least one site photo documentation before saving.",
      );
      return;
    }

    setLoading(true);

    const quote: any = {
      tech: authName,
      customerName,
      address,
      phone,
      email,
      date: new Date().toISOString(),
      brand,
      recommendedKw,
      acCount,
      totalPoints,
      majorLoads,
      otherLoadNotes,
      packageType,
      gasFt,
      elecFt,
      loadShedCount,
      gasMeterUpgrade,
      pricing,
      photos: [],
    };

    try {
      // -------- Upload to Cloudinary ----------
      const uploadResults = await Promise.all(
        photos.map(async (p) => {
          if (!p.file) return null;

          const result = await uploadImageToCloudinary(p.file);

          return {
            public_id: result.public_id,
            url: result.url,
            category: p.category || "",
          };
        }),
      );

      // remove nulls
      quote.photos = uploadResults.filter(Boolean);

      // -------- Save Quote ----------
      await saveQuote(quote);

      setQuoteSaved(true);
      alert("Quote saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save quote or upload photos");
    } finally {
      setLoading(false);
    }
  }

  // --- PDF Generation Logic (Spec 10) ---
  async function onGeneratePdf() {
    if (!quoteSaved) return alert("Save the quote first.");

    const generateStructuredPdf = async () => {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      const pageWidth = pdf.internal.pageSize.getWidth();
      let y = 40;

      const formatCurrency = (n: number) =>
        `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

      // --- Helper to Load Images ---
      async function getLogoData(url: string): Promise<string | null> {
        try {
          const response = await fetch(url);
          if (!response.ok) return null;
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          return null;
        }
      }

      // 1. Header
      const logoUrl = settings?.company?.logoUrl ?? "/logo.jpeg";
      const logoData = await getLogoData(logoUrl);
      if (logoData) pdf.addImage(logoData, "JPEG", margin, y, 100, 40);

      pdf.setFontSize(10);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont("helvetica", "bold");
      pdf.text("GARSAN PLUMBING SERVICES LLC", pageWidth - margin, y + 10, {
        align: "right",
      });
      pdf.setFont("helvetica", "normal");
      pdf.text(
        settings?.company?.address ?? "Texas, USA",
        pageWidth - margin,
        y + 22,
        { align: "right" },
      );
      pdf.text(settings?.company?.phone ?? "", pageWidth - margin, y + 34, {
        align: "right",
      });
      y += 70;

      // 2. Title Banner
      pdf.setFillColor(30, 41, 59);
      pdf.rect(0, y, pageWidth, 40, "F");
      pdf.setTextColor(255);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("GENERATOR INSTALLATION PROPOSAL", margin, y + 25);
      pdf.setFontSize(10);
      pdf.text(
        `DATE: ${new Date().toLocaleDateString()}`,
        pageWidth - margin,
        y + 25,
        { align: "right" },
      );
      y += 70;

      // 3. Info Section
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(11);
      pdf.text("CUSTOMER INFO", margin, y);
      pdf.text("RECOMMENDED GENERATOR", pageWidth / 2 + 20, y);
      y += 15;
      pdf.line(margin, y, margin + 100, y);
      pdf.line(pageWidth / 2 + 20, y, pageWidth / 2 + 150, y);

      y += 20;
      pdf.setTextColor(0);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Name: ${customerName || "Customer Name"}`, margin, y);
      pdf.setTextColor(2, 132, 199);
      pdf.text(`${brand} ${recommendedKw}kW`, pageWidth / 2 + 20, y);

      y += 18;
      pdf.setTextColor(100);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      // কাস্টমার এড্রেস
      pdf.text(`Address: ${address || "Address not provided"}`, margin, y);

      // প্যাকেজ ডিটেইলস (ডান দিকে)
      pdf.text(
        `Package: ${packageType === "value" ? "Value" : "Premium Underground"}`,
        pageWidth / 2 + 20,
        y,
      );

      // ফোন নাম্বার যোগ করা
      if (phone) {
        y += 15;
        pdf.text(`Phone: ${phone}`, margin, y);
      }

      // ইমেইল যোগ করা
      if (email) {
        y += 15;
        pdf.text(`Email: ${email}`, margin, y);
      }

      // সেকশন শেষ হওয়ার পর গ্যাপ অ্যাডজাস্টমেন্ট
      y += 45;

      // 4. Detailed Line Items Table
      pdf.setFillColor(241, 245, 249);
      pdf.rect(margin, y, pageWidth - margin * 2, 25, "F");
      pdf.setTextColor(30, 41, 59);
      pdf.setFont("helvetica", "bold");
      pdf.text("DESCRIPTION", margin + 10, y + 17);
      pdf.text("AMOUNT", pageWidth - margin - 10, y + 17, { align: "right" });
      y += 40;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0);

      // --- Line Item Logic ---
      const items = [
        {
          desc: `${brand} Base Price (${recommendedKw}kW) - Inc. 15ft Gas/Elec`,
          price: pricing.basePrice,
        },
      ];

      if (packageType === "premium_underground") {
        items.push({
          desc: "Premium Underground Upgrade Fee",
          price: pricing.premiumUpgradeAmount,
        });
      }

      // Extra Gas Details
      if (pricing.gasCharge > 0) {
        const extraFt = gasFt - 15;
        const rate =
          packageType === "value"
            ? settings?.footageRates?.valueGas
            : settings?.footageRates?.premiumGas;
        items.push({
          desc: `Extra Gas Line: ${extraFt}ft @ $${rate}/ft`,
          price: pricing.gasCharge,
        });
      }

      // Extra Electrical Details
      if (pricing.elecCharge > 0) {
        const extraFt = elecFt - 15;
        const rate =
          packageType === "value"
            ? settings?.footageRates?.valueElec
            : settings?.footageRates?.premiumElec;
        items.push({
          desc: `Extra Electrical Line: ${extraFt}ft @ $${rate}/ft`,
          price: pricing.elecCharge,
        });
      }

      if (pricing.loadShedPrice > 0) {
        items.push({
          desc: `Load Management System (Add-on)`,
          price: pricing.loadShedPrice,
        });
      }

      items.forEach((item) => {
        pdf.text(item.desc, margin + 10, y);
        pdf.text(formatCurrency(item.price), pageWidth - margin - 10, y, {
          align: "right",
        });
        y += 20;
      });

      // 5. Grand Total
      y += 20;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 30;
      pdf.setFillColor(30, 41, 59);
      pdf.rect(pageWidth / 2, y - 20, pageWidth / 2 - margin, 40, "F");
      pdf.setTextColor(255);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("TOTAL INVESTMENT", pageWidth / 2 + 15, y + 5);
      pdf.text(formatCurrency(pricing.total), pageWidth - margin - 15, y + 5, {
        align: "right",
      });

      // 6. Footer Note
      y += 60;
      if (gasMeterUpgrade) {
        pdf.setTextColor(0);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text(
          "Gas utility upgrade: by gas provider (cost varies; customer to coordinate)",
          margin,
          y,
        );
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text(
        "Regulated by Texas State Board of Plumbing Examiners (TSBPE), 7915 Cameron Rd, Austin, TX 78754.",
        pageWidth / 2,
        820,
        { align: "center" },
      );

      return pdf;
    };

    try {
      const pdf = await generateStructuredPdf();
      const fileName = `Proposal_${(customerName || "Customer").replace(/\s+/g, "_")}.pdf`;
      pdf.save(fileName);
      alert("Proposal downloaded! You can now share it manually.");
    } catch (err) {
      alert("Could not download the PDF proposal.");
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        {!isAuthenticated ? (
          <div className="flex justify-center items-center py-20">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl w-full max-w-md text-center">
              <LogIn size={32} className="mx-auto mb-6 text-blue-600" />
              <h2 className="text-2xl font-black mb-6">Technician Sign-in</h2>

              <select
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                className="w-full p-4 bg-slate-50 border rounded-2xl mb-4 font-bold"
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
                placeholder="PIN"
                className="w-full p-4 bg-slate-50 border rounded-2xl mb-4 text-center font-bold tracking-widest"
              />

              <div className="space-y-3">
                <button
                  onClick={onAuth}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-95"
                >
                  Start Estimating
                </button>

                {/* Admin Page Button */}
                <a
                  href="/admin"
                  className="block w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all border border-slate-200"
                >
                  Go to Admin Panel
                </a>
              </div>

              <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                GarSan Plumbing Services LLC
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 pb-20">
            {/* Spec 1: Brand Selection */}
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-slate-800">
                <Package className="text-blue-500" /> 1. Brand Selection
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {["Generac", "Kohler"].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBrand(b as any)}
                    className={`p-4 rounded-2xl font-black border-2 transition-all ${brand === b ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-100 bg-slate-50 text-slate-400"}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </section>

            {/* Customer Details */}
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <User className="text-blue-500" /> Customer Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="p-4 bg-slate-50 border rounded-2xl font-bold focus:border-blue-500 outline-none transition-all"
                    placeholder="Customer Name"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="p-4 bg-slate-50 border rounded-2xl font-bold focus:border-blue-500 outline-none transition-all"
                    placeholder="Address"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="p-4 bg-slate-50 border rounded-2xl font-bold focus:border-blue-500 outline-none transition-all"
                    placeholder="Phone Number"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="p-4 bg-slate-50 border rounded-2xl font-bold focus:border-blue-500 outline-none transition-all"
                    placeholder="Email"
                  />
                </div>
              </div>
            </section>

            {/* Spec 2: Sizing Recommendation */}
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-slate-800">
                <Zap className="text-emerald-500" /> 2. Sizing Recommendation
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase mb-2 block">
                    Number of A/C Units
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((n) => (
                      <button
                        key={n}
                        onClick={() => setAcCount(n)}
                        className={`p-3 rounded-xl font-bold border ${acCount === n ? "bg-emerald-600 text-white" : "bg-slate-50"}`}
                      >
                        {n === 3 ? "3+" : n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase mb-2 block">
                    Major Load Toggles
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {majorLoads.map((load, idx) => (
                      <button
                        key={load.id}
                        onClick={() => {
                          const nl = [...majorLoads];
                          nl[idx].checked = !nl[idx].checked;
                          setMajorLoads(nl);
                        }}
                        className={`flex justify-between p-4 rounded-xl border ${load.checked ? "bg-emerald-50 border-emerald-500" : "bg-slate-50"}`}
                      >
                        <span className="font-bold text-sm">{load.label}</span>
                        {load.checked && (
                          <CheckCircle2
                            size={18}
                            className="text-emerald-500"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-blue-900 rounded-2xl text-white flex justify-between">
                  <div>
                    <p className="text-[10px] font-bold opacity-70">
                      RECOMMENDED SIZE
                    </p>
                    <p className="text-xl font-black">
                      {recommendedKw} kW {brand}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold opacity-70">WHY</p>
                    <p className="text-xs">
                      {acCount} AC + {totalPoints} Load Points
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Spec 3, 6, 7: Package & Footage */}
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-indigo-600">
                <Package /> 3. Installation Footage
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Package Selection */}
                <div className="flex flex-col justify-center">
                  <label className="text-xs font-black text-slate-400 uppercase mb-2 block ml-1">
                    Select Installation Type
                  </label>
                  <select
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value as any)}
                    className="p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl font-black text-indigo-700 outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="value">Value (Above Ground)</option>
                    <option value="premium_underground">
                      Premium Underground
                    </option>
                  </select>
                </div>

                {/* Footage Inputs */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Gas Line */}
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block ml-1">
                      Gas Line (Included: 15ft)
                    </label>
                    <input
                      type="number"
                      value={gasFt}
                      onChange={(e) => setGasFt(Number(e.target.value))}
                      className="w-full p-4 bg-slate-50 border rounded-2xl font-bold focus:bg-white transition-all outline-none focus:border-blue-500"
                      placeholder="Gas ft"
                    />
                    <p className="text-[10px] font-bold text-slate-400 mt-2 ml-1">
                      Extra rate:{" "}
                      <span className="text-indigo-600">
                        $
                        {packageType === "value"
                          ? settings?.footageRates?.valueGas
                          : settings?.footageRates?.premiumGas}
                        /ft
                      </span>
                    </p>
                  </div>

                  {/* Electrical Line */}
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block ml-1">
                      Electrical (Included: 15ft)
                    </label>
                    <input
                      type="number"
                      value={elecFt}
                      onChange={(e) => setElecFt(Number(e.target.value))}
                      className="w-full p-4 bg-slate-50 border rounded-2xl font-bold focus:bg-white transition-all outline-none focus:border-blue-500"
                      placeholder="Elec ft"
                    />
                    <p className="text-[10px] font-bold text-slate-400 mt-2 ml-1">
                      Extra rate:{" "}
                      <span className="text-indigo-600">
                        $
                        {packageType === "value"
                          ? settings?.footageRates?.valueElec
                          : settings?.footageRates?.premiumElec}
                        /ft
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Spec 8: Load Management */}
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-slate-800">
                <Activity /> 4. Load Management
              </h2>
              <div className="flex items-center gap-4 p-4 bg-slate-900 rounded-2xl text-white">
                <p className="flex-1 text-sm">Number of managed loads:</p>
                <input
                  type="number"
                  value={loadShedCount}
                  onChange={(e) => setLoadShedCount(Number(e.target.value))}
                  className="w-20 p-2 bg-slate-800 border-none rounded-lg text-center font-bold"
                />
              </div>
            </section>

            {/* Spec 9: Gas Meter */}
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border">
              <h2 className="text-xl font-black mb-4">5. Gas Meter Upgrade?</h2>
              <button
                onClick={() => setGasMeterUpgrade(!gasMeterUpgrade)}
                className={`w-full p-4 rounded-2xl font-black transition-all ${gasMeterUpgrade ? "bg-amber-500 text-white" : "bg-slate-100"}`}
              >
                {gasMeterUpgrade ? "YES - Upgrade Recommended" : "NO"}
              </button>
            </section>

            {/* Spec 11: Photos */}
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <ImageIcon /> 6. Photos (Up to 10)
              </h2>
              <PhotoUploader
                photos={photos}
                setPhotos={setPhotosAndMarkDirty}
                max={10}
              />
            </section>

            {/* Final Actions */}
            <section className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl text-white">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black">Total Investment</h3>
                <p className="text-4xl font-black text-emerald-400">
                  ${pricing.total.toLocaleString()}
                </p>
              </div>
              {/* FINAL BUTTONS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <button
                  onClick={onSaveQuote}
                  className="flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95"
                >
                  <ShieldCheck size={20} />{" "}
                  {loading
                    ? "Saving..."
                    : quoteSaved
                      ? "Quote Saved"
                      : "Save Quote"}
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
                  <RefreshCcw size={20} className="rotate-180" /> Download PDF
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl transition-all"
                >
                  <RefreshCcw size={20} /> Reset Form
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
