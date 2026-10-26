"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert, Loader2, MapPin, MapPinPlus, Navigation, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type TurfLocation = {
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  country: string;
};

type TurfLocationPickerProps = {
  value: TurfLocation | null;
  onChange: (location: TurfLocation) => void;
  onAddressChange?: (address: string) => void;
};

const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125];

export default function TurfLocationPicker({ value, onChange, onAddressChange }: TurfLocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [L, setL] = useState<any>(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [userCleared, setUserCleared] = useState(false);

  useEffect(() => {
    import("leaflet").then((leaflet) => {
      setL(leaflet.default);
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
    });
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { 'User-Agent': 'OneArena-TurfBooking/1.0' } }
      );
      const data = await response.json();

      const address = data.display_name || "Selected location";
      const city = data.address?.city || data.address?.town || data.address?.village || "";
      const district = data.address?.state_district || data.address?.county || "";
      const country = data.address?.country || "";

      const location = { address, latitude: lat, longitude: lng, city, district, country };
      onChange(location);
      onAddressChange?.(address);
    } catch {
      const location = { address: "Selected location", latitude: lat, longitude: lng, city: "", district: "", country: "" };
      onChange(location);
      onAddressChange?.("Selected location");
    }
  }, [onChange, onAddressChange]);

  const forwardGeocode = useCallback(async (query: string) => {
    if (!query.trim()) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=bd`,
        { headers: { 'User-Agent': 'OneArena-TurfBooking/1.0' } }
      );
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Location search failed:", msg);
      setError(`Failed to search locations: ${msg}`);
      setSuggestions([]);
    } finally { setSearching(false); }
  }, []);

  const debouncedForwardGeocode = useCallback(
    (() => {
      let timeout: NodeJS.Timeout | null = null;
      return (query: string) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => forwardGeocode(query), 300);
      };
    })(),
    [forwardGeocode]
  );

  useEffect(() => {
    setManualLat(value?.latitude.toFixed(7) || "");
    setManualLng(value?.longitude.toFixed(7) || "");
    setUserCleared(false);
  }, [value]);

  const resetCoord = useCallback((field: "latitude" | "longitude") => {
    if (field === "latitude") setManualLat(value?.latitude.toFixed(7) || "");
    else setManualLng(value?.longitude.toFixed(7) || "");
  }, [value]);

  const commitCoord = useCallback(
    (field: "latitude" | "longitude") => {
      const val = field === "latitude" ? manualLat : manualLng;
      const num = parseFloat(val);
      if (!Number.isFinite(num)) return;
      const next: TurfLocation = {
        address: value?.address ?? "",
        latitude: field === "latitude" ? num : Number(value?.latitude ?? 0),
        longitude: field === "longitude" ? num : Number(value?.longitude ?? 0),
        city: value?.city ?? "",
        district: value?.district ?? "",
        country: value?.country ?? "",
      };
      onChange(next);
      const lat = next.latitude;
      const lng = next.longitude;
      if (mapInstanceRef.current && L) {
        mapInstanceRef.current.setView([lat, lng] as [number, number], 16);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng] as [number, number]);
        } else {
          const marker = L.marker([lat, lng] as [number, number], { draggable: true }).addTo(mapInstanceRef.current);
          markerRef.current = marker;
          marker.on("dragend", () => { const pos = markerRef.current!.getLatLng(); reverseGeocode(pos.lat, pos.lng); });
        }
      }
      setMapCenter([lat, lng]);
    },
    [manualLat, manualLng, value, onChange, L, reverseGeocode]
  );

  const handleSuggestionClick = (suggestion: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    setSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
    addressInputRef.current?.blur();
    reverseGeocode(lat, lng);
    if (mapInstanceRef.current && L) {
      mapInstanceRef.current.setView([lat, lng], 16);
    }
    setMapCenter([lat, lng]);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setUserCleared(false);
    onAddressChange?.(value);
    debouncedForwardGeocode(value);
  };

  const handleAddressBlur = () => setTimeout(() => setShowSuggestions(false), 200);
  const handleAddressFocus = () => { if (searchQuery.trim() && suggestions.length > 0) setShowSuggestions(true); };
  const clearSearch = () => {
    setSearchQuery("");
    setUserCleared(true);
    setSuggestions([]);
    setShowSuggestions(false);
    addressInputRef.current?.focus();
  };

  const chooseCurrentLocation = () => {
    if (!navigator.geolocation) { setError("Location not available."); return; }
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { reverseGeocode(coords.latitude, coords.longitude); if (mapInstanceRef.current && L) mapInstanceRef.current.setView([coords.latitude, coords.longitude], 18); setLocating(false); },
      (err) => { setLocating(false); setError(err.code === err.PERMISSION_DENIED ? "Permission denied." : "Could not get location."); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    const initialCenter = value ? [value.latitude, value.longitude] as [number, number] : mapCenter;
    const map = L.map(mapRef.current, { center: initialCenter, zoom: 16, zoomControl: false, scrollWheelZoom: true, doubleClickZoom: true });
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19 }).addTo(map);

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    if (value) {
      const marker = L.marker([value.latitude, value.longitude] as [number, number], { draggable: true }).addTo(map);
      markerRef.current = marker;
      marker.on("dragend", () => { const pos = marker.getLatLng(); reverseGeocode(pos.lat, pos.lng); });
    }

    map.on("click", (e: any) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) markerRef.current.setLatLng([lat, lng] as [number, number]);
      else { markerRef.current = L.marker([lat, lng] as [number, number], { draggable: true }).addTo(map); markerRef.current.on("dragend", () => { const pos = markerRef.current!.getLatLng(); reverseGeocode(pos.lat, pos.lng); }); }
      reverseGeocode(lat, lng);
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    return () => { map.remove(); mapInstanceRef.current = null; markerRef.current = null; };
  }, [L, mapCenter, reverseGeocode, value]);

  useEffect(() => {
    if (!mapInstanceRef.current || !L) return;
    if (value) {
      mapInstanceRef.current.setView([value.latitude, value.longitude] as [number, number], 16);
      if (markerRef.current) markerRef.current.setLatLng([value.latitude, value.longitude] as [number, number]);
      else { const marker = L.marker([value.latitude, value.longitude] as [number, number], { draggable: true }).addTo(mapInstanceRef.current); markerRef.current = marker; marker.on("dragend", () => { const pos = marker.getLatLng(); reverseGeocode(pos.lat, pos.lng); }); }
    } else if (markerRef.current) { mapInstanceRef.current.removeLayer(markerRef.current); markerRef.current = null; }
  }, [value, L, reverseGeocode]);

  return (
    <div className="space-y-4 overflow-hidden rounded-lg border bg-card shadow-sm">
      {/* Address & Search - Combined */}
      <div className="grid gap-3 lg:grid-cols-12 p-4">
        {/* Left: Address Fields */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                ref={addressInputRef}
                type="text"
                placeholder="Type address to search, or pick from map"
                value={userCleared ? "" : (searchQuery || value?.address || "")}
                onChange={handleAddressChange}
                onFocus={handleAddressFocus}
                onBlur={handleAddressBlur}
                className="pl-10 pr-10 h-9"
              />
              {(searchQuery || value?.address) && !userCleared && (
                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={clearSearch} aria-label="Clear">
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
            {searching && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />}

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border bg-popover shadow-lg">
                {suggestions.map((s, i) => (
                  <button key={i} type="button" className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent focus:bg-accent focus:outline-none flex items-center gap-2" onClick={() => handleSuggestionClick(s)}>
                    <MapPin className="size-4 text-muted-foreground" />
                    <span className="truncate">{s.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 grid-cols-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Latitude</label>
              <div className="relative">
                <Input
                  type="text"
                  step="any"
                  value={manualLat}
                  onChange={(event) => setManualLat(event.target.value)}
                  onBlur={() => commitCoord("latitude")}
                  className="h-9 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => resetCoord("latitude")}
                  aria-label="Reset latitude"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Longitude</label>
              <div className="relative">
                <Input
                  type="text"
                  step="any"
                  value={manualLng}
                  onChange={(event) => setManualLng(event.target.value)}
                  onBlur={() => commitCoord("longitude")}
                  className="h-9 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => resetCoord("longitude")}
                  aria-label="Reset longitude"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">City</label>
              <Input value={value?.city || ""} readOnly className="h-9 bg-muted" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">District</label>
              <Input value={value?.district || ""} readOnly className="h-9 bg-muted" />
            </div>
          </div>
        </div>

        {/* Right: Map */}
        <div className="lg:col-span-7 space-y-3">
          {/* Current Location Button */}
          <Button type="button" variant="outline" onClick={chooseCurrentLocation} disabled={locating} className="w-full sm:w-auto h-9 text-xs">
            {locating ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Navigation className="mr-2 size-3.5" />}
            {locating ? "Locating..." : "Use my location"}
          </Button>

          {error && <p className="flex items-center gap-2 text-[11px] text-destructive"><CircleAlert className="size-3.5" />{error}</p>}

          {/* Map */}
          <div className="relative h-[340px]">
            <div
              ref={mapRef}
              className="size-full rounded-lg border overflow-hidden"
              style={{ zIndex: 1 }}
              aria-label="Interactive map for location selection"
            />
            <div className="absolute bottom-2 right-2 flex flex-col gap-1">
              <Button type="button" variant="default" size="icon" className="shadow-md" onClick={() => mapInstanceRef.current?.zoomIn()} aria-label="Zoom in"><MapPinPlus className="size-3.5" /></Button>
              <Button type="button" variant="default" size="icon" className="shadow-md" onClick={() => mapInstanceRef.current?.zoomOut()} aria-label="Zoom out"><MapPin className="size-3.5" /></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}