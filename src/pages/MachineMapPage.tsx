import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMachines, useRenters } from "@/hooks/useSupabaseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box, MapPin, AlertCircle } from "lucide-react";

const statusColors: Record<string, string> = {
  assigned: "hsl(215 65% 48%)",
  rented: "hsl(215 65% 48%)",
  available: "hsl(0 0% 55%)",
  maintenance: "hsl(38 88% 50%)",
  retired: "hsl(0 0% 72%)",
};

function createIcon(color: string) {
  return L.divIcon({
    className: "machine-map-marker",
    html: `<div style="width:12px;height:12px;border-radius:9999px;background:${color};border:2px solid hsl(0 0% 100%);box-shadow:0 1px 3px hsl(0 0% 0% / 0.25);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

interface GeoCache {
  [address: string]: { lat: number; lng: number } | null;
}

export default function MachineMapPage() {
  const { data: machines = [], isLoading: loadingMachines } = useMachines();
  const { data: renters = [], isLoading: loadingRenters } = useRenters();
  const [geoCache, setGeoCache] = useState<GeoCache>({});
  const [geocoding, setGeocoding] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const renterMap = useMemo(() => {
    const mappedRenters: Record<string, typeof renters[number]> = {};
    renters.forEach((renter) => {
      mappedRenters[renter.id] = renter;
    });
    return mappedRenters;
  }, [renters]);

  const machineAddresses = useMemo(() => {
    return machines.map((machine) => {
      const renter = machine.assigned_renter_id ? renterMap[machine.assigned_renter_id] : null;
      const address = renter?.address || null;
      return { machine, renter, address };
    });
  }, [machines, renterMap]);

  const uniqueAddresses = useMemo(() => {
    const addresses = new Set<string>();
    machineAddresses.forEach(({ address }) => {
      if (address?.trim()) addresses.add(address.trim());
    });
    return Array.from(addresses);
  }, [machineAddresses]);

  const geocodeAddresses = useCallback(async () => {
    const toGeocode = uniqueAddresses.filter((address) => !(address in geoCache));
    if (toGeocode.length === 0) return;

    setGeocoding(true);
    const nextCache: GeoCache = { ...geoCache };

    for (const address of toGeocode) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
          { headers: { "User-Agent": "LaundryLord/1.0" } }
        );
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          nextCache[address] = {
            lat: Number.parseFloat(data[0].lat),
            lng: Number.parseFloat(data[0].lon),
          };
        } else {
          nextCache[address] = null;
        }
      } catch {
        nextCache[address] = null;
      }

      await new Promise((resolve) => setTimeout(resolve, 1100));
    }

    setGeoCache(nextCache);
    setGeocoding(false);
  }, [geoCache, uniqueAddresses]);

  useEffect(() => {
    if (!loadingMachines && !loadingRenters && uniqueAddresses.length > 0) {
      void geocodeAddresses();
    }
  }, [loadingMachines, loadingRenters, uniqueAddresses, geocodeAddresses]);

  const { mapped, unmatched } = useMemo(() => {
    const mappedMachines: Array<{
      machine: typeof machines[number];
      renter: typeof renters[number] | null;
      address: string;
      lat: number;
      lng: number;
    }> = [];
    const unmatchedMachines: Array<{
      machine: typeof machines[number];
      renter: typeof renters[number] | null;
      reason: string;
    }> = [];

    machineAddresses.forEach(({ machine, renter, address }) => {
      if (!address?.trim()) {
        unmatchedMachines.push({
          machine,
          renter,
          reason: renter ? "No address on file" : "Not assigned to a renter",
        });
        return;
      }

      const geocoded = geoCache[address.trim()];
      if (geocoded) {
        mappedMachines.push({
          machine,
          renter,
          address: address.trim(),
          lat: geocoded.lat,
          lng: geocoded.lng,
        });
      } else if (geocoded === null) {
        unmatchedMachines.push({ machine, renter, reason: "Address could not be geocoded" });
      }
    });

    return { mapped: mappedMachines, unmatched: unmatchedMachines };
  }, [geoCache, machineAddresses, machines, renters]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [33.749, -84.388],
      zoom: 10,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      markersLayerRef.current?.clearLayers();
      markersLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (mapped.length === 0) {
      map.setView([33.749, -84.388], 10);
      return;
    }

    const bounds = L.latLngBounds([]);

    mapped.forEach((item) => {
      const marker = L.marker([item.lat, item.lng], {
        icon: createIcon(statusColors[item.machine.status] || "hsl(0 0% 55%)"),
      });

      marker.bindPopup(`
        <div style="font-size:12px;line-height:1.4;min-width:160px;">
          <div style="font-weight:600;">${item.machine.type} — ${item.machine.model}</div>
          <div style="color:hsl(0 0% 45%);">SN: ${item.machine.serial}</div>
          ${item.renter ? `<div>Renter: <strong>${item.renter.name}</strong></div>` : ""}
          <div style="color:hsl(0 0% 45%);">${item.address}</div>
          <div style="margin-top:6px;text-transform:capitalize;">${item.machine.status}</div>
        </div>
      `);

      marker.addTo(markersLayer);
      bounds.extend([item.lat, item.lng]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [mapped]);

  const isLoading = loadingMachines || loadingRenters;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <MapPin className="h-4 w-4" /> Machine Map
        </h1>
        {geocoding && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
            Geocoding addresses…
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div ref={mapContainerRef} className="h-[calc(100vh-180px)] w-full min-h-[420px]" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-4 pb-1 pt-3">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                Not on Map ({unmatched.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {unmatched.length === 0 ? (
                <div className="px-4 pb-3">
                  <p className="text-xs text-muted-foreground">All machines are mapped.</p>
                </div>
              ) : (
                <div className="max-h-[calc(100vh-260px)] divide-y overflow-y-auto">
                  {unmatched.map(({ machine, renter, reason }) => (
                    <div key={machine.id} className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <Box className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate text-xs font-medium">
                          {machine.type} — {machine.model}
                        </span>
                      </div>
                      <div className="ml-[18px] mt-0.5 text-[10px] text-muted-foreground">
                        SN: {machine.serial}
                      </div>
                      {renter && (
                        <div className="ml-[18px] text-[10px] text-muted-foreground">
                          Renter: {renter.name}
                        </div>
                      )}
                      <div className="ml-[18px] text-[10px] text-warning">{reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-4 px-1 text-[10px] text-muted-foreground lg:col-span-2">
            {Object.entries({
              assigned: "Assigned/Rented",
              available: "Available",
              maintenance: "Maintenance",
              retired: "Retired",
            }).map(([status, label]) => (
              <div key={status} className="flex items-center gap-1">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: statusColors[status] }}
                />
                {label}
              </div>
            ))}
          </div>

          {mapped.length > 0 && (
            <div className="lg:col-span-2 flex flex-wrap gap-2 px-1">
              <Badge variant="outline" className="text-[10px]">
                {mapped.length} machine{mapped.length === 1 ? "" : "s"} mapped
              </Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
