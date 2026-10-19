/* ------------------------------------------------------------------ *
 * Aqua Signature — Inventory: dictionary, language provider and the
 * two brand bits the app needs (Logo, LangSwitch).
 *
 * Self-contained by design. The app shares nothing with the public
 * site, including its language preference: this stores under
 * "aqua_inv_lang", so signing the workshop into Spanish never changes
 * what a visitor sees on aquasignaturerd.com.
 * ------------------------------------------------------------------ */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

const INV_DICT = {
  en: {
    "logo.country": "Dominican Republic",
    "inv.title": "Inventory",
    "inv.sub": "Internal stock control",
    "inv.login.title": "Staff sign in",
    "inv.login.body": "This area is for Aqua Signature staff.",
    "inv.login.pw": "Staff password",
    "inv.login.btn": "Sign in",
    "inv.login.busy": "Signing in…",
    "inv.logout": "Sign out",
    "inv.staff": "Initials",
    "inv.staff.ph": "e.g. AL",
    "inv.staff.hint": "Recorded against every movement you make.",
    "inv.sum.skus": "SKUs",
    "inv.sum.onhand": "Units on hand",
    "inv.sum.reserved": "Reserved",
    "inv.sum.value": "Stock value",
    "inv.sum.needs": "Need production",
    "inv.tab.all": "All",
    "inv.search.ph": "Search code, finish, location…",
    "inv.col.item": "Item",
    "inv.col.code": "Code",
    "inv.col.location": "Location",
    "inv.col.onhand": "On hand",
    "inv.col.reserved": "Res.",
    "inv.col.available": "Avail.",
    "inv.col.reorder": "Reorder",
    "inv.col.value": "Value",
    "inv.col.status": "Status",
    "inv.status.ok": "In stock",
    "inv.status.low": "Low",
    "inv.status.out": "Out",
    "inv.mv.produced": "Produced",
    "inv.mv.delivered": "Delivered",
    "inv.mv.reserve": "Reserve",
    "inv.mv.release": "Release",
    "inv.mv.count": "Count",
    "inv.mv.write_off": "Write off",
    "inv.mv.produced.hint": "Units arriving from the workshop.",
    "inv.mv.delivered.hint": "Shipped to a client. Frees reserved units first.",
    "inv.mv.reserve.hint": "Hold units for an order. Cannot exceed available.",
    "inv.mv.release.hint": "Give reserved units back to available stock.",
    "inv.mv.count.hint": "Set on hand to a physical count. Overwrites, not adds.",
    "inv.mv.write_off.hint": "Damaged, sample or lost units.",
    "inv.panel.movement": "Record movement",
    "inv.panel.qty": "Quantity",
    "inv.panel.ref": "Client / order ref",
    "inv.panel.ref.ph": "Casa de Campo — PO 1182",
    "inv.panel.note": "Note",
    "inv.panel.note.ph": "Optional",
    "inv.panel.record": "Record",
    "inv.panel.busy": "Recording…",
    "inv.panel.edit": "Edit SKU",
    "inv.panel.delete": "Delete",
    "inv.panel.del.ask": "Delete this SKU and its whole movement history?",
    "inv.panel.del.yes": "Yes, delete",
    "inv.panel.del.no": "Keep it",
    "inv.panel.close": "Close",
    "inv.panel.history": "Recent movements",
    "inv.sku.add": "Add SKU",
    "inv.sku.new": "New SKU",
    "inv.sku.edit": "Edit SKU",
    "inv.sku.code": "Code",
    "inv.sku.product": "Product",
    "inv.sku.finish": "Finish",
    "inv.sku.hex": "Swatch hex",
    "inv.sku.location": "Location",
    "inv.sku.price": "List price (RD$)",
    "inv.sku.reorder": "Reorder point",
    "inv.sku.onhand": "Opening on hand",
    "inv.sku.save": "Save",
    "inv.sku.cancel": "Cancel",
    "inv.sku.editnote": "Stock is not edited here — record a movement instead.",
    "inv.log.title": "Movement log",
    "inv.log.all": "All SKUs",
    "inv.log.empty": "No movements yet.",
    "inv.log.qty": "Qty",
    "inv.log.after": "After",
    "inv.log.by": "By",
    "inv.export.stock": "Export stock CSV",
    "inv.export.mov": "Export movements CSV",
    "inv.empty": "No SKUs match.",
    "inv.first.title": "No SKUs yet.",
    "inv.first.body": "Add your first one to start tracking stock.",
    "inv.loading": "Loading…",
    "inv.err.network": "Could not reach the server.",
    "inv.err.session": "Your session expired. Sign in again.",
    "inv.saved": "Saved",
    "inv.e.insufficient_stock": "Only {have} on hand — cannot move {want}.",
    "inv.e.insufficient_available": "Only {have} available — cannot reserve {want}.",
    "inv.e.insufficient_reserved": "Only {have} reserved — cannot release {want}.",
    "inv.e.bad_qty": "Enter a quantity of at least 1.",
    "inv.e.bad_type": "Unknown movement type.",
    "inv.e.no_sku": "That SKU no longer exists.",
    "inv.e.duplicate_code": "The code {code} is already in use.",
    "inv.e.bad_code": "Code may use letters, numbers, - and _ only.",
    "inv.e.bad_hex": "Swatch must look like #D9C29B.",
    "inv.e.bad_fields": "Product and finish are required.",
    "inv.e.bad_reserved": "Reserved cannot exceed on hand.",
    "inv.e.bad_csrf": "Your session token expired. Reload the page.",
    "inv.e.unauthenticated": "Your session expired. Sign in again.",
    "inv.e.bad_password": "Wrong password.",
    "inv.e.throttled": "Too many attempts. Wait a few minutes.",
    "inv.e.negative": "Refused — that would drive stock negative.",
  },

  es: {
    "logo.country": "República Dominicana",
    "inv.title": "Inventario",
    "inv.sub": "Control interno de existencias",
    "inv.login.title": "Acceso de personal",
    "inv.login.body": "Esta área es para el personal de Aqua Signature.",
    "inv.login.pw": "Contraseña del personal",
    "inv.login.btn": "Entrar",
    "inv.login.busy": "Entrando…",
    "inv.logout": "Salir",
    "inv.staff": "Iniciales",
    "inv.staff.ph": "ej. AL",
    "inv.staff.hint": "Se registran en cada movimiento que hagas.",
    "inv.sum.skus": "SKUs",
    "inv.sum.onhand": "Unidades en mano",
    "inv.sum.reserved": "Reservadas",
    "inv.sum.value": "Valor del stock",
    "inv.sum.needs": "Requieren producción",
    "inv.tab.all": "Todos",
    "inv.search.ph": "Buscar código, acabado, ubicación…",
    "inv.col.item": "Artículo",
    "inv.col.code": "Código",
    "inv.col.location": "Ubicación",
    "inv.col.onhand": "En mano",
    "inv.col.reserved": "Res.",
    "inv.col.available": "Disp.",
    "inv.col.reorder": "Reorden",
    "inv.col.value": "Valor",
    "inv.col.status": "Estado",
    "inv.status.ok": "En stock",
    "inv.status.low": "Bajo",
    "inv.status.out": "Agotado",
    "inv.mv.produced": "Producido",
    "inv.mv.delivered": "Entregado",
    "inv.mv.reserve": "Reservar",
    "inv.mv.release": "Liberar",
    "inv.mv.count": "Conteo",
    "inv.mv.write_off": "Baja",
    "inv.mv.produced.hint": "Unidades que llegan del taller.",
    "inv.mv.delivered.hint": "Enviado a un cliente. Libera primero las reservadas.",
    "inv.mv.reserve.hint": "Apartar unidades para un pedido. No puede exceder lo disponible.",
    "inv.mv.release.hint": "Devolver unidades reservadas al stock disponible.",
    "inv.mv.count.hint": "Fija las unidades en mano a un conteo físico. Reemplaza, no suma.",
    "inv.mv.write_off.hint": "Unidades dañadas, de muestra o perdidas.",
    "inv.panel.movement": "Registrar movimiento",
    "inv.panel.qty": "Cantidad",
    "inv.panel.ref": "Cliente / referencia",
    "inv.panel.ref.ph": "Casa de Campo — OC 1182",
    "inv.panel.note": "Nota",
    "inv.panel.note.ph": "Opcional",
    "inv.panel.record": "Registrar",
    "inv.panel.busy": "Registrando…",
    "inv.panel.edit": "Editar SKU",
    "inv.panel.delete": "Eliminar",
    "inv.panel.del.ask": "¿Eliminar este SKU y todo su historial de movimientos?",
    "inv.panel.del.yes": "Sí, eliminar",
    "inv.panel.del.no": "Conservar",
    "inv.panel.close": "Cerrar",
    "inv.panel.history": "Movimientos recientes",
    "inv.sku.add": "Agregar SKU",
    "inv.sku.new": "Nuevo SKU",
    "inv.sku.edit": "Editar SKU",
    "inv.sku.code": "Código",
    "inv.sku.product": "Producto",
    "inv.sku.finish": "Acabado",
    "inv.sku.hex": "Hex de muestra",
    "inv.sku.location": "Ubicación",
    "inv.sku.price": "Precio de lista (RD$)",
    "inv.sku.reorder": "Punto de reorden",
    "inv.sku.onhand": "Existencia inicial",
    "inv.sku.save": "Guardar",
    "inv.sku.cancel": "Cancelar",
    "inv.sku.editnote": "El stock no se edita aquí — registra un movimiento.",
    "inv.log.title": "Registro de movimientos",
    "inv.log.all": "Todos los SKUs",
    "inv.log.empty": "Aún no hay movimientos.",
    "inv.log.qty": "Cant.",
    "inv.log.after": "Después",
    "inv.log.by": "Por",
    "inv.export.stock": "Exportar stock CSV",
    "inv.export.mov": "Exportar movimientos CSV",
    "inv.empty": "Ningún SKU coincide.",
    "inv.first.title": "Aún no hay SKUs.",
    "inv.first.body": "Agrega el primero para empezar a controlar existencias.",
    "inv.loading": "Cargando…",
    "inv.err.network": "No se pudo conectar con el servidor.",
    "inv.err.session": "Tu sesión expiró. Entra de nuevo.",
    "inv.saved": "Guardado",
    "inv.e.insufficient_stock": "Solo hay {have} en mano — no se pueden mover {want}.",
    "inv.e.insufficient_available": "Solo hay {have} disponibles — no se pueden reservar {want}.",
    "inv.e.insufficient_reserved": "Solo hay {have} reservadas — no se pueden liberar {want}.",
    "inv.e.bad_qty": "Ingresa una cantidad de al menos 1.",
    "inv.e.bad_type": "Tipo de movimiento desconocido.",
    "inv.e.no_sku": "Ese SKU ya no existe.",
    "inv.e.duplicate_code": "El código {code} ya está en uso.",
    "inv.e.bad_code": "El código solo admite letras, números, - y _.",
    "inv.e.bad_hex": "La muestra debe verse como #D9C29B.",
    "inv.e.bad_fields": "Producto y acabado son obligatorios.",
    "inv.e.bad_reserved": "Lo reservado no puede exceder lo que hay en mano.",
    "inv.e.bad_csrf": "Tu token de sesión expiró. Recarga la página.",
    "inv.e.unauthenticated": "Tu sesión expiró. Entra de nuevo.",
    "inv.e.bad_password": "Contraseña incorrecta.",
    "inv.e.throttled": "Demasiados intentos. Espera unos minutos.",
    "inv.e.negative": "Rechazado — eso dejaría el stock en negativo.",
  },
};

