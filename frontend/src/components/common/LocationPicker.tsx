"use client";

import { useState } from "react";
import { CircleAlert, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

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
};

export default function TurfLocationPicker({ value, onChange }: TurfLocationPickerProps) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const chooseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not available in this browser.");
      return;
    }

    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onChange({
          address: "Current location",
          latitude: coords.latitude,
          longitude: coords.longitude,
          city: "",
          district: "",
          country: "",
        });
        setLocating(false);
      },
      (positionError) => {
        setLocating(false);
        setError(positionError.code === positionError.PERMISSION_DENIED ? "Location permission was denied. Allow location access and try again." : "Could not read your current location. Try again.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  return <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-medium">Use your current location</p>
      </div>
      <Button type="button" variant="outline" onClick={chooseCurrentLocation} disabled={locating}>
        {locating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <MapPin className="mr-2 size-4" />}
        {locating ? "Locating..." : "Use my location"}
      </Button>
    </div>
    {error && <p className="flex items-center gap-2 text-sm text-destructive"><CircleAlert className="size-4" />{error}</p>}
  </div>;
}
