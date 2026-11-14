import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Location } from '../../store/bookingStore';
import { searchPlaces, POPULAR_LANDMARKS } from '../../services/geocodingService';
import type { PlaceResult } from '../../services/geocodingService';

interface AutocompleteProps {
  placeholder: string;
  onSelect: (location: Location) => void;
  defaultValue?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const LocationAutocomplete = ({
  placeholder,
  onSelect,
  defaultValue = '',
  icon = <Search className="w-5 h-5 text-gray-400" />,
  className,
}: AutocompleteProps) => {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync external defaultValue (e.g. Current Location)
  useEffect(() => {
    if (defaultValue !== inputValue) {
      setInputValue(defaultValue);
    }
  }, [defaultValue]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search places with debounce
  useEffect(() => {
    if (!isOpen) return;

    if (!inputValue.trim()) {
      setResults(POPULAR_LANDMARKS.slice(0, 5));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      searchPlaces(inputValue).then((data) => {
        setResults(data);
        setIsLoading(false);
      });
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [inputValue, isOpen]);

  const handleSelect = (place: PlaceResult) => {
    setInputValue(place.mainText);
    setIsOpen(false);
    onSelect({
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      placeId: place.placeId,
    });
  };

  const handleClear = () => {
    setInputValue('');
    setResults(POPULAR_LANDMARKS.slice(0, 5));
  };

  return (
    <div className={cn('relative w-full', className)} ref={wrapperRef}>
      <div className="flex items-center px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition-all shadow-sm">
        <div className="shrink-0 mr-3">{icon}</div>
        <input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (!inputValue.trim()) {
              setResults(POPULAR_LANDMARKS.slice(0, 5));
            }
          }}
          placeholder={placeholder}
          className="bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-400 w-full font-medium outline-none text-sm"
        />
        {isLoading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0 ml-2" />}
        {inputValue && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden max-h-60 overflow-y-auto divide-y divide-gray-50">
          {!inputValue && (
            <li className="px-4 py-2 bg-gray-50/70 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Popular Spots
            </li>
          )}
          {results.map((place) => (
            <li
              key={place.placeId}
              onClick={() => handleSelect(place)}
              className="flex items-start px-4 py-3 hover:bg-emerald-50/50 cursor-pointer transition-colors text-left"
            >
              <MapPin className="w-4 h-4 text-brand-600 mr-3 shrink-0 mt-0.5" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-gray-900 truncate">
                  {place.mainText}
                </span>
                <span className="text-xs text-gray-500 truncate">{place.secondaryText}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