const InvLangContext = React.createContext({ lang: "es", setLang: () => {}, t: (k) => k });

function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem("aqua_inv_lang") || "es"; }   // staff default
    catch (e) { return "es"; }
  });
  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem("aqua_inv_lang", l); } catch (e) {}
    document.documentElement.lang = l;
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const t = useCallback((key) => {
    const v = INV_DICT[lang] && INV_DICT[lang][key];
    if (v === undefined) return INV_DICT.en[key] !== undefined ? INV_DICT.en[key] : key;
    return v;
  }, [lang]);
  return <InvLangContext.Provider value={{ lang, setLang, t }}>{children}</InvLangContext.Provider>;
}

function useLang() { return React.useContext(InvLangContext); }

function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      <button className={`lang-switch__btn ${lang === "en" ? "is-on" : ""}`}
              onClick={() => setLang("en")} aria-pressed={lang === "en"}>EN</button>
      <span className="lang-switch__sep" aria-hidden="true">·</span>
      <button className={`lang-switch__btn ${lang === "es" ? "is-on" : ""}`}
              onClick={() => setLang("es")} aria-pressed={lang === "es"}>ES</button>
    </div>
  );
}

function Droplet({ className = "" }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (!imgFailed) {
    return (
      <img src="logo.svg?v=1" alt="" aria-hidden="true"
           className={`logo__drop logo__drop--img ${className}`}
           onError={() => setImgFailed(true)} />
    );
  }
  return (
    <svg className={`logo__drop ${className}`} viewBox="0 0 64 76" fill="none"
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="dropGrad" x1="32" y1="2" x2="32" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9FE3F0" />
          <stop offset="35%" stopColor="#5CC4DA" />
          <stop offset="70%" stopColor="#1B96A8" />
          <stop offset="100%" stopColor="#0A4D5A" />
        </linearGradient>
        <radialGradient id="dropShine" cx="42%" cy="32%" r="22%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <path d="M32 2 C32 2, 56 30, 56 50 C56 64, 45 74, 32 74 C19 74, 8 64, 8 50 C8 30, 32 2, 32 2 Z"
            fill="url(#dropGrad)" />
      <ellipse cx="26" cy="22" rx="6" ry="9" fill="url(#dropShine)" />
    </svg>
  );
}

function Logo({ size = "sm", stack = false, className = "" }) {
  const { t } = useLang();
  const cls = ["logo", size === "lg" && "logo--lg", stack && "logo--stack", className]
    .filter(Boolean).join(" ");
  return (
    <span className={cls}>
      <Droplet />
      <span className="logo__wordmark">
        <span className="logo__aqua">AQUA</span>
        <span className="logo__sig">Signature</span>
        <span className="logo__country">{t("logo.country")}</span>
      </span>
    </span>
  );
}

Object.assign(window, { INV_DICT, LangProvider, useLang, LangSwitch, Logo });
