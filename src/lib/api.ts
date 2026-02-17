/* eslint-disable @typescript-eslint/no-explicit-any */

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

/* -------------------------------------------------------------------------- */
/*                             ADMIN PIN STORAGE                              */
/* -------------------------------------------------------------------------- */

let ADMIN_PIN: string | null = null;

// call this after admin enters PIN
export function setAdminPin(pin: string) {
  ADMIN_PIN = pin;
}

// optional logout
export function clearAdminPin() {
  ADMIN_PIN = null;
}

/* -------------------------------------------------------------------------- */
/*                              CORE API HELPER                               */
/* -------------------------------------------------------------------------- */

async function apiFetch(
  path: string,
  options: RequestInit = {},
  requireAdmin = false
): Promise<any> {
  const headers: any = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // attach admin header automatically
  if (requireAdmin) {
    if (!ADMIN_PIN) throw new Error("Admin authentication required");
    headers["x-admin-pin"] = ADMIN_PIN;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let data: any = null;

  try {
    data = await res.json();
  } catch {
    // ignore json error
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "API request failed");
  }

  return data;
}

/* -------------------------------------------------------------------------- */
/*                                 IMAGES                                     */
/* -------------------------------------------------------------------------- */

export async function uploadImageToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset)
    throw new Error("Cloudinary not configured");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: fd }
  );

  const data = await res.json();
  if (!res.ok) throw new Error("Cloudinary upload failed");

  return data.secure_url;
}

export async function uploadImageToBackend(file: File): Promise<string> {
  const toDataUrl = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error("Failed to read file"));
      fr.readAsDataURL(f);
    });

  const base64 = await toDataUrl(file);

  const data = await apiFetch("/upload-image", {
    method: "POST",
    body: JSON.stringify({ base64 }),
  });

  return data.secure_url;
}

/* -------------------------------------------------------------------------- */
/*                                  TECHS                                     */
/* -------------------------------------------------------------------------- */

export async function loginTech(name: string, pin: string) {
  return apiFetch("/techs/login", {
    method: "POST",
    body: JSON.stringify({ name, pin }),
  });
}

export async function fetchTechs() {
  return apiFetch("/techs");
}

// ADMIN ONLY
export async function addTech(name: string, pin: string) {
  return apiFetch(
    "/techs",
    {
      method: "POST",
      body: JSON.stringify({ name, pin }),
    },
    true
  );
}

// ADMIN ONLY
export async function deleteTech(name: string) {
  return apiFetch(
    `/techs/${encodeURIComponent(name)}`,
    { method: "DELETE" },
    true
  );
}

/* -------------------------------------------------------------------------- */
/*                                  QUOTES                                    */
/* -------------------------------------------------------------------------- */

export async function saveQuote(quote: any) {
  return apiFetch("/quotes", {
    method: "POST",
    body: JSON.stringify(quote),
  });
}

export async function fetchQuotes() {
  return apiFetch("/quotes");
}

/* -------------------------------------------------------------------------- */
/*                                 SETTINGS                                   */
/* -------------------------------------------------------------------------- */

export async function fetchSettings() {
  return apiFetch("/settings");
}

// ADMIN ONLY
export async function saveSettings(settings: any) {
  return apiFetch(
    "/settings",
    {
      method: "POST",
      body: JSON.stringify(settings),
    },
    true
  );
}


export async function updateLoadShedLadder(ladder: any[]) {
  return apiFetch(
    "/settings/load-shed",
    {
      method: "PUT",
      body: JSON.stringify({ ladder }),
    },
    true
  );
}

export async function updateGeneratorPricing(pricing: any[]) {
  return apiFetch(
    "/settings/generator-pricing",
    {
      method: "PUT",
      body: JSON.stringify({ pricing }),
    },
    true
  );
}

export async function updateTechPin(name: string, newPin: string) {
  return apiFetch(
    "/techs/update-pin",
    {
      method: "PUT",
      body: JSON.stringify({ name, newPin }),
    },
    true // Assuming true enables admin auth headers
  );
}
