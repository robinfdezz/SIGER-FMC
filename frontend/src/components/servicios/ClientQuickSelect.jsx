import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, UserPlus, X, CheckCircle2, Phone, CreditCard, Loader2 } from 'lucide-react';
import { getClients } from '../../services/clients.service';
import { ClientModal } from '../clients/ClientModal';

/**
 * ClientQuickSelect
 * Buscador predictivo de clientes con debounce + modal de creacion rapida.
 *
 * @param {Object|null} value    - Cliente seleccionado { id, nombre, apellido, telefono, cedula_rnc }
 * @param {Function}    onChange - Callback con el cliente seleccionado o null
 */
const ClientQuickSelect = ({ value, onChange }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Cerrar dropdown al click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce de busqueda (300ms)
  const handleQueryChange = useCallback((e) => {
    const term = e.target.value;
    setQuery(term);
    clearTimeout(debounceRef.current);

    if (term.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const cleanTerm = term.trim().toLowerCase();
        const res = await getClients({ search: term.trim(), q: term.trim(), limit: 12 });
        const list = res.success ? (res.data || []) : [];
        
        // Filtrado reactivo estricto
        const filtered = list.filter((c) => {
          const fullName = `${c.nombre || ''} ${c.apellido || ''}`.toLowerCase();
          const cedula = (c.cedula_rnc || '').toLowerCase();
          const tel = (c.telefono || '').toLowerCase();
          const telAdic = (c.telefono_adicional || '').toLowerCase();
          return (
            fullName.includes(cleanTerm) ||
            (c.nombre || '').toLowerCase().includes(cleanTerm) ||
            (c.apellido || '').toLowerCase().includes(cleanTerm) ||
            cedula.includes(cleanTerm) ||
            tel.includes(cleanTerm) ||
            telAdic.includes(cleanTerm)
          );
        });

        setResults(filtered);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleSelect = (client) => {
    onChange(client);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
  };

  // Callback cuando se crea un cliente nuevo desde el modal
  const handleNewClientSuccess = (newClient) => {
    setShowNewClientModal(false);
    if (newClient) {
      onChange(newClient);
    }
  };

  const inputClass = "w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:outline-none focus-visible:outline-none focus:border-red-500 dark:focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:focus:ring-red-500/20 font-inter transition-colors";

  // Si ya hay cliente seleccionado, muestra ficha compacta con paleta institucional roja
  if (value && value.id) {
    const fullName = [value.nombre, value.apellido].filter(Boolean).join(' ');
    return (
      <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-neutral-900 dark:text-neutral-100">
        <CheckCircle2 size={16} className="text-red-600 dark:text-red-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{fullName}</p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter truncate">
            {value.telefono && <span className="mr-2">{value.telefono}</span>}
            {value.cedula_rnc && <span>Céd: {value.cedula_rnc}</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer shrink-0"
          title="Quitar cliente seleccionado"
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        {/* Input de busqueda */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Buscar por nombre, telefono o cedula..."
            className={inputClass}
          />
          {isSearching && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 animate-spin" />
          )}
        </div>

        {/* Dropdown de resultados */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-neutral-400 dark:text-neutral-500 text-center font-inter">
                No se encontraron clientes con esa búsqueda
              </div>
            ) : (
              results.map((client) => {
                const fullName = [client.nombre, client.apellido].filter(Boolean).join(' ');
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelect(client)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center text-xs font-bold shrink-0 font-outfit">
                      {fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{fullName}</p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter flex items-center gap-2 mt-0.5">
                        {client.telefono && <span className="flex items-center gap-1"><Phone size={10} />{client.telefono}</span>}
                        {client.cedula_rnc && <span className="flex items-center gap-1"><CreditCard size={10} />{client.cedula_rnc}</span>}
                      </p>
                    </div>
                  </button>
                );
              })
            )}

            {/* Boton de nuevo cliente siempre visible al fondo del dropdown */}
            <div className="border-t border-neutral-100 dark:border-neutral-800/80 p-2">
              <button
                type="button"
                onClick={() => { setShowDropdown(false); setShowNewClientModal(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                <UserPlus size={14} />
                Registrar nuevo cliente
              </button>
            </div>
          </div>
        )}

        {/* Boton externo de nuevo cliente (cuando no hay dropdown) */}
        {!showDropdown && query.length === 0 && (
          <button
            type="button"
            onClick={() => setShowNewClientModal(true)}
            className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
          >
            <UserPlus size={13} />
            Registrar como cliente nuevo
          </button>
        )}
      </div>

      {/* Modal de creacion de cliente */}
      <ClientModal
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onSuccess={handleNewClientSuccess}
        client={null}
      />
    </>
  );
};

export default ClientQuickSelect;